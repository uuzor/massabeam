import { i128, u128 } from 'as-bignum/assembly';
import { u256 } from 'as-bignum/assembly/integer/u256';

export class SafeMath {
  /**
   *
   * @param a
   * @param b
   * @returns Returns the addition of two unsigned integers,
   * reverting on overflow.
   */
  static add(a: u64, b: u64): u64 {
    const c: u64 = a + b;
    assert(c >= a, 'SafeMath: addition overflow');

    return c;
  }

  /**
   *
   * @param a
   * @param b
   * @returns Returns the integer division of two unsigned integers. Reverts with custom message on
   * division by zero. The result is rounded towards zero.
   */
  static sub(a: u64, b: u64): u64 {
    assert(b <= a, 'SafeMath: substraction overflow');
    const c: u64 = a - b;

    return c;
  }

  /**
   *
   * @param a
   * @param b
   * @returns Returns the multiplication of two unsigned integers, reverting on
   * overflow.
   */
  static mul(a: u64, b: u64): u64 {
    if (a == 0) {
      return 0;
    }

    const c = a * b;
    assert(c / a == b, 'SafeMath: multiplication overflow');

    return c;
  }

  /**
   *
   * @param a
   * @param b
   * @returns Returns the integer division of two unsigned integers. Reverts on
   * division by zero. The result is rounded towards zero.
   */
  static div(a: u64, b: u64): u64 {
    assert(b > 0, 'SafeMath: division by zero');
    const c = a / b;

    return c;
  }

  /**
   *
   * @param a
   * @param b
   * @returns Returns the remainder of dividing two unsigned integers. (unsigned integer modulo),
   * Reverts with custom message when dividing by zero.
   */
  static mod(a: u64, b: u64): u64 {
    assert(b != 0, 'SafeMath: modulo by zero');
    return a % b;
  }
}

export class SafeMathU8 {
  /**
   *
   * @param a
   * @param b
   * @returns Returns the addition of two unsigned integers,
   * reverting on overflow.
   */
  static add(a: u8, b: u8): u8 {
    const c: u8 = a + b;
    assert(c >= a, 'SafeMath: addition overflow');

    return c;
  }

  /**
   *
   * @param a
   * @param b
   * @returns Returns the integer division of two unsigned integers. Reverts with custom message on
   * division by zero. The result is rounded towards zero.
   */
  static sub(a: u8, b: u8): u8 {
    assert(b <= a, 'SafeMathU8: substraction overflow');
    const c: u8 = a - b;

    return c;
  }
}

export class SafeMathU128 {
  static add(a: u128, b: u128): u128 {
    const c: u128 = u128.add(a, b);
    assert(c >= a, 'SafeMathU128: addition overflow');

    return c;
  }

  static sub(a: u128, b: u128): u128 {
    assert(b <= a, 'SafeMathU128: substraction overflow');
    const c: u128 = u128.sub(a, b);

    return c;
  }

  static mul(a: u128, b: u128): u128 {
    if (a == u128.Zero) {
      return u128.Zero;
    }

    const c = u128.mul(a, b);
    assert(c >= a, 'SafeMathU128: multiplication overflow');

    return c;
  }

  static div(a: u128, b: u128): u128 {
    assert(b > u128.Zero, 'SafeMathU128: division by zero');
    const c = u128.div(a, b);

    return c;
  }

  static mod(a: u128, b: u128): u128 {
    assert(b != u128.Zero, 'SafeMathU128: modulo by zero');
    return u128.rem(a, b);
  }
}

export class safeMathI128 {
  static add(a: i128, b: i128): i128 {
    const c: i128 = i128.add(a, b);
    assert(c >= a, 'SafeMathI128: addition overflow');

    return c;
  }

  static sub(a: i128, b: i128): i128 {
    assert(b <= a, 'SafeMathI128: substraction overflow');
    const c: i128 = i128.sub(a, b);

    return c;
  }

  static mul(a: i128, b: i128): i128 {
    if (a == i128.Zero) {
      return i128.Zero;
    }

    const c = i128.mul(a, b);
    assert(c >= a, 'SafeMathI128: multiplication overflow');

    return c;
  }

  static div(a: i128, b: i128): i128 {
    assert(b > i128.Zero, 'SafeMathI128: division by zero');
    const c = i128.div(a, b);

    return c;
  }
}

export class SafeMathU256 {
  static add(a: u256, b: u256): u256 {
    const c: u256 = u256.add(a, b);
    assert(c >= a, 'SafeMathU256: addition overflow');

    return c;
  }

  static sub(a: u256, b: u256): u256 {
    assert(b <= a, 'SafeMathU256: substraction overflow');
    const c: u256 = u256.sub(a, b);

    return c;
  }

  static mul(a: u256, b: u256): u256 {
    if (a == u256.Zero) {
      return u256.Zero;
    }
    const c = u256.mul(a, b);
    assert(c >= a, 'SafeMathU256: multiplication overflow');

    return c;
  }

   /**
   * Division with zero check
   * Returns a / b, reverts if b == 0
   */
   static div(a: u256, b: u256): u256 {
    assert(u256.gt(b, u256.Zero), 'SafeMath256: division by zero');
    const c = u256.fromU128(u128.div(u128.fromU256(a) , u128.fromU256(b)));
    return c;
  }

}
