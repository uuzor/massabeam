/**
 * Factory Contract Hook
 * Manages pool creation and factory interactions
 */


import { useState, useCallback } from 'react';
import { web3 } from '@hicaru/bearby.js';
import { Args, bytesToStr, Mas, OperationStatus, PublicAPI } from '@massalabs/massa-web3';
import { useWallet } from './useWallet';

const API_URL = 'https://buildnet.massa.net/api/v2';

// Generic contract call wrapper
export async function callContract(
  provider: any,
  contractAddress: string,
  functionName: string,
  args: Args,
  amount = Mas.fromMas(0n),
  fee = Mas.fromMas(0n), // 0.1 MAS fee
  maxGas: bigint = BigInt(300_000_000)
) {
  if (!provider) {
    throw new Error("Wallet not connected");
  }

  try {
    const coins = Mas.fromMas(amount + fee);

    const operation = await provider.callSC({
      target: contractAddress,
      func: functionName,
      parameter: args,
      coins,
      maxGas,
    });

    const status = await operation.waitSpeculativeExecution();
    if (status !== OperationStatus.SpeculativeSuccess) {
      throw new Error(`Transaction failed with status: ${status}`);
    }

    return operation;
  } catch (error) {
    console.error(`Contract call failed: ${functionName}`, error);
    throw error;
  }
}



// Generic contract read wrapper
export async function readContract(provider,contractAddress, functionName, args) {
  
  if (!provider) {
    throw new Error("Wallet not connected");
  }

  try {
    const result = await provider.readSC({
      target: contractAddress,
      func: functionName,
      parameter: args,
      maxGas: 1_000_000_000n,
      coins: Mas.fromString("0.1"), 
    });
    console.log("Contract read result:", result);
    return result.value;
  } catch (error) {
    console.error(`Contract read failed: ${functionName}`, error);
    throw error;
  }
}

export function useFactory(factoryAddress: string, isConnected, provider, userAddress) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
    


  /**
   * Create a new pool with the specified token pair and fee tier
   * @param tokenA - Address of the first token
   * @param tokenB - Address of the second token
   * @param fee - Fee tier (500, 3000, or 10000)
   * @returns Pool address if successful
   */
  const createPool = useCallback(
    async (tokenA: string, tokenB: string, fee: number) => {
      setLoading(true);
      setError(null);

      try {
        if (!isConnected || !userAddress) {
          throw new Error('Wallet not connected. Please connect your wallet first.');
        }

        const args = new Args()
          .addString(tokenA)
          .addString(tokenB)
          .addU64(BigInt(fee));

        const op = await callContract(provider, factoryAddress, "createPool", args, Mas.fromMas(0n), Mas.fromMas(100_000_000n), BigInt(1_000_000_000));

        console.log('Pool created successfully:', op);
        return op.id;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create pool';
        setError(message);
        console.error('Pool creation error:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [isConnected, factoryAddress]
  );

  /**
   * Check if a pool exists for the given token pair and fee
   * @param tokenA - Address of the first token
   * @param tokenB - Address of the second token
   * @param fee - Fee tier
   * @returns true if pool exists, false otherwise
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
          target: factoryAddress,
          func: 'isPoolExist',
          parameter: args.serialize(),
          caller: userAddress || web3.wallet.account?.base58 || '',
        });

        // Parse boolean result from contract
        return result.value.length > 0 && result.value[0] === 1;
      } catch (err) {
        console.error('Error checking pool existence:', err);
        return false;
      }
    },
    [factoryAddress, userAddress]
  );

  /**
   * Get the pool address for a given token pair and fee
   * @param tokenA - Address of the first token
   * @param tokenB - Address of the second token
   * @param fee - Fee tier
   * @returns Pool address string
   */
  const getPool = useCallback(
    async (tokenA: string, tokenB: string, fee: number): Promise<any> => {
      try {
       
        const args = new Args()
          .addString(tokenA)
          .addString(tokenB)
          .addU64(BigInt(fee));

        const result = await readContract(provider, factoryAddress, "getPoolMetadat", args)

        // Parse address result from contract
        if (result && result.length > 0) {
          console.log(result);
          const metadataArgs = new Args(result);
          const token0 = metadataArgs.nextString();
          const token1 = metadataArgs.nextString();
          const feeRead = metadataArgs.nextU64();
          const tickSpacingRead = metadataArgs.nextU64();
          const factoryRead = metadataArgs.nextString();

          return {
            token0,
            token1,
            feeRead,
            tickSpacingRead
          }
        }

        return null;
      } catch (err) {
        console.error('Error getting pool address:', err);
        return null;
      }
    },
    [factoryAddress, userAddress]
  );

  /**
   * Enable a new fee amount with associated tick spacing (owner only)
   * @param fee - Fee tier to enable
   * @param tickSpacing - Tick spacing for this fee tier
   */
  const enableFeeAmount = useCallback(
    async (fee: number, tickSpacing: number) => {
      setLoading(true);
      setError(null);

      try {
        if (!isConnected || !web3.wallet.connected) {
          throw new Error('Wallet not connected. Please connect your wallet first.');
        }

        const args = new Args()
          .addU64(BigInt(fee))
          .addU64(BigInt(tickSpacing));

        const result = await web3.contract.call({
          targetAddress: factoryAddress,
          functionName: 'enableFeeAmount',
          unsafeParameters: args.serialize(),
          maxGas: 2_000_000_000,
          coins: 0,
          fee: 0,
        });

        console.log('Fee amount enabled successfully:', result);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to enable fee amount';
        setError(message);
        console.error('Enable fee amount error:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [isConnected, factoryAddress]
  );

  /**
   * Get all pools created by the factory
   * @returns Array of pool addresses
   */
  const getPools = useCallback(
    async (): Promise<string[]> => {
      try {
        

        const result = await readContract(provider, factoryAddress, "getPools", new Args());
        console.log(result)
        // Parse pools list from contract
        if (result && result.length > 0) {
          // const args_result = new Args(result.value);
          const poolsString = bytesToStr(result)
          return poolsString.split(',').filter(addr => addr.length > 0);
        }

        return [];
      } catch (err) {
        console.error('Error getting pools list:', err);
        return [];
      }
    },
    [factoryAddress, userAddress]
  );

  return {
    createPool,
    isPoolExist,
    getPool,
    enableFeeAmount,
    getPools,
    loading,
    error,
    isConnected,
  };
}
