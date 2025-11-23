import { Args, Result, Serializable } from '@massalabs/as-types';
import { u256 } from 'as-bignum/assembly';

export class PoolState implements Serializable {
  constructor(
    // Current sqrt(price)
    public sqrtPrice: u256,
    // Current tick
    public tick: u64,
    // the most-recently updated index of the observations array
    public observationIndex: u16,
    // the current maximum number of observations that are being stored
    public observationCardinality: u16,
    // the next maximum number of observations to store, triggered in observations.write
    public observationCardinalityNext: u16,
    // the current protocol fee as a percentage of the swap fee taken on withdrawal
    // represented as an integer denominator (1/x)%
    public feeProtocol: u8
  ) {
    this.sqrtPrice = sqrtPrice;
    this.tick = tick;
    this.observationIndex = observationIndex;
    this.observationCardinality = observationCardinality;
    this.observationCardinalityNext = observationCardinalityNext;
    this.feeProtocol = feeProtocol;
  }

  serialize(): StaticArray<u8> {
    return new Args()
      .add<u256>(this.sqrtPrice)
      .add<u64>(this.tick)
      .add<u16>(this.observationIndex)
      .add<u16>(this.observationCardinality)
      .add<u16>(this.observationCardinalityNext)
      .add<u8>(this.feeProtocol)
      .serialize();
  }

  deserialize(data: StaticArray<u8>, offset: i32): Result<i32> {
    const args = new Args(data, offset);

    this.sqrtPrice = args.nextU256().expect("Can't deserialize sqrtPrice");
    this.tick = args.nextU64().expect("Can't deserialize tick");
    this.observationIndex = args
      .nextU16()
      .expect("Can't deserialize observationIndex");
    this.observationCardinality = args
      .nextU16()
      .expect("Can't deserialize observationCardinality");
    this.observationCardinalityNext = args
      .nextU16()
      .expect("Can't deserialize observationCardinalityNext");
    this.feeProtocol = args.nextU8().expect("Can't deserialize feeProtocol");

    return new Result(args.offset);
  }
}
