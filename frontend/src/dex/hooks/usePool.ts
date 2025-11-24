/**
 * Pool Hook
 * React hook for interacting with Pool contracts
 */

import { useState, useCallback } from 'react';
import { Args, PublicAPI } from '@massalabs/massa-web3';
import { web3 } from '@hicaru/bearby.js';

const API_URL = import.meta.env.VITE_API_URL || 'https://buildnet.massa.net/api/v2';
const DEFAULT_FEE = BigInt(100_000_000);

export interface PoolState {
  sqrtPriceX96: bigint;
  tick: number;
  liquidity: bigint;
  feeGrowthGlobal0X128: bigint;
  feeGrowthGlobal1X128: bigint;
}

export function usePool(poolAddress: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Get current pool state
   */
  const getPoolState = useCallback(async (): Promise<PoolState | null> => {
    if (!poolAddress) return null;

    try {
      setLoading(true);
      setError(null);

      const client = new PublicAPI(API_URL);
      const result = await client.executeReadOnlyCall({
        target: poolAddress,
        func: 'getState',
        parameter: new Uint8Array(),
        caller: web3.wallet.account?.base58 || '',
      });

      // Deserialize pool state
      const args = new Args(result.value);
      const sqrtPriceX96 = args.nextU256().unwrap();
      const tick = args.nextI32().unwrap();
      const liquidity = args.nextU128().unwrap();
      const feeGrowthGlobal0X128 = args.nextU256().unwrap();
      const feeGrowthGlobal1X128 = args.nextU256().unwrap();

      return {
        sqrtPriceX96: BigInt(sqrtPriceX96.toString()),
        tick,
        liquidity: BigInt(liquidity.toString()),
        feeGrowthGlobal0X128: BigInt(feeGrowthGlobal0X128.toString()),
        feeGrowthGlobal1X128: BigInt(feeGrowthGlobal1X128.toString()),
      };
    } catch (err: any) {
      setError(err.message || 'Failed to fetch pool state');
      return null;
    } finally {
      setLoading(false);
    }
  }, [poolAddress]);

  /**
   * Mint liquidity position
   */
  const mint = useCallback(
    async (
      recipient: string,
      tickLower: number,
      tickUpper: number,
      amount: bigint,
    ): Promise<string | null> => {
      if (!poolAddress) {
        setError('Pool address not set');
        return null;
      }

      try {
        setLoading(true);
        setError(null);

        const args = new Args()
          .addString(recipient)
          .addI32(tickLower)
          .addI32(tickUpper)
          .addU128(amount);

        const result = await web3.contract.call({
          targetAddress: poolAddress,
          functionName: 'mint',
          unsafeParameters: args.serialize(),
          maxGas: BigInt(3_000_000_000),
          coins: 0,
          fee: DEFAULT_FEE,
        });

        return result.operationId;
      } catch (err: any) {
        setError(err.message || 'Failed to mint liquidity');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [poolAddress],
  );

  /**
   * Burn liquidity position
   */
  const burn = useCallback(
    async (tickLower: number, tickUpper: number, amount: bigint): Promise<string | null> => {
      if (!poolAddress) {
        setError('Pool address not set');
        return null;
      }

      try {
        setLoading(true);
        setError(null);

        const args = new Args()
          .addI32(tickLower)
          .addI32(tickUpper)
          .addU128(amount);

        const result = await web3.contract.call({
          targetAddress: poolAddress,
          functionName: 'burn',
          unsafeParameters: args.serialize(),
          maxGas: BigInt(3_000_000_000),
          coins: 0,
          fee: DEFAULT_FEE,
        });

        return result.operationId;
      } catch (err: any) {
        setError(err.message || 'Failed to burn liquidity');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [poolAddress],
  );

  /**
   * Collect fees from position
   */
  const collect = useCallback(
    async (
      recipient: string,
      tickLower: number,
      tickUpper: number,
      amount0Requested: bigint,
      amount1Requested: bigint,
    ): Promise<string | null> => {
      if (!poolAddress) {
        setError('Pool address not set');
        return null;
      }

      try {
        setLoading(true);
        setError(null);

        const args = new Args()
          .addString(recipient)
          .addI32(tickLower)
          .addI32(tickUpper)
          .addU128(amount0Requested)
          .addU128(amount1Requested);

        const result = await web3.contract.call({
          targetAddress: poolAddress,
          functionName: 'collect',
          unsafeParameters: args.serialize(),
          maxGas: BigInt(2_000_000_000),
          coins: 0,
          fee: DEFAULT_FEE,
        });

        return result.operationId;
      } catch (err: any) {
        setError(err.message || 'Failed to collect fees');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [poolAddress],
  );

  /**
   * Get position info
   */
  const getPosition = useCallback(
    async (owner: string, tickLower: number, tickUpper: number) => {
      if (!poolAddress) return null;

      try {
        const client = new PublicAPI(API_URL);
        const args = new Args()
          .addString(owner)
          .addI32(tickLower)
          .addI32(tickUpper);

        const result = await client.executeReadOnlyCall({
          target: poolAddress,
          func: 'getPosition',
          parameter: args.serialize(),
          caller: owner,
        });

        const resultArgs = new Args(result.value);
        const liquidity = resultArgs.nextU128().unwrap();
        const feeGrowthInside0LastX128 = resultArgs.nextU256().unwrap();
        const feeGrowthInside1LastX128 = resultArgs.nextU256().unwrap();
        const tokensOwed0 = resultArgs.nextU128().unwrap();
        const tokensOwed1 = resultArgs.nextU128().unwrap();

        return {
          liquidity: BigInt(liquidity.toString()),
          feeGrowthInside0LastX128: BigInt(feeGrowthInside0LastX128.toString()),
          feeGrowthInside1LastX128: BigInt(feeGrowthInside1LastX128.toString()),
          tokensOwed0: BigInt(tokensOwed0.toString()),
          tokensOwed1: BigInt(tokensOwed1.toString()),
        };
      } catch (err: any) {
        console.error('Failed to fetch position:', err);
        return null;
      }
    },
    [poolAddress],
  );

  return {
    getPoolState,
    mint,
    burn,
    collect,
    getPosition,
    loading,
    error,
  };
}
