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
  asyncCall,
  Slot,
} from '@massalabs/massa-as-sdk';
import { u256, i128, u128 } from 'as-bignum/assembly';
import { ReentrancyGuard } from '../utils/reentrancyGuard';
import { setOwner } from '../utils/ownership';
import { SafeMathU256 } from '../libraries/safeMath';
import { PersistentMap } from '../utils/collections/persistentMap';
import { IFactory } from '../interfaces/IFactory';
import { IPool } from '../interfaces/Ipool';
import { getSqrtPriceAtTick, getTickAtSqrtPrice } from '../libraries/swapMath';

// Storage keys
export const ORDER_ID_COUNTER = stringToBytes('ORDER_ID_COUNTER');
export const ORDER_PREFIX = stringToBytes('ORDER');
export const FACTORY_ADDRESS_KEY = stringToBytes('FACTORY_ADDRESS');
export const PENDING_ORDERS_KEY = stringToBytes('PENDING_ORDERS');
export const PENDING_ORDERS_COUNT_KEY = stringToBytes('PENDING_ORDERS_COUNT');
export const NATIVE_MAS_ADDRESS = 'NATIVE_MAS'; // Sentinel for native MAS token

export const BOT_COUNTER = "BOT_COUNTER";

// Async execution configuration
const CHECK_INTERVAL_PERIODS: u64 = 5; // Check every 5 periods (~80 seconds)
const EXECUTION_GAS_BUDGET: u64 = 2_000_000_000; // 2B gas for execution
const MAX_ORDERS_PER_CHECK: i32 = 10; // Max orders to check per async call
const DEFAULT_FEE: u64 = 3000; // Default 0.3% fee tier for pools

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
export function constructor(binaryArgs: StaticArray<u8>): void {
  assert(Context.isDeployingContract(), 'ALREADY_INITIALIZED');

  const args = new Args(binaryArgs);
  const factoryAddress = args.nextString().expect('factoryAddress missing');

  // Set the contract owner
  setOwner(new Args().add(Context.caller().toString()).serialize());

  // Store factory address
  Storage.set(FACTORY_ADDRESS_KEY, stringToBytes(factoryAddress));

  // Initialize order ID counter
  Storage.set(ORDER_ID_COUNTER, u256ToBytes(u256.Zero));

  // Initialize pending orders count
  Storage.set(PENDING_ORDERS_COUNT_KEY, u64ToBytes(0));

  // Initialize reentrancy guard
  ReentrancyGuard.__ReentrancyGuard_init();

  generateEvent(`OrderManager:Initialized:${factoryAddress}`);
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
  const duration = args.nextU64().expect('expiry missing');

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
    duration + Context.timestamp(),
    false, // not filled
    false, // not cancelled
  );

  // Store order
  const orderKey = _getOrderKey(orderId);
  Storage.set(orderKey, order.serialize());

  // Transfer tokenIn from user to this contract
  // User must have approved this contract to spend their tokens
  _transferTokensIn(tokenIn, caller, amountIn);

  // Add to pending orders for automated execution
  _addToPendingOrders(orderId);

  // Schedule automated checker if this is the first pending order
  const pendingCount = _getPendingOrdersCount();
  if (pendingCount == 1) {
    _scheduleNextCheck(CHECK_INTERVAL_PERIODS);
  }

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

  // Remove from pending orders
  _removeFromPendingOrders(orderId);

  // Return tokenIn to user
  _transferTokensOut(order.tokenIn, caller, order.amountIn);

  generateEvent(`LimitOrderCancelled:${orderId}:${caller}`);

  ReentrancyGuard.endNonReentrant();
}

/**
 * AUTOMATED BATCH CHECKER - Runs via asyncCall
 * Checks pending orders and executes those that meet price criteria
 */
