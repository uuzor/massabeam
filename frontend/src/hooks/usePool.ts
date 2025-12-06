/**
 * Pool Contract Hook
 * Manages individual pool interactions (liquidity, swaps, position management)
 */

import { useState, useCallback } from 'react';
import { Args, bytesToF64, bytesToStr, Mas, OperationStatus, U256 } from '@massalabs/massa-web3';
import {  readContract, callContract } from './useFactory';




interface PoolMetadata {
  token0: string;
  token1: string;
  fee: bigint;
  tickSpacing: bigint;
  factory: string;
  maxLiqPerTick: bigint | number;
}

interface PoolState {
  sqrtPriceX96: bigint;
  tick: number | bigint;
  liquidity: bigint;
  feeGrowth0: bigint;
  feeGrowth1: bigint;
}

interface Position {
  owner: string;
  tickLower: number;
  tickUpper: number;
  liquidity: bigint;
  tokensOwed0: bigint;
  tokensOwed1: bigint;
}

interface SwapParams {
  recipient: string;
  zeroForOne: boolean;
  amountSpecified: bigint;
  sqrtPriceLimitX96: bigint;
  coins?: bigint; // Optional coins to send with the transaction
}

interface MintParams {
  recipient: string;
  tickLower: number;
  tickUpper: number;
  liquidityDelta: bigint;
  coins?: bigint; // Optional coins to send with the transaction
}

interface BurnParams {
  tickLower: number;
  tickUpper: number;
  liquidityDelta: bigint;
}

interface CollectParams {
  recipient: string;
  tickLower: number;
  tickUpper: number;
  amount0Requested: bigint;
  amount1Requested: bigint;
}

