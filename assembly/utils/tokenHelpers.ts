/**
 * Token Transfer Helper Functions
 * Consolidates duplicate token transfer logic across order managers
 */

import { Address, Context, Coins, call } from '@massalabs/massa-as-sdk';
import { Args } from '@massalabs/as-types';
import { u256 } from 'as-bignum/assembly';

export const NATIVE_MAS_ADDRESS = 'NATIVE_MAS';

/**
 * Transfer tokens INTO contract (from user to contract)
 * Handles both native MAS and MRC6909 tokens
 *
 * @param token - Token address or 'NATIVE_MAS' for native tokens
 * @param from - Sender address
 * @param amount - Amount to transfer
 */
export function transferTokensIn(
  token: string,
  from: string,
  amount: u256,
): void {
  if (token === NATIVE_MAS_ADDRESS) {
    // Native MAS transfer - verify coins were sent with transaction
    const coinsReceived = Context.transferredCoins();
    const amountU64 = amount.toU64();
    assert(coinsReceived >= amountU64, 'INSUFFICIENT_MAS_SENT');
  } else {
    // MRC6909 token transfer using transferFrom
    const transferArgs = new Args()
      .add(from)                              // from
      .add(Context.callee().toString())       // to (this contract)
      .add(u256.Zero)                          // token ID (0 for fungible)
      .add(amount);                            // amount

    call(new Address(token), 'transferFrom', transferArgs, 0);
  }
}

/**
 * Transfer tokens OUT of contract (from contract to user)
 * Handles both native MAS and MRC6909 tokens
 *
 * @param token - Token address or 'NATIVE_MAS' for native tokens
 * @param to - Recipient address
 * @param amount - Amount to transfer
 */
export function transferTokensOut(
  token: string,
  to: string,
  amount: u256,
): void {
  if (token === NATIVE_MAS_ADDRESS) {
    // Native MAS transfer
    const amountU64 = amount.toU64();
    Coins.transferCoins(new Address(to), amountU64);
  } else {
    // MRC6909 token transfer using transfer
    const transferArgs = new Args()
      .add(Context.callee().toString())       // from (this contract)
      .add(to)                                 // to
      .add(u256.Zero)                          // token ID (0 for fungible)
      .add(amount);                            // amount

    call(new Address(token), 'transfer', transferArgs, 0);
  }
}

/**
 * Get token balance of an address
 *
 * @param token - Token address or 'NATIVE_MAS'
 * @param owner - Address to check balance of
 * @returns Balance as u256
 */
export function getTokenBalance(
  token: string,
  owner: string,
): u256 {
  if (token === NATIVE_MAS_ADDRESS) {
    // For native MAS, we can't easily query balance from contract
    // This would require additional tracking
    return u256.Zero;
  } else {
    // MRC6909 balanceOf
    const balanceArgs = new Args()
      .add(owner)
      .add(u256.Zero); // token ID

    const result = call(new Address(token), 'balanceOf', balanceArgs, 0);
    if (result.length > 0) {
      const resultArgs = new Args(result);
      return resultArgs.nextU256().unwrap();
    }
    return u256.Zero;
  }
}

/**
 * Approve token spending (for MRC6909 only)
 *
 * @param token - Token address
 * @param spender - Address to approve
 * @param amount - Amount to approve
 */
export function approveToken(
  token: string,
  spender: string,
  amount: u256,
): void {
  if (token === NATIVE_MAS_ADDRESS) {
    // Native MAS doesn't need approval
    return;
  }

  const approveArgs = new Args()
    .add(spender)
    .add(u256.Zero) // token ID
    .add(amount);

  call(new Address(token), 'approve', approveArgs, 0);
}

/**
 * Check if token is native MAS
 *
 * @param token - Token address to check
 * @returns true if native MAS
 */
export function isNativeToken(token: string): bool {
  return token === NATIVE_MAS_ADDRESS;
}
