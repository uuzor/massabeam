import {
  Args,
  boolToByte,
  bytesToU256,
  byteToBool,
  stringToBytes,
  u256ToBytes,
} from '@massalabs/as-types';
import {
  Address,
  Context,
  generateEvent,
  Storage,
} from '@massalabs/massa-as-sdk';
import { onlyOwner, setOwner } from '../utils/ownership';
import { ReentrancyGuard } from '../utils/reentrancyGuard';
import { feeAmountTickSpacing } from '../storage/factory';
import { FeeAmountEnabledEvent, PoolCreatedEvent } from '../utils/events';
import { _build_pool_key } from '../utils/helpers';
import { u256 } from 'as-bignum/assembly';
import { SafeMathU256 } from '../libraries/safeMath';
import { _setOwner } from '@massalabs/sc-standards/assembly/contracts/utils/ownership-internal';

export const BALANCE_KEY_PREFIX = stringToBytes('BALANCE');
export const ALLOWANCE_KEY_PREFIX = stringToBytes('ALLOWANCE');
export const OPERATOR_KEY_PREFIX = stringToBytes('OPERATOR');

/**
 * This function is meant to be called only one time: when the contract is deployed.
 *
 * @param _ - not used
 */
export function mrc6909Constructor(): void {
  // This line is important. It ensures that this function can't be called in the future.
  // If you remove this check, someone could call your constructor function and reset your smart contract.
  assert(Context.isDeployingContract(), 'ALREADY_INITIALIZED');

  _setOwner(Context.caller().toString());
}

/**
 *
 * Get the balance of a specific token for an address
 *
 * @param owner - the address to get the balance for
 * @param id - the id of the token to get the balance for
 *
 * @returns the balance of the token for the address
 */
export function balanceOf(binaryArgs: StaticArray<u8>): StaticArray<u8> {
  const args = new Args(binaryArgs);

  const owner = args
    .nextString()
    .expect('owner argument is missing or invalid');
  const id = args.nextU256().expect('tokenId argument is missing or invalid');

  return u256ToBytes(_balanceOf(owner, id));
}

/**
 * Transfer tokens from the caller to another address.
 * @param to - the address to transfer the tokens to
 * @param id - the id of the token to transfer
 * @param amount - the amount of tokens to transfer
 */
export function transfer(binaryArgs: StaticArray<u8>): void {
  const args = new Args(binaryArgs);

  const to = args.nextString().expect('to argument is missing or invalid');
  const id = args.nextU256().expect('tokenId argument is missing or invalid');
  const amount = args.nextU256().expect('value argument is missing or invalid');

  const sender = Context.caller().toString();

  _transfer(sender, to, id, amount);

  // emit transfer event
  generateEvent(`Transfer:${sender}:${to}:${id}:${amount}`);
}

/**
 * Transfer tokens from one address to another.
 * @param from - the address to transfer the tokens from
 * @param to - the address to transfer the tokens to
 * @param id - the id of the token to transfer
 * @param amount - the amount of tokens to transfer
 */
export function transferFrom(binaryArgs: StaticArray<u8>): void {
  const args = new Args(binaryArgs);

  const from = args.nextString().expect('from argument is missing or invalid');
  const to = args.nextString().expect('to argument is missing or invalid');
  const id = args.nextU256().expect('tokenId argument is missing or invalid');
  const amount = args.nextU256().expect('value argument is missing or invalid');

  const spender = Context.caller().toString();

  const isOperator = _isOperator(from, spender);

  // Update allowance if spender is not an operator
  if (!isOperator && from != spender) {
    // Get allowance of spender
    const spenderAllowance = _allowance(from, spender, id);

    assert(
      spenderAllowance >= amount,
      'TRANSFER_FAILED: INSUFFICIENT_ALLOWANCE',
    );

    if (spenderAllowance != u256.Max) {
      _approve(from, spender, id, SafeMathU256.sub(spenderAllowance, amount));
    }
  }

  // transfer tokens
  _transfer(from, to, id, amount);

  // emit transfer event
  generateEvent(`Transfer:${from}:${to}:${id}:${amount}`);
}

