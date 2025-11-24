import { Address, Context, Storage, generateEvent, call, Coins } from '@massalabs/massa-as-sdk';
import { setOwner } from '../utils/ownership';
import { ReentrancyGuard } from '../utils/reentrancyGuard';
import {
  Args,
  bytesToString,
  bytesToU64,
  stringToBytes,
  u64ToBytes,
  u128ToBytes,
  bytesToU128,
  u256ToBytes,
  bytesToU256,
} from '@massalabs/as-types';
import { IFactory } from '../interfaces/IFactory';
import {
  FACTORY,
  FEE,
  TICK_SPACING,
  TOKEN_0,
  TOKEN_1,
  poolState as POOL_STATE_KEY,
  feeGrowthGlobal0,
  feeGrowthGlobal1,
  liquidity as LIQUIDITY_KEY
} from '../storage/pool';
import { i128, u128 } from 'as-bignum/assembly';
import { u256 } from 'as-bignum/assembly';
import { SafeMathU128, SafeMathU256, safeMathI128 } from '../libraries/safeMath';
import { Tick } from '../libraries/tick';
import { TickInfo } from '../utils/types/tick';
import { Position, getAmountsForLiquidity, getLiquidityForAmounts, updatePosition } from '../libraries/position';
import { computeSwapStep, getSqrtPriceAtTick, getTickAtSqrtPrice } from '../libraries/swapMath';

// Constants
const MIN_TICK: i32 = -887220;
const MAX_TICK: i32 = 887220;
const MIN_SQRT_RATIO: u256 = u256.fromU64(4295128739); // Approximation
const MAX_SQRT_RATIO: u256 = u256.Max; // Maximum u256 value
const NATIVE_MAS_ADDRESS = 'NATIVE_MAS';

// Helper to create 2^96 as u256
function getSqrtPrice96(): u256 {
  // 2^96 = 79228162514264337593543950336
  // Create using bit shift: 1 << 96
  const one = u256.One;
  const shift96 = one << 96;
  return shift96;
}

/**
 * Pool State Class
 */
class PoolState {
  constructor(
    public sqrtPriceX96: u256,
    public tick: i32,
    public liquidity: u128,
  ) {}

  serialize(): StaticArray<u8> {
    return new Args()
      .add(this.sqrtPriceX96)
      .add(this.tick)
      .add(this.liquidity)
      .serialize();
  }

  static deserialize(data: StaticArray<u8>): PoolState {
    const args = new Args(data);
    return new PoolState(
      args.nextU256().expect('sqrtPriceX96 missing'),
      args.nextI32().expect('tick missing'),
      args.nextU128().expect('liquidity missing'),
    );
  }

  static load(): PoolState {
    const data = Storage.get(POOL_STATE_KEY);
    if (data.length === 0) {
      // Initialize with default state
      const defaultSqrtPrice = getSqrtPrice96(); // 2^96
      return new PoolState(defaultSqrtPrice, 0, u128.Zero);
    }
    return PoolState.deserialize(data);
  }

  save(): void {
    Storage.set(POOL_STATE_KEY, this.serialize());
  }
}

/**
 * Get position storage key
 */
function getPositionKey(owner: string, tickLower: i32, tickUpper: i32): StaticArray<u8> {
  return stringToBytes(`position:${owner}:${tickLower.toString()}:${tickUpper.toString()}`);
}

/**
 * Load position from storage
 */
function loadPosition(owner: string, tickLower: i32, tickUpper: i32): Position {
  const key = getPositionKey(owner, tickLower, tickUpper);
  const data = Storage.get(key);

  if (data.length === 0) {
    return new Position(u128.Zero, u256.Zero, u256.Zero, u128.Zero, u128.Zero);
  }

  return Position.deserialize(data);
}

/**
 * Save position to storage
 */
function savePosition(owner: string, tickLower: i32, tickUpper: i32, position: Position): void {
  const key = getPositionKey(owner, tickLower, tickUpper);
  Storage.set(key, position.serialize());
}

/**
 * Get tick storage key
 */
function getTickKey(tick: i32): StaticArray<u8> {
  return stringToBytes(`tick:${tick.toString()}`);
}

/**
 * Load tick from storage
 */
