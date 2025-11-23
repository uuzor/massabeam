import { i128, u128, u256 } from 'as-bignum/assembly';

export class FeeGrowth {
  constructor(public feeGrowth0: u256, public feeGrowth1: u256) {}
}

export class TickInfo {
  constructor(
    public liqidityGross: u128,
    public liquidityNet: i128,
    public feeGrowthOutside0: u256,
    public feeGrowthOutside1: u256,
    public tickCumulativeOutside: i64,
    public secondsPerLiquidityOutside: u256,
    public secondsOutside: u32,
    public initialized: bool,
  ) {}
}
