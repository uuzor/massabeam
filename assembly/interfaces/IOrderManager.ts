import {
  Args,
  bytesToU256,
} from '@massalabs/as-types';
import { Address, call } from '@massalabs/massa-as-sdk';
import { u256 } from 'as-bignum/assembly';

export class IOrderManager {
  _origin: Address;

  /**
   * Wraps an OrderManager smart contract address in an interface.
   *
   * @param {Address} _address - Address of the smart contract.
   */
  constructor(_address: Address) {
    this._origin = _address;
  }

  /**
   * Create a limit order
   */
  createLimitOrder(
    tokenIn: string,
    tokenOut: string,
    amountIn: u256,
    minAmountOut: u256,
    limitPrice: u256,
    expiry: u64,
    coins: u64 = 0,
  ): u256 {
    const args = new Args()
      .add(tokenIn)
      .add(tokenOut)
      .add(amountIn)
      .add(minAmountOut)
      .add(limitPrice)
      .add(expiry);

    const result = call(this._origin, 'createLimitOrder', args, coins);
    return bytesToU256(result);
  }

  /**
   * Cancel a limit order
   */
  cancelLimitOrder(orderId: u256, coins: u64 = 0): void {
    const args = new Args().add(orderId);
    call(this._origin, 'cancelLimitOrder', args, coins);
  }

  /**
   * Execute a limit order
   */
  executeLimitOrder(orderId: u256, amountOut: u256, coins: u64 = 0): void {
    const args = new Args().add(orderId).add(amountOut);
    call(this._origin, 'executeLimitOrder', args, coins);
  }

  /**
   * Get order details
   */
  getOrder(orderId: u256): StaticArray<u8> {
    const args = new Args().add(orderId);
    return call(this._origin, 'getOrder', args, 0);
  }

  /**
   * Get total order count
   */
  getOrderCount(): u256 {
    const result = call(this._origin, 'getOrderCount', new Args(), 0);
    return bytesToU256(result);
  }
}
