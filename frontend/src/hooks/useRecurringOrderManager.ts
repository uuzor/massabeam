/**
 * Recurring Order Manager Hook - Complete Smart Contract Integration
 * Provides all functionality for DCA (Dollar-Cost Averaging) orders
 */

import { useState, useCallback } from 'react';
import { Args, SmartContract, IProvider, Mas } from '@massalabs/massa-web3';

export interface RecurringOrder {
  orderId: string;
  owner: string;
  tokenIn: string;
  tokenOut: string;
  amountPerExecution: bigint;
  intervalPeriods: bigint;
  totalExecutions: bigint;
  executedCount: bigint;
  lastExecutionPeriod: bigint;
  active: boolean;
  cancelled: boolean;
}

export interface OrderProgress {
  executedCount: number;
  totalExecutions: number;
  isActive: boolean;
  isComplete: boolean;
  progressPercentage: number;
  nextExecutionPeriod: number | null;
  estimatedCompletionDate: Date | null;
}

export function useRecurringOrderManager(
  contractAddress: string | null,
  provider: IProvider | null,
  userAddress: string | null
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  /**
   * Create a new recurring order (DCA)
   */
  const createRecurringOrder = useCallback(
    async (
      tokenIn: string,
      tokenOut: string,
      amountPerExecution: bigint,
      intervalPeriods: bigint,
      totalExecutions: bigint
    ): Promise<string | null> => {
      if (!provider || !contractAddress || !userAddress) {
        setError('Provider, contract, or user address not available');
        return null;
      }

      setLoading(true);
      setError(null);
      setTxHash(null);

      try {
        const contract = new SmartContract(provider, contractAddress);

        // Calculate total amount needed
        const totalAmount = amountPerExecution * totalExecutions;

        const tx = await contract.call(
          'createRecurringOrder',
          new Args()
            .addString(tokenIn)
            .addString(tokenOut)
            .addU256(amountPerExecution)
            .addU64(intervalPeriods)
            .addU64(totalExecutions),
          {
            coins: Mas.fromString('0.1'), // Fee for contract execution
            maxGas: BigInt(300_000_000),
          }
        );

        await tx.waitFinalExecution();
        setTxHash(tx.id);

        // Get order ID from return value
        const orderId = new Args(tx.result?.returnValue || new Uint8Array()).nextU256().toString();

        return orderId;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create recurring order';
        console.error('Error creating recurring order:', err);
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [provider, contractAddress, userAddress]
  );

  /**
   * Cancel a recurring order
   */
  const cancelRecurringOrder = useCallback(
    async (orderId: bigint): Promise<boolean> => {
      if (!provider || !contractAddress || !userAddress) {
        setError('Provider, contract, or user address not available');
        return false;
      }

      setLoading(true);
      setError(null);
      setTxHash(null);

      try {
        const contract = new SmartContract(provider, contractAddress);

        const tx = await contract.call(
          'cancelRecurringOrder',
          new Args().addU256(orderId),
          {
            coins: Mas.fromString('0.01'),
            maxGas: BigInt(200_000_000),
          }
        );

        await tx.waitFinalExecution();
        setTxHash(tx.id);

        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to cancel order';
        console.error('Error cancelling order:', err);
        setError(errorMessage);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [provider, contractAddress, userAddress]
  );

  /**
   * Get a specific recurring order by ID
   */
  const getRecurringOrder = useCallback(
    async (orderId: bigint): Promise<RecurringOrder | null> => {
      if (!provider || !contractAddress) {
        setError('Provider or contract address not available');
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const contract = new SmartContract(provider, contractAddress);
        const result = await contract.read('getRecurringOrder', new Args().addU256(orderId));

        const args = new Args(result.value);
        const order: RecurringOrder = {
          orderId: args.nextU256().toString(),
          owner: args.nextString(),
          tokenIn: args.nextString(),
          tokenOut: args.nextString(),
          amountPerExecution: args.nextU256(),
          intervalPeriods: args.nextU64(),
          totalExecutions: args.nextU64(),
          executedCount: args.nextU64(),
          lastExecutionPeriod: args.nextU64(),
          active: args.nextBool(),
          cancelled: args.nextBool(),
        };

        return order;
      } catch (err) {
        console.error('Error fetching order:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch order');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [provider, contractAddress]
  );

  /**
   * Get order progress/status
   */
  const getOrderProgress = useCallback(
    async (orderId: bigint): Promise<OrderProgress | null> => {
      if (!provider || !contractAddress) {
        setError('Provider or contract address not available');
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const contract = new SmartContract(provider, contractAddress);
        const result = await contract.read('getOrderProgress', new Args().addU256(orderId));

        const args = new Args(result.value);
        const executedCount = Number(args.nextU64());
        const totalExecutions = Number(args.nextU64());
        const isActive = args.nextBool();
        const isComplete = args.nextBool();

        const progressPercentage = totalExecutions > 0 ? (executedCount / totalExecutions) * 100 : 0;

        // Get order to calculate next execution
        const orderResult = await contract.read('getRecurringOrder', new Args().addU256(orderId));
        const orderArgs = new Args(orderResult.value);
        orderArgs.nextU256(); // Skip orderId
        orderArgs.nextString(); // Skip owner
        orderArgs.nextString(); // Skip tokenIn
        orderArgs.nextString(); // Skip tokenOut
        orderArgs.nextU256(); // Skip amountPerExecution
        const intervalPeriods = Number(orderArgs.nextU64());
        orderArgs.nextU64(); // Skip totalExecutions
        orderArgs.nextU64(); // Skip executedCount
        const lastExecutionPeriod = Number(orderArgs.nextU64());

        const nextExecutionPeriod = isActive && !isComplete
          ? lastExecutionPeriod + intervalPeriods
          : null;

        const estimatedCompletionDate = isActive && !isComplete && nextExecutionPeriod
          ? new Date(Date.now() + (nextExecutionPeriod - lastExecutionPeriod) * (totalExecutions - executedCount) * 16000) // 16s per period
          : null;

        const progress: OrderProgress = {
          executedCount,
          totalExecutions,
          isActive,
          isComplete,
          progressPercentage,
          nextExecutionPeriod,
          estimatedCompletionDate,
        };

        return progress;
      } catch (err) {
        console.error('Error fetching order progress:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch progress');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [provider, contractAddress]
  );

  /**
   * Get all orders for a user
   */
  const getUserOrders = useCallback(
    async (limit: number = 100): Promise<RecurringOrder[]> => {
      if (!provider || !contractAddress || !userAddress) {
        setError('Provider, contract, or user address not available');
        return [];
      }

      setLoading(true);
      setError(null);

      try {
        const contract = new SmartContract(provider, contractAddress);
        const result = await contract.read(
          'getUserOrders',
          new Args().addString(userAddress).addU64(BigInt(limit))
        );

        const args = new Args(result.value);
        const count = Number(args.nextU64());

        if (count === 0) {
          return [];
        }

        const orders: RecurringOrder[] = [];
        for (let i = 0; i < count; i++) {
          const orderData = args.nextBytes();
          const orderArgs = new Args(orderData);

          const order: RecurringOrder = {
            orderId: orderArgs.nextU256().toString(),
            owner: orderArgs.nextString(),
            tokenIn: orderArgs.nextString(),
            tokenOut: orderArgs.nextString(),
            amountPerExecution: orderArgs.nextU256(),
            intervalPeriods: orderArgs.nextU64(),
            totalExecutions: orderArgs.nextU64(),
            executedCount: orderArgs.nextU64(),
            lastExecutionPeriod: orderArgs.nextU64(),
            active: orderArgs.nextBool(),
            cancelled: orderArgs.nextBool(),
          };

          orders.push(order);
        }

        return orders;
      } catch (err) {
        console.error('Error fetching user orders:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch user orders');
        return [];
      } finally {
        setLoading(false);
      }
    },
    [provider, contractAddress, userAddress]
  );

  /**
   * Get active orders count
   */
  const getActiveOrdersCount = useCallback(
    async (): Promise<number> => {
      if (!provider || !contractAddress) {
        setError('Provider or contract address not available');
        return 0;
      }

      try {
        const contract = new SmartContract(provider, contractAddress);
        const result = await contract.read('getActiveOrdersCount', new Args());

        return Number(new Args(result.value).nextU64());
      } catch (err) {
        console.error('Error fetching active orders count:', err);
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
   * Get orders by token pair
   */
  const getOrdersByTokenPair = useCallback(
    async (tokenIn: string, tokenOut: string, limit: number = 50): Promise<RecurringOrder[]> => {
      if (!provider || !contractAddress) {
        setError('Provider or contract address not available');
        return [];
      }

      setLoading(true);
      setError(null);

      try {
        const contract = new SmartContract(provider, contractAddress);
        const result = await contract.read(
          'getOrdersByTokenPair',
          new Args().addString(tokenIn).addString(tokenOut).addU64(BigInt(limit))
        );

        const args = new Args(result.value);
        const count = Number(args.nextU64());

        if (count === 0) {
          return [];
        }

        const orders: RecurringOrder[] = [];
        for (let i = 0; i < count; i++) {
          const orderData = args.nextBytes();
          const orderArgs = new Args(orderData);

          const order: RecurringOrder = {
            orderId: orderArgs.nextU256().toString(),
            owner: orderArgs.nextString(),
            tokenIn: orderArgs.nextString(),
            tokenOut: orderArgs.nextString(),
            amountPerExecution: orderArgs.nextU256(),
            intervalPeriods: orderArgs.nextU64(),
            totalExecutions: orderArgs.nextU64(),
            executedCount: orderArgs.nextU64(),
            lastExecutionPeriod: orderArgs.nextU64(),
            active: orderArgs.nextBool(),
            cancelled: orderArgs.nextBool(),
          };

          orders.push(order);
        }

        return orders;
      } catch (err) {
        console.error('Error fetching orders by token pair:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch orders');
        return [];
      } finally {
        setLoading(false);
      }
    },
    [provider, contractAddress]
  );

  return {
    // Actions
    createRecurringOrder,
    cancelRecurringOrder,

    // Queries
    getRecurringOrder,
    getOrderProgress,
    getUserOrders,
    getActiveOrdersCount,
    getBotExecutionCount,
    getOrdersByTokenPair,

    // State
    loading,
    error,
    txHash,
  };
}

/**
 * Helper function to convert periods to human-readable time
 */
export function periodsToTime(periods: number): string {
  const seconds = periods * 16; // 16 seconds per period
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/**
 * Helper function to calculate next execution date
 */
export function calculateNextExecutionDate(
  lastExecutionPeriod: number,
  intervalPeriods: number,
  currentPeriod: number
): Date {
  const nextPeriod = lastExecutionPeriod + intervalPeriods;
  const periodsRemaining = Math.max(0, nextPeriod - currentPeriod);
  const secondsRemaining = periodsRemaining * 16;

  return new Date(Date.now() + secondsRemaining * 1000);
}
