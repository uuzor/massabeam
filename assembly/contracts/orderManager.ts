import {
  Args,
  bytesToU256,
  stringToBytes,
  u256ToBytes,
} from '@massalabs/as-types';
import {
  Address,
  Context,
  generateEvent,
  Storage,
  call,
  Coins,
} from '@massalabs/massa-as-sdk';
import { u256 } from 'as-bignum/assembly';
import { ReentrancyGuard } from '../utils/reentrancyGuard';
import { setOwner } from '../utils/ownership';
import { SafeMathU256 } from '../libraries/safeMath';
import { PersistentMap } from '../utils/collections/persistentMap';

// Storage keys
export const ORDER_ID_COUNTER = stringToBytes('ORDER_ID_COUNTER');
export const ORDER_PREFIX = stringToBytes('ORDER');
export const FACTORY_ADDRESS_KEY = stringToBytes('FACTORY_ADDRESS');
export const NATIVE_MAS_ADDRESS = 'NATIVE_MAS'; // Sentinel for native MAS token

/**
 * Order Type Enum
 * BUY: User wants to buy tokenOut with tokenIn at or below limitPrice
 * SELL: User wants to sell tokenIn for tokenOut at or above limitPrice
 */
export enum OrderType {
  BUY = 0,
  SELL = 1,
}

/**
 * Limit Order structure
 *
 * BUY Order Example:
 * - User has USDC (tokenIn) and wants to buy WMAS (tokenOut)
 * - limitPrice = max price willing to pay (e.g., 10 USDC per WMAS)
 * - Order executes when market price <= limitPrice
 *
 * SELL Order Example:
 * - User has WMAS (tokenIn) and wants to sell for USDC (tokenOut)
 * - limitPrice = min price willing to accept (e.g., 10 USDC per WMAS)
 * - Order executes when market price >= limitPrice
 */
export class LimitOrder {
  constructor(
    public orderId: u256,
    public owner: string,
    public tokenIn: string,
    public tokenOut: string,
    public amountIn: u256,
    public minAmountOut: u256, // Minimum amount of tokenOut to receive
    public limitPrice: u256, // Price limit (represented as tokenOut per tokenIn * 10^18)
    public orderType: u8, // 0 = BUY, 1 = SELL
    public expiry: u64, // Expiration timestamp (0 = no expiry)
    public filled: bool, // Whether the order has been filled
    public cancelled: bool, // Whether the order has been cancelled
  ) {}

  serialize(): StaticArray<u8> {
    return new Args()
      .add<u256>(this.orderId)
      .add(this.owner)
      .add(this.tokenIn)
      .add(this.tokenOut)
      .add<u256>(this.amountIn)
      .add<u256>(this.minAmountOut)
      .add<u256>(this.limitPrice)
      .add(this.orderType)
      .add(this.expiry)
      .add(this.filled)
      .add(this.cancelled)
      .serialize();
  }

  static deserialize(data: StaticArray<u8>): LimitOrder {
    const args = new Args(data);
    return new LimitOrder(
      args.nextU256().expect('orderId missing'),
      args.nextString().expect('owner missing'),
      args.nextString().expect('tokenIn missing'),
      args.nextString().expect('tokenOut missing'),
      args.nextU256().expect('amountIn missing'),
      args.nextU256().expect('minAmountOut missing'),
      args.nextU256().expect('limitPrice missing'),
      args.nextU8().expect('orderType missing'),
      args.nextU64().expect('expiry missing'),
      args.nextBool().expect('filled missing'),
      args.nextBool().expect('cancelled missing'),
    );
  }
}

/**
 * Constructor - Initialize the OrderManager contract
 */
export function constructor(_: StaticArray<u8>): void {
  assert(Context.isDeployingContract(), 'ALREADY_INITIALIZED');

  // Set the contract owner
  setOwner(new Args().add(Context.caller().toString()).serialize());

  // Initialize order ID counter
  Storage.set(ORDER_ID_COUNTER, u256ToBytes(u256.Zero));

  // Initialize reentrancy guard
  ReentrancyGuard.__ReentrancyGuard_init();

  generateEvent('OrderManager initialized');
}

/**
 * Create a new limit order
 * @param binaryArgs - Contains:
 *  - tokenIn: string - Token to sell
 *  - tokenOut: string - Token to buy
 *  - amountIn: u256 - Amount of tokenIn to sell
 *  - minAmountOut: u256 - Minimum amount of tokenOut to receive
 *  - limitPrice: u256 - Price limit (tokenOut per tokenIn * 10^18)
 *  - orderType: u8 - Order type (0 = BUY, 1 = SELL)
 *  - expiry: u64 - Expiration timestamp (0 = no expiry)
 */
