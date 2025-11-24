# MassaBeam React Hooks

Custom React hooks for querying MassaBeam DEX smart contracts.

## Overview

These hooks provide easy-to-use interfaces for reading data from:
- **Pool Contract** - Liquidity pools, positions, prices, and fees
- **Limit Order Manager** - Limit orders and their status
- **Recurring Order Manager** - DCA (Dollar Cost Averaging) orders
- **Grid Order Manager** - Grid trading strategies

## Installation & Setup

All hooks are currently set up with placeholder implementations. To connect them to real contracts:

1. Integrate with `@massalabs/massa-web3` provider
2. Replace the TODO comments with actual contract calls
3. Add proper error handling

## Pool Hooks (`usePool.ts`)

### usePoolState
Get current pool state (price, tick, liquidity)

```tsx
import { usePoolState } from './hooks';

function PoolInfo({ poolAddress }: { poolAddress: string }) {
  const { state, loading, error } = usePoolState(poolAddress);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <p>Current Tick: {state?.tick}</p>
      <p>Liquidity: {state?.liquidity}</p>
    </div>
  );
}
```

### usePoolMetadata
Get immutable pool configuration

```tsx
const { metadata, loading, error } = usePoolMetadata(poolAddress);
// Returns: token0, token1, fee, tickSpacing, factory, maxLiquidityPerTick
```

### usePoolPrice
Get current pool price

```tsx
const { price, loading, error } = usePoolPrice(poolAddress);
```

### useTickInfo
Get information about a specific tick

```tsx
const { tickInfo, loading, error } = useTickInfo(poolAddress, tickIndex);
```

### usePosition
Get user's liquidity position

```tsx
const { position, loading, error } = usePosition(
  poolAddress,
  ownerAddress,
  tickLower,
  tickUpper
);
```

### usePoolFeeGrowth
Get global fee growth for both tokens

```tsx
const { feeGrowth, loading, error } = usePoolFeeGrowth(poolAddress);
// Returns: { token0: string, token1: string }
```

### useProtocolFees
Get accumulated protocol fees

```tsx
const { protocolFees, loading, error } = useProtocolFees(poolAddress);
// Returns: { token0: string, token1: string }
```

## Limit Order Hooks (`useLimitOrders.ts`)

### useLimitOrder
Get a specific limit order

```tsx
import { useLimitOrder, OrderType } from './hooks';

function OrderDetails({ orderId }: { orderId: string }) {
  const { order, loading, error } = useLimitOrder(contractAddress, orderId);

  return (
    <div>
      <p>Type: {order?.orderType === OrderType.BUY ? 'Buy' : 'Sell'}</p>
      <p>Amount: {order?.amountIn}</p>
      <p>Limit Price: {order?.limitPrice}</p>
    </div>
  );
}
```

### useOrderStatus
Get order status (Active/Filled/Cancelled/Expired)

```tsx
import { useOrderStatus, OrderStatus } from './hooks';

const { status, loading, error } = useOrderStatus(contractAddress, orderId);
// status: 0=Active, 1=Filled, 2=Cancelled, 3=Expired
```

### useUserLimitOrders
Get all orders for a user

```tsx
const { orders, loading, error, refetch } = useUserLimitOrders(
  contractAddress,
  userAddress,
  100 // limit
);
```

### useOrdersByTokenPair
Get orders for a specific token pair

```tsx
const { orders, loading, error } = useOrdersByTokenPair(
  contractAddress,
  tokenInAddress,
  tokenOutAddress,
  50 // limit
);
```

### usePendingOrders
Get list of pending order IDs

```tsx
const { orderIds, loading, error } = usePendingOrders(contractAddress);
```

### useOrderStats
Get aggregate order statistics

```tsx
const { stats, loading, error } = useOrderStats(contractAddress);
// Returns: { totalOrders, activeOrders, filledOrders, pendingOrders }
```

## Recurring Order Hooks (`useRecurringOrders.ts`)

### useRecurringOrder
Get a specific DCA order

```tsx
import { useRecurringOrder } from './hooks';

function DCAOrderInfo({ orderId }: { orderId: string }) {
  const { order, loading, error } = useRecurringOrder(contractAddress, orderId);

  return (
    <div>
      <p>Amount per execution: {order?.amountPerExecution}</p>
      <p>Interval: {order?.intervalPeriods} periods</p>
      <p>Progress: {order?.executedCount}/{order?.totalExecutions}</p>
    </div>
  );
}
```

### useOrderProgress
Get execution progress for an order

```tsx
const { progress, loading, error } = useOrderProgress(contractAddress, orderId);
// Returns: { executedCount, totalExecutions, isActive, isComplete, progressPercentage }
```

### useUserRecurringOrders
Get all DCA orders for a user

```tsx
const { orders, loading, error, refetch } = useUserRecurringOrders(
  contractAddress,
  userAddress,
  100
);
```