export function usePool(poolAddress: string, isConnected: boolean, provider: any, userAddress: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Get the complete pool metadata (immutable values)
   * @returns Pool metadata including tokens, fee, tick spacing, factory
   */
  const getPoolMetadata = useCallback(async (): Promise<PoolMetadata | null> => {
    try {
      const result = await readContract(provider, poolAddress, 'getPoolMetadata', new Args());

      if (result && result.length > 0) {
        const args = new Args(result);
        return {
          token0: args.nextString(),
          token1: args.nextString(),
          fee: args.nextU64(),
          tickSpacing: args.nextU64(),
          factory: args.nextString(),
          maxLiqPerTick: Number(args.nextString()),
        };
      }

      return null;
    } catch (err) {
      console.error('Error getting pool metadata:', err);
      return null;
    }
  }, [poolAddress]);

  /**
   * Get the current pool state (price, tick, liquidity, fee growth)
   * @returns Pool state with current conditions
   */
  const getPoolState = useCallback(async (): Promise<PoolState | null> => {
    try {
      const result = await readContract(provider, poolAddress, 'getState', new Args());

      if (result && result.length > 0) {
        const args = new Args(result);
        return {
          sqrtPriceX96: args.nextU256(),
          tick: args.nextI32(),
          liquidity: args.nextU128(),
          feeGrowth0: args.nextU256(),
          feeGrowth1: args.nextU256(),
        };
      }

      return null;
    } catch (err) {
      console.error('Error getting pool state:', err);
      return null;
    }
  }, [poolAddress]);

  /**
   * Get current sqrt price (X96 format)
   * @returns sqrt price as bigint
   */
  const getSqrtPriceX96 = useCallback(async (): Promise<bigint| number | null> => {
    try {
      const result = await readContract(provider, poolAddress, 'getPrice', new Args());

      if (result) {
        console.log(result)
        console.log(U256.fromBytes(result))
        
        return BigInt(U256.fromBytes(result).toString());
      }

      return null;
    } catch (err) {
      console.error('Error getting sqrt price:', err);
      return null;
    }
  }, [poolAddress]);

  /**
   * Get current tick
   * @returns Current tick as number
   */
  const getTick = useCallback(async (): Promise<number | bigint | null> => {
    try {
      const result = await readContract(provider, poolAddress, 'getTick', new Args());

      if (result && result.length > 0) {
        const args = new Args(result);
        return args.nextI32();
      }

      return null;
    } catch (err) {
      console.error('Error getting tick:', err);
      return null;
    }
  }, [poolAddress]);

  /**
   * Get current liquidity
   * @returns Current liquidity as bigint
   */
  const getLiquidity = useCallback(async (): Promise<bigint| number | null> => {
    try {
      const result = await readContract(provider, poolAddress, 'getLiquidity', new Args());

      if (result && result.length > 0) {
        return bytesToF64(result);
      }

      return null;
    } catch (err) {
      console.error('Error getting liquidity:', err);
      return null;
    }
  }, [poolAddress]);

  /**
   * Get pool tokens (token0 and token1)
   * @returns Tuple of token addresses
   */
  const getTokens = useCallback(async (): Promise<[string, string] | null> => {
    try {
      const result = await readContract(provider, poolAddress, 'getTokens', new Args());

      if (result && result.length > 0) {
        const args = new Args(result);
        return [args.nextString(), args.nextString()];
      }

      return null;
    } catch (err) {
      console.error('Error getting tokens:', err);
      return null;
    }
  }, [poolAddress]);

  /**
   * Get pool fee
   * @returns Fee as bigint
   */
  const getFee = useCallback(async (): Promise<bigint| number | null> => {
    try {
      const result = await readContract(provider, poolAddress, 'getFee', new Args());

      if (result && result.length > 0) {
        return bytesToF64(result);
      }

      return null;
    } catch (err) {
      console.error('Error getting fee:', err);
      return null;
    }
  }, [poolAddress]);

  /**
   * Get tick spacing
   * @returns Tick spacing as bigint
   */
  const getTickSpacing = useCallback(async (): Promise<bigint | number | null> => {
    try {
      const result = await readContract(provider, poolAddress, 'getTickSpacing', new Args());

      if (result && result.length > 0) {
        return bytesToF64(result);
      }

      return null;
    } catch (err) {
      console.error('Error getting tick spacing:', err);
      return null;
    }
  }, [poolAddress]);

  /**
   * Get position details
   * @param owner - Position owner address
   * @param tickLower - Lower tick boundary
   * @param tickUpper - Upper tick boundary
   * @returns Position data
   */
  const getPosition = useCallback(
    async (owner: string, tickLower: number, tickUpper: number): Promise<Position | null> => {
      try {
        const args = new Args()
          .addString(owner)
          .addI32(BigInt(tickLower))
          .addI32(BigInt(tickUpper));

        const result = await readContract(provider, poolAddress, 'getPosition', args);

        if (result && result.length > 0) {
          const posArgs = new Args(result);
          return {
            owner,
            tickLower,
            tickUpper,
            liquidity: posArgs.nextU128(),
            tokensOwed0: posArgs.nextU128(),
            tokensOwed1: posArgs.nextU128(),
          };
        }

        return null;
      } catch (err) {
        console.error('Error getting position:', err);
        return null;
      }
    },
    [poolAddress]
  );

  /**
   * Get maximum liquidity per tick
   * @returns Max liquidity as bigint
   */
  const getMaxLiquidityPerTick = useCallback(async (): Promise<bigint | number | null> => {
    try {
      const result = await readContract(provider, poolAddress, 'getMaxLiquidityPerTick', new Args());

      if (result && result.length > 0) {
        return bytesToF64(result);
      }

      return null;
    } catch (err) {
      console.error('Error getting max liquidity per tick:', err);
      return null;
    }
  }, [poolAddress]);

  /**
   * Get fee growth global for token0
   * @returns Fee growth as bigint
   */
  const getFeeGrowthGlobal0 = useCallback(async (): Promise<bigint | number | null> => {
    try {
      const result = await readContract(provider, poolAddress, 'getFeeGrowthGlobal0', new Args());

      if (result && result.length > 0) {
        return bytesToF64(result);
      }

      return null;
    } catch (err) {
      console.error('Error getting fee growth global0:', err);
      return null;
    }
  }, [poolAddress]);

  /**
   * Get fee growth global for token1
   * @returns Fee growth as bigint
   */
  const getFeeGrowthGlobal1 = useCallback(async (): Promise<bigint |number | null> => {
    try {
      const result = await readContract(provider, poolAddress, 'getFeeGrowthGlobal1', new Args());

      if (result && result.length > 0) {
        return bytesToF64(result);
      }

      return null;
    } catch (err) {
      console.error('Error getting fee growth global1:', err);
      return null;
    }
  }, [poolAddress]);

  /**
   * Get protocol fees for both tokens
   * @returns Tuple of [fee0, fee1]
   */
  const getProtocolFees = useCallback(async (): Promise<[bigint, bigint] | null> => {
    try {
      const result = await readContract(provider, poolAddress, 'getProtocolFees', new Args());

      if (result && result.length > 0) {
        const args = new Args(result);
        return [args.nextU128(), args.nextU128()];
      }

      return null;
    } catch (err) {
      console.error('Error getting protocol fees:', err);
      return null;
    }
  }, [poolAddress]);

  /**
   * Get factory address
   * @returns Factory contract address
   */
  const getFactory = useCallback(async (): Promise<string | null> => {
    try {
      const result = await readContract(provider, poolAddress, 'getFactory', new Args());

      if (result && result.length > 0) {
        const args = new Args(result);
        return args.nextString();
      }

      return null;
    } catch (err) {
      console.error('Error getting factory:', err);
      return null;
    }
  }, [poolAddress]);

  /**
   * Mint liquidity to a position
   * @param params - Mint parameters
   * @returns Operation ID
   */
  const mint = useCallback(
    async (params: MintParams, coins = Mas.fromMas(0n)): Promise<string | null> => {
      setLoading(true);
      setError(null);

      try {
        if (!isConnected || !userAddress) {
          throw new Error('Wallet not connected. Please connect your wallet first.');
        }
        console.log('Mint params:', params);
        console.log('Coins:', coins);
        const args = new Args()
          .addString(params.recipient)
          .addI32(BigInt(params.tickLower))
          .addI32(BigInt(params.tickUpper))
          .addU128(params.liquidityDelta);

        const op = await callContract(provider, poolAddress, 'mint', args, coins);

        console.log('Liquidity minted successfully:', op);
        return op.id;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to mint liquidity';
        setError(message);
        console.error('Mint error:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [isConnected, userAddress, poolAddress]
  );

  /**
   * Burn liquidity from a position
   * @param params - Burn parameters
   * @returns Operation ID
   */
  const burn = useCallback(
    async (params: BurnParams): Promise<string | null> => {
      setLoading(true);
      setError(null);

      try {
        if (!isConnected || !userAddress) {
          throw new Error('Wallet not connected. Please connect your wallet first.');
        }

        const args = new Args()
          .addI32(BigInt(params.tickLower))
          .addI32(BigInt(params.tickUpper))
          .addU128(params.liquidityDelta);

        const op = await callContract(provider, poolAddress, 'burn', args);

        console.log('Liquidity burned successfully:', op);
        return op.id;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to burn liquidity';
        setError(message);
        console.error('Burn error:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [isConnected, userAddress, poolAddress]
  );

  /**
   * Swap tokens
   * @param params - Swap parameters
   * @returns Operation ID
   */
  const swap = useCallback(
    async (params: SwapParams, coins = Mas.fromMas(0n)): Promise<string | null> => {
      setLoading(true);
      setError(null);

      try {
        if (!isConnected || !userAddress) {
          throw new Error('Wallet not connected. Please connect your wallet first.');
        }

        const args = new Args()
          .addString(params.recipient)
          .addBool(params.zeroForOne)
          .addI128(params.amountSpecified)
          .addU256(params.sqrtPriceLimitX96);

        const op = await callContract(provider, poolAddress, 'swap', args, coins);

        console.log('Swap executed successfully:', op);
        return op.id;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to execute swap';
        setError(message);
        console.error('Swap error:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [isConnected, userAddress, poolAddress]
  );

  /**
   * Collect fees from a position
   * @param params - Collect parameters
   * @returns Operation ID
   */
  const collect = useCallback(
    async (params: CollectParams): Promise<string | null> => {
      setLoading(true);
      setError(null);

      try {
        if (!isConnected || !userAddress) {
          throw new Error('Wallet not connected. Please connect your wallet first.');
        }

        const args = new Args()
          .addString(params.recipient)
          .addI32(BigInt(params.tickLower))
          .addI32(BigInt(params.tickUpper))
          .addU128(params.amount0Requested)
          .addU128(params.amount1Requested);

        const op = await callContract(provider, poolAddress, 'collect', args);

        console.log('Fees collected successfully:', op);
        return op.id;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to collect fees';
        setError(message);
        console.error('Collect error:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [isConnected, userAddress, poolAddress]
  );

  return {
    // Read-only functions
    getPoolMetadata,
    getPoolState,
    getSqrtPriceX96,
    getTick,
    getLiquidity,
    getTokens,
    getFee,
    getTickSpacing,
    getPosition,
    getMaxLiquidityPerTick,
    getFeeGrowthGlobal0,
    getFeeGrowthGlobal1,
    getProtocolFees,
    getFactory,

    // State-changing functions
    mint,
    burn,
    swap,
    collect,

    // State
    loading,
    error,
    isConnected,
  };
}