export function checkAndExecutePendingOrders(_: StaticArray<u8>): void {
  const currentTime = Context.timestamp();
  const pendingCount = _getPendingOrdersCount();

  if (pendingCount == 0) {
    generateEvent('AutoChecker:NoPendingOrders');
    return; // No orders to check
  }

  let processed = 0;
  let executed = 0;
  let expired = 0;

  // Load pending order IDs
  for (let i: u64 = 0; i < pendingCount && processed < MAX_ORDERS_PER_CHECK; i++) {
    const orderIdKey = stringToBytes(`pending_order_${i.toString()}`);
    if (!Storage.has(orderIdKey)) {
      continue;
    }

    const orderId = bytesToU256(Storage.get(orderIdKey));
    const orderKey = _getOrderKey(orderId);

    if (!Storage.has(orderKey)) {
      // Order was deleted, clean up
      Storage.del(orderIdKey);
      continue;
    }

    const order = LimitOrder.deserialize(Storage.get(orderKey));

    // Skip if already processed
    if (order.filled || order.cancelled) {
      _removeFromPendingOrders(orderId);
      continue;
    }

    // Check expiry
    if (order.expiry > 0 && currentTime > order.expiry) {
      order.cancelled = true;
      Storage.set(orderKey, order.serialize());
      _removeFromPendingOrders(orderId);
      generateEvent(`AutoExpired:${orderId}`);
      expired++;
      processed++;
      continue;
    }

    // Try to execute
    const executedSuccess = _tryExecuteOrder(order);

    if (executedSuccess) {
      _removeFromPendingOrders(orderId);
      executed++;
    }

    processed++;
  }

  generateEvent(`AutoChecker:Processed:${processed}:Executed:${executed}:Expired:${expired}`);

  // Schedule next check if there are still pending orders
  const remainingCount = _getPendingOrdersCount();
  if (remainingCount > 0) {
    _scheduleNextCheck(CHECK_INTERVAL_PERIODS);
  }
}

/**
 * Execute a limit order (manual execution by keeper)
 * @param binaryArgs - Contains:
 *  - orderId: u256 - ID of the order to execute
 */
