import { Args } from '@massalabs/as-types';
import { Context } from '@massalabs/massa-as-sdk';
import { _allowance, _approve, _burn, _isOperator } from './MRC6909';
import { u256 } from 'as-bignum/assembly';
import { SafeMathU256 } from '../libraries/safeMath';

export function _burnFrom(binaryArgs: StaticArray<u8>): void {
  const args = new Args(binaryArgs);

  const from = args.nextString().expect('from argument is missing or invalid');
  const id = args.nextU256().expect('tokenId argument is missing or invalid');
  const amount = args.nextU256().expect('value argument is missing or invalid');

  const sender = Context.caller().toString();

  const isOperator = _isOperator(from, sender);

  if (!isOperator && from != sender) {
    const spenderAllowance = _allowance(from, sender, id);

    assert(spenderAllowance >= amount, 'BURN_FAILED: INSUFFICIENT_ALLOWANCE');

    if (spenderAllowance != u256.Max) {
      _approve(from, sender, id, SafeMathU256.sub(spenderAllowance, amount));
    }
  }

  _burn(from, id, amount);
}

export * from './MRC6909';
