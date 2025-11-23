/**
 * Swap Math Library
 * Simplified swap calculations for concentrated liquidity
 */

import { u128, u256, i128 } from 'as-bignum/assembly';
import { SafeMathU256 } from './safeMath';

/**
 * Swap step result
 */
export class SwapStepResult {
  constructor(
    public sqrtPriceNextX96: u256,
    public amountIn: u256,
    public amountOut: u256,
    public feeAmount: u256,
  ) {}
}

/**
 * Calculate a single swap step
 * Simplified version - in production use proper sqrt price math
 */
export function computeSwapStep(
  sqrtPriceCurrentX96: u256,
  sqrtPriceTargetX96: u256,
  liquidity: u128,
  amountRemaining: u256,
  feePips: u64,
): SwapStepResult {
  // Simplified swap step calculation
  // In production, implement full Uniswap V3 swap math

  const zeroForOne = sqrtPriceCurrentX96 >= sqrtPriceTargetX96;

  // Calculate fee (e.g., 0.3% = 3000 pips)
  const feeAmount = SafeMathU256.div(
    SafeMathU256.mul(amountRemaining, u256.fromU64(feePips)),
    u256.fromU64(1000000),
  );

  const amountInWithoutFee = SafeMathU256.sub(amountRemaining, feeAmount);

  // Simplified: assume we can use all remaining amount
  const amountIn = amountInWithoutFee;

  // Simplified output calculation (1:1 minus fee for demo)
  const amountOut = SafeMathU256.div(
    SafeMathU256.mul(amountIn, u256.fromU64(995)),
    u256.fromU64(1000),
  );

  // Move price toward target
  const sqrtPriceNextX96 = sqrtPriceTargetX96;

  return new SwapStepResult(sqrtPriceNextX96, amountIn, amountOut, feeAmount);
}

/**
 * Calculate sqrt price from tick
 * Simplified version
 */
export function getSqrtPriceAtTick(tick: i32): u256 {
  // Simplified: linear approximation
  // In production, use proper tick math with 1.0001^tick
  const base = u256.fromU64(79228162514264337593543950336); // 2^96
  const tickAbs = tick >= 0 ? tick : -tick;
  const adjustment = u256.fromU32(u32(tickAbs));

  if (tick >= 0) {
    return SafeMathU256.add(base, adjustment);
  } else {
    return SafeMathU256.sub(base, adjustment);
  }
}

/**
 * Calculate tick from sqrt price
 * Simplified version
 */
export function getTickAtSqrtPrice(sqrtPriceX96: u256): i32 {
  // Simplified: linear approximation
  // In production, use proper inverse tick math
  const base = u256.fromU64(79228162514264337593543950336); // 2^96

  if (sqrtPriceX96 >= base) {
    const diff = SafeMathU256.sub(sqrtPriceX96, base);
    return i32(diff.toU32());
  } else {
    const diff = SafeMathU256.sub(base, sqrtPriceX96);
    return -i32(diff.toU32());
  }
}
