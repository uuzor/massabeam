import { Args, boolToByte } from '@massalabs/as-types';
import { Context, generateEvent, Storage } from '@massalabs/massa-as-sdk';
import { onlyOwner, setOwner } from '../utils/ownership';
import { ReentrancyGuard } from '../utils/reentrancyGuard';
import { feeAmountTickSpacing } from '../storage/factory';
import { FeeAmountEnabledEvent, PoolCreatedEvent } from '../utils/events';
import { _build_pool_key } from '../utils/helpers';

/**
 * This function is meant to be called only one time: when the contract is deployed.
 *
 * @param _ - not used
 */
export function constructor(_: StaticArray<u8>): void {
  // This line is important. It ensures that this function can't be called in the future.
  // If you remove this check, someone could call your constructor function and reset your smart contract.
  assert(Context.isDeployingContract(), 'ALREADY_INITIALIZED');

  // Set the contract owner to the caller
  setOwner(new Args().add(Context.caller().toString()).serialize());

  // Set default tick spacing for each fee amount
  feeAmountTickSpacing.set(500, 10);
  feeAmountTickSpacing.set(3000, 60);
  feeAmountTickSpacing.set(10000, 200);

  // Generate events for enabled fee amounts
  generateEvent(FeeAmountEnabledEvent(500, 10));
  generateEvent(FeeAmountEnabledEvent(3000, 60));
  generateEvent(FeeAmountEnabledEvent(10000, 200));

  generateEvent('Factory initialized');

  // Init Reeentrancy guard
  ReentrancyGuard.__ReentrancyGuard_init();
}

/**
 * Creates a new liquidity pool for the given token pair and fee.
 * 
 * @param binaryArgs - A StaticArray<u8> containing the serialized arguments:
 *  - tokenA: string - The address of the first token.
 *  - tokenB: string - The address of the second token.
 *  - fee: u64 - The fee amount for the pool.
 * @throws If tokenA and tokenB are the same, if the fee is not enabled, or if the pool already exists.
 */
export function createPool(binaryArgs: StaticArray<u8>): void {
  // Start Reentracy Security
  ReentrancyGuard.nonReentrant();

  const args = new Args(binaryArgs);

  let tokenA = args
    .nextString()
    .expect('tokenA argument is missing or invalid');
  let tokenB = args
    .nextString()
    .expect('tokenB argument is missing or invalid');
  const fee = args.nextU64().expect('fee argument is missing or invalid');

  assert(tokenA != tokenB, 'tokenA and tokenB must be different');

  // Sort tokens
  if (tokenA > tokenB) {
    const temp = tokenA;
    tokenA = tokenB;
    tokenB = temp;
  }

  // Get tick spacing for the given fee amount
  const tickSpacing = feeAmountTickSpacing.get(fee, 0);

  assert(tickSpacing > 0, 'FEE_NOT_ENABLED');

  // Build pool key
  const poolKey = _build_pool_key(tokenA, tokenB, fee);

  // Ensure that the pool does not already exist by checking if the key exists on storage
  assert(!Storage.has(poolKey), 'POOL_ALREADY_EXISTS');

  // TODO: Deploy pool contract

  generateEvent(PoolCreatedEvent(tokenA, tokenB, fee, tickSpacing, poolKey));

  // End Reentracy Security
  ReentrancyGuard.endNonReentrant();
}

/**
 * Enables a new fee amount with an associated tick spacing.
 * This function can only be called by the contract owner.
 *
 * @param binaryArgs - A StaticArray<u8> containing the serialized arguments:
 *  - fee: u64 - The fee amount to enable.
 *  - tickSpacing: u64 - The tick spacing associated with the fee amount.
 * @throws If the fee is too high, tick spacing is too wide, or the fee is already enabled.
 */
export function enableFeeAmount(binaryArgs: StaticArray<u8>): void {
  onlyOwner();

  const args = new Args(binaryArgs);

  const fee = args.nextU64().expect('fee argument is missing or invalid');
  const tickSpacing = args
    .nextU64()
    .expect('tickSpacing argument is missing or invalid');

  assert(fee < 1_000_000, 'FEE_TOO_HIGH');

  // tick spacing is capped at 16384 to prevent the situation where tickSpacing is so large
  // 16384 ticks represents a >5x price change with ticks of 1 bips
  assert(tickSpacing <= 16384, 'TICK_SPACING_TOO_WIDE');

  // Fee amount cannot be already enabled
  assert(feeAmountTickSpacing.get(fee, 0) == 0, 'FEE_ALREADY_ENABLED');

  feeAmountTickSpacing.set(fee, tickSpacing);

  generateEvent(FeeAmountEnabledEvent(fee, tickSpacing));
}

/**
 * Checks if a pool exists for the given token pair and fee.
 *
 * @param binaryArgs - A StaticArray<u8> containing the serialized arguments:
 *  - tokenA: string - The address of the first token.
 *  - tokenB: string - The address of the second token.
 *  - fee: u64 - The fee amount.
 * @returns A StaticArray<u8> containing a single byte: 1 if the pool exists, 0 otherwise.
 */
export function isPoolExist(binaryArgs: StaticArray<u8>): StaticArray<u8> {
  const args = new Args(binaryArgs);

  let tokenA = args
    .nextString()
    .expect('tokenA argument is missing or invalid');
  let tokenB = args
    .nextString()
    .expect('tokenB argument is missing or invalid');
  const fee = args.nextU64().expect('fee argument is missing or invalid');

  // Sort tokens
  if (tokenA > tokenB) {
    const temp = tokenA;
    tokenA = tokenB;
    tokenB = temp;
  }

  return boolToByte(Storage.has(_build_pool_key(tokenA, tokenB, fee)));
}