export function createLimitOrder(binaryArgs: StaticArray<u8>): StaticArray<u8> {
  ReentrancyGuard.nonReentrant();

  const args = new Args(binaryArgs);
  const tokenIn = args.nextString().expect('tokenIn missing');
  const tokenOut = args.nextString().expect('tokenOut missing');
  const amountIn = args.nextU256().expect('amountIn missing');
  const minAmountOut = args.nextU256().expect('minAmountOut missing');
  const limitPrice = args.nextU256().expect('limitPrice missing');
  const orderType = args.nextU8().expect('orderType missing');
  const expiry = args.nextU64().expect('expiry missing');

  const caller = Context.caller().toString();

  // Validate inputs
  assert(tokenIn != tokenOut, 'TOKENS_MUST_BE_DIFFERENT');
  assert(amountIn > u256.Zero, 'INVALID_AMOUNT_IN');
  assert(minAmountOut > u256.Zero, 'INVALID_MIN_AMOUNT_OUT');
  assert(limitPrice > u256.Zero, 'INVALID_LIMIT_PRICE');
  assert(orderType <= 1, 'INVALID_ORDER_TYPE');

  // Get and increment order ID
  const currentId = bytesToU256(Storage.get(ORDER_ID_COUNTER));
  const orderId = currentId;
  const nextId = SafeMathU256.add(currentId, u256.One);
  Storage.set(ORDER_ID_COUNTER, u256ToBytes(nextId));

  // Create order
  const order = new LimitOrder(
    orderId,
    caller,
    tokenIn,
    tokenOut,
    amountIn,
    minAmountOut,
    limitPrice,
    orderType,
    expiry,
    false, // not filled
    false, // not cancelled
  );

  // Store order
  const orderKey = _getOrderKey(orderId);
  Storage.set(orderKey, order.serialize());

  // Transfer tokenIn from user to this contract
  // User must have approved this contract to spend their tokens
  _transferTokensIn(tokenIn, caller, amountIn);

  const orderTypeStr = orderType == 0 ? 'BUY' : 'SELL';
  generateEvent(
    `LimitOrderCreated:${orderId}:${caller}:${orderTypeStr}:${tokenIn}:${tokenOut}`,
  );

  ReentrancyGuard.endNonReentrant();

  return u256ToBytes(orderId);
}

/**
 * Cancel a limit order
 * @param binaryArgs - Contains:
 *  - orderId: u256 - ID of the order to cancel
 */
export function cancelLimitOrder(binaryArgs: StaticArray<u8>): void {
  ReentrancyGuard.nonReentrant();

  const args = new Args(binaryArgs);
  const orderId = args.nextU256().expect('orderId missing');

  const caller = Context.caller().toString();

  // Load order
  const orderKey = _getOrderKey(orderId);
  assert(Storage.has(orderKey), 'ORDER_NOT_FOUND');

  const order = LimitOrder.deserialize(Storage.get(orderKey));

  // Validate caller is owner
  assert(order.owner == caller, 'NOT_ORDER_OWNER');
  assert(!order.filled, 'ORDER_ALREADY_FILLED');
  assert(!order.cancelled, 'ORDER_ALREADY_CANCELLED');

  // Mark as cancelled
  order.cancelled = true;
  Storage.set(orderKey, order.serialize());

  // Return tokenIn to user
  _transferTokensOut(order.tokenIn, caller, order.amountIn);

  generateEvent(`LimitOrderCancelled:${orderId}:${caller}`);

  ReentrancyGuard.endNonReentrant();
}

/**
 * Execute a limit order (called by keeper/executor)
 * @param binaryArgs - Contains:
 *  - orderId: u256 - ID of the order to execute
 *  - amountOut: u256 - Actual amount of tokenOut received
 */