function loadTick(tick: i32): TickInfo {
  const key = getTickKey(tick);
  const data = Storage.get(key);

  if (data.length === 0) {
    return new TickInfo(
      u128.Zero, // liquidityGross
      i128.Zero, // liquidityNet
      u256.Zero, // feeGrowthOutside0
      u256.Zero, // feeGrowthOutside1
      0, // tickCumulativeOutside
      u256.Zero, // secondsPerLiquidityOutsideX128
      0, // secondsOutside
      false // initialized
    );
  }

  return TickInfo.deserialize(data);
}

/**
 * Save tick to storage
 */
function saveTick(tick: i32, info: TickInfo): void {
  const key = getTickKey(tick);
  Storage.set(key, info.serialize());
}

/**
 * Update a tick (simplified without PersistentMap)
 */
function updateTick(
  tick: i32,
  currentTick: i32,
  liquidityDelta: i128,
  feeGrowth0: u256,
  feeGrowth1: u256,
  upper: bool
): bool {
  let info = loadTick(tick);

  const liquidityGrossBefore = info.liqidityGross;

  // Calculate new gross liquidity
  const liquidityGrossAfter: u128 = liquidityDelta < i128.Zero
    ? SafeMathU128.sub(liquidityGrossBefore, u128.from(i128.abs(liquidityDelta)))
    : SafeMathU128.add(liquidityGrossBefore, u128.from(liquidityDelta));

  const flipped = (liquidityGrossAfter == u128.Zero) != (liquidityGrossBefore == u128.Zero);

  if (liquidityGrossBefore == u128.Zero) {
    info.initialized = true;
  }

  info.liqidityGross = liquidityGrossAfter;
  info.liquidityNet = upper
    ? safeMathI128.sub(info.liquidityNet, liquidityDelta)
    : safeMathI128.add(info.liquidityNet, liquidityDelta);

  saveTick(tick, info);

  return flipped;
}

/**
 * Transfer tokens in (from user to pool)
 */
function transferTokensIn(token: string, from: string, amount: u256): void {
  if (token === NATIVE_MAS_ADDRESS) {
    const coinsReceived = Context.transferredCoins();
    const amountU64 = amount.toU64();
    assert(coinsReceived >= amountU64, 'INSUFFICIENT_MAS_SENT');
  } else {
    // MRC6909 token transfer
    const transferArgs = new Args()
      .add(from)
      .add(Context.callee().toString())
      .add(u256.Zero) // token ID (0 for fungible)
      .add(amount);

    call(new Address(token), 'transferFrom', transferArgs, 0);
  }
}

/**
 * Transfer tokens out (from pool to recipient)
 */
function transferTokensOut(token: string, to: string, amount: u256): void {
  if (token === NATIVE_MAS_ADDRESS) {
    const amountU64 = amount.toU64();
    Coins.transferCoins(new Address(to), amountU64);
  } else {
    // MRC6909 token transfer
    const transferArgs = new Args()
      .add(Context.callee().toString())
      .add(to)
      .add(u256.Zero) // token ID (0 for fungible)
      .add(amount);

    call(new Address(token), 'transfer', transferArgs, 0);
  }
}

/**
 * Load fee growth global
 */
function loadFeeGrowthGlobal0(): u256 {
  const data = Storage.get(feeGrowthGlobal0);
  if (data.length === 0) return u256.Zero;
  return bytesToU256(data);
}

function loadFeeGrowthGlobal1(): u256 {
  const data = Storage.get(feeGrowthGlobal1);
  if (data.length === 0) return u256.Zero;
  return bytesToU256(data);
}

function saveFeeGrowthGlobal0(value: u256): void {
  Storage.set(feeGrowthGlobal0, u256ToBytes(value));
}

function saveFeeGrowthGlobal1(value: u256): void {
  Storage.set(feeGrowthGlobal1, u256ToBytes(value));
}

/**
 * This function is meant to be called only one time: when the contract is deployed.
 *
 * @param binaryArgs - Arguments serialized with Args
 * - factory: string - The address of the factory contract.
 * - token0: string - The address of the first token.
 * - token1: string - The address of the second token.
 * - fee: u64 - The fee amount.
 * - tickSpacing: u64 - The tick spacing.
 */
