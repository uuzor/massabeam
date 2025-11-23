import { i128 } from 'as-bignum';

export class TickMath {
  static MIN_TICK: i32 = -887272;
  static MAX_TICK: i32 = -this.MIN_TICK;
}
