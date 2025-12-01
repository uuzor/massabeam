import { Args, boolToByte, byteToBool, stringToBytes } from '@massalabs/as-types';
import { Context, generateEvent,
  
  getOpData,
  call,
  functionExists,
  hasOpKey,
  Storage, createSC, getBytecodeOf, Address } from '@massalabs/massa-as-sdk';

import { onlyOwner, setOwner, ownerAddress, isOwner } from '../utils/ownership';
import { ReentrancyGuard } from '../utils/reentrancyGuard';
import { feeAmountTickSpacing } from '../storage/factory';
import { FeeAmountEnabledEvent, PoolCreatedEvent } from '../utils/events';
import { _build_pool_key } from '../utils/helpers';
import { IPool } from '../interfaces/Ipool';

// Storage key for pool template contract address
const POOL_TEMPLATE_ADDRESS_KEY = 'POOL_TEMPLATE';
const POOLS = 'POOLS';

/**
 * This function is meant to be called only one time: when the contract is deployed.
 *
 * @param binaryArgs - Arguments serialized with Args:
 *  - poolTemplateAddress: string - The address of the pool contract template to be cloned
 */
export function constructor(binaryArgs: StaticArray<u8>): void {
  // This line is important. It ensures that this function can't be called in the future.
  // If you remove this check, someone could call your constructor function and reset your smart contract.
  assert(Context.isDeployingContract(), 'ALREADY_INITIALIZED');

  const args = new Args(binaryArgs);
  const poolTemplateAddress = args
    .nextString()
    .expect('poolTemplateAddress argument is missing or invalid');

  // Store the pool template address for cloning
  Storage.set(POOL_TEMPLATE_ADDRESS_KEY, poolTemplateAddress);
  Storage.set(POOLS, "");

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

  generateEvent('Factory initialized with pool template: ' + poolTemplateAddress);

  // Init Reentrancy guard
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
export function createPool(binaryArgs: StaticArray<u8>): StaticArray<u8> {
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

  
  // Get the pool template address from storage
  const poolTemplateAddress = Storage.get(POOL_TEMPLATE_ADDRESS_KEY);
  assert(poolTemplateAddress.length > 0, 'POOL_TEMPLATE_NOT_SET');

  // Get the pool template bytecode
  const poolTemplateByteCode = getBytecodeOf(
    new Address(poolTemplateAddress),
  );

  // Deploy a new pool contract (clone of the template)
  const poolAddress = createSC(poolTemplateByteCode);

  // // Initialize the pool contract using the IPool interface wrapper
  // // This calls the pool's constructor with the required parameters
  const poolContract = new IPool(poolAddress);
  poolContract.init(
    Context.caller(), // factory address
    new Address(tokenA),                                                        // token0
    new Address(tokenB),                                                        // token1
    fee,                                                                        // fee amount
    tickSpacing,                                                             // tick spacing
    200_000_000
  );

  // Store pool address in factory storage with the pool key
  // This allows querying the pool address later using (token0, token1, fee)
  Storage.set(poolKey, poolAddress.toString());
  addToList(poolAddress.toString());

  // Emit pool creation event with the deployed pool address
  generateEvent(PoolCreatedEvent(tokenA, tokenB, fee, tickSpacing,  poolAddress.toString()));

  // End Reentracy Security
  ReentrancyGuard.endNonReentrant();


  return poolTemplateByteCode;
}


function addToList(poolAddress: string) : void {
  const poolsString = Storage.has(POOLS) ? Storage.get(POOLS) : "";

  const list = poolsString.split(",");

  list.push(poolAddress);

  Storage.set(POOLS, list.join(","));
}

export function getPools(binaryArgs: StaticArray<u8>): StaticArray<u8> {
  const poolsString = Storage.has(POOLS) ? Storage.get(POOLS) : "";
  return stringToBytes(poolsString);
}


// const _preset = _getPreset(_binStep);

// const _pairBytes: StaticArray<u8> = fileToByteArray('build/Pair.wasm');
// const _pair = new IPair(createSC(_pairBytes));

// // Only send the amount of coins that were not already used (amount sent - amount used)
// _pair.init(
//   Context.callee(),
//   _tokenA,
//   _tokenB,
//   _activeId,
//   _preset,
//   SafeMath.sub(sent, SafeMath.sub(SCBalance, balance())),
// );

// const createdByOwner = _isOwner(caller.toString());
// _setLBPairInformation(
//   tokens.token0,
//   tokens.token1,
//   new LBPairInformation(_binStep, _pair, createdByOwner, false),
// );


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



/**
 * Get the pool address for a given token pair and fee
 *
 * @param binaryArgs - A StaticArray<u8> containing the serialized arguments:
 *  - tokenA: string - The address of the first token.
 *  - tokenB: string - The address of the second token.
 *  - fee: u64 - The fee amount.
 * @returns The pool contract address as bytes, or empty bytes if pool doesn't exist.
 */
export function getPool(binaryArgs: StaticArray<u8>): StaticArray<u8> {
  const args = new Args(binaryArgs);

  let tokenA = args
    .nextString()
    .expect('tokenA argument is missing or invalid');
  let tokenB = args
    .nextString()
    .expect('tokenB argument is missing or invalid');
  const fee = args.nextU64().expect('fee argument is missing or invalid');

  // Sort tokens canonically
  if (tokenA > tokenB) {
    const temp = tokenA;
    tokenA = tokenB;
    tokenB = temp;
  }

  // Retrieve pool address from storage
  const poolAddress = Storage.get(_build_pool_key(tokenA, tokenB, fee));
  return stringToBytes(poolAddress);
}

/**
 * Get the pool template address (internal helper)
 *
 * @returns The pool template contract address
 */
export function getPoolTemplate(): StaticArray<u8> {
  const poolTemplateAddress = Storage.get(POOL_TEMPLATE_ADDRESS_KEY);
  assert(poolTemplateAddress.length > 0, 'POOL_TEMPLATE_NOT_SET');
  return stringToBytes(poolTemplateAddress);
}

/**
 * Set the pool template address (owner only)
 * Used to upgrade or change the pool contract implementation
 *
 * @param binaryArgs - The new pool template address
 */
export function setPoolTemplate(binaryArgs: StaticArray<u8>): void {
  onlyOwner();

  const args = new Args(binaryArgs);
  const newTemplateAddress = args
    .nextString()
    .expect('template address argument is missing or invalid');

  Storage.set(POOL_TEMPLATE_ADDRESS_KEY, newTemplateAddress);

  generateEvent('Pool template address updated to: ' + newTemplateAddress);
}


export * from '../utils/ownership';