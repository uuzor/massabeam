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
import { u256, i128 } from 'as-bignum/assembly';
import { ReentrancyGuard } from '../utils/reentrancyGuard';
import { setOwner } from '../utils/ownership';
import { SafeMathU256 } from '../libraries/safeMath';
import { IFactory } from '../interfaces/IFactory';
import { IPool } from '../interfaces/Ipool';
import { getSqrtPriceAtTick, getTickAtSqrtPrice } from '../libraries/swapMath';

// Storage keys
export const ORDER_ID_COUNTER = stringToBytes('RECURRING_ORDER_ID_COUNTER');
export const ORDER_PREFIX = stringToBytes('RECURRING_ORDER');
export const FACTORY_ADDRESS_KEY = stringToBytes('FACTORY_ADDRESS');
export const ACTIVE_ORDERS_KEY = stringToBytes('ACTIVE_ORDERS');
export const ACTIVE_ORDERS_COUNT_KEY = stringToBytes('ACTIVE_ORDERS_COUNT');
export const NATIVE_MAS_ADDRESS = 'NATIVE_MAS';
export const BOT_COUNTER = 'RECURRING_BOT_COUNTER'; // Bot execution counter with debug events
export const BOT_ENABLED_KEY = 'RECURRING_BOT_ENABLED';

// Execution configuration
const DEFAULT_FEE: u64 = 3000; // Default 0.3% fee tier for pools
const EXECUTION_GAS_BUDGET: u64 = 2_000_000_000; // 2B gas for execution
const CHECK_INTERVAL_PERIODS: u64 = 5; // Check every 5 periods (~80 seconds)
const MAX_ORDERS_PER_CHECK: i32 = 10; // Max orders to check per async call

/**
 * Recurring Order structure
 * Executes periodic buys/sells at fixed intervals (DCA strategy)
 */
export class RecurringOrder {
  constructor(
    public orderId: u256,
    public owner: string,
    public tokenIn: string,
    public tokenOut: string,
    public amountPerExecution: u256, // Amount to swap each execution
    public intervalPeriods: u64, // Periods between executions
    public totalExecutions: u64, // Total number of executions
    public executedCount: u64, // Number of executions completed
    public lastExecutionPeriod: u64, // Period of last execution
    public active: bool, // Is order active
    public cancelled: bool, // Was order cancelled
  ) {}

  serialize(): StaticArray<u8> {
    return new Args()
      .add(this.orderId)
      .add(this.owner)
      .add(this.tokenIn)
      .add(this.tokenOut)
      .add(this.amountPerExecution)
      .add(this.intervalPeriods)
      .add(this.totalExecutions)
      .add(this.executedCount)
      .add(this.lastExecutionPeriod)
      .add(this.active)
      .add(this.cancelled)
      .serialize();
  }

