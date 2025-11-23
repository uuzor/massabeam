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
} from '@massalabs/massa-as-sdk';
import { u256 } from 'as-bignum/assembly';
import { ReentrancyGuard } from '../utils/reentrancyGuard';
import { setOwner } from '../utils/ownership';
import { SafeMathU256 } from '../libraries/safeMath';
import { PersistentMap } from '../utils/collections/persistentMap';

// Storage keys
export const ORDER_ID_COUNTER = stringToBytes('ORDER_ID_COUNTER');
export const ORDER_PREFIX = stringToBytes('ORDER');

/**
 * Limit Order structure
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
  const expiry = args.nextU64().expect('expiry missing');

  const caller = Context.caller().toString();

  // Validate inputs
  assert(tokenIn != tokenOut, 'TOKENS_MUST_BE_DIFFERENT');
  assert(amountIn > u256.Zero, 'INVALID_AMOUNT_IN');
  assert(minAmountOut > u256.Zero, 'INVALID_MIN_AMOUNT_OUT');
  assert(limitPrice > u256.Zero, 'INVALID_LIMIT_PRICE');

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
    expiry,
    false, // not filled
    false, // not cancelled
  );

  // Store order
  const orderKey = _getOrderKey(orderId);
  Storage.set(orderKey, order.serialize());

  // TODO: Transfer tokenIn from user to contract
  // This would require integration with token contracts

  generateEvent(
    `LimitOrderCreated:${orderId}:${caller}:${tokenIn}:${tokenOut}:${amountIn}:${limitPrice}`,
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

  // TODO: Return tokenIn to user
  // This would require integration with token contracts

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

  // Validate price meets limit
  // price = amountOut / amountIn
  // We need: amountOut / amountIn >= limitPrice
  // Which is: amountOut * 10^18 / amountIn >= limitPrice
  const actualPrice = SafeMathU256.div(
    SafeMathU256.mul(amountOut, u256.fromU64(1000000000000000000)),
    order.amountIn,
  );
  assert(actualPrice >= order.limitPrice, 'PRICE_LIMIT_NOT_MET');

  // Mark as filled
  order.filled = true;
  Storage.set(orderKey, order.serialize());

  // TODO: Execute swap through pool
  // This would require integration with pool contracts

  // TODO: Transfer tokenOut to order owner
  // This would require integration with token contracts

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
