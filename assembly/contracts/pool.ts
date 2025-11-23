import { Address, Context, Storage, generateEvent } from '@massalabs/massa-as-sdk';
import { setOwner } from '../utils/ownership';
import { ReentrancyGuard } from '../utils/reentrancyGuard';
import {
  Args,
  bytesToString,
  stringToBytes,
  u64ToBytes,
} from '@massalabs/as-types';
import { IFactory } from '../interfaces/IFactory';
import { FACTORY, FEE, TICK_SPACING, TOKEN_0, TOKEN_1 } from '../storage/pool';
import { i128, u128 } from 'as-bignum/assembly';
import { u256 } from 'as-bignum/assembly';

/**
 * This function is meant to be called only one time: when the contract is deployed.
 *
 * @param binaryArgs - Arguments serialized with Args
 * - factory: string - The address of the factory contract.
 * - token0: string - The address of the first token.
 * - token1: string - The address of the second token.
 * - fee: u64 - The fee amount.
 * - tickSpacing: u64 - The tick spacing.
 */
export function constructor(binaryArgs: StaticArray<u8>): void {
  // This line is important. It ensures that this function can't be called in the future.
  // If you remove this check, someone could call your constructor function and reset your smart contract.
  assert(Context.isDeployingContract(), 'ALREADY_INITIALIZED');

  const args = new Args(binaryArgs);

  const factoryIn = args
    .nextString()
    .expect('factory argument is missing or invalid');
  const token0In = args
    .nextString()
    .expect('token0 argument is missing or invalid');
  const token1In = args
    .nextString()
    .expect('token1 argument is missing or invalid');
  const feeIn = args.nextU64().expect('fee argument is missing or invalid');
  const tickSpacingIn = args
    .nextU64()
    .expect('tickSpacing argument is missing or invalid');

  // Set the pool storage
  Storage.set(FACTORY, factoryIn);
  Storage.set(TOKEN_0, token0In);
  Storage.set(TOKEN_1, token1In);
  Storage.set(FEE, u64ToBytes(feeIn));
  Storage.set(TICK_SPACING, u64ToBytes(tickSpacingIn));

  // Get the factory owner
  const factoryOwner = _getFactoryOwner(factoryIn);

  // Set the contract owner to the factory owner
  setOwner(new Args().add(factoryOwner.toString()).serialize());

  // Init Reeentrancy guard
  ReentrancyGuard.__ReentrancyGuard_init();
}

// Getters

/**
 * Get the pool state
 * @returns The pool state serialized
 */
export function getPoolState(_: StaticArray<u8>): StaticArray<u8> {
  return Storage.get(stringToBytes('poolState'));
}

/**
 * Mint liquidity to a position
 * @param binaryArgs - A StaticArray<u8> containing:
 *  - recipient: string - Address to receive the liquidity position
 *  - tickLower: i32 - Lower tick of the position
 *  - tickUpper: i32 - Upper tick of the position
 *  - amount: u128 - Amount of liquidity to mint
 */
export function mint(binaryArgs: StaticArray<u8>): void {
  ReentrancyGuard.nonReentrant();

  const args = new Args(binaryArgs);
  const recipient = args
    .nextString()
    .expect('recipient argument is missing or invalid');
  const tickLower = args
    .nextI32()
    .expect('tickLower argument is missing or invalid');
  const tickUpper = args
    .nextI32()
    .expect('tickUpper argument is missing or invalid');
  const amount = args
    .nextU128()
    .expect('amount argument is missing or invalid');

  // TODO: Implement liquidity minting logic
  // - Validate tick range
  // - Update tick state
  // - Calculate token amounts needed
  // - Transfer tokens from user
  // - Update position
  // - Mint position tokens

  generateEvent(`Mint:${recipient}:${tickLower}:${tickUpper}`);

  ReentrancyGuard.endNonReentrant();
}