export function executeLimitOrder(binaryArgs: StaticArray<u8>): void {
  ReentrancyGuard.nonReentrant();

  const args = new Args(binaryArgs);
  const orderId = args.nextU256().expect('orderId missing');
  const amountOut = args.nextU256().expect('amountOut missing');

  // Load order
  const orderKey = _getOrderKey(orderId);
  assert(Storage.has(orderKey), 'ORDER_NOT_FOUND');

  const order = LimitOrder.deserialize(Storage.get(orderKey));

  // Validate order state
  assert(!order.filled, 'ORDER_ALREADY_FILLED');
  assert(!order.cancelled, 'ORDER_CANCELLED');

  // Check expiry
  if (order.expiry > 0) {
    const currentTime = Context.timestamp();
    assert(currentTime <= order.expiry, 'ORDER_EXPIRED');
  }

  // Validate execution meets minimum output
  assert(amountOut >= order.minAmountOut, 'INSUFFICIENT_OUTPUT_AMOUNT');

  // Validate price meets limit based on order type
  // actualPrice = (amountOut * 10^18) / amountIn
  const actualPrice = SafeMathU256.div(
    SafeMathU256.mul(amountOut, u256.fromU64(1000000000000000000)),
    order.amountIn,
  );

  if (order.orderType == 0) {
    // BUY order: actualPrice should be <= limitPrice (buying at or below limit)
    assert(actualPrice <= order.limitPrice, 'BUY_PRICE_TOO_HIGH');
  } else {
    // SELL order: actualPrice should be >= limitPrice (selling at or above limit)
    assert(actualPrice >= order.limitPrice, 'SELL_PRICE_TOO_LOW');
  }

  // Mark as filled
  order.filled = true;
  Storage.set(orderKey, order.serialize());

  // Note: In a production system, you would:
  // 1. Query the factory to get the pool address for this token pair
  // 2. Execute the swap through the pool
  // 3. Verify the amountOut matches what was provided
  //
  // For now, we trust the executor and directly transfer the output tokens
  // The executor must have already obtained tokenOut and will transfer it

  // Transfer tokenOut to order owner
  _transferTokensOut(order.tokenOut, order.owner, amountOut);

  generateEvent(
    `LimitOrderExecuted:${orderId}:${order.owner}:${amountOut}:${actualPrice}`,
  );

  ReentrancyGuard.endNonReentrant();
}

/**
 * Get order details
 * @param binaryArgs - Contains:
 *  - orderId: u256 - ID of the order
 */
export function getOrder(binaryArgs: StaticArray<u8>): StaticArray<u8> {
  const args = new Args(binaryArgs);
  const orderId = args.nextU256().expect('orderId missing');

  const orderKey = _getOrderKey(orderId);
  assert(Storage.has(orderKey), 'ORDER_NOT_FOUND');

  return Storage.get(orderKey);
}

/**
 * Get total number of orders created
 */
export function getOrderCount(_: StaticArray<u8>): StaticArray<u8> {
  return Storage.get(ORDER_ID_COUNTER);
}

/* Internal functions */

function _getOrderKey(orderId: u256): StaticArray<u8> {
  return ORDER_PREFIX.concat(u256ToBytes(orderId));
}

/**
 * Transfer tokens from user to this contract
 * Supports both MRC6909 tokens and native MAS
 */
function _transferTokensIn(
  token: string,
  from: string,
  amount: u256,
): void {
  if (token == NATIVE_MAS_ADDRESS) {
    // For native MAS, we expect coins to be sent with the transaction
    // The caller should have sent the amount as coins
    const coinsReceived = Context.transferredCoins();
    const amountU64 = amount.toU64(); // Convert u256 to u64 for MAS
    assert(
      coinsReceived >= amountU64,
      'INSUFFICIENT_MAS_SENT',
    );
  } else {
    // For MRC6909 tokens, call transferFrom
    const transferArgs = new Args()
      .add(from)
      .add(Context.callee().toString())
      .add(u256.Zero) // tokenId - using 0 for standard tokens
      .add(amount);

    call(
      new Address(token),
      'transferFrom',
      transferArgs,
      0,
    );
  }
}

/**
 * Transfer tokens from this contract to user
 * Supports both MRC6909 tokens and native MAS
 */
function _transferTokensOut(
  token: string,
  to: string,
  amount: u256,
): void {
  if (token == NATIVE_MAS_ADDRESS) {
    // For native MAS, transfer coins
    const amountU64 = amount.toU64(); // Convert u256 to u64 for MAS
    Coins.transferCoins(new Address(to), amountU64);
  } else {
    // For MRC6909 tokens, call transfer
    const transferArgs = new Args()
      .add(to)
      .add(u256.Zero) // tokenId - using 0 for standard tokens
      .add(amount);

    call(
      new Address(token),
      'transfer',
      transferArgs,
      0,
    );
  }
}

/**
 * Execute a swap through a pool
 * This is a simplified version - in production you would route through the factory
 */
function _executeSwap(
  poolAddress: string,
  tokenIn: string,
  tokenOut: string,
  amountIn: u256,
  recipient: string,
): u256 {
  // Determine swap direction (zeroForOne)
  // This assumes tokens are sorted (token0 < token1)
  const zeroForOne = tokenIn < tokenOut;

  // For simplicity, we use approximate sqrt price limits
  // In production, calculate proper price limits based on pool state
  const sqrtPriceLimitX96 = zeroForOne
    ? u256.fromU64(4295128739) // Approximate MIN_SQRT_RATIO + 1
    : u256.Max; // Use max value as upper limit

  const swapArgs = new Args()
    .add(recipient)
    .add(zeroForOne)
    .add(amountIn) // Using as i128 approximation
    .add(sqrtPriceLimitX96);

  // Call pool swap function
  call(
    new Address(poolAddress),
    'swap',
    swapArgs,
    0,
  );

  // Return expected amountOut (in production, parse return value)
  // For now, return a placeholder
  return u256.Zero;
}
