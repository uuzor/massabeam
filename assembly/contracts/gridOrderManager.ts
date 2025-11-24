import {
  Args,
  bytesToU256,
  stringToBytes,
  u256ToBytes,
  bytesToU64,
  u64ToBytes,
  bytesToString,
} from '@massalabs/as-types';
import {
  Address,
  Context,
  generateEvent,
  Storage,
  call,
  Coins,
  sendMessage,
} from '@massalabs/massa-as-sdk';
import { u256, i128 } from 'as-bignum/assembly';
import { ReentrancyGuard } from '../utils/reentrancyGuard';
import { setOwner } from '../utils/ownership';
import { SafeMathU256 } from '../libraries/safeMath';

// Storage keys
export const GRID_ID_COUNTER = stringToBytes('GRID_ID_COUNTER');
export const GRID_PREFIX = stringToBytes('GRID');
export const GRID_LEVEL_PREFIX = stringToBytes('GRID_LEVEL');
export const FACTORY_ADDRESS_KEY = stringToBytes('FACTORY_ADDRESS');
export const ACTIVE_GRIDS_KEY = stringToBytes('ACTIVE_GRIDS');
export const ACTIVE_GRIDS_COUNT_KEY = stringToBytes('ACTIVE_GRIDS_COUNT');
export const NATIVE_MAS_ADDRESS = 'NATIVE_MAS';

// Execution configuration
const CHECK_INTERVAL_PERIODS: u64 = 3; // Check every 3 periods (~48 seconds)
const DEFAULT_FEE: u64 = 3000; // Default 0.3% fee tier for pools
const EXECUTION_GAS_BUDGET: u64 = 3_000_000_000; // 3B gas for execution
const MAX_GRIDS_PER_CHECK: i32 = 5; // Max grids to check per execution

/**
 * Grid Level Status
 */
export enum GridLevelStatus {
  IDLE = 0, // No active order
  BUY_PENDING = 1, // Buy order placed, waiting to fill
  SELL_PENDING = 2, // Sell order placed, waiting to fill
}

/**
 * Grid Level - represents one price level in the grid
 */
export class GridLevel {
  constructor(
    public price: u256, // Target price for this level
    public amount: u256, // Amount to trade at this level
    public status: u8, // GridLevelStatus
    public lastFillPeriod: u64, // Period when last filled
  ) {}

  serialize(): StaticArray<u8> {
    return new Args()
      .add(this.price)
      .add(this.amount)
      .add(this.status)
      .add(this.lastFillPeriod)
      .serialize();
  }

  static deserialize(data: StaticArray<u8>): GridLevel {
    const args = new Args(data);
    return new GridLevel(
      args.nextU256().expect('price missing'),
      args.nextU256().expect('amount missing'),
      args.nextU8().expect('status missing'),
      args.nextU64().expect('lastFillPeriod missing'),
    );
  }
}

/**
 * Grid Order - manages a grid trading strategy
 */
export class GridOrder {
  constructor(
    public gridId: u256,
    public owner: string,
    public tokenIn: string, // Base token (e.g., USDC)
    public tokenOut: string, // Quote token (e.g., WMAS)
    public gridLevels: u64, // Number of grid levels
    public lowerPrice: u256, // Lowest price level
    public upperPrice: u256, // Highest price level
    public amountPerLevel: u256, // Amount to trade per level
    public active: bool,
    public cancelled: bool,
  ) {}

  serialize(): StaticArray<u8> {
    return new Args()
      .add(this.gridId)
      .add(this.owner)
      .add(this.tokenIn)
      .add(this.tokenOut)
      .add(this.gridLevels)
      .add(this.lowerPrice)
      .add(this.upperPrice)
      .add(this.amountPerLevel)
      .add(this.active)
      .add(this.cancelled)
      .serialize();
  }

  static deserialize(data: StaticArray<u8>): GridOrder {
    const args = new Args(data);
    return new GridOrder(
      args.nextU256().expect('gridId missing'),
      args.nextString().expect('owner missing'),
      args.nextString().expect('tokenIn missing'),
      args.nextString().expect('tokenOut missing'),
      args.nextU64().expect('gridLevels missing'),
      args.nextU256().expect('lowerPrice missing'),
      args.nextU256().expect('upperPrice missing'),
      args.nextU256().expect('amountPerLevel missing'),
      args.nextBool().expect('active missing'),
      args.nextBool().expect('cancelled missing'),
    );
  }
}