export function executeLimitOrder(binaryArgs: StaticArray<u8>): void {
  ReentrancyGuard.nonReentrant();

  const args = new Args(binaryArgs);
  const orderId = args.nextU256().expect('orderId missing');

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

  // Execute the order
  _tryExecuteOrder(order);

  // Remove from pending orders
  _removeFromPendingOrders(orderId);

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

/**
 * Get number of pending orders
 */
export function getPendingOrdersCount(_: StaticArray<u8>): StaticArray<u8> {
  return Storage.get(PENDING_ORDERS_COUNT_KEY);
}

// Storage.set(BOT_ENABLED_KEY, 'true');
// Storage.set(BOT_COUNTER_KEY, '0');
// Storage.set(BOT_MAX_ITERATIONS, maxIterations.toString());



// const counter = u64(parseInt(Storage.get(BOT_COUNTER_KEY)));
// const maxIterations = u64(parseInt(Storage.get(BOT_MAX_ITERATIONS)));

/**
 * Get current autonomous execution count (internal)
 * Tracks number of times checkAndExecutePendingOrders has been called
 */
function _getBotExecutionCount(): u64 {
  if (Storage.has(stringToBytes(BOT_COUNTER))) {
    return u64(parseInt(Storage.get(BOT_COUNTER)));
  }
  return 0;
}

/**
 * Increment autonomous execution counter by 1
 * Called after each successful checkAndExecutePendingOrders execution
 */
function _incrementBotExecutionCount(): void {
  const currentCount = _getBotExecutionCount();
  const newCount : u64 = currentCount + 1;
  Storage.set(stringToBytes(BOT_COUNTER), stringToBytes((newCount).toString()));
  generateEvent(`BotExecution:Count:${newCount}`);
}

/**
 * Set bot execution count to a specific value
 * Used for testing or manual adjustment
 *
 * @param countValue - The count to set
 */
function _setBotExecutionCount(countValue: u64): void {
  Storage.set(stringToBytes(BOT_COUNTER), stringToBytes(countValue.toString()));
  generateEvent(`BotExecution:CountSet:${countValue}`);
}

/**
 * Reset bot execution counter to 0
 * Used for testing or when restarting the counter
 */
function _resetBotExecutionCount(): void {
  Storage.set(stringToBytes(BOT_COUNTER), stringToBytes('0'));
  generateEvent(`BotExecution:CountReset`);
}

/**
 * Get factory address
 */
export function getFactoryAddress(_: StaticArray<u8>): StaticArray<u8> {
  return new Args()
    .add(Storage.get(FACTORY_ADDRESS_KEY))
    .serialize();
}

/**
 * Get list of pending order IDs
 * Returns array of order IDs that are pending execution
 */
export function getPendingOrders(_: StaticArray<u8>): StaticArray<u8> {
  const count = _getPendingOrdersCount();
  const args = new Args();

  args.add(count); // Add count first

  for (let i: u64 = 0; i < count; i++) {
    const key = stringToBytes(`pending_order_${i.toString()}`);
    if (Storage.has(key)) {
      const orderId = bytesToU256(Storage.get(key));
      args.add(orderId);
    }
  }

  return args.serialize();
}

/**
 * Get orders by owner address
 * @param binaryArgs - Contains:
 *  - owner: string - Owner address
 *  - limit: u64 - Max number of orders to return (optional, default 100)
 */
export function getUserOrders(binaryArgs: StaticArray<u8>): StaticArray<u8> {
  const args = new Args(binaryArgs);
  const owner = args.nextString().expect('owner missing');
  const limit: u64 = args.nextU64().unwrap();

  const totalOrders = bytesToU64(Storage.get(ORDER_ID_COUNTER));
  const result = new Args();

  let matchCount: u64 = 0;
  result.add(matchCount); // Placeholder for count, will update later

  for (let i: u64 = 1; i <= totalOrders && matchCount < limit; i++) {
    const orderId = u256.fromU64(i);
    const orderKey = _getOrderKey(orderId);

    if (Storage.has(orderKey)) {
      const order = LimitOrder.deserialize(Storage.get(orderKey));
      if (order.owner == owner) {
        result.add(order.serialize());
        matchCount++;
      }
    }
  }

  // Update count at the beginning
  const resultBytes = result.serialize();
  const finalArgs = new Args().add(matchCount);

  // Re-add all orders after count
  for (let i: u64 = 1; i <= totalOrders && i <= matchCount; i++) {
    const orderId = u256.fromU64(i);
    const orderKey = _getOrderKey(orderId);

    if (Storage.has(orderKey)) {
      const order = LimitOrder.deserialize(Storage.get(orderKey));
      if (order.owner == owner) {
        finalArgs.add(order.serialize());
      }
    }
  }

  return finalArgs.serialize();
}

/**
 * Get order status
 * @param binaryArgs - Contains:
 *  - orderId: u256 - Order ID
 * @returns Status: 0 = Active, 1 = Filled, 2 = Cancelled, 3 = Expired
 */
export function getOrderStatus(binaryArgs: StaticArray<u8>): StaticArray<u8> {
  const args = new Args(binaryArgs);
  const orderId = args.nextU256().expect('orderId missing');

  const orderKey = _getOrderKey(orderId);
  assert(Storage.has(orderKey), 'ORDER_NOT_FOUND');

  const order = LimitOrder.deserialize(Storage.get(orderKey));

  let status: u8 = 0; // Active

  if (order.cancelled) {
    status = 2; // Cancelled
  } else if (order.filled) {
    status = 1; // Filled
  } else if (order.expiry > 0 && Context.currentPeriod() > order.expiry) {
    status = 3; // Expired
  }

  return new Args().add(status).serialize();
}

/**
 * Get orders by token pair
 * @param binaryArgs - Contains:
 *  - tokenIn: string
 *  - tokenOut: string
 *  - limit: u64 - Max orders to return (optional, default 50)
 */
export function getOrdersByTokenPair(binaryArgs: StaticArray<u8>): StaticArray<u8> {
  const args = new Args(binaryArgs);
  const tokenIn = args.nextString().expect('tokenIn missing');
  const tokenOut = args.nextString().expect('tokenOut missing');
  const limit = args.nextU64().unwrap();

  const totalOrders = bytesToU64(Storage.get(ORDER_ID_COUNTER));
  const result = new Args();

  let matchCount: u64 = 0;

  for (let i: u64 = 1; i <= totalOrders && matchCount < limit; i++) {
    const orderId = u256.fromU64(i);
    const orderKey = _getOrderKey(orderId);

    if (Storage.has(orderKey)) {
      const order = LimitOrder.deserialize(Storage.get(orderKey));
      if (order.tokenIn == tokenIn && order.tokenOut == tokenOut && !order.filled && !order.cancelled) {
        if (matchCount == 0) {
          result.add(matchCount + 1); // Add placeholder count
        }
        result.add(order.serialize());
        matchCount++;
      }
    }
  }

  if (matchCount == 0) {
    return new Args().add(u64(0)).serialize();
  }

  return result.serialize();
}

/**
 * Get active orders count (not filled, not cancelled)
 */
export function getActiveOrdersCount(_: StaticArray<u8>): StaticArray<u8> {
  const totalOrders = bytesToU64(Storage.get(ORDER_ID_COUNTER));
  let activeCount: u64 = 0;

  for (let i: u64 = 1; i <= totalOrders; i++) {
    const orderId = u256.fromU64(i);
    const orderKey = _getOrderKey(orderId);

    if (Storage.has(orderKey)) {
      const order = LimitOrder.deserialize(Storage.get(orderKey));
      if (!order.filled && !order.cancelled) {
        activeCount++;
      }
    }
  }

  return new Args().add(activeCount).serialize();
}


/**
 * Get total autonomous execution count
 * Returns the number of times checkAndExecutePendingOrders has been called
 */
export function getBotExecutionCount(_: StaticArray<u8>): StaticArray<u8> {
  const count = _getBotExecutionCount();
  return new Args().add(count).serialize();
}

/**
 * Get filled orders count
 */
export function getFilledOrdersCount(_: StaticArray<u8>): StaticArray<u8> {
  const totalOrders = bytesToU64(Storage.get(ORDER_ID_COUNTER));
  let filledCount: u64 = 0;

  for (let i: u64 = 1; i <= totalOrders; i++) {
    const orderId = u256.fromU64(i);
    const orderKey = _getOrderKey(orderId);

    if (Storage.has(orderKey)) {
      const order = LimitOrder.deserialize(Storage.get(orderKey));
      if (order.filled) {
        filledCount++;
      }
    }
  }

  return new Args().add(filledCount).serialize();
}

/* Internal functions */

function _getOrderKey(orderId: u256): StaticArray<u8> {
  return ORDER_PREFIX.concat(u256ToBytes(orderId));
}

/**
 * Add order to pending orders list
 */
function _addToPendingOrders(orderId: u256): void {
  const currentCount = _getPendingOrdersCount();
  const key = stringToBytes(`pending_order_${currentCount.toString()}`);
  Storage.set(key, u256ToBytes(orderId));

  const newCount = currentCount + 1;
  Storage.set(PENDING_ORDERS_COUNT_KEY, u64ToBytes(newCount));
}

/**
 * Remove order from pending orders list
 */
function _removeFromPendingOrders(orderId: u256): void {
  const count = _getPendingOrdersCount();

  // Find and remove the order
  for (let i: u64 = 0; i < count; i++) {
    const key = stringToBytes(`pending_order_${i.toString()}`);
    if (!Storage.has(key)) continue;

    const storedId = bytesToU256(Storage.get(key));
    if (storedId == orderId) {
      // Swap with last element and delete
      const lastKey = stringToBytes(`pending_order_${(count - 1).toString()}`);
      if (i < count - 1 && Storage.has(lastKey)) {
        const lastId = Storage.get(lastKey);
        Storage.set(key, lastId);
      }
      Storage.del(lastKey);

      const newCount = count - 1;
      Storage.set(PENDING_ORDERS_COUNT_KEY, u64ToBytes(newCount));
      break;
    }
  }
}

/**
 * Get pending orders count
 */
function _getPendingOrdersCount(): u64 {
  const data = Storage.get(PENDING_ORDERS_COUNT_KEY);
  if (data.length == 0) return 0;
  return bytesToU64(data);
}

/**
 * Schedule next async check using asyncCall with Slot-based scheduling
 */
function _scheduleNextCheck(periodDelay: u64): void {
  const currentPeriod = Context.currentPeriod();
  const currentThread = Context.currentThread();

  _incrementBotExecutionCount();

  // Calculate next slot
  let nextPeriod = currentPeriod;
  let nextThread = currentThread + 1;

  // Wrap thread if needed
  if (nextThread >= 32) {
    nextPeriod = currentPeriod + periodDelay;
    nextThread = 0;
  }

  // Schedule async call for next slot
  asyncCall(
    Context.callee(), // This contract
    'checkAndExecutePendingOrders', // Function to call
    new Slot(nextPeriod, nextThread), // Validity start slot
    new Slot(nextPeriod + 10, nextThread), // Validity end slot (10 period window)
    EXECUTION_GAS_BUDGET, // Max gas budget
    0, // Coins (no coins needed)
    new Args().serialize(), // Function params
  );

  generateEvent(`AutoScheduled:Period:${nextPeriod}:Thread:${nextThread}`);
}

/**
 * Try to execute an order - returns true if executed
 * Validates limitPrice and minAmountOut before execution
 */
function _tryExecuteOrder(order: LimitOrder): bool {
  // Get factory address
  const factoryAddressBytes = Storage.get(FACTORY_ADDRESS_KEY);
  const factoryAddress = bytesToString(factoryAddressBytes);

  // Get pool address for token pair with proper token ordering
  let token0 = order.tokenIn;
  let token1 = order.tokenOut;

  // Ensure canonical token ordering (token0 < token1)
  if (token0 > token1) {
    token0 = order.tokenOut;
    token1 = order.tokenIn;
  }

  const poolAddress = _getPoolAddress(
    factoryAddress,
    token0,
    token1,
    DEFAULT_FEE,
  );

  

  if (poolAddress == '') {
    generateEvent(`AutoExecute:NoPool:${order.orderId}`);
    return false;
  }

  // Wrap pool in interface to call getSqrtPriceX96
  const pool = new IPool(new Address(poolAddress));

  // Get current pool state (price and sqrtPriceX96)
  const stateData = pool.getState();
  if (stateData.length == 0) {
    generateEvent(`AutoExecute:FailedToGetState:${order.orderId}`);
    return false;
  }

  const stateArgs = new Args(stateData);
  stateArgs.nextU256(); // Skip sqrtPriceX96 (not needed for price validation)
  const currentTick = stateArgs.nextI32().expect('tick missing');

  // Determine swap direction based on canonical token ordering
  const zeroForOne = order.tokenIn == token0;

  // Convert limit price u256 to tick
  // order.limitPrice is a u256 that should represent the sqrt price in Q64.96 format
  const limitTick = getTickAtSqrtPrice(order.limitPrice);
  
  // Validate price condition based on order type
  // BUY: Current price must be at or below limit price (tick <= limitTick)
  // SELL: Current price must be at or above limit price (tick >= limitTick)
  if (order.orderType == 0) {
    // BUY order - check if currentPrice <= limitPrice (currentTick <= limitTick)
    if (currentTick > limitTick) {
      generateEvent(`AutoExecute:PriceTooHigh:${order.orderId}:${currentTick}:${limitTick}`);
      return false;
    }
  } else {
    // SELL order - check if currentPrice >= limitPrice (currentTick >= limitTick)
    if (currentTick < limitTick) {
      generateEvent(`AutoExecute:PriceTooLow:${order.orderId}:${currentTick}:${limitTick}`);
      return false;
    }
  }

  // Set sqrtPriceLimitX96 for slippage protection
  // Use minAmountOut to calculate appropriate price limit
  // For safety, use extreme boundaries if price check passed
  const sqrtPriceLimitX96 = zeroForOne
    ? u256.fromU64(4295128739)    // MIN_SQRT_RATIO approximation
    : u256.Max;                   // MAX_SQRT_RATIO
  // Convert amountIn to i128 for swap
  const amountInI128 = i128.fromU256(order.amountIn);

  const swapArgs = new Args()
    .add(order.owner)           // Recipient of output tokens
    .add(zeroForOne)            // Swap direction
    .add(amountInI128)          // Amount input
    .add(sqrtPriceLimitX96);    // Price limit

 
  // Execute the swap via pool interface
  const poolContract  = new IPool(new Address(poolAddress));
  poolContract.swap(order.owner, zeroForOne, amountInI128, sqrtPriceLimitX96);

  generateEvent(`AutoScheduled:AfterSwap`);

  // If we reach here, swap succeeded - mark order as filled
  order.filled = true;
  const orderKey = _getOrderKey(order.orderId);
  Storage.set(orderKey, order.serialize());

  generateEvent(`AutoExecuted:${order.orderId}:${order.owner}:${order.amountIn}`);

  return true;
}

/**
 * Get pool address from factory
 */
function _getPoolAddress(
  factoryAddress: string,
  token0: string,
  token1: string,
  fee: u64,
): string {
  // Ensure tokens are ordered
  let tokenA = token0;
  let tokenB = token1;
  if (token0 > token1) {
    tokenA = token1;
    tokenB = token0;
  }

  const factory  =new IFactory(new Address(factoryAddress));
  return factory.getPool(tokenA, tokenB, fee).toString();
  
}

/**
 * Transfer tokens from user to this contract
 * Supports both MRC6909 tokens and native MAS
 */
function _transferTokensIn(token: string, from: string, amount: u256): void {
  if (token == NATIVE_MAS_ADDRESS) {
    // For native MAS, we expect coins to be sent with the transaction
    const coinsReceived = Context.transferredCoins();
    const amountU64 = amount.toU64();
    assert(coinsReceived >= amountU64, 'INSUFFICIENT_MAS_SENT');
  } else {
    // For MRC6909 tokens, call transferFrom
    const transferArgs = new Args()
      .add(from)
      .add(Context.callee().toString())
      .add(u256.Zero) // tokenId - using 0 for standard tokens
      .add(amount);

    call(new Address(token), 'transferFrom', transferArgs, 0);
  }
}

/**
 * Transfer tokens from this contract to user
 * Supports both MRC6909 tokens and native MAS
 */
function _transferTokensOut(token: string, to: string, amount: u256): void {
  if (token == NATIVE_MAS_ADDRESS) {
    // For native MAS, transfer coins
    const amountU64 = amount.toU64();
    Coins.transferCoins(new Address(to), amountU64);
  } else {
    // For MRC6909 tokens, call transfer
    const transferArgs = new Args()
      .add(to)
      .add(u256.Zero) // tokenId - using 0 for standard tokens
      .add(amount);

    call(new Address(token), 'transfer', transferArgs, 0);
  }
}
