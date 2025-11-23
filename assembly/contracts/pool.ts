import { Address, Context, Storage } from '@massalabs/massa-as-sdk';
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
