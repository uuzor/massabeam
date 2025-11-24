/**
 * WMAS (Wrapped MAS) Token Contract
 *
 * A standard ERC20-like wrapper for native MAS tokens.
 * Users can deposit MAS to receive WMAS tokens and withdraw to get MAS back.
 */

import { Args, stringToBytes, u256ToBytes } from '@massalabs/as-types';
import {
  Address,
  Context,
  Storage,
  transferCoins,
  generateEvent,
} from '@massalabs/massa-as-sdk';
import { u256 } from 'as-bignum/assembly/integer/u256';

// Storage keys
const NAME_KEY = stringToBytes('NAME');
const SYMBOL_KEY = stringToBytes('SYMBOL');
const DECIMALS_KEY = stringToBytes('DECIMALS');
const TOTAL_SUPPLY_KEY = stringToBytes('TOTAL_SUPPLY');

// Constants
const STORAGE_BYTE_COST: u64 = 100_000;
const BALANCE_KEY_PREFIX = stringToBytes('BALANCE');

/**
 * Initialize the WMAS token
 * Called once during deployment
 */
export function constructor(binaryArgs: StaticArray<u8>): void {
  const args = new Args(binaryArgs);
  const name = args.nextString().expect('name is missing');
  const symbol = args.nextString().expect('symbol is missing');
  const decimals = args.nextU8().expect('decimals is missing');

  Storage.set(NAME_KEY, stringToBytes(name));
  Storage.set(SYMBOL_KEY, stringToBytes(symbol));
  Storage.set(DECIMALS_KEY, [decimals]);
  Storage.set(TOTAL_SUPPLY_KEY, u256ToBytes(u256.Zero));

  generateEvent(`WMAS initialized: ${name} (${symbol})`);
}

/**
 * Get token name
 */
export function name(_: StaticArray<u8>): StaticArray<u8> {
  return new Args().add(bytesToString(Storage.get(NAME_KEY))).serialize();
}

/**
 * Get token symbol
 */
export function symbol(_: StaticArray<u8>): StaticArray<u8> {
  return new Args().add(bytesToString(Storage.get(SYMBOL_KEY))).serialize();
}

/**
 * Get token decimals
 */
export function decimals(_: StaticArray<u8>): StaticArray<u8> {
  return new Args().add(Storage.get(DECIMALS_KEY)[0]).serialize();
}

/**
 * Get total supply
 */
export function totalSupply(_: StaticArray<u8>): StaticArray<u8> {
  const supply = bytesToU256(Storage.get(TOTAL_SUPPLY_KEY));
  return new Args().addBytes(u256ToBytes(supply)).serialize();
}

/**
 * Get balance of an address
 */
export function balanceOf(binaryArgs: StaticArray<u8>): StaticArray<u8> {
  const args = new Args(binaryArgs);
  const owner = new Address(args.nextString().expect('owner is missing'));
  const balance = getBalance(owner);
  return new Args().addBytes(u256ToBytes(balance)).serialize();
}

/**
 * Transfer tokens
 */
export function transfer(binaryArgs: StaticArray<u8>): void {
  const args = new Args(binaryArgs);
  const to = new Address(args.nextString().expect('recipient is missing'));
  const amountBytes = args.nextBytes().expect('amount is missing');
  const amount = bytesToU256(amountBytes);

  const from = Context.caller();

  _transfer(from, to, amount);
}

/**
 * Approve spender
 */
export function approve(binaryArgs: StaticArray<u8>): void {
  const args = new Args(binaryArgs);
  const spender = new Address(args.nextString().expect('spender is missing'));
  const amountBytes = args.nextBytes().expect('amount is missing');
  const amount = bytesToU256(amountBytes);

  const owner = Context.caller();
  setAllowance(owner, spender, amount);

  generateEvent(`Approval: ${owner.toString()} approved ${spender.toString()} for ${amount.toString()}`);
}

/**
 * Get allowance
 */
export function allowance(binaryArgs: StaticArray<u8>): StaticArray<u8> {
  const args = new Args(binaryArgs);
  const owner = new Address(args.nextString().expect('owner is missing'));
  const spender = new Address(args.nextString().expect('spender is missing'));

  const allowed = getAllowance(owner, spender);
  return new Args().addBytes(u256ToBytes(allowed)).serialize();
}

/**
 * Transfer from
 */