/**
 * Approve a spender to spend a certain amount of tokens on behalf of the owner.
 * @param spender - the address of the spender
 * @param id - the id of the token to approve
 * @param amount - the amount of tokens to approve
 */
export function approve(binaryArgs: StaticArray<u8>): void {
  const args = new Args(binaryArgs);

  const spender = args
    .nextString()
    .expect('spender argument is missing or invalid');
  const id = args.nextU256().expect('tokenId argument is missing or invalid');
  const amount = args
    .nextU256()
    .expect('amount argument is missing or invalid');

  const owner = Context.caller().toString();

  assert(owner != spender, 'APPROVE_FAILED: SELF_APPROVE');

  _approve(owner, spender, id, amount);

  // emit Approval event
  generateEvent(`Approval:${owner}:${spender}:${id}:${amount}`);
}

/**
 * Approve `operator` to operate on all of `owner`'s tokens
 * @param operator - the address of the operator
 * @param approved - whether the operator is approved or not
 */
export function setOperator(binaryArgs: StaticArray<u8>): void {
  const args = new Args(binaryArgs);

  const operator = args
    .nextString()
    .expect('operator argument is missing or invalid');
  const approved = args
    .nextBool()
    .expect('approved argument is missing or invalid');

  const caller = Context.caller().toString();

  assert(operator != caller, 'SET_OPERATOR_FAILED: SELF_OPERATOR');

  const key = operatorKey(caller, operator);

  Storage.set(key, boolToByte(approved));

  generateEvent(`SetOperator:${caller}:${operator}:${approved}`);
}

/**
 * Get the allowance of a spender for a specific token for an address
 * @param owner - the address to get the allowance for
 * @param spender - the address of the spender
 * @param id - the id of the token to get the allowance for
 * @returns the allowance of the spender for the token for the address
 */
export function allownace(binaryArgs: StaticArray<u8>): StaticArray<u8> {
  const args = new Args(binaryArgs);

  const owner = args
    .nextString()
    .expect('owner argument is missing or invalid');
  const spender = args
    .nextString()
    .expect('spender argument is missing or invalid');
  const id = args.nextU256().expect('tokenId argument is missing or invalid');

  const key = allowanceKey(id, owner, spender);

  return Storage.has(key) ? Storage.get(key) : u256ToBytes(u256.Zero);
}

/**
 * Get the key of the balance in the storage for the given id and address
 * @param id - the id of the token
 * @param address - the address of the owner
 * @returns the key of the balance in the storage for the given id and address
 */
export function balanceKey(id: u256, address: string): StaticArray<u8> {
  return BALANCE_KEY_PREFIX.concat(
    u256ToBytes(id).concat(stringToBytes(address)),
  );
}

/**
 * Get the key of the allowance in the storage for the given id and address
 * @param id - the id of the token
 * @param owner - the address of the owner
 * @param spender - the address of the spender
 * @returns the key of the allowance in the storage for the given id and address
 */
export function allowanceKey(
  id: u256,
  owner: string,
  spender: string,
): StaticArray<u8> {
  return ALLOWANCE_KEY_PREFIX.concat(
    u256ToBytes(id).concat(stringToBytes(owner)).concat(stringToBytes(spender)),
  );
}

/**
 * Get the key of the operator in the storage for the given owner and spender
 * @param owner - the address of the owner
 * @param spender - the address of the spender
 * @returns the key of the operator in the storage for the given owner and spender
 */
export function operatorKey(owner: string, spender: string): StaticArray<u8> {
  return OPERATOR_KEY_PREFIX.concat(stringToBytes(owner)).concat(
    stringToBytes(spender),
  );
}

/**
 * Check if an address is an operator for another address.
 * @param owner - the address of the owner
 * @param spender - the address of the spender
 * @returns true if the spender is an operator for the owner, false otherwise
 */
export function isOperator(binaryArgs: StaticArray<u8>): StaticArray<u8> {
  const args = new Args(binaryArgs);
  const owner = args
    .nextString()
    .expect('owner argument is missing or invalid');

  const spender = args
    .nextString()
    .expect('spender argument is missing or invalid');

  const key = operatorKey(owner, spender);

  return Storage.has(key) ? Storage.get(key) : boolToByte(false);
}

