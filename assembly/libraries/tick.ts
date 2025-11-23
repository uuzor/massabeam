import { i128, u128, u256 } from 'as-bignum/assembly';
import { TickMath } from './tickMath';
import { safeBatchTransferFrom } from '@massalabs/sc-standards/assembly/contracts/MRC1155';
import { safeMathI128, SafeMathU128, SafeMathU256 } from './safeMath';
import { FeeGrowth, TickInfo } from '../utils/types/tick';
import { PersistentMap } from '../utils/collections/persistentMap';

export class Tick {
  /**
   * Calculates the maximum liquidity per tick for a given tick spacing.
   *
   * @param tickSpacing - The spacing between ticks
   * @returns The maximum amount of liquidity that can be held in a single tick
   */
  static tickSpacingToMaxLiquidityPerTick(tickSpacing: i32): u128 {
    const minTick = (TickMath.MIN_TICK / tickSpacing) * tickSpacing;
    const maxTick = (TickMath.MAX_TICK / tickSpacing) * tickSpacing;
    const minMaxDiff = maxTick - minTick;
    const numTicks: u32 = u32(minMaxDiff / tickSpacing) + 1;

    const maxLiquidityPerTick = SafeMathU128.div(
      u128.Max,
      u128.fromU32(numTicks),
    );

    return maxLiquidityPerTick;
  }

  /**
   * Calculates the fee growth inside a given tick range.
   *
   * @param ticks - A PersistentMap containing tick information
   * @param tickLower - The lower tick of the range
   * @param tickUpper - The upper tick of the range
   * @param tickCurrent - The current tick
   * @param feeGrowthGlobal0 - The global fee growth of token0
   * @param feeGrowthGlobal1 - The global fee growth of token1
   * @returns A FeeGrowth object containing the fee growth inside the range for both tokens
   */
  static getFeeGrowthInside(
    ticks: PersistentMap<i32, TickInfo>,
    tickLower: i32,
    tickUpper: i32,
    tickCurrent: i32,
    feeGrowthGlobal0: u256,
    feeGrowthGlobal1: u256,
  ): FeeGrowth {
    const lower: TickInfo = ticks.getSome(tickLower, 'LOWER_TICK_NOT_FOUND');
    const upper: TickInfo = ticks.getSome(tickUpper, 'UPPER_TICK_NOT_FOUND');

    // Calculate fee growth below
    let feeGrowthBelow0: u256;
    let feeGrowthBelow1: u256;

    if (tickCurrent >= tickLower) {
      feeGrowthBelow0 = lower.feeGrowthOutside0;
      feeGrowthBelow1 = lower.feeGrowthOutside1;
    } else {
      feeGrowthBelow0 = SafeMathU256.sub(
        feeGrowthGlobal0,
        lower.feeGrowthOutside0,
      );
      feeGrowthBelow1 = SafeMathU256.sub(
        feeGrowthGlobal1,
        lower.feeGrowthOutside1,
      );
    }

    // Calculate fee growth above
    let feeGrowthAbove0: u256;
    let feeGrowthAbove1: u256;

    if (tickCurrent < tickUpper) {
      feeGrowthAbove0 = upper.feeGrowthOutside0;
      feeGrowthAbove1 = upper.feeGrowthOutside1;
    } else {
      feeGrowthAbove0 = SafeMathU256.sub(
        feeGrowthGlobal0,
        upper.feeGrowthOutside0,
      );
      feeGrowthAbove1 = SafeMathU256.sub(
        feeGrowthGlobal1,
        upper.feeGrowthOutside1,
      );
    }

    // Calculate fee growth inside
    const feeGrowthInside0 = SafeMathU256.sub(
      SafeMathU256.sub(feeGrowthGlobal0, feeGrowthBelow0),
      feeGrowthAbove0,
    );

    const feeGrowthInside1 = SafeMathU256.sub(
      SafeMathU256.sub(feeGrowthGlobal1, feeGrowthBelow1),
      feeGrowthAbove1,
    );

    return new FeeGrowth(feeGrowthInside0, feeGrowthInside1);
  }

  static update(
    ticks: PersistentMap<i32, TickInfo>,
    tick: i32,
    tickCurrent: i32,
    liquidityDelta: i128,
    feeGrowthGlobal0: u256,
    feeGrowthGlobal1: u256,
    secondsPerLiquidityCumulative: u256,
    tickCumulative: i64,
    time: u32,
    upper: bool,
    maxLiquidity: u128,
  ): bool {
    let info = ticks.getSome(tick, 'TICK_NOT_FOUND');

    const liquidityGrossBefore = info.liqidityGross;
    // TODO: use the right fromulat after creating liquidityMath library
    const liquidityGrossAfter: u128 = u128.One;

    assert(liquidityGrossAfter <= maxLiquidity, 'MAX_LIQUIDITY_OVERFLOW');

    // Checking if the state of liquidityGross has transitioned from zero to non-zero or vice versa.
    const flipped: bool =
      (liquidityGrossAfter == u128.Zero) != (liquidityGrossBefore == u128.Zero);

    if (liquidityGrossBefore == u128.Zero) {
      // by convention, we assume that all growth before a tick was initialized happened _below_ the tick
      if (tick <= tickCurrent) {
        info.feeGrowthOutside0 = feeGrowthGlobal0;
        info.feeGrowthOutside1 = feeGrowthGlobal1;
        info.secondsPerLiquidityOutside = secondsPerLiquidityCumulative;
        info.tickCumulativeOutside = tickCumulative;
        info.secondsOutside = time;
      }

      info.initialized = true;
    }

    info.

    return flipped;
  }
}