export function constructor(binaryArgs: StaticArray<u8>): void {
  // This line is important. It ensures that this function can't be called in the future.
  // If you remove this check, someone could call your constructor function and reset your smart contract.
  assert(Context.isDeployingContract(), 'ALREADY_INITIALIZED');

  const args = new Args(binaryArgs);

  const factoryIn = args
    .nextString()
    .expect('factory argument is missing or invalid');
  const token0In = args
    .nextString()
    .expect('token0 argument is missing or invalid');
  const token1In = args
    .nextString()
    .expect('token1 argument is missing or invalid');
  const feeIn = args.nextU64().expect('fee argument is missing or invalid');
  const tickSpacingIn = args
    .nextU64()
    .expect('tickSpacing argument is missing or invalid');

  // Set the pool storage
  Storage.set(FACTORY, factoryIn);
  Storage.set(TOKEN_0, token0In);
  Storage.set(TOKEN_1, token1In);
  Storage.set(FEE, u64ToBytes(feeIn));
  Storage.set(TICK_SPACING, u64ToBytes(tickSpacingIn));

  // Initialize pool state with default values
  const defaultState = new PoolState(
    getSqrtPrice96(), // 2^96 (1:1 price)
    0,
    u128.Zero
  );
  defaultState.save();

  // Initialize fee growth
  saveFeeGrowthGlobal0(u256.Zero);
  saveFeeGrowthGlobal1(u256.Zero);

  // Get the factory owner
  const factoryOwner = _getFactoryOwner(factoryIn);

  // Set the contract owner to the factory owner
  setOwner(new Args().add(factoryOwner.toString()).serialize());

  // Init Reeentrancy guard
  ReentrancyGuard.__ReentrancyGuard_init();
}

// Getters

/**
 * Get the pool state
 * @returns The pool state serialized
 */
export function getState(_: StaticArray<u8>): StaticArray<u8> {
  const state = PoolState.load();
  const feeGrowth0 = loadFeeGrowthGlobal0();
  const feeGrowth1 = loadFeeGrowthGlobal1();

  return new Args()
    .add(state.sqrtPriceX96)
    .add(state.tick)
    .add(state.liquidity)
    .add(feeGrowth0)
    .add(feeGrowth1)
    .serialize();
}

/**
 * Get position info
 */
export function getPosition(binaryArgs: StaticArray<u8>): StaticArray<u8> {
  const args = new Args(binaryArgs);
  const owner = args.nextString().expect('owner missing');
  const tickLower = args.nextI32().expect('tickLower missing');
  const tickUpper = args.nextI32().expect('tickUpper missing');

  const position = loadPosition(owner, tickLower, tickUpper);
  return position.serialize();
}

/**
 * Mint liquidity to a position
 * @param binaryArgs - A StaticArray<u8> containing:
 *  - recipient: string - Address to receive the liquidity position
 *  - tickLower: i32 - Lower tick of the position
 *  - tickUpper: i32 - Upper tick of the position
 *  - amount: u128 - Amount of liquidity to mint
 */
export function mint(binaryArgs: StaticArray<u8>): void {
  ReentrancyGuard.nonReentrant();

  const args = new Args(binaryArgs);
  const recipient = args
    .nextString()
    .expect('recipient argument is missing or invalid');
  const tickLower = args
    .nextI32()
    .expect('tickLower argument is missing or invalid');
  const tickUpper = args
    .nextI32()
    .expect('tickUpper argument is missing or invalid');
  const liquidityDelta = args
    .nextU128()
    .expect('amount argument is missing or invalid');

  // Validate tick range
  assert(tickLower < tickUpper, 'TICK_LOWER_MUST_BE_LESS_THAN_TICK_UPPER');
  assert(tickLower >= MIN_TICK, 'TICK_LOWER_TOO_LOW');
  assert(tickUpper <= MAX_TICK, 'TICK_UPPER_TOO_HIGH');

  // Load current pool state
  const state = PoolState.load();
  const tickSpacing = bytesToU64(Storage.get(TICK_SPACING));

  // Validate tick spacing
  assert(tickLower % i32(tickSpacing) === 0, 'TICK_LOWER_NOT_ALIGNED');
  assert(tickUpper % i32(tickSpacing) === 0, 'TICK_UPPER_NOT_ALIGNED');

  // Calculate token amounts needed
  const sqrtPriceLowerX96 = getSqrtPriceAtTick(tickLower);
  const sqrtPriceUpperX96 = getSqrtPriceAtTick(tickUpper);

  const amounts = getAmountsForLiquidity(
    state.sqrtPriceX96,
    sqrtPriceLowerX96,
    sqrtPriceUpperX96,
    liquidityDelta
  );

  // Update ticks
  const feeGrowth0 = loadFeeGrowthGlobal0();
  const feeGrowth1 = loadFeeGrowthGlobal1();

  const liquidityDeltaI128 = i128.from(liquidityDelta);

  updateTick(
    tickLower,
    state.tick,
    liquidityDeltaI128,
    feeGrowth0,
    feeGrowth1,
    false // upper = false for lower tick
  );

  updateTick(
    tickUpper,
    state.tick,
    liquidityDeltaI128,
    feeGrowth0,
    feeGrowth1,
    true // upper = true for upper tick
  );

  // Update position
  let position = loadPosition(recipient, tickLower, tickUpper);

  // Calculate fee growth inside the position range (simplified)
  const feeGrowthInside0 = feeGrowth0;
  const feeGrowthInside1 = feeGrowth1;

  position = updatePosition(
    position,
    liquidityDeltaI128,
    feeGrowthInside0,
    feeGrowthInside1
  );

  savePosition(recipient, tickLower, tickUpper, position);

  // Update pool liquidity if current price is in range
  if (state.tick >= tickLower && state.tick < tickUpper) {
    state.liquidity = SafeMathU128.add(state.liquidity, liquidityDelta);
    state.save();
  }

  // Transfer tokens from user
  const caller = Context.caller().toString();
  const token0 = Storage.get(TOKEN_0);
  const token1 = Storage.get(TOKEN_1);

  transferTokensIn(token0, caller, amounts.amount0);
  transferTokensIn(token1, caller, amounts.amount1);

  generateEvent(`Mint:${recipient}:${tickLower}:${tickUpper}:${liquidityDelta.toString()}`);

  ReentrancyGuard.endNonReentrant();
}