/**
 * Initialize contract
 */
export function constructor(binaryArgs: StaticArray<u8>): void {
  const args = new Args(binaryArgs);
  const factoryAddress = args.nextString().expect('factoryAddress missing');

  // Set the contract owner
  setOwner(new Args().add(Context.caller().toString()).serialize());

  // Store factory address
  Storage.set(FACTORY_ADDRESS_KEY, stringToBytes(factoryAddress));

  // Initialize grid ID counter
  Storage.set(GRID_ID_COUNTER, u256ToBytes(u256.Zero));

  // Initialize active grids count
  Storage.set(ACTIVE_GRIDS_COUNT_KEY, u64ToBytes(0));

  // Initialize reentrancy guard
  ReentrancyGuard.__ReentrancyGuard_init();

  generateEvent(`GridOrderManager:Initialized:${factoryAddress}`);
}

/**
 * Create a new grid order
 */
export function createGridOrder(binaryArgs: StaticArray<u8>): StaticArray<u8> {
  ReentrancyGuard.nonReentrant();

  const args = new Args(binaryArgs);
  const tokenIn = args.nextString().expect('tokenIn missing');
  const tokenOut = args.nextString().expect('tokenOut missing');
  const gridLevels = args.nextU64().expect('gridLevels missing');
  const lowerPrice = args.nextU256().expect('lowerPrice missing');
  const upperPrice = args.nextU256().expect('upperPrice missing');
  const amountPerLevel = args.nextU256().expect('amountPerLevel missing');

  // Validate inputs
  assert(tokenIn != tokenOut, 'IDENTICAL_TOKENS');
  assert(gridLevels >= 2, 'MIN_2_LEVELS');
  assert(gridLevels <= 50, 'MAX_50_LEVELS');
  assert(lowerPrice < upperPrice, 'INVALID_PRICE_RANGE');
  assert(amountPerLevel > u256.Zero, 'INVALID_AMOUNT');

  // Generate grid ID
  const currentId = bytesToU256(Storage.get(GRID_ID_COUNTER));
  const gridId = SafeMathU256.add(currentId, u256.One);
  Storage.set(GRID_ID_COUNTER, u256ToBytes(gridId));

  // Calculate total amount needed (half for buys, half for sells)
  const totalLevels = u256.fromU64(gridLevels);
  const totalAmount = SafeMathU256.mul(amountPerLevel, totalLevels);

  // Transfer tokens to contract (escrow)
  transferTokensIn(tokenIn, Context.caller().toString(), totalAmount);

  // Create grid
  const grid = new GridOrder(
    gridId,
    Context.caller().toString(),
    tokenIn,
    tokenOut,
    gridLevels,
    lowerPrice,
    upperPrice,
    amountPerLevel,
    true, // active
    false, // cancelled
  );

  // Store grid
  Storage.set(_getGridKey(gridId), grid.serialize());

  // Initialize grid levels
  _initializeGridLevels(grid);

  // Add to active grids
  _addToActiveGrids(gridId);

  // Schedule checker if this is the first grid
  const activeCount = _getActiveGridsCount();
  if (activeCount == 1) {
    _scheduleNextCheck(CHECK_INTERVAL_PERIODS);
  }

  generateEvent(`GridOrder:Created:${gridId}:${Context.caller()}:${gridLevels}:${lowerPrice}:${upperPrice}`);

  return u256ToBytes(gridId);
}

/**
 * Cancel a grid order
 */
