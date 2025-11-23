import { stringToBytes } from '@massalabs/as-types';
import { PersistentMap } from '../utils/collections/persistentMap';
import { u256 } from 'as-bignum/assembly';

export const FACTORY = 'factory';
export const TOKEN_0 = 'token0';
export const TOKEN_1 = 'token1';
export const FEE = stringToBytes('fee');
export const TICK_SPACING = stringToBytes('tickSpacing');
export const maxLiquidityPerTick = stringToBytes('maxLiquidityPerTick');
export const poolState = stringToBytes('poolState');
// The fee growth of token 0 collected per unit of liquidity for the entire life of the pool
export const feeGrowthGlobal0 = stringToBytes('feeGrowthGlobal0');
// The fee growth of token 1 collected per unit of liquidity for the entire life of the pool
export const feeGrowthGlobal1 = stringToBytes('feeGrowthGlobal1');
// Accumulated Protocol fees collected of token 0
export const protocolFee0 = stringToBytes('protocolFee0');
// Accumulated Protocol fees collected of token 1
export const protocolFee1 = stringToBytes('protocolFee1');
// Available liquidity in current range
export const liquidity = stringToBytes('liquidity');
