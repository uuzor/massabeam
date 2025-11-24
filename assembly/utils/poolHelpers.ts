/**
 * Pool Helper Functions
 * Utility functions for interacting with pools and retrieving pool data
 */

import { Address, call } from '@massalabs/massa-as-sdk';
import { Args } from '@massalabs/as-types';
import { u256, u128 } from 'as-bignum/assembly';

/**
 * Token amounts structure
 */
export class TokenAmounts {
  constructor(
    public amount0: u256,
    public amount1: u256,
  ) {}
}

/**
 * Pool information structure
 */
export class PoolInfo {
  constructor(
    public sqrtPriceX96: u256,
    public tick: i32,
    public liquidity: u128,
    public token0: string,
    public token1: string,
    public fee: u64,
  ) {}
}

/**
 * Get pool address from factory
 *
 * @param factoryAddress - Factory contract address
 * @param token0 - First token address
 * @param token1 - Second token address
 * @param fee - Fee tier
 * @returns Pool address or empty string if not exists
 */
export function getPoolAddress(
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
 * Get current sqrt price from pool
 *
 * @param poolAddress - Pool contract address
 * @returns Current sqrtPriceX96 or zero if error
 */
export function getPoolSqrtPrice(poolAddress: string): u256 {
  if (poolAddress == '') {
    return u256.Zero;
  }

  const result = call(new Address(poolAddress), 'getSqrtPriceX96', new Args(), 0);
  if (result.length > 0) {
    const resultArgs = new Args(result);
    return resultArgs.nextU256().unwrap();
  }

  return u256.Zero;
}

/**
 * Get current tick from pool
 *
 * @param poolAddress - Pool contract address
 * @returns Current tick or 0 if error
 */
export function getPoolTick(poolAddress: string): i32 {
  if (poolAddress == '') {
    return 0;
  }

  const result = call(new Address(poolAddress), 'getTick', new Args(), 0);
  if (result.length > 0) {
    const resultArgs = new Args(result);
    return resultArgs.nextI32().unwrap();
  }

  return 0;
}

/**
 * Get current liquidity from pool
 *
 * @param poolAddress - Pool contract address
 * @returns Current liquidity or zero if error
 */
export function getPoolLiquidity(poolAddress: string): u128 {
  if (poolAddress == '') {
    return u128.Zero;
  }

  const result = call(new Address(poolAddress), 'getLiquidity', new Args(), 0);
  if (result.length > 0) {
    const resultArgs = new Args(result);
    return resultArgs.nextU128().unwrap();
  }

  return u128.Zero;
}

/**
 * Get complete pool state
 *
 * @param poolAddress - Pool contract address
 * @returns PoolInfo structure with all pool data
 */
export function getPoolInfo(poolAddress: string): PoolInfo | null {
  if (poolAddress == '') {
    return null;
  }

  const result = call(new Address(poolAddress), 'getPoolState', new Args(), 0);
  if (result.length > 0) {
    const resultArgs = new Args(result);
    return new PoolInfo(
      resultArgs.nextU256().unwrap(),  // sqrtPriceX96
      resultArgs.nextI32().unwrap(),   // tick
      resultArgs.nextU128().unwrap(),  // liquidity
      resultArgs.nextString().unwrap(), // token0
      resultArgs.nextString().unwrap(), // token1
      resultArgs.nextU64().unwrap(),   // fee
    );
  }

  return null;
}

/**
 * Convert sqrtPriceX96 to human-readable price
 * price = (sqrtPriceX96 / 2^96)^2
 *
 * @param sqrtPriceX96 - Square root price in Q96 format
 * @returns Approximate price (simplified calculation)
 */
export function sqrtPriceToPrice(sqrtPriceX96: u256): u256 {
  // Simplified calculation
  // In production, use proper Q96 math
  const Q96 = u256.One << 96; // 2^96
  const ratio = sqrtPriceX96 / Q96;
  return ratio * ratio;
}

/**
 * Calculate price impact for a swap
 *
 * @param poolAddress - Pool contract address
 * @param amountIn - Input amount
 * @param zeroForOne - Swap direction
 * @returns Estimated price impact as percentage (in basis points, e.g., 50 = 0.5%)
 */
export function calculatePriceImpact(
  poolAddress: string,
  amountIn: u256,
  zeroForOne: bool,
): u64 {
  // This is a placeholder - actual implementation would:
  // 1. Get current price
  // 2. Simulate swap
  // 3. Get new price
  // 4. Calculate: (newPrice - oldPrice) / oldPrice * 10000

  // For now, return 0
  return 0;
}

/**
 * Check if pool exists for token pair
 *
 * @param factoryAddress - Factory contract address
 * @param token0 - First token address
 * @param token1 - Second token address
 * @param fee - Fee tier
 * @returns true if pool exists
 */
export function poolExists(
  factoryAddress: string,
  token0: string,
  token1: string,
  fee: u64,
): bool {
  const poolAddress = getPoolAddress(factoryAddress, token0, token1, fee);
  return poolAddress != '';
}

/**
 * Get pool token addresses
 *
 * @param poolAddress - Pool contract address
 * @returns Tuple of [token0, token1] or null if error
 */
export function getPoolTokens(poolAddress: string): string[] | null {
  if (poolAddress == '') {
    return null;
  }

  const result = call(new Address(poolAddress), 'getTokens', new Args(), 0);
  if (result.length > 0) {
    const resultArgs = new Args(result);
    const token0 = resultArgs.nextString().unwrap();
    const token1 = resultArgs.nextString().unwrap();
    return [token0, token1];
  }

  return null;
}

/**
 * Estimate swap output amount (quote)
 *
 * @param poolAddress - Pool contract address
 * @param amountIn - Input amount
 * @param zeroForOne - Swap direction
 * @returns Estimated output amount
 */
export function quoteSwap(
  poolAddress: string,
  amountIn: u256,
  zeroForOne: bool,
): u256 {
  // This is a placeholder - actual implementation would:
  // 1. Load pool state
  // 2. Simulate swap using SwapMath
  // 3. Return estimated output

  // For now, return simple estimation (0.997 * input for 0.3% fee)
  return (amountIn * u256.fromU64(997)) / u256.fromU64(1000);
}
