import {
  Args,
  bytesToU64,
  bytesToString,
  byteToBool,
  u256ToBytes,
} from '@massalabs/as-types';
import { Address, call } from '@massalabs/massa-as-sdk';
import { u256 } from 'as-bignum/assembly';

export class IFactory {
  _origin: Address;

  /**
   * Wraps a factory smart contract address in an interface.
   *
   * @param {Address} _address - Address of the smart contract.
   */
  constructor(_address: Address) {
    this._origin = _address;
  }

  /**
   * Calls the `constructor` function of the factory
   */
  init(coins: u64 = 0): void {
    const args = new Args();
    call(this._origin, 'constructor', args, coins);
  }

  ownerAddress(): Address {
    return new Address(
      bytesToString(call(this._origin, 'ownerAddress', new Args(), 0)),
    );
  }
}