  static deserialize(data: StaticArray<u8>): RecurringOrder {
    const args = new Args(data);
    return new RecurringOrder(
      args.nextU256().expect('orderId missing'),
      args.nextString().expect('owner missing'),
      args.nextString().expect('tokenIn missing'),
      args.nextString().expect('tokenOut missing'),
      args.nextU256().expect('amountPerExecution missing'),
      args.nextU64().expect('intervalPeriods missing'),
      args.nextU64().expect('totalExecutions missing'),
      args.nextU64().expect('executedCount missing'),
      args.nextU64().expect('lastExecutionPeriod missing'),
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

  // Initialize order ID counter
  Storage.set(ORDER_ID_COUNTER, u256ToBytes(u256.Zero));

  // Initialize active orders count
  Storage.set(ACTIVE_ORDERS_COUNT_KEY, u64ToBytes(0));

  // Initialize reentrancy guard
  ReentrancyGuard.__ReentrancyGuard_init();

  generateEvent(`RecurringOrderManager:Initialized:${factoryAddress}`);
}

/**
 * Create a new recurring order
 */
export function createRecurringOrder(binaryArgs: StaticArray<u8>): StaticArray<u8> {
  ReentrancyGuard.nonReentrant();

  const args = new Args(binaryArgs);
  const tokenIn = args.nextString().expect('tokenIn missing');
  const tokenOut = args.nextString().expect('tokenOut missing');
  const amountPerExecution = args.nextU256().expect('amountPerExecution missing');
  const intervalPeriods = args.nextU64().expect('intervalPeriods missing');
  const totalExecutions = args.nextU64().expect('totalExecutions missing');

  // Validate inputs
  assert(tokenIn != tokenOut, 'IDENTICAL_TOKENS');
  assert(amountPerExecution > u256.Zero, 'INVALID_AMOUNT');
  assert(intervalPeriods > 0, 'INVALID_INTERVAL');
  assert(totalExecutions > 0, 'INVALID_TOTAL_EXECUTIONS');

  // Generate order ID
  const currentId = bytesToU256(Storage.get(ORDER_ID_COUNTER));
  const orderId = SafeMathU256.add(currentId, u256.One);
  Storage.set(ORDER_ID_COUNTER, u256ToBytes(orderId));

  // Calculate total amount needed
  const totalAmount = SafeMathU256.mul(amountPerExecution, u256.fromU64(totalExecutions));

  // Transfer tokens to contract (escrow)
  transferTokensIn(tokenIn, Context.caller().toString(), totalAmount);

  // Create order
  const order = new RecurringOrder(
    orderId,
    Context.caller().toString(),
    tokenIn,
    tokenOut,
    amountPerExecution,
    intervalPeriods,
    totalExecutions,
    0, // executedCount
    Context.currentPeriod(), // lastExecutionPeriod
    true, // active
    false, // cancelled
  );

  // Store order
  Storage.set(_getOrderKey(orderId), order.serialize());

  // Add to active orders
  _addToActiveOrders(orderId);

  // Schedule first execution
  const activeCount = _getActiveOrdersCount();
  if (activeCount == 1) {
    _scheduleNextCheck(intervalPeriods);
  }

  generateEvent(`RecurringOrder:Created:${orderId}:${Context.caller()}:${intervalPeriods}:${totalExecutions}`);

  return u256ToBytes(orderId);
}

/**
 * Cancel a recurring order
 */
export function cancelRecurringOrder(binaryArgs: StaticArray<u8>): void {
  ReentrancyGuard.nonReentrant();

  const args = new Args(binaryArgs);
  const orderId = args.nextU256().expect('orderId missing');

  const orderKey = _getOrderKey(orderId);
  assert(Storage.has(orderKey), 'ORDER_NOT_FOUND');

  const order = RecurringOrder.deserialize(Storage.get(orderKey));

  // Only owner can cancel
  assert(order.owner == Context.caller().toString(), 'NOT_ORDER_OWNER');
  assert(order.active, 'ORDER_NOT_ACTIVE');

  // Mark as cancelled
  order.active = false;
  order.cancelled = true;
  Storage.set(orderKey, order.serialize());

  // Remove from active orders
  _removeFromActiveOrders(orderId);

  // Refund remaining tokens
  const executionsRemaining = order.totalExecutions - order.executedCount;
  if (executionsRemaining > 0) {
    const refundAmount = SafeMathU256.mul(
      order.amountPerExecution,
      u256.fromU64(executionsRemaining)
    );
    transferTokensOut(order.tokenIn, order.owner, refundAmount);
  }

  generateEvent(`RecurringOrder:Cancelled:${orderId}:${order.owner}`);
}

/**
 * Check and execute pending recurring orders (called by automation)
 */
export function checkAndExecuteRecurringOrders(_: StaticArray<u8>): void {
  const currentPeriod = Context.currentPeriod();
  const activeCount = _getActiveOrdersCount();

  if (activeCount == 0) {
    generateEvent('RecurringAutoChecker:NoActiveOrders');
    return;
  }

  let processed = 0;
  let executed = 0;
  let completed = 0;

  // Check active orders
  for (let i: u64 = 0; i < activeCount; i++) {
    const orderIdKey = stringToBytes(`active_order_${i.toString()}`);
    if (!Storage.has(orderIdKey)) continue;

    const orderId = bytesToU256(Storage.get(orderIdKey));
    const orderKey = _getOrderKey(orderId);

    if (!Storage.has(orderKey)) {
      // Order was deleted, clean up
      Storage.del(orderIdKey);
      continue;
    }

    const order = RecurringOrder.deserialize(Storage.get(orderKey));

    // Skip if not active
    if (!order.active || order.cancelled) {
      _removeFromActiveOrders(orderId);
      continue;
    }

    // Check if it's time to execute
    const periodsSinceLastExecution = currentPeriod - order.lastExecutionPeriod;
    if (periodsSinceLastExecution >= order.intervalPeriods) {
      // Try to execute
      const executeSuccess = _tryExecuteOrder(order);

      if (executeSuccess) {
        // Update execution count and last execution period
        order.executedCount = order.executedCount + 1;
        order.lastExecutionPeriod = currentPeriod;

        // Check if all executions completed
        if (order.executedCount >= order.totalExecutions) {
          order.active = false;
          _removeFromActiveOrders(orderId);
          completed++;
          generateEvent(`RecurringOrder:Completed:${orderId}`);
        }

        Storage.set(orderKey, order.serialize());
        executed++;
      }
    }

    processed++;
  }

  generateEvent(`RecurringAutoChecker:Processed:${processed}:Executed:${executed}:Completed:${completed}`);

  // Schedule next check if there are still active orders
  const remainingCount = _getActiveOrdersCount();
  if (remainingCount > 0) {
    // Find minimum interval among active orders for next check
    let minInterval: u64 = 10; // Default to 10 periods
    for (let i: u64 = 0; i < remainingCount; i++) {
      const orderIdKey = stringToBytes(`active_order_${i.toString()}`);
      if (!Storage.has(orderIdKey)) continue;

      const orderId = bytesToU256(Storage.get(orderIdKey));
      const order = RecurringOrder.deserialize(Storage.get(_getOrderKey(orderId)));

      if (order.active && order.intervalPeriods < minInterval) {
        minInterval = order.intervalPeriods;
      }
    }

    _scheduleNextCheck(minInterval);
  }
}

/**
 * Get order details
 */
export function getRecurringOrder(binaryArgs: StaticArray<u8>): StaticArray<u8> {
  const args = new Args(binaryArgs);
  const orderId = args.nextU256().expect('orderId missing');

  const orderKey = _getOrderKey(orderId);
  assert(Storage.has(orderKey), 'ORDER_NOT_FOUND');

  return Storage.get(orderKey);
}

/**
 * Get active orders count
 */
export function getActiveOrdersCount(_: StaticArray<u8>): StaticArray<u8> {
  return Storage.get(ACTIVE_ORDERS_COUNT_KEY);
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
 * Get total order count
 */
export function getOrderCount(_: StaticArray<u8>): StaticArray<u8> {
  return Storage.get(ORDER_ID_COUNTER);
}

/**
 * Get list of active order IDs
 */
export function getActiveOrders(_: StaticArray<u8>): StaticArray<u8> {
  const count = _getActiveOrdersCount();
  const args = new Args();

  args.add(count); // Add count first

  for (let i: u64 = 0; i < count; i++) {
    const key = stringToBytes(`active_order_${i.toString()}`);
    if (Storage.has(key)) {
      const orderId = bytesToU256(Storage.get(key));
      args.add(orderId);
    }
  }

  return args.serialize();
}

/**
 * Get orders by owner
 * @param binaryArgs - Contains:
 *  - owner: string - Owner address
 *  - limit: u64 - Max orders to return (optional, default 100)
 */
export function getUserOrders(binaryArgs: StaticArray<u8>): StaticArray<u8> {
  const args = new Args(binaryArgs);
  const owner = args.nextString().expect('owner missing');
  const limit: u64 = args.nextU64().unwrap();

  const totalOrders = bytesToU64(Storage.get(ORDER_ID_COUNTER));
  const result = new Args();

  let matchCount: u64 = 0;

  for (let i: u64 = 1; i <= totalOrders && matchCount < limit; i++) {
    const orderId = u256.fromU64(i);
    const orderKey = _getOrderKey(orderId);

    if (Storage.has(orderKey)) {
      const orderData = Storage.get(orderKey);
      const order = RecurringOrder.deserialize(orderData);
      if (order.owner == owner) {
        if (matchCount == 0) {
          result.add(matchCount + 1);
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
 * Get order progress/status
 * @param binaryArgs - Contains:
 *  - orderId: u256 - Order ID
 * @returns (executedCount, totalExecutions, isActive, isComplete)
 */
export function getOrderProgress(binaryArgs: StaticArray<u8>): StaticArray<u8> {
  const args = new Args(binaryArgs);
  const orderId = args.nextU256().expect('orderId missing');

  const orderKey = _getOrderKey(orderId);
  assert(Storage.has(orderKey), 'ORDER_NOT_FOUND');

  const order = RecurringOrder.deserialize(Storage.get(orderKey));

  return new Args()
    .add(order.executedCount)
    .add(order.totalExecutions)
    .add(order.active)
    .add(order.executedCount >= order.totalExecutions)
    .serialize();
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
      const order = RecurringOrder.deserialize(Storage.get(orderKey));
      if (order.tokenIn == tokenIn && order.tokenOut == tokenOut && order.active) {
        if (matchCount == 0) {
          result.add(matchCount + 1);
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
 * Get completed orders count
 */
export function getCompletedOrdersCount(_: StaticArray<u8>): StaticArray<u8> {
  const totalOrders = bytesToU64(Storage.get(ORDER_ID_COUNTER));
  let completedCount: u64 = 0;

  for (let i: u64 = 1; i <= totalOrders; i++) {
    const orderId = u256.fromU64(i);
    const orderKey = _getOrderKey(orderId);

    if (Storage.has(orderKey)) {
      const order = RecurringOrder.deserialize(Storage.get(orderKey));
      if (order.executedCount >= order.totalExecutions) {
        completedCount++;
      }
    }
  }

  return new Args().add(completedCount).serialize();
}

/**
 * Internal: Get order storage key
 */
function _getOrderKey(orderId: u256): StaticArray<u8> {
  return stringToBytes(`recurring_order:${orderId.toString()}`);
}

/**
 * Get current autonomous execution count (internal)
 * Tracks number of times checkAndExecuteRecurringOrders has been called
 */
function _getBotExecutionCount(): u64 {
  if (Storage.has(stringToBytes(BOT_COUNTER))) {
    const stored = Storage.get(stringToBytes(BOT_COUNTER));
    return bytesToU64(stored);
  }
  return 0;
}



/**
 * Increment autonomous execution counter by 1
 * Called after each successful checkAndExecuteRecurringOrders execution
 */
function _incrementBotExecutionCount(): void {
  const currentCount = _getBotExecutionCount();
  const newCount = currentCount + 1;
  Storage.set(stringToBytes(BOT_COUNTER), u64ToBytes(newCount));
  generateEvent(`RecurringBotExecution:Count:${newCount}`);
}

/**
 * Set bot execution count to a specific value
 * Used for testing or manual adjustment
 */
function _setBotExecutionCount(countValue: u64): void {
  Storage.set(stringToBytes(BOT_COUNTER), u64ToBytes(countValue));
  generateEvent(`RecurringBotExecution:CountSet:${countValue}`);
}

/**
 * Reset bot execution counter to 0
 * Used for testing or when restarting the counter
 */
function _resetBotExecutionCount(): void {
  Storage.set(stringToBytes(BOT_COUNTER), u64ToBytes(0));
  generateEvent(`RecurringBotExecution:CountReset`);
}

/**
 * Internal: Schedule next check using asyncCall with Slot-based scheduling
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
    'checkAndExecuteRecurringOrders', // Function to call
    new Slot(nextPeriod, nextThread), // Validity start slot
    new Slot(nextPeriod + 10, nextThread), // Validity end slot (10 period window)
    EXECUTION_GAS_BUDGET, // Max gas budget
    0, // Coins (no coins needed)
    new Args().serialize(), // Function params
  );

  generateEvent(`RecurringAutoScheduled:Period:${nextPeriod}:Thread:${nextThread}:Current:${Context.currentPeriod()}:Count:${_getBotExecutionCount()}`);
}

/**
 * Internal: Try to execute an order - returns true if executed
 */
function _tryExecuteOrder(order: RecurringOrder): bool {
  // Get factory address
  const factoryAddressBytes = Storage.get(FACTORY_ADDRESS_KEY);
  const factoryAddress = bytesToString(factoryAddressBytes);

  // Get pool address for token pair
  const poolAddress = _getPoolAddress(
    factoryAddress,
    order.tokenIn,
    order.tokenOut,
    DEFAULT_FEE,
  );

  if (poolAddress == '') {
    generateEvent(`RecurringAutoExecute:NoPool:${order.orderId}`);
    return false;
  }

  // Determine swap direction
  const zeroForOne = order.tokenIn < order.tokenOut;

  // Set sqrt price limit (no limit - take any price)
  const sqrtPriceLimitX96 = zeroForOne
    ? u256.fromU64(4295128739) // Approximate MIN_SQRT_RATIO
    : u256.Max; // MAX_SQRT_RATIO

  // Convert amountIn to i128 for swap
  const amountInI128 = i128.from(order.amountPerExecution);

  const swapArgs = new Args()
    .add(order.owner) // Recipient
    .add(zeroForOne)
    .add(amountInI128)
    .add(sqrtPriceLimitX96);

  // Execute swap
  call(new Address(poolAddress), 'swap', swapArgs, 0);

  generateEvent(`RecurringAutoExecuted:${order.orderId}:${order.owner}:${order.executedCount + 1}`);

  return true;
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
  // Call factory to get pool address
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
 * Internal: Add order to active orders list
 */
function _addToActiveOrders(orderId: u256): void {
  const currentCount = _getActiveOrdersCount();
  const key = stringToBytes(`active_order_${currentCount.toString()}`);
  Storage.set(key, u256ToBytes(orderId));

  const newCount = currentCount + 1;
  Storage.set(ACTIVE_ORDERS_COUNT_KEY, u64ToBytes(newCount));
}

/**
 * Internal: Remove order from active orders list
 */
function _removeFromActiveOrders(orderId: u256): void {
  const count = _getActiveOrdersCount();

  // Find and remove the order
  for (let i: u64 = 0; i < count; i++) {
    const key = stringToBytes(`active_order_${i.toString()}`);
    if (!Storage.has(key)) continue;

    const storedId = bytesToU256(Storage.get(key));
    if (storedId == orderId) {
      // Swap with last element and delete
      const lastKey = stringToBytes(`active_order_${(count - 1).toString()}`);
      if (i < count - 1 && Storage.has(lastKey)) {
        const lastId = Storage.get(lastKey);
        Storage.set(key, lastId);
      }
      Storage.del(lastKey);

      const newCount = count - 1;
      Storage.set(ACTIVE_ORDERS_COUNT_KEY, u64ToBytes(newCount));
      break;
    }
  }
}

/**
 * Get bot execution count (public read function)
 * Returns the number of times the autonomous bot has executed
 */
export function getBotExecutionCount(_: StaticArray<u8>): StaticArray<u8> {
  const count = _getBotExecutionCount();
  return new Args().add(count).serialize();
}

/**
 * Internal: Get active orders count
 */
function _getActiveOrdersCount(): u64 {
  const data = Storage.get(ACTIVE_ORDERS_COUNT_KEY);
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