/**
 * Burn liquidity from a position
 * @param binaryArgs - A StaticArray<u8> containing:
 *  - tickLower: i32 - Lower tick of the position
 *  - tickUpper: i32 - Upper tick of the position
 *  - amount: u128 - Amount of liquidity to burn
 */
export function burn(binaryArgs: StaticArray<u8>): void {
  ReentrancyGuard.nonReentrant();

  const args = new Args(binaryArgs);
  const tickLower = args
    .nextI32()
    .expect('tickLower argument is missing or invalid');
  const tickUpper = args
    .nextI32()
    .expect('tickUpper argument is missing or invalid');
  const liquidityDelta = args
    .nextU128()
    .expect('amount argument is missing or invalid');

  const owner = Context.caller().toString();

  // Load position and validate
  let position = loadPosition(owner, tickLower, tickUpper);
  assert(position.liquidity >= liquidityDelta, 'INSUFFICIENT_LIQUIDITY');

  // Load pool state
  const state = PoolState.load();

  // Calculate token amounts to return
  const sqrtPriceLowerX96 = getSqrtPriceAtTick(tickLower);
  const sqrtPriceUpperX96 = getSqrtPriceAtTick(tickUpper);

  const amounts = getAmountsForLiquidity(
    state.sqrtPriceX96,
    sqrtPriceLowerX96,
    sqrtPriceUpperX96,
    liquidityDelta
  );

  // Update ticks with negative liquidity delta
  const feeGrowth0 = loadFeeGrowthGlobal0();
  const feeGrowth1 = loadFeeGrowthGlobal1();

  const negativeLiquidityDelta = i128.Zero - i128.from(liquidityDelta);

  updateTick(
    tickLower,
    state.tick,
    negativeLiquidityDelta,
    feeGrowth0,
    feeGrowth1,
    false
  );

  updateTick(
    tickUpper,
    state.tick,
    negativeLiquidityDelta,
    feeGrowth0,
    feeGrowth1,
    true
  );

  // Update position
  const feeGrowthInside0 = feeGrowth0;
  const feeGrowthInside1 = feeGrowth1;

  position = updatePosition(
    position,
    negativeLiquidityDelta,
    feeGrowthInside0,
    feeGrowthInside1
  );

  // Add burned amounts to tokens owed
  position.tokensOwed0 = SafeMathU128.add(position.tokensOwed0, u128.from(amounts.amount0));
  position.tokensOwed1 = SafeMathU128.add(position.tokensOwed1, u128.from(amounts.amount1));

  savePosition(owner, tickLower, tickUpper, position);

  // Update pool liquidity if current price is in range
  if (state.tick >= tickLower && state.tick < tickUpper) {
    state.liquidity = SafeMathU128.sub(state.liquidity, liquidityDelta);
    state.save();
  }

  generateEvent(`Burn:${owner}:${tickLower}:${tickUpper}:${liquidityDelta.toString()}`);

  ReentrancyGuard.endNonReentrant();
}