### useRecurringOrdersByTokenPair
Get DCA orders for a token pair

```tsx
const { orders, loading, error } = useRecurringOrdersByTokenPair(
  contractAddress,
  tokenIn,
  tokenOut,
  50
);
```

### useActiveRecurringOrders
Get list of active order IDs

```tsx
const { orderIds, loading, error } = useActiveRecurringOrders(contractAddress);
```

### useRecurringOrderStats
Get aggregate statistics

```tsx
const { stats, loading, error } = useRecurringOrderStats(contractAddress);
// Returns: { totalOrders, activeOrders, completedOrders }
```

### useEstimatedCompletion
Calculate estimated completion time

```tsx
import { useEstimatedCompletion } from './hooks';

const estimatedDate = useEstimatedCompletion(order);
// Returns: Date object for estimated completion
```

## Grid Order Hooks (`useGridOrders.ts`)

### useGridOrder
Get a specific grid order

```tsx
import { useGridOrder } from './hooks';

function GridDetails({ gridId }: { gridId: string }) {
  const { grid, loading, error } = useGridOrder(contractAddress, gridId);

  return (
    <div>
      <p>Levels: {grid?.gridLevels}</p>
      <p>Price Range: {grid?.lowerPrice} - {grid?.upperPrice}</p>
      <p>Amount per Level: {grid?.amountPerLevel}</p>
    </div>
  );
}
```

### useGridLevel
Get a specific price level in a grid

```tsx
const { level, loading, error } = useGridLevel(contractAddress, gridId, levelIndex);
// Returns: { price, amount, status, lastFillPeriod }
```

### useAllGridLevels
Get all levels for a grid

```tsx
const { levels, loading, error } = useAllGridLevels(contractAddress, gridId);
// Returns array of GridLevel objects
```

### useGridStats
Get grid execution statistics

```tsx
const { stats, loading, error } = useGridStats(contractAddress, gridId);
// Returns: { totalLevels, idleLevels, buyPendingLevels, sellPendingLevels }
```

### useUserGrids
Get all grids for a user

```tsx
const { grids, loading, error, refetch } = useUserGrids(
  contractAddress,
  userAddress,
  100
);
```

### useGridsByTokenPair
Get grids for a token pair

```tsx
const { grids, loading, error } = useGridsByTokenPair(
  contractAddress,
  tokenIn,
  tokenOut,
  50
);
```

### useActiveGrids
Get list of active grid IDs

```tsx
const { gridIds, loading, error } = useActiveGrids(contractAddress);
```

### useGridOrderStats
Get aggregate grid statistics

```tsx
const { stats, loading, error } = useGridOrderStats(contractAddress);
// Returns: { totalGrids, activeGrids, cancelledGrids }
```

### useGridPriceDistribution
Calculate price distribution across grid levels

```tsx
const distribution = useGridPriceDistribution(grid);
// Returns: [{ price: string, index: number }, ...]
```

## Common Patterns

### Loading States
All hooks return a `loading` boolean:

```tsx
if (loading) return <Spinner />;
```

### Error Handling
All hooks return an `error` object:

```tsx
if (error) return <ErrorMessage error={error} />;
```

### Conditional Queries
Hooks only execute when required parameters are provided:

```tsx
// Won't query until poolAddress is available
const { state } = usePoolState(poolAddress || null);
```

### Refetching Data
Some hooks provide a `refetch` function:

```tsx
const { orders, refetch } = useUserLimitOrders(contract, user);

// Refetch after creating a new order
await createOrder();
refetch();
```

## Next Steps

1. **Integrate massa-web3**: Replace placeholder implementations with real contract calls
2. **Add caching**: Use React Query or SWR for better data management
3. **Add polling**: Implement automatic refresh for real-time updates
4. **Error handling**: Add retry logic and user-friendly error messages
5. **Type safety**: Ensure proper TypeScript types throughout

## Example: Complete Integration

```tsx
import { usePoolState, useUserLimitOrders, OrderStatus } from './hooks';

function TradingDashboard({ poolAddress, userAddress, orderManagerAddress }) {
  // Query pool data
  const { state: poolState, loading: poolLoading } = usePoolState(poolAddress);

  // Query user's orders
  const { orders, loading: ordersLoading, refetch } = useUserLimitOrders(
    orderManagerAddress,
    userAddress
  );

  if (poolLoading || ordersLoading) {
    return <LoadingSpinner />;
  }

  const activeOrders = orders.filter(o => !o.filled && !o.cancelled);

  return (
    <div>
      <h2>Current Price</h2>
      <p>Tick: {poolState?.tick}</p>

      <h2>Your Orders ({activeOrders.length})</h2>
      {activeOrders.map(order => (
        <OrderCard key={order.orderId} order={order} />
      ))}
    </div>
  );
}
```

## Support

For questions or issues, refer to the main MassaBeam documentation or smart contract ABIs.