export function transferFrom(binaryArgs: StaticArray<u8>): void {
  const args = new Args(binaryArgs);
  const from = new Address(args.nextString().expect('from is missing'));
  const to = new Address(args.nextString().expect('to is missing'));
  const amountBytes = args.nextBytes().expect('amount is missing');
  const amount = bytesToU256(amountBytes);

  const spender = Context.caller();
  const currentAllowance = getAllowance(from, spender);

  assert(currentAllowance >= amount, 'Insufficient allowance');

  setAllowance(from, spender, currentAllowance - amount);
  _transfer(from, to, amount);
}

/**
 * Deposit MAS to receive WMAS tokens
 * Send MAS with this call and receive equivalent WMAS
 */
export function deposit(_: StaticArray<u8>): void {
  const recipient = Context.caller();
  const amount = Context.transferredCoins();

  // Calculate storage cost if first time user
  const storageCost = computeStorageCost(recipient);

  assert(amount > storageCost, 'Transferred amount must cover storage cost');

  const mintAmount = u256.fromU64(amount - storageCost);

  // Mint WMAS tokens
  _mint(recipient, mintAmount);

  generateEvent(`Deposit: ${recipient.toString()} wrapped ${amount} MAS -> ${mintAmount.toString()} WMAS`);
}

/**
 * Withdraw WMAS to receive MAS tokens
 */
export function withdraw(binaryArgs: StaticArray<u8>): void {
  const args = new Args(binaryArgs);
  const amountU64 = args.nextU64().expect('amount is missing');
  const recipientStr = args.nextString().expect('recipient is missing');
  const recipient = new Address(recipientStr);

  const amount = u256.fromU64(amountU64);
  const caller = Context.caller();

  // Burn WMAS tokens
  _burn(caller, amount);

  // Transfer MAS to recipient
  transferCoins(recipient, amountU64);

  generateEvent(`Withdraw: ${caller.toString()} unwrapped ${amount.toString()} WMAS -> ${amountU64} MAS`);
}

// ============================================================================
// Internal Functions
// ============================================================================

function balanceKey(owner: Address): StaticArray<u8> {
  return stringToBytes('BALANCE:' + owner.toString());
}

function allowanceKey(owner: Address, spender: Address): StaticArray<u8> {
  return stringToBytes('ALLOWANCE:' + owner.toString() + ':' + spender.toString());
}

function getBalance(owner: Address): u256 {
  const key = balanceKey(owner);
  if (!Storage.has(key)) {
    return u256.Zero;
  }
  return bytesToU256(Storage.get(key));
}

function setBalance(owner: Address, amount: u256): void {
  Storage.set(balanceKey(owner), u256ToBytes(amount));
}

function getAllowance(owner: Address, spender: Address): u256 {
  const key = allowanceKey(owner, spender);
  if (!Storage.has(key)) {
    return u256.Zero;
  }
  return bytesToU256(Storage.get(key));
}

function setAllowance(owner: Address, spender: Address, amount: u256): void {
  Storage.set(allowanceKey(owner, spender), u256ToBytes(amount));
}

function _transfer(from: Address, to: Address, amount: u256): void {
  assert(!amount.isZero(), 'Cannot transfer zero amount');

  const fromBalance = getBalance(from);
  assert(fromBalance >= amount, 'Insufficient balance');

  const toBalance = getBalance(to);

  setBalance(from, fromBalance - amount);
  setBalance(to, toBalance + amount);

  generateEvent(`Transfer: ${from.toString()} -> ${to.toString()}: ${amount.toString()}`);
}

function _mint(to: Address, amount: u256): void {
  const balance = getBalance(to);
  setBalance(to, balance + amount);

  const supply = bytesToU256(Storage.get(TOTAL_SUPPLY_KEY));
  Storage.set(TOTAL_SUPPLY_KEY, u256ToBytes(supply + amount));
}

function _burn(from: Address, amount: u256): void {
  const balance = getBalance(from);
  assert(balance >= amount, 'Insufficient balance to burn');

  setBalance(from, balance - amount);

  const supply = bytesToU256(Storage.get(TOTAL_SUPPLY_KEY));
  Storage.set(TOTAL_SUPPLY_KEY, u256ToBytes(supply - amount));
}

function computeStorageCost(owner: Address): u64 {
  if (Storage.has(balanceKey(owner))) {
    return 0;
  }
  const keyLength = 8 + owner.toString().length; // "BALANCE:" + address
  const valueLength = 32; // u256 size
  return (keyLength + valueLength) * STORAGE_BYTE_COST;
}

function bytesToString(data: StaticArray<u8>): string {
  return String.UTF8.decode(data.buffer);
}

function bytesToU256(data: StaticArray<u8>): u256 {
  return u256.fromBytes(data, true);
}
