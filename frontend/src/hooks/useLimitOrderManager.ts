/**
 * Limit Order Manager Hook - Complete Smart Contract Integration
 * Provides all functionality for limit order management
 */

import { useState, useCallback } from 'react';
import { Args, SmartContract, IProvider, Mas } from '@massalabs/massa-web3';

export interface LimitOrder {
  orderId: string;
  owner: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: bigint;
  minAmountOut: bigint;
  limitPrice: bigint;
  orderType: bigint; // 0 = BUY, 1 = SELL
  expiry: bigint;
  filled: boolean;
  cancelled: boolean;
  createdAt: bigint;
}

export interface OrderStats {
  totalOrders: number;
  pendingOrders: number;
  filledOrders: number;
  cancelledOrders: number;
}

export interface OrderExecution {
  orderId: string;
  executedAt: number;
  amountIn: bigint;
  amountOut: bigint;
  executionPrice: bigint;
}

export function useLimitOrderManager(
  contractAddress: string | null,
  provider: IProvider | null,
  userAddress: string | null
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  /**
   * Create a new limit order
   */
  const createLimitOrder = useCallback(
    async (
      tokenIn: string,
      tokenOut: string,
      amountIn: bigint,
      minAmountOut: bigint,
      limitPrice: bigint,
      orderType: bigint, // 0 = BUY, 1 = SELL
      expiry: bigint
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

        const tx = await contract.call(
          'createLimitOrder',
          new Args()
            .addString(tokenIn)
            .addString(tokenOut)
            .addU256(amountIn)
            .addU256(minAmountOut)
            .addU256(limitPrice)
            .addU256(orderType)
            .addU256(expiry),
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
        const errorMessage = err instanceof Error ? err.message : 'Failed to create limit order';
        console.error('Error creating limit order:', err);
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [provider, contractAddress, userAddress]
  );

  /**
   * Cancel a limit order
   */
  const cancelLimitOrder = useCallback(
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
          'cancelLimitOrder',
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
   * Get a specific limit order by ID
   */
  const getLimitOrder = useCallback(
    async (orderId: bigint): Promise<LimitOrder | null> => {
      if (!provider || !contractAddress) {
        setError('Provider or contract address not available');
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const contract = new SmartContract(provider, contractAddress);
        const result = await contract.read('getOrder', new Args().addU256(orderId));

        const args = new Args(result.value);
        const order: LimitOrder = {
          orderId: args.nextU256().toString(),
          owner: args.nextString(),
          tokenIn: args.nextString(),
          tokenOut: args.nextString(),
          amountIn: args.nextU256(),
          minAmountOut: args.nextU256(),
          limitPrice: args.nextU256(),
          orderType: args.nextU256(),
          expiry: args.nextU256(),
          filled: args.nextBool(),
          cancelled: args.nextBool(),
          createdAt: args.nextU256(),
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
   * Get all orders for a user
   */
  const getUserOrders = useCallback(
    async (limit: number = 100): Promise<LimitOrder[]> => {
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

        const orders: LimitOrder[] = [];
        for (let i = 0; i < count; i++) {
          const orderData = args.nextBytes();
          const orderArgs = new Args(orderData);

          const order: LimitOrder = {
            orderId: orderArgs.nextU256().toString(),
            owner: orderArgs.nextString(),
            tokenIn: orderArgs.nextString(),
            tokenOut: orderArgs.nextString(),
            amountIn: orderArgs.nextU256(),
            minAmountOut: orderArgs.nextU256(),
            limitPrice: orderArgs.nextU256(),
            orderType: orderArgs.nextU256(),
            expiry: orderArgs.nextU256(),
            filled: orderArgs.nextBool(),
            cancelled: orderArgs.nextBool(),
            createdAt: orderArgs.nextU256(),
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
   * Get pending orders count
   */
  const getPendingOrdersCount = useCallback(
    async (): Promise<number> => {
      if (!provider || !contractAddress) {
        setError('Provider or contract address not available');
        return 0;
      }

      try {
        const contract = new SmartContract(provider, contractAddress);
        const result = await contract.read('getPendingOrdersCount', new Args());

        return Number(new Args(result.value).nextU64());
      } catch (err) {
        console.error('Error fetching pending orders count:', err);
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
   * Get total order count
   */
  const getTotalOrderCount = useCallback(
    async (): Promise<number> => {
      if (!provider || !contractAddress) {
        setError('Provider or contract address not available');
        return 0;
      }

      try {
        const contract = new SmartContract(provider, contractAddress);
        const result = await contract.read('getOrderCount', new Args());

        return Number(new Args(result.value).nextU256());
      } catch (err) {
        console.error('Error fetching total order count:', err);
        return 0;
      }
    },
    [provider, contractAddress]
  );

  /**
   * Get order statistics
   */
  const getOrderStats = useCallback(
    async (): Promise<OrderStats> => {
      if (!provider || !contractAddress) {
        setError('Provider or contract address not available');
        return {
          totalOrders: 0,
          pendingOrders: 0,
          filledOrders: 0,
          cancelledOrders: 0,
        };
      }

      try {
        const [totalOrders, pendingOrders] = await Promise.all([
          getTotalOrderCount(),
          getPendingOrdersCount(),
        ]);

        // Get user orders to calculate filled/cancelled
        const userOrders = await getUserOrders(1000);
        const filledOrders = userOrders.filter(o => o.filled).length;
        const cancelledOrders = userOrders.filter(o => o.cancelled).length;

        return {
          totalOrders,
          pendingOrders,
          filledOrders,
          cancelledOrders,
        };
      } catch (err) {
        console.error('Error fetching order stats:', err);
        return {
          totalOrders: 0,
          pendingOrders: 0,
          filledOrders: 0,
          cancelledOrders: 0,
        };
      }
    },
    [provider, contractAddress, getTotalOrderCount, getPendingOrdersCount, getUserOrders]
  );

  /**
   * Get orders by token pair
   */
  const getOrdersByTokenPair = useCallback(
    async (tokenIn: string, tokenOut: string, limit: number = 50): Promise<LimitOrder[]> => {
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

        const orders: LimitOrder[] = [];
        for (let i = 0; i < count; i++) {
          const orderData = args.nextBytes();
          const orderArgs = new Args(orderData);

          const order: LimitOrder = {
            orderId: orderArgs.nextU256().toString(),
            owner: orderArgs.nextString(),
            tokenIn: orderArgs.nextString(),
            tokenOut: orderArgs.nextString(),
            amountIn: orderArgs.nextU256(),
            minAmountOut: orderArgs.nextU256(),
            limitPrice: orderArgs.nextU256(),
            orderType: orderArgs.nextU256(),
            expiry: orderArgs.nextU256(),
            filled: orderArgs.nextBool(),
            cancelled: orderArgs.nextBool(),
            createdAt: orderArgs.nextU256(),
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
    createLimitOrder,
    cancelLimitOrder,

    // Queries
    getLimitOrder,
    getUserOrders,
    getPendingOrdersCount,
    getBotExecutionCount,
    getTotalOrderCount,
    getOrderStats,
    getOrdersByTokenPair,

    // State
    loading,
    error,
    txHash,
  };
}

/**
 * Helper function to format price from Q64.96 format
 */
export function formatPriceFromQ6496(price: bigint): string {
  const Q96 = BigInt('79228162514264337593543950336'); // 2^96
  const priceDecimal = Number(price * BigInt(1e6) / Q96) / 1e6;
  return priceDecimal.toFixed(6);
}

/**
 * Helper function to convert price to Q64.96 format
 */
export function priceToQ6496(priceDecimal: number): bigint {
  const Q96 = BigInt('79228162514264337593543950336'); // 2^96
  return BigInt(Math.floor(priceDecimal * Number(Q96)));
}

/**
 * Helper function to check if order is expired
 */
export function isOrderExpired(order: LimitOrder): boolean {
  if (order.expiry === BigInt(0)) return false; // No expiry
  const currentTimestamp = BigInt(Math.floor(Date.now() / 1000));
  return order.createdAt + order.expiry < currentTimestamp;
}

/**
 * Helper function to get order status
 */
export function getOrderStatus(order: LimitOrder): 'PENDING' | 'FILLED' | 'CANCELLED' | 'EXPIRED' {
  if (order.filled) return 'FILLED';
  if (order.cancelled) return 'CANCELLED';
  if (isOrderExpired(order)) return 'EXPIRED';
  return 'PENDING';
}

/**
 * Helper function to get order type label
 */
export function getOrderTypeLabel(orderType: bigint): 'BUY' | 'SELL' {
  return orderType === BigInt(0) ? 'BUY' : 'SELL';
}

/**
 * Helper function to calculate expiry date
 */
export function calculateExpiryDate(createdAt: bigint, expiry: bigint): Date | null {
  if (expiry === BigInt(0)) return null; // No expiry
  const expiryTimestamp = Number(createdAt + expiry) * 1000;
  return new Date(expiryTimestamp);
}

/**
 * Helper function to format token amount
 */
export function formatTokenAmount(amount: bigint, decimals: number = 18): string {
  return (Number(amount) / Math.pow(10, decimals)).toFixed(4);
}

/**
 * Helper function to calculate expected output
 */
export function calculateExpectedOutput(
  amountIn: bigint,
  limitPrice: bigint,
  orderType: bigint
): bigint {
  // For BUY orders: amountOut = amountIn / limitPrice
  // For SELL orders: amountOut = amountIn * limitPrice
  const Q96 = BigInt('79228162514264337593543950336');

  if (orderType === BigInt(0)) {
    // BUY: divide by price
    return (amountIn * Q96) / limitPrice;
  } else {
    // SELL: multiply by price
    return (amountIn * limitPrice) / Q96;
  }
}
