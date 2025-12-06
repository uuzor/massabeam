/**
 * Grid Order Manager Hook - Complete Smart Contract Integration
 * Provides all functionality for grid order management
 */

import { useState, useCallback } from 'react';
import { Args, SmartContract, IProvider, Mas, strToBytes } from '@massalabs/massa-web3';
import { callContract } from './useFactory'; // Assuming callContract is generic enough

export interface GridOrder {
  gridId: string;
  owner: string;
  tokenIn: string;
  tokenOut: string;
  gridLevels: bigint;
  lowerPrice: bigint;
  upperPrice: bigint;
  amountPerLevel: bigint;
  active: boolean;
  cancelled: boolean;
}

export interface GridLevel {
  price: bigint;
  amount: bigint;
  status: number; // 0 = IDLE, 1 = BUY_PENDING, 2 = SELL_PENDING
  lastFillPeriod: bigint;
}

export interface GridStats {
  totalGrids: number;
  activeGrids: number;
  cancelledGrids: number;
  botExecutions: number;
}

export function useGridOrderManager(
  contractAddress: string | null,
  provider: IProvider | null,
  userAddress: string | null
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  /**
   * Create a new grid order
   */
  const createGridOrder = useCallback(
    async (
      tokenIn: string,
      tokenOut: string,
      gridLevels: bigint,
      lowerPrice: bigint,
      upperPrice: bigint,
      amountPerLevel: bigint,
      coinsToSend: Mas = Mas.fromMas(0n)
    ): Promise<string | null> => {
      if (!provider || !contractAddress || !userAddress) {
        setError('Provider, contract, or user address not available');
        return null;
      }

      setLoading(true);
      setError(null);
      setTxHash(null);

      try {
        // Use the generic callContract wrapper
        const tx = await callContract(
          provider,
          contractAddress,
          'createGridOrder',
          new Args()
            .addString(tokenIn)
            .addString(tokenOut)
            .addU64(gridLevels)
            .addU256(lowerPrice)
            .addU256(upperPrice)
            .addU256(amountPerLevel),
          coinsToSend,
          Mas.fromMas(100_000_000n) // Fixed fee for execution
        );

        // TODO: Parse order ID from event
        // For now, return a placeholder or the tx.id
        const orderId = tx.id; // Simplified - real implementation would parse event

        return orderId;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create grid order';
        console.error('Error creating grid order:', err);
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [provider, contractAddress, userAddress]
  );

  /**
   * Cancel a grid order
   */
  const cancelGridOrder = useCallback(
    async (gridId: bigint): Promise<boolean> => {
      if (!provider || !contractAddress || !userAddress) {
        setError('Provider, contract, or user address not available');
        return false;
      }

      setLoading(true);
      setError(null);
      setTxHash(null);

      try {
        const tx = await callContract(
          provider,
          contractAddress,
          'cancelGridOrder',
          new Args().addU256(gridId),
          Mas.fromMas(0n), // No amount to send, just fee
          Mas.fromMas(100_000_000n) // Fixed fee
        );

        // Await speculative execution is handled by callContract

        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to cancel grid order';
        console.error('Error cancelling grid order:', err);
        setError(errorMessage);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [provider, contractAddress, userAddress]
  );

  /**
   * Get a specific grid order by ID
   */
  const getGridOrder = useCallback(
    async (gridId: bigint): Promise<GridOrder | null> => {
      if (!provider || !contractAddress) {
        setError('Provider or contract address not available');
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const contract = new SmartContract(provider, contractAddress);
        const result = await contract.read('getGridOrder', new Args().addU256(gridId));

        const args = new Args(result.value);
        const order: GridOrder = {
          gridId: args.nextU256().toString(),
          owner: args.nextString(),
          tokenIn: args.nextString(),
          tokenOut: args.nextString(),
          gridLevels: args.nextU64(),
          lowerPrice: args.nextU256(),
          upperPrice: args.nextU256(),
          amountPerLevel: args.nextU256(),
          active: args.nextBool(),
          cancelled: args.nextBool(),
        };

        return order;
      } catch (err) {
        console.error('Error fetching grid order:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch grid order');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [provider, contractAddress]
  );

  /**
   * Get all grid orders for a user
   */
  const getUserGrids = useCallback(
    async (limit: number = 100): Promise<GridOrder[]> => {
      if (!provider || !contractAddress || !userAddress) {
        setError('Provider, contract, or user address not available');
        return [];
      }

      setLoading(true);
      setError(null);

      try {
        const contract = new SmartContract(provider, contractAddress);
        const result = await contract.read(
          'getUserGrids',
          new Args().addString(userAddress).addU64(BigInt(limit))
        );

        const args = new Args(result.value);
        const count = Number(args.nextU64());

        if (count === 0) {
          return [];
        }

        const grids: GridOrder[] = [];
        for (let i = 0; i < count; i++) {
          const gridData = args.nextBytes();
          const gridArgs = new Args(gridData);

          const grid: GridOrder = {
            gridId: gridArgs.nextU256().toString(),
            owner: gridArgs.nextString(),
            tokenIn: gridArgs.nextString(),
            tokenOut: gridArgs.nextString(),
            gridLevels: gridArgs.nextU64(),
            lowerPrice: gridArgs.nextU256(),
            upperPrice: gridArgs.nextU256(),
            amountPerLevel: gridArgs.nextU256(),
            active: gridArgs.nextBool(),
            cancelled: gridArgs.nextBool(),
          };

          grids.push(grid);
        }

        return grids;
      } catch (err) {
        console.error('Error fetching user grids:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch user grids');
        return [];
      } finally {
        setLoading(false);
      }
    },
    [provider, contractAddress, userAddress]
  );

  /**
   * Get active grids count
   */
  const getActiveGridsCount = useCallback(
    async (): Promise<number> => {
      if (!provider || !contractAddress) {
        setError('Provider or contract address not available');
        return 0;
      }

      try {
        const contract = new SmartContract(provider, contractAddress);
        const result = await contract.read('getActiveGridsCount', new Args());

        return Number(new Args(result.value).nextU64());
      } catch (err) {
        console.error('Error fetching active grids count:', err);
        return 0;
      }
    },
    [provider, contractAddress]
  );

  /**
   * Get bot execution count
   */
  const getBotExecutionCount = useCallback(
    async (): Promise<number> => {
      if (!provider || !contractAddress) {
        setError('Provider or contract address not available');
        return 0;
      }

      try {
        const contract = new SmartContract(provider, contractAddress);
        const result = await contract.read('getBotExecutionCount', new Args());

        return Number(new Args(result.value).nextU64());
      } catch (err) {
        console.error('Error fetching bot execution count:', err);
        return 0;
      }
    },
    [provider, contractAddress]
  );

  /**
   * Get grid statistics (total, active, cancelled, bot executions)
   */
  const getGridStats = useCallback(
    async (): Promise<GridStats> => {
      if (!provider || !contractAddress) {
        setError('Provider or contract address not available');
        return {
          totalGrids: 0,
          activeGrids: 0,
          cancelledGrids: 0,
          botExecutions: 0,
        };
      }

      try {
        const contract = new SmartContract(provider, contractAddress);
        const [totalGridsResult, activeGridsResult, botExecutionsResult] = await Promise.all([
          contract.read('getGridCount', new Args()),
          contract.read('getActiveGridsCount', new Args()),
          contract.read('getBotExecutionCount', new Args()),
        ]);
        const cancelledGridsResult = await contract.read('getCancelledGridsCount', new Args());

        console.log('cancelledGridsResult:', cancelledGridsResult);
        if (cancelledGridsResult.value && (!Array.isArray(cancelledGridsResult.value) || cancelledGridsResult.value.length === 0)) {
          console.log('Returning default stats due to empty cancelledGridsResult');
          return {
            totalGrids: 0,
            activeGrids: 0,
            cancelledGrids: 0,
            botExecutions: 0,
          };
        }

        const totalGrids = Number(new Args(totalGridsResult.value).nextU256());
        const activeGrids = Number(new Args(activeGridsResult.value).nextU64());
        const cancelledGrids = Number(new Args(cancelledGridsResult.value).nextU64());
        const botExecutions = Number(new Args(botExecutionsResult.value).nextU64());

        return {
          totalGrids,
          activeGrids,
          cancelledGrids,
          botExecutions,
        };
      } catch (err) {
        console.error('Error fetching grid stats:', err);
        return {
          totalGrids: 0,
          activeGrids: 0,
          cancelledGrids: 0,
          botExecutions: 0,
        };
      }
    },
    [provider, contractAddress]
  );


  return {
    createGridOrder,
    cancelGridOrder,
    getGridOrder,
    getUserGrids,
    getActiveGridsCount,
    getBotExecutionCount,
    getGridStats,
    loading,
    error,
    txHash,
  };
}