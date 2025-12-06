/**
 * Token Contract Hook
 * Manages token interactions (balance, allowance, symbol, decimals)
 */

import { useState, useCallback } from 'react';
import { Args, bytesToF64, bytesToStr } from '@massalabs/massa-web3';
import { callContract, readContract } from './useFactory';

interface TokenInfo {
  symbol: string;
  decimals: number;
  balance: bigint;
  allowance: bigint;
}

export function useToken(
  tokenAddress: string,
  isConnected: boolean,
  provider: any,
  userAddress: string
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Get token symbol
   * @returns Token symbol as string
   */
  const getSymbol = useCallback(async (): Promise<string | null> => {
    try {
      if (!tokenAddress) return null;
      if (tokenAddress === "NATIVE_MAS") return "MAS";

      const result = await readContract(provider, tokenAddress, 'symbol', new Args());

      if (result && result.length > 0) {
        return bytesToStr(result);
      }

      return null;
    } catch (err) {
      console.error('Error getting token symbol:', err);
      return null;
    }
  }, [tokenAddress, provider]);

  /**
   * Get token decimals
   * @returns Number of decimals
   */
  const getDecimals = useCallback(async (): Promise<number | null> => {
    try {
      if (!tokenAddress) return null;
      if (tokenAddress === "NATIVE_MAS") return 9;

      const result = await readContract(provider, tokenAddress, 'decimals', new Args());

      if (result && result.length > 0) {
        const args = new Args(result);
        return Number(args.nextU8());
      }

      return null;
    } catch (err) {
      console.error('Error getting token decimals:', err);
      return null;
    }
  }, [tokenAddress, provider]);

  /**
   * Get token balance for an address
   * @param account - Account address to check balance for
   * @returns Balance as bigint
   */
  const balanceOf = useCallback(
    async (account: string): Promise<bigint | null> => {
      try {
        if (!tokenAddress || !account) return null;
        if (tokenAddress == "NATIVE_MAS") {
          const balance = await provider.balanceOf(account);
          return BigInt(balance.toString());
        }

        const args = new Args().addString(account);
        const result = await readContract(provider, tokenAddress, 'balanceOf', args);
        
        if (result && result.length > 0) {
          const balanceArgs = new Args(result);
          
          
          return balanceArgs.nextU256()
        }

        return null;
      } catch (err) {
        console.error('Error getting balance:', err);
        return null;
      }
    },
    [tokenAddress, provider]
  );

  /**
   * Get token allowance for a spender
   * @param owner - Owner address
   * @param spender - Spender address (usually a contract like pool or router)
   * @returns Allowance amount as bigint
   */
  const allowance = useCallback(
    async (owner: string, spender: string): Promise<bigint | null> => {
      try {
        if (!tokenAddress || !owner || !spender) return null;
        if (tokenAddress === "NATIVE_MAS") return BigInt(2)**BigInt(256) - BigInt(1); // Infinite allowance for native MAS

        const args = new Args().addString(owner).addString(spender);
        const result = await readContract(provider, tokenAddress, 'allowance', args);

        if (result && result.length > 0) {
          const allowanceArgs = new Args(result);
          return allowanceArgs.nextU256();
        }

        return null;
      } catch (err) {
        console.error('Error getting allowance:', err);
        return null;
      }
    },
    [tokenAddress, provider]
  );

  /**
   * Approve a spender to spend tokens
   * @param spender - Spender address
   * @param amount - Amount to approve
   * @returns Operation ID
   */
  const approve = useCallback(
    async (spender: string, amount: bigint): Promise<string | null> => {
      setLoading(true);
      setError(null);

      try {
        if (!isConnected || !userAddress) {
          throw new Error('Wallet not connected. Please connect your wallet first.');
        }

        if (!tokenAddress || !spender) {
          throw new Error('Token address or spender not provided');
        }
        
        if (tokenAddress === "NATIVE_MAS") {
          return null;
        }

        const args = new Args().addString(spender).addU256(amount);

        const op = await callContract(provider, tokenAddress, 'approve', args);

        console.log('Token approved successfully:', op);
        return op.id;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to approve token';
        setError(message);
        console.error('Approve error:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [isConnected, userAddress, tokenAddress, provider]
  );

  /**
   * Increase allowance for a spender
   * @param spender - Spender address
   * @param addedValue - Additional amount to approve
   * @returns Operation ID
   */
  const increaseAllowance = useCallback(
    async (spender: string, addedValue: bigint): Promise<string | null> => {
      setLoading(true);
      setError(null);

      try {
        if (!isConnected || !userAddress) {
          throw new Error('Wallet not connected. Please connect your wallet first.');
        }

        if (!tokenAddress || !spender) {
          throw new Error('Token address or spender not provided');
        }
        
        if (tokenAddress === "NATIVE_MAS") {
          return null;
        }

        const args = new Args().addString(spender).addU256(addedValue);

        const op = await callContract(provider, tokenAddress, 'increaseAllowance', args);

        console.log('Allowance increased successfully:', op);
        return op.id;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to increase allowance';
        setError(message);
        console.error('Increase allowance error:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [isConnected, userAddress, tokenAddress, provider]
  );

  /**
   * Decrease allowance for a spender
   * @param spender - Spender address
   * @param subtractedValue - Amount to decrease
   * @returns Operation ID
   */
  const decreaseAllowance = useCallback(
    async (spender: string, subtractedValue: bigint): Promise<string | null> => {
      setLoading(true);
      setError(null);

      try {
        if (!isConnected || !userAddress) {
          throw new Error('Wallet not connected. Please connect your wallet first.');
        }

        if (!tokenAddress || !spender) {
          throw new Error('Token address or spender not provided');
        }
        
        if (tokenAddress === "NATIVE_MAS") {
          return null;
        }

        const args = new Args().addString(spender).addU256(subtractedValue);

        const op = await callContract(provider, tokenAddress, 'decreaseAllowance', args);

        console.log('Allowance decreased successfully:', op);
        return op.id;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to decrease allowance';
        setError(message);
        console.error('Decrease allowance error:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [isConnected, userAddress, tokenAddress, provider]
  );

  /**
   * Transfer tokens to another address
   * @param to - Recipient address
   * @param amount - Amount to transfer
   * @returns Operation ID
   */
  const transfer = useCallback(
    async (to: string, amount: bigint): Promise<string | null> => {
      setLoading(true);
      setError(null);

      try {
        if (!isConnected || !userAddress) {
          throw new Error('Wallet not connected. Please connect your wallet first.');
        }

        if (!tokenAddress || !to) {
          throw new Error('Token address or recipient not provided');
        }

        if (tokenAddress === "NATIVE_MAS") {
          return null;
        }

        const args = new Args().addString(to).addU256(amount);

        const op = await callContract(provider, tokenAddress, 'transfer', args);

        console.log('Transfer successful:', op);
        return op.id;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to transfer tokens';
        setError(message);
        console.error('Transfer error:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [isConnected, userAddress, tokenAddress, provider]
  );

  /**
   * Get complete token information
   * @param account - Account to get balance for
   * @returns Object containing symbol, decimals, balance, and allowance
   */
  const getTokenInfo = useCallback(
    async (account: string, spender: string): Promise<TokenInfo | null> => {
      try {
        const [symbol, decimals, balance, allowanceAmount] = await Promise.all([
          getSymbol(),
          getDecimals(),
          balanceOf(account),
          allowance(account, spender),
        ]);

        if (symbol && decimals !== null && balance !== null && allowanceAmount !== null) {
          return {
            symbol,
            decimals,
            balance,
            allowance: allowanceAmount,
          };
        }

        return null;
      } catch (err) {
        console.error('Error getting token info:', err);
        return null;
      }
    },
    [getSymbol, getDecimals, balanceOf, allowance]
  );

  return {
    // Read-only functions
    getSymbol,
    getDecimals,
    balanceOf,
    allowance,
    getTokenInfo,

    // State-changing functions
    approve,
    increaseAllowance,
    decreaseAllowance,
    transfer,

    // State
    loading,
    error,
    isConnected,
  };
}
