/**
 * Position Management Library
 * Handles liquidity positions for concentrated liquidity AMM
 */

import { u128, u256, i128 } from 'as-bignum/assembly';
import { Args } from '@massalabs/as-types';
import { SafeMathU128, SafeMathU256 } from './safeMath';

/**
 * Position information for a liquidity provider
 */
export class Position {
  constructor(
    public liquidity: u128,
    public feeGrowthInside0LastX128: u256,
    public feeGrowthInside1LastX128: u256,
    public tokensOwed0: u128,
    public tokensOwed1: u128,
  ) {}

  serialize(): StaticArray<u8> {
    return new Args()
      .add(this.liquidity)
      .add(this.feeGrowthInside0LastX128)
      .add(this.feeGrowthInside1LastX128)
      .add(this.tokensOwed0)
      .add(this.tokensOwed1)
      .serialize();
  }

  static deserialize(data: StaticArray<u8>): Position {
    const args = new Args(data);
    return new Position(
      args.nextU128().expect('liquidity missing'),
      args.nextU256().expect('feeGrowthInside0 missing'),
      args.nextU256().expect('feeGrowthInside1 missing'),
      args.nextU128().expect('tokensOwed0 missing'),
      args.nextU128().expect('tokensOwed1 missing'),
    );
  }
}

/**
 * Token amounts class
 */
export class TokenAmounts {
  constructor(
    public amount0: u256,
    public amount1: u256,
  ) {}
}

/**
 * Calculate token amounts needed for a given liquidity amount
 * Simplified version - in production use proper sqrt price math
 */
export function getAmountsForLiquidity(
  sqrtPriceX96: u256,
  sqrtPriceAX96: u256,
  sqrtPriceBX96: u256,
  liquidity: u128,
): TokenAmounts {
  // Simplified calculation
  // In production, use proper Q96 math from Uniswap V3

  if (sqrtPriceX96 <= sqrtPriceAX96) {
    // Current price below range - only token0
    return new TokenAmounts(
      u256.from(liquidity),
      u256.Zero
    );
  } else if (sqrtPriceX96 >= sqrtPriceBX96) {
    // Current price above range - only token1
    return new TokenAmounts(
      u256.Zero,
      u256.from(liquidity)
    );
  } else {
    // Current price in range - both tokens
    const half = SafeMathU128.div(liquidity, u128.fromU32(2));
    return new TokenAmounts(
      u256.from(half),
      u256.from(half)
    );
  }
}

/**
 * Calculate liquidity from token amounts
 * Simplified version
 */
export function getLiquidityForAmounts(
  sqrtPriceX96: u256,
  sqrtPriceAX96: u256,
  sqrtPriceBX96: u256,
  amount0: u256,
  amount1: u256,
): u128 {
  // Simplified calculation
  // In production, use proper Q96 math

  if (sqrtPriceX96 <= sqrtPriceAX96) {
    return u128.from(amount0);
  } else if (sqrtPriceX96 >= sqrtPriceBX96) {
    return u128.from(amount1);
  } else {
    // Average of both amounts
    const sum = SafeMathU256.add(amount0, amount1);
    return u128.from(SafeMathU256.div(sum, u256.fromU32(2)));
  }
}

/**
 * Update position and calculate fees owed
 */
export function updatePosition(
  position: Position,
  liquidityDelta: i128,
  feeGrowthInside0X128: u256,
  feeGrowthInside1X128: u256,
): Position {
  // Calculate fees owed since last update
  if (position.liquidity > u128.Zero) {
    const feeGrowth0Delta = SafeMathU256.sub(
      feeGrowthInside0X128,
      position.feeGrowthInside0LastX128,
    );
    const feeGrowth1Delta = SafeMathU256.sub(
      feeGrowthInside1X128,
      position.feeGrowthInside1LastX128,
    );

    // Simplified fee calculation
    const fees0 = u128.from(SafeMathU256.div(feeGrowth0Delta, u256.fromU64(1000000)));
    const fees1 = u128.from(SafeMathU256.div(feeGrowth1Delta, u256.fromU64(1000000)));

    position.tokensOwed0 = SafeMathU128.add(position.tokensOwed0, fees0);
    position.tokensOwed1 = SafeMathU128.add(position.tokensOwed1, fees1);
  }

  // Update liquidity
  if (liquidityDelta < i128.Zero) {
    const absDelta = i128.abs(liquidityDelta);
    position.liquidity = SafeMathU128.sub(position.liquidity, u128.from(absDelta));
  } else {
    position.liquidity = SafeMathU128.add(position.liquidity, u128.from(liquidityDelta));
  }

  // Update fee growth checkpoints
  position.feeGrowthInside0LastX128 = feeGrowthInside0X128;
  position.feeGrowthInside1LastX128 = feeGrowthInside1X128;

  return position;
}