/**
 * Swap tokens
 * @param binaryArgs - A StaticArray<u8> containing:
 *  - recipient: string - Address to receive output tokens
 *  - zeroForOne: bool - Direction of swap (token0 -> token1 if true)
 *  - amountSpecified: i128 - Amount to swap (positive = exact input)
 *  - sqrtPriceLimitX96: u256 - Price limit for the swap
 */
export function swap(binaryArgs: StaticArray<u8>): void {
  ReentrancyGuard.nonReentrant();

  const args = new Args(binaryArgs);
  const recipient = args
    .nextString()
    .expect('recipient argument is missing or invalid');
  const zeroForOne = args
    .nextBool()
    .expect('zeroForOne argument is missing or invalid');
  const amountSpecified = args
    .nextI128()
    .expect('amountSpecified argument is missing or invalid');
  const sqrtPriceLimitX96 = args
    .nextU256()
    .expect('sqrtPriceLimitX96 argument is missing or invalid');

  assert(amountSpecified != i128.Zero, 'AMOUNT_ZERO');

  // Load pool state
  let state = PoolState.load();

  // Validate price limit
  if (zeroForOne) {
    assert(sqrtPriceLimitX96 < state.sqrtPriceX96, 'PRICE_LIMIT_INVALID');
    assert(sqrtPriceLimitX96 > MIN_SQRT_RATIO, 'PRICE_LIMIT_TOO_LOW');
  } else {
    assert(sqrtPriceLimitX96 > state.sqrtPriceX96, 'PRICE_LIMIT_INVALID');
    assert(sqrtPriceLimitX96 < MAX_SQRT_RATIO, 'PRICE_LIMIT_TOO_HIGH');
  }

  // Simplified swap implementation
  // In production, this would loop through ticks
  const fee = bytesToU64(Storage.get(FEE));

  let amountIn: u256;
  let amountOut: u256;

  if (amountSpecified > i128.Zero) {
    // Exact input swap
    amountIn = u256.from(amountSpecified);

    // Calculate fee
    const feeAmount = SafeMathU256.div(
      SafeMathU256.mul(amountIn, u256.fromU64(fee)),
      u256.fromU64(1000000)
    );

    const amountInAfterFee = SafeMathU256.sub(amountIn, feeAmount);

    // Simplified output calculation (should use proper liquidity math)
    amountOut = SafeMathU256.div(
      SafeMathU256.mul(amountInAfterFee, u256.fromU64(995)),
      u256.fromU64(1000)
    );

    // Update fee growth
    if (state.liquidity > u128.Zero) {
      const feeGrowthDelta = SafeMathU256.div(
        SafeMathU256.mul(feeAmount, u256.fromU64(1000000)),
        u256.from(state.liquidity)
      );

      if (zeroForOne) {
        const currentFeeGrowth = loadFeeGrowthGlobal0();
        saveFeeGrowthGlobal0(SafeMathU256.add(currentFeeGrowth, feeGrowthDelta));
      } else {
        const currentFeeGrowth = loadFeeGrowthGlobal1();
        saveFeeGrowthGlobal1(SafeMathU256.add(currentFeeGrowth, feeGrowthDelta));
      }
    }
  } else {
    // Exact output swap (not implemented in this simplified version)
    assert(false, 'EXACT_OUTPUT_NOT_IMPLEMENTED');
    amountIn = u256.Zero;
    amountOut = u256.Zero;
  }

  // Update price (simplified - just move toward limit)
  state.sqrtPriceX96 = sqrtPriceLimitX96;
  state.tick = getTickAtSqrtPrice(sqrtPriceLimitX96);
  state.save();

  // Transfer tokens
  const caller = Context.caller().toString();
  const token0 = Storage.get(TOKEN_0);
  const token1 = Storage.get(TOKEN_1);

  if (zeroForOne) {
    transferTokensIn(token0, caller, amountIn);
    transferTokensOut(token1, recipient, amountOut);
  } else {
    transferTokensIn(token1, caller, amountIn);
    transferTokensOut(token0, recipient, amountOut);
  }

  generateEvent(`Swap:${recipient}:${zeroForOne}:${amountIn.toString()}:${amountOut.toString()}`);

  ReentrancyGuard.endNonReentrant();
}