export function cancelGridOrder(binaryArgs: StaticArray<u8>): void {
  ReentrancyGuard.nonReentrant();

  const args = new Args(binaryArgs);
  const gridId = args.nextU256().expect('gridId missing');

  const gridKey = _getGridKey(gridId);
  assert(Storage.has(gridKey), 'GRID_NOT_FOUND');

  const grid = GridOrder.deserialize(Storage.get(gridKey));

  // Only owner can cancel
  assert(grid.owner == Context.caller().toString(), 'NOT_GRID_OWNER');
  assert(grid.active, 'GRID_NOT_ACTIVE');

  // Mark as cancelled
  grid.active = false;
  grid.cancelled = true;
  Storage.set(gridKey, grid.serialize());

  // Remove from active grids
  _removeFromActiveGrids(gridId);

  // Refund remaining tokens (simplified - refund all escrowed tokens)
  const totalAmount = SafeMathU256.mul(grid.amountPerLevel, u256.fromU64(grid.gridLevels));
  transferTokensOut(grid.tokenIn, grid.owner, totalAmount);

  generateEvent(`GridOrder:Cancelled:${gridId}:${grid.owner}`);
}

/**
 * Check and execute pending grid orders (called by automation)
 */
export function checkAndExecuteGridOrders(_: StaticArray<u8>): void {
  const currentPeriod = Context.currentPeriod();
  const activeCount = _getActiveGridsCount();

  if (activeCount == 0) {
    generateEvent('GridAutoChecker:NoActiveGrids');
    return;
  }

  let processed = 0;
  let executed = 0;

  // Check active grids (limit to MAX_GRIDS_PER_CHECK)
  const checksToPerform = activeCount < u64(MAX_GRIDS_PER_CHECK) ? activeCount : u64(MAX_GRIDS_PER_CHECK);

  for (let i: u64 = 0; i < checksToPerform; i++) {
    const gridIdKey = stringToBytes(`active_grid_${i.toString()}`);
    if (!Storage.has(gridIdKey)) continue;

    const gridId = bytesToU256(Storage.get(gridIdKey));
    const gridKey = _getGridKey(gridId);

    if (!Storage.has(gridKey)) {
      // Grid was deleted, clean up
      Storage.del(gridIdKey);
      continue;
    }

    const grid = GridOrder.deserialize(Storage.get(gridKey));

    // Skip if not active
    if (!grid.active || grid.cancelled) {
      _removeFromActiveGrids(gridId);
      continue;
    }

    // Get current price from pool
    const currentPrice = _getCurrentPrice(grid.tokenIn, grid.tokenOut);

    if (currentPrice == u256.Zero) {
      // No pool exists or error getting price
      continue;
    }

    // Check each grid level
    const levelsExecuted = _checkGridLevels(grid, currentPrice, currentPeriod);
    executed += levelsExecuted;
    processed++;
  }

  generateEvent(`GridAutoChecker:Processed:${processed}:Executed:${executed}`);

  // Schedule next check if there are still active grids
  const remainingCount = _getActiveGridsCount();
  if (remainingCount > 0) {
    _scheduleNextCheck(CHECK_INTERVAL_PERIODS);
  }
}

/**
 * Get grid details
 */
export function getGridOrder(binaryArgs: StaticArray<u8>): StaticArray<u8> {
  const args = new Args(binaryArgs);
  const gridId = args.nextU256().expect('gridId missing');

  const gridKey = _getGridKey(gridId);
  assert(Storage.has(gridKey), 'GRID_NOT_FOUND');

  return Storage.get(gridKey);
}

/**
 * Get grid level details
 */
export function getGridLevel(binaryArgs: StaticArray<u8>): StaticArray<u8> {
  const args = new Args(binaryArgs);
  const gridId = args.nextU256().expect('gridId missing');
  const levelIndex = args.nextU64().expect('levelIndex missing');

  const levelKey = _getGridLevelKey(gridId, levelIndex);
  assert(Storage.has(levelKey), 'LEVEL_NOT_FOUND');

  return Storage.get(levelKey);
}

/**
 * Get active grids count
 */
export function getActiveGridsCount(_: StaticArray<u8>): StaticArray<u8> {
  return Storage.get(ACTIVE_GRIDS_COUNT_KEY);
}

/**
 * Internal: Initialize grid levels
 */
function _initializeGridLevels(grid: GridOrder): void {
  // Calculate price step between levels
  const priceRange = SafeMathU256.sub(grid.upperPrice, grid.lowerPrice);
  const levels = u256.fromU64(grid.gridLevels - 1);
  const priceStep = SafeMathU256.div(priceRange, levels);

  // Create grid levels
  for (let i: u64 = 0; i < grid.gridLevels; i++) {
    const levelPrice = SafeMathU256.add(
      grid.lowerPrice,
      SafeMathU256.mul(priceStep, u256.fromU64(i))
    );

    const level = new GridLevel(
      levelPrice,
      grid.amountPerLevel,
      u8(GridLevelStatus.IDLE),
      0, // lastFillPeriod
    );

    Storage.set(_getGridLevelKey(grid.gridId, i), level.serialize());
  }
}

