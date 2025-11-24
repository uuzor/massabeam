import { i128, u128, u256 } from 'as-bignum/assembly';
import { Args } from '@massalabs/as-types';

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

  serialize(): StaticArray<u8> {
    return new Args()
      .add(this.liqidityGross)
      .add(this.liquidityNet)
      .add(this.feeGrowthOutside0)
      .add(this.feeGrowthOutside1)
      .add(this.tickCumulativeOutside)
      .add(this.secondsPerLiquidityOutside)
      .add(this.secondsOutside)
      .add(this.initialized)
      .serialize();
  }

  static deserialize(data: StaticArray<u8>): TickInfo {
    const args = new Args(data);
    return new TickInfo(
      args.nextU128().expect('liqidityGross missing'),
      args.nextI128().expect('liquidityNet missing'),
      args.nextU256().expect('feeGrowthOutside0 missing'),
      args.nextU256().expect('feeGrowthOutside1 missing'),
      args.nextI64().expect('tickCumulativeOutside missing'),
      args.nextU256().expect('secondsPerLiquidityOutside missing'),
      args.nextU32().expect('secondsOutside missing'),
      args.nextBool().expect('initialized missing'),
    );
  }
}