/**
 * Collect fees from a position
 * @param binaryArgs - A StaticArray<u8> containing:
 *  - recipient: string - Address to receive fees
 *  - tickLower: i32 - Lower tick of the position
 *  - tickUpper: i32 - Upper tick of the position
 *  - amount0Requested: u128 - Maximum amount of token0 to collect
 *  - amount1Requested: u128 - Maximum amount of token1 to collect
 */
export function collect(binaryArgs: StaticArray<u8>): void {
  ReentrancyGuard.nonReentrant();

  const args = new Args(binaryArgs);
  const recipient = args
    .nextString()
    .expect('recipient argument is missing or invalid');
  const tickLower = args
    .nextI32()
    .expect('tickLower argument is missing or invalid');
  const tickUpper = args
    .nextI32()
    .expect('tickUpper argument is missing or invalid');
  const amount0Requested = args
    .nextU128()
    .expect('amount0Requested argument is missing or invalid');
  const amount1Requested = args
    .nextU128()
    .expect('amount1Requested argument is missing or invalid');

  const owner = Context.caller().toString();

  // Load position
  let position = loadPosition(owner, tickLower, tickUpper);

  // Calculate amounts to collect (min of requested and owed)
  const amount0Collect = position.tokensOwed0 < amount0Requested
    ? position.tokensOwed0
    : amount0Requested;

  const amount1Collect = position.tokensOwed1 < amount1Requested
    ? position.tokensOwed1
    : amount1Requested;

  // Update position
  position.tokensOwed0 = SafeMathU128.sub(position.tokensOwed0, amount0Collect);
  position.tokensOwed1 = SafeMathU128.sub(position.tokensOwed1, amount1Collect);

  savePosition(owner, tickLower, tickUpper, position);

  // Transfer tokens
  const token0 = Storage.get(TOKEN_0);
  const token1 = Storage.get(TOKEN_1);

  if (amount0Collect > u128.Zero) {
    transferTokensOut(token0, recipient, u256.from(amount0Collect));
  }

  if (amount1Collect > u128.Zero) {
    transferTokensOut(token1, recipient, u256.from(amount1Collect));
  }

  generateEvent(`Collect:${recipient}:${tickLower}:${tickUpper}:${amount0Collect.toString()}:${amount1Collect.toString()}`);

  ReentrancyGuard.endNonReentrant();
}

/**
 * Get current sqrt price
 */
export function getSqrtPriceX96(_: StaticArray<u8>): StaticArray<u8> {
  const state = PoolState.load();
  return u256ToBytes(state.sqrtPriceX96);
}

/**
 * Get current tick
 */
export function getTick(_: StaticArray<u8>): StaticArray<u8> {
  const state = PoolState.load();
  return new Args().add(state.tick).serialize();
}

/**
 * Get current liquidity
 */
export function getLiquidity(_: StaticArray<u8>): StaticArray<u8> {
  const state = PoolState.load();
  return u128ToBytes(state.liquidity);
}

/**
 * Get pool tokens
 */
export function getTokens(_: StaticArray<u8>): StaticArray<u8> {
  const token0 = Storage.get(TOKEN_0);
  const token1 = Storage.get(TOKEN_1);
  return new Args()
    .add(token0)
    .add(token1)
    .serialize();
}

/**
 * Get pool fee
 */
export function getFee(_: StaticArray<u8>): StaticArray<u8> {
  return Storage.get(FEE);
}

/**
 * Get complete pool state (for external queries)
 */
export function getPoolState(_: StaticArray<u8>): StaticArray<u8> {
  const state = PoolState.load();
  const token0 = Storage.get(TOKEN_0);
  const token1 = Storage.get(TOKEN_1);
  const fee = bytesToU64(Storage.get(FEE));

  return new Args()
    .add(state.sqrtPriceX96)
    .add(state.tick)
    .add(state.liquidity)
    .add(token0)
    .add(token1)
    .add(fee)
    .serialize();
}

/* Internals */

function _getFactoryOwner(
  factoryStored: string = Storage.get(FACTORY),
): Address {
  return new IFactory(new Address(factoryStored)).ownerAddress();
}

function onlyFactoryOwner(factoryStored: string = Storage.get(FACTORY)): void {
  assert(
    Context.caller() === _getFactoryOwner(factoryStored),
    'ONLY_FACTORY_OWNER',
  );
}