/**
 * Internal: Check grid levels and execute orders
 */
function _checkGridLevels(grid: GridOrder, currentPrice: u256, currentPeriod: u64): i32 {
  let executed: i32 = 0;

  // Check each level
  for (let i: u64 = 0; i < grid.gridLevels; i++) {
    const levelKey = _getGridLevelKey(grid.gridId, i);
    const level = GridLevel.deserialize(Storage.get(levelKey));

    // Determine if we should buy or sell at this level
    if (currentPrice <= level.price && level.status != u8(GridLevelStatus.BUY_PENDING)) {
      // Price is at or below level - place buy order
      const buySuccess = _executeBuy(grid, level, i);
      if (buySuccess) {
        level.status = u8(GridLevelStatus.BUY_PENDING);
        level.lastFillPeriod = currentPeriod;
        Storage.set(levelKey, level.serialize());
        executed++;
        generateEvent(`Grid:BuyExecuted:${grid.gridId}:Level:${i}:Price:${level.price}`);
      }
    } else if (currentPrice >= level.price && level.status != u8(GridLevelStatus.SELL_PENDING)) {
      // Price is at or above level - place sell order
      const sellSuccess = _executeSell(grid, level, i);
      if (sellSuccess) {
        level.status = u8(GridLevelStatus.SELL_PENDING);
        level.lastFillPeriod = currentPeriod;
        Storage.set(levelKey, level.serialize());
        executed++;
        generateEvent(`Grid:SellExecuted:${grid.gridId}:Level:${i}:Price:${level.price}`);
      }
    }
  }

  return executed;
}

/**
 * Internal: Execute buy order at grid level
 */
function _executeBuy(grid: GridOrder, level: GridLevel, levelIndex: u64): bool {
  const factoryAddressBytes = Storage.get(FACTORY_ADDRESS_KEY);
  const factoryAddress = bytesToString(factoryAddressBytes);

  const poolAddress = _getPoolAddress(
    factoryAddress,
    grid.tokenIn,
    grid.tokenOut,
    DEFAULT_FEE,
  );

  if (poolAddress == '') {
    return false;
  }

  // Buy tokenOut with tokenIn
  const zeroForOne = grid.tokenIn < grid.tokenOut;
  const sqrtPriceLimitX96 = level.price; // Use level price as limit

  const amountInI128 = i128.from(level.amount);

  const swapArgs = new Args()
    .add(grid.owner) // Recipient
    .add(zeroForOne)
    .add(amountInI128)
    .add(sqrtPriceLimitX96);

  call(new Address(poolAddress), 'swap', swapArgs, 0);

  return true;
}

/**
 * Internal: Execute sell order at grid level
 */
function _executeSell(grid: GridOrder, level: GridLevel, levelIndex: u64): bool {
  const factoryAddressBytes = Storage.get(FACTORY_ADDRESS_KEY);
  const factoryAddress = bytesToString(factoryAddressBytes);

  const poolAddress = _getPoolAddress(
    factoryAddress,
    grid.tokenOut, // Swap direction reversed for sell
    grid.tokenIn,
    DEFAULT_FEE,
  );

  if (poolAddress == '') {
    return false;
  }

  // Sell tokenOut for tokenIn
  const zeroForOne = grid.tokenOut < grid.tokenIn;
  const sqrtPriceLimitX96 = level.price; // Use level price as limit

  const amountInI128 = i128.from(level.amount);

  const swapArgs = new Args()
    .add(grid.owner) // Recipient
    .add(zeroForOne)
    .add(amountInI128)
    .add(sqrtPriceLimitX96);

  call(new Address(poolAddress), 'swap', swapArgs, 0);

  return true;
}

/**
 * Internal: Get current price from pool
 */