/*//////////////////////////////////////////////////////////////
                        Internal Functions
  //////////////////////////////////////////////////////////////*/

/**
 * Mint tokens for a specific address.
 * @param recipient - the address to mint the tokens for
 * @param id - the id of the token to mint
 * @param amount - the amount of tokens to mint
 */
export function _mint(recipient: string, id: u256, amount: u256): void {
  const currentBalance = _balanceOf(recipient, id);
  const newBalance = SafeMathU256.add(currentBalance, amount);
  _setBalance(recipient, id, newBalance);

  generateEvent(`Mint:${recipient}:${id}:${amount}`);
}

/**
 * Burn tokens for a specific address.
 * @param recipient - the address to burn the tokens for
 * @param id - the id of the token to burn
 * @param amount - the amount of tokens to burn
 */
export function _burn(recipient: string, id: u256, amount: u256): void {
  const currentBalance = _balanceOf(recipient, id);

  assert(currentBalance >= amount, 'BURN_FAILED: INSUFFICIENT_BALANCE');

  const newBalance = SafeMathU256.sub(currentBalance, amount);
  _setBalance(recipient, id, newBalance);

  generateEvent(`Burn:${recipient}:${id}:${amount}`);
}

/**
 * @param owner - the address of the owner
 * @param id - the id of the token
 * @returns the key of the balance in the storage for the given owner
 */
export function _balanceOf(owner: string, id: u256): u256 {
  const key = balanceKey(id, owner);
  return Storage.has(key) ? bytesToU256(Storage.get(key)) : u256.Zero;
}

/**
 * @notice Returns the allowance of a spender for a given owner and token id.
 * @param owner - the address of the owner
 * @param spender - the address of the spender
 * @param id - the id of the token
 * @returns the key of the allowance in the storage for the given owner and spender
 */
export function _allowance(owner: string, spender: string, id: u256): u256 {
  const key = allowanceKey(id, owner, spender);
  return Storage.has(key) ? bytesToU256(Storage.get(key)) : u256.Zero;
}

/**
 *  Approve a spender to spend a certain amount of tokens on behalf of the owner.
 * @param owner - address of the owner
 * @param spender - address of the spender
 * @param id - id of the token
 * @param amount - amount of tokens to approve
 */
export function _approve(
  owner: string,
  spender: string,
  id: u256,
  amount: u256,
): void {
  const key = allowanceKey(id, owner, spender);

  Storage.set(key, u256ToBytes(amount));
}

/**
 *  Transfer tokens from one address to another.
 * @param from - address of the sender
 * @param to - address of the receiver
 * @param id - id of the token
 * @param amount - amount of tokens to transfer
 */
function _transfer(from: string, to: string, id: u256, amount: u256): void {
  assert(amount > u256.Zero, 'TRANSFER_FAILED: ZERO_AMOUNT');
  assert(to != from, 'TRANSFER_FAILED: SELF_TRANSFER');

  const currentFromBalance = _balanceOf(from, id);

  assert(currentFromBalance >= amount, 'TRANSFER_FAILED: INSUFFICIENT_BALANCE');

  const currentToBalance = _balanceOf(to, id);

  const newToBalance = SafeMathU256.add(currentToBalance, amount);
  const newFromBalance = SafeMathU256.sub(currentFromBalance, amount);

  _setBalance(from, id, newFromBalance);
  _setBalance(to, id, newToBalance);
}

/**
 *  Set the balance of a specific token for an address.
 * @param address - address of the owner
 * @param id - id of the token
 * @param amount - amount of tokens to set
 */
function _setBalance(address: string, id: u256, amount: u256): void {
  const key = balanceKey(id, address);
  Storage.set(key, u256ToBytes(amount));
}

/**
 *  Check if an address is an operator for another address.
 * @param owner - address of the owner
 * @param operator - address of the operator
 * @returns true if the operator is approved for the owner, false otherwise
 */
export function _isOperator(owner: string, operator: string): bool {
  const key = operatorKey(owner, operator);
  return Storage.has(key) && byteToBool(Storage.get(key));
}
