/**
 * Factory Contract Hook
 * Manages pool creation and factory interactions
 */

import { useState, useCallback } from 'react';
import { web3 } from '@hicaru/bearby.js';
import { Args, PublicAPI } from '@massalabs/massa-web3';
import { CONTRACTS, API_URL, GAS_LIMITS, DEFAULT_FEE } from '../utils/contracts';

export function useFactory() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Create a new pool
   */
  const createPool = useCallback(
    async (tokenA: string, tokenB: string, fee: number) => {
      setLoading(true);
      setError(null);

      try {
        if (!web3.wallet.connected) {
          throw new Error('Wallet not connected');
        }

        const args = new Args()
          .addString(tokenA)
          .addString(tokenB)
          .addU64(BigInt(fee));

        const result = await web3.contract.call({
          targetAddress: CONTRACTS.factory,
          functionName: 'createPool',
          unsafeParameters: args.serialize(),
          maxGas: GAS_LIMITS.CREATE_POOL,
          coins: 0,
          fee: DEFAULT_FEE,
        });

        setLoading(false);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create pool';
        setError(message);
        setLoading(false);
        throw err;
      }
    },
    []
  );

  /**
   * Check if pool exists
   */
  const isPoolExist = useCallback(
    async (tokenA: string, tokenB: string, fee: number): Promise<boolean> => {
      try {
        const client = new PublicAPI(API_URL);
        const args = new Args()
          .addString(tokenA)
          .addString(tokenB)
          .addU64(BigInt(fee));

        const result = await client.executeReadOnlyCall({
          target: CONTRACTS.factory,
          func: 'isPoolExist',
          parameter: args.serialize(),
          caller: web3.wallet.account?.base58 || '',
        });

        // Parse boolean result
        return result.value.length > 0 && result.value[0] === 1;
      } catch (err) {
        console.error('Error checking pool existence:', err);
        return false;
      }
    },
    []
  );

  /**
   * Enable a new fee amount (owner only)
   */
  const enableFeeAmount = useCallback(
    async (fee: number, tickSpacing: number) => {
      setLoading(true);
      setError(null);

      try {
        if (!web3.wallet.connected) {
          throw new Error('Wallet not connected');
        }

        const args = new Args()
          .addU64(BigInt(fee))
          .addU64(BigInt(tickSpacing));

        const result = await web3.contract.call({
          targetAddress: CONTRACTS.factory,
          functionName: 'enableFeeAmount',
          unsafeParameters: args.serialize(),
          maxGas: BigInt(2_000_000_000),
          coins: 0,
          fee: DEFAULT_FEE,
        });

        setLoading(false);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to enable fee amount';
        setError(message);
        setLoading(false);
        throw err;
      }
    },
    []
  );

  return {
    createPool,
    isPoolExist,
    enableFeeAmount,
    loading,
    error,
  };
}