function _getCurrentPrice(token0: string, token1: string): u256 {
  const factoryAddressBytes = Storage.get(FACTORY_ADDRESS_KEY);
  const factoryAddress = bytesToString(factoryAddressBytes);

  const poolAddress = _getPoolAddress(
    factoryAddress,
    token0,
    token1,
    DEFAULT_FEE,
  );

  if (poolAddress == '') {
    return u256.Zero;
  }

  // Call pool to get current sqrt price
  const result = call(new Address(poolAddress), 'getSqrtPriceX96', new Args(), 0);
  if (result.length > 0) {
    const resultArgs = new Args(result);
    return resultArgs.nextU256().unwrap();
  }

  return u256.Zero;
}

/**
 * Internal: Get grid storage key
 */
function _getGridKey(gridId: u256): StaticArray<u8> {
  return stringToBytes(`grid:${gridId.toString()}`);
}

/**
 * Internal: Get grid level storage key
 */
function _getGridLevelKey(gridId: u256, levelIndex: u64): StaticArray<u8> {
  return stringToBytes(`grid:${gridId.toString()}:level:${levelIndex.toString()}`);
}

/**
 * Internal: Schedule next check
 */
function _scheduleNextCheck(periodDelay: u64): void {
  const currentPeriod = Context.currentPeriod();
  const currentThread = Context.currentThread();

  let nextPeriod = currentPeriod + periodDelay;
  let nextThread = currentThread + 1;

  // Wrap thread if needed
  if (nextThread >= 32) {
    nextPeriod = nextPeriod + 1;
    nextThread = 0;
  }

  sendMessage(
    Context.callee(), // This contract
    'checkAndExecuteGridOrders', // Function to call
    nextPeriod, // Validity start period
    u8(nextThread), // Validity start thread
    nextPeriod + 10, // Validity end period (10 period window)
    u8(nextThread), // Validity end thread
    EXECUTION_GAS_BUDGET, // Max gas
    0, // Raw fee
    0, // No coins needed
    new Args().serialize(), // Function params
  );

  generateEvent(`GridAutoScheduled:Period:${nextPeriod}:Thread:${nextThread}`);
}

/**
 * Internal: Get pool address from factory
 */
function _getPoolAddress(
  factoryAddress: string,
  token0: string,
  token1: string,
  fee: u64,
): string {
  const args = new Args()
    .add(token0)
    .add(token1)
    .add(fee);

  const result = call(new Address(factoryAddress), 'getPool', args, 0);

  if (result.length == 0) {
    return '';
  }

  const resultArgs = new Args(result);
  return resultArgs.nextString().unwrap();
}

/**
 * Internal: Add grid to active grids list
 */
function _addToActiveGrids(gridId: u256): void {
  const currentCount = _getActiveGridsCount();
  const key = stringToBytes(`active_grid_${currentCount.toString()}`);
  Storage.set(key, u256ToBytes(gridId));

  const newCount = currentCount + 1;
  Storage.set(ACTIVE_GRIDS_COUNT_KEY, u64ToBytes(newCount));
}

/**
 * Internal: Remove grid from active grids list
 */
function _removeFromActiveGrids(gridId: u256): void {
  const count = _getActiveGridsCount();

  // Find and remove the grid
  for (let i: u64 = 0; i < count; i++) {
    const key = stringToBytes(`active_grid_${i.toString()}`);
    if (!Storage.has(key)) continue;

    const storedId = bytesToU256(Storage.get(key));
    if (storedId == gridId) {
      // Swap with last element and delete
      const lastKey = stringToBytes(`active_grid_${(count - 1).toString()}`);
      if (i < count - 1 && Storage.has(lastKey)) {
        const lastId = Storage.get(lastKey);
        Storage.set(key, lastId);
      }
      Storage.del(lastKey);

      const newCount = count - 1;
      Storage.set(ACTIVE_GRIDS_COUNT_KEY, u64ToBytes(newCount));
      break;
    }
  }
}

/**
 * Internal: Get active grids count
 */
function _getActiveGridsCount(): u64 {
  const data = Storage.get(ACTIVE_GRIDS_COUNT_KEY);
  if (data.length == 0) return 0;
  return bytesToU64(data);
}

/**
 * Internal: Transfer tokens in (from user to contract)
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
 * Internal: Transfer tokens out (from contract to user)
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