/**
 * Burn liquidity from a position
 * @param binaryArgs - A StaticArray<u8> containing:
 *  - tickLower: i32 - Lower tick of the position
 *  - tickUpper: i32 - Upper tick of the position
 *  - amount: u128 - Amount of liquidity to burn
 */
export function burn(binaryArgs: StaticArray<u8>): void {
  ReentrancyGuard.nonReentrant();

  const args = new Args(binaryArgs);
  const tickLower = args
    .nextI32()
    .expect('tickLower argument is missing or invalid');
  const tickUpper = args
    .nextI32()
    .expect('tickUpper argument is missing or invalid');
  const amount = args
    .nextU128()
    .expect('amount argument is missing or invalid');

  // TODO: Implement liquidity burning logic
  // - Validate caller owns position
  // - Update tick state
  // - Calculate token amounts to return
  // - Update position
  // - Burn position tokens

  generateEvent(`Burn:${Context.caller()}:${tickLower}:${tickUpper}`);

  ReentrancyGuard.endNonReentrant();
}

/**
 * Swap tokens
 * @param binaryArgs - A StaticArray<u8> containing:
 *  - recipient: string - Address to receive output tokens
 *  - zeroForOne: bool - Direction of swap (token0 -> token1 if true)
 *  - amountSpecified: i128 - Amount to swap (negative for exact output)
 *  - sqrtPriceLimitX96: u256 - Price limit for the swap
 */
export function swap(binaryArgs: StaticArray<u8>): void {
  ReentrancyGuard.nonReentrant();

  const args = new Args(binaryArgs);
  const recipient = args
    .nextString()
    .expect('recipient argument is missing or invalid');
  const zeroForOne = args
    .nextBool()
    .expect('zeroForOne argument is missing or invalid');
  const amountSpecified = args
    .nextI128()
    .expect('amountSpecified argument is missing or invalid');
  const sqrtPriceLimitX96 = args
    .nextU256()
    .expect('sqrtPriceLimitX96 argument is missing or invalid');

  // TODO: Implement swap logic
  // - Validate price limit
  // - Calculate swap through ticks
  // - Update pool state
  // - Transfer tokens
  // - Update fee growth

  generateEvent(`Swap:${recipient}:${zeroForOne}`);

  ReentrancyGuard.endNonReentrant();
}

/**
 * Collect fees from a position
 * @param binaryArgs - A StaticArray<u8> containing:
 *  - recipient: string - Address to receive fees
 *  - tickLower: i32 - Lower tick of the position
 *  - tickUpper: i32 - Upper tick of the position
 *  - amount0Requested: u128 - Maximum amount of token0 to collect
 *  - amount1Requested: u128 - Maximum amount of token1 to collect
 */
export function collect(binaryArgs: StaticArray<u8>): void {
  ReentrancyGuard.nonReentrant();

  const args = new Args(binaryArgs);
  const recipient = args
    .nextString()
    .expect('recipient argument is missing or invalid');
  const tickLower = args
    .nextI32()
    .expect('tickLower argument is missing or invalid');
  const tickUpper = args
    .nextI32()
    .expect('tickUpper argument is missing or invalid');
  const amount0Requested = args
    .nextU128()
    .expect('amount0Requested argument is missing or invalid');
  const amount1Requested = args
    .nextU128()
    .expect('amount1Requested argument is missing or invalid');

  // TODO: Implement fee collection logic
  // - Calculate fees owed to position
  // - Transfer fees to recipient
  // - Update position state

  generateEvent(`Collect:${recipient}:${tickLower}:${tickUpper}`);

  ReentrancyGuard.endNonReentrant();
}

/* Internals */

function _getFactoryOwner(
  factoryStored: string = Storage.get(FACTORY),
): Address {
  return new IFactory(new Address(factoryStored)).ownerAddress();
}

function onlyFactoryOwner(factoryStored: string = Storage.get(FACTORY)): void {
  assert(
    Context.caller() === _getFactoryOwner(factoryStored),
    'ONLY_FACTORY_OWNER',
  );
}
