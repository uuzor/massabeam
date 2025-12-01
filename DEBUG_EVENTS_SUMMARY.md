# Limit Order Debug Event Emission Summary

## Overview
Comprehensive debug event emission has been added to the limit order execution and scheduling functions to track and trace all call paths, state transitions, and execution results.

## Debug Events by Function

### 1. checkAndExecutePendingOrders() - Entry and Main Loop

**Entry Events:**
- `DEBUG:CheckExecute:Entry:Period:${currentPeriod}:Thread:${currentThread}:BotCount:${botCount}`
  - Logs: Entry point with current period, thread, and bot execution counter
- `DEBUG:CheckExecute:PendingOrders:${pendingCount}:Time:${currentTime}`
  - Logs: Number of pending orders and current block timestamp

**No Orders Case:**
- `DEBUG:CheckExecute:NoPendingOrders:Exit`
  - Logs: Early exit when no pending orders exist

**Per-Order Processing:**
- `DEBUG:CheckExecute:IndexMissing:${i}`
  - Logs: When order index key doesn't exist in storage
- `DEBUG:CheckExecute:ProcessingOrder:${orderId}:Index:${i}`
  - Logs: Order ID being processed and its index
- `DEBUG:CheckExecute:OrderNotFound:${orderId}:Cleaning`
  - Logs: When order data doesn't exist (cleanup triggered)
- `DEBUG:CheckExecute:OrderSkipped:${orderId}:Filled:${order.filled}:Cancelled:${order.cancelled}`
  - Logs: When order is already filled or cancelled (with status flags)
- `DEBUG:CheckExecute:OrderExpired:${orderId}:Time:${currentTime}:Expiry:${order.expiry}`
  - Logs: When order has expired (with current vs expiry time)
- `DEBUG:CheckExecute:AttemptExecute:${orderId}:Type:${order.orderType}:Amount:${order.amountIn}`
  - Logs: Before attempting order execution (with order type: 0=BUY, 1=SELL)
- `DEBUG:CheckExecute:ExecuteSuccess:${orderId}:Removing`
  - Logs: When order execution succeeds
- `DEBUG:CheckExecute:ExecuteFailed:${orderId}:Keeping`
  - Logs: When order execution fails (order remains pending)

**Completion and Scheduling:**
- `DEBUG:CheckExecute:Summary:Processed:${processed}:Executed:${executed}:Expired:${expired}:Skipped:${skipped}`
  - Logs: Summary of all processing results
- `DEBUG:CheckExecute:RemainingOrders:${remainingCount}:WillSchedule:${remainingCount > 0}`
  - Logs: Remaining orders count and scheduling decision
- `DEBUG:CheckExecute:SchedulingNextCheck:Interval:${CHECK_INTERVAL_PERIODS}`
  - Logs: Next check is being scheduled with interval
- `DEBUG:CheckExecute:NoMoreOrders:Exiting`
  - Logs: No more orders, clean exit

---

### 2. _scheduleNextCheck() - Async Call Scheduling

**Entry and Bot Count:**
- `DEBUG:Schedule:Entry:Period:${currentPeriod}:Thread:${currentThread}:BotCountBefore:${botCountBefore}`
  - Logs: Entry point with current context and bot count before increment
- `DEBUG:Schedule:Interval:${periodDelay}`
  - Logs: Scheduling interval (delay in periods)
- `DEBUG:Schedule:BotCountIncremented:${botCountBefore}→${botCountAfter}`
  - Logs: Bot counter increment (with before and after values)

**Slot Calculation:**
- `DEBUG:Schedule:InitialSlot:Period:${nextPeriod}:Thread:${nextThread}`
  - Logs: Initial next slot calculation (before wrapping)
- `DEBUG:Schedule:ThreadWrapped:NewPeriod:${nextPeriod}:NewThread:${nextThread}`
  - Logs: When thread wraps to next period
- `DEBUG:Schedule:FinalSlot:Period:${nextPeriod}:Thread:${nextThread}:End:${nextPeriod + 10}`
  - Logs: Final slot configuration (validity window is 10 periods)

**AsyncCall Execution:**
- `DEBUG:Schedule:AsyncCallIssued:Next:${nextPeriod}:${nextThread}:Count:${botCountAfter}`
  - Logs: AsyncCall has been issued with target slot and new bot count

---

### 3. _tryExecuteOrder() - Order Execution Details

**Entry and Setup:**
- `DEBUG:Execute:Entry:OrderId:${order.orderId}:Type:${order.orderType}`
  - Logs: Entry with order ID and type (0=BUY, 1=SELL)
- `DEBUG:Execute:FactoryAddress:${factoryAddress}`
  - Logs: Factory address retrieved

**Token and Pool Resolution:**
- `DEBUG:Execute:TokenPair:In:${order.tokenIn}:Out:${order.tokenOut}:Canonical:${token0}:${token1}`
  - Logs: Token pair with canonical ordering applied
- `DEBUG:Execute:PoolNotFound:${order.orderId}:Tokens:${token0}:${token1}`
  - Logs: Pool address lookup failed for token pair
- `DEBUG:Execute:PoolFound:${order.orderId}:Pool:${poolAddress}`
  - Logs: Pool found successfully

**Price and State Retrieval:**
- `DEBUG:Execute:GetStateFailed:${order.orderId}`
  - Logs: Failed to retrieve pool state
- `DEBUG:Execute:CurrentSqrtPrice:${order.orderId}:${currentSqrtPriceX96}`
  - Logs: Current sqrt price from pool (in Q64.96 format)
- `DEBUG:Execute:SwapDirection:${order.orderId}:ZeroForOne:${zeroForOne}`
  - Logs: Swap direction (true = token0→token1, false = token1→token0)

**Price Validation:**
- `DEBUG:Execute:TickInfo:${order.orderId}:Current:${currentTick}:Limit:${limitTick}:LimitPrice:${order.limitPrice}`
  - Logs: Current and limit ticks with original limit price
- `DEBUG:Execute:PriceCheckFailed:${order.orderId}:BUY:${currentTick}>${limitTick}`
  - Logs: BUY order price check failed (current price too high)
- `DEBUG:Execute:PriceCheckFailed:${order.orderId}:SELL:${currentTick}<${limitTick}`
  - Logs: SELL order price check failed (current price too low)
- `DEBUG:Execute:PriceCheckPassed:${order.orderId}`
  - Logs: Price validation succeeded, ready to execute

**Swap Execution:**
- `DEBUG:Execute:SwapParams:${order.orderId}:Amount:${order.amountIn}:PriceLimit:${sqrtPriceLimitX96}`
  - Logs: Swap parameters (amount in and price limit)
- `DEBUG:Execute:CallingSwap:${order.orderId}:Pool:${poolAddress}:Owner:${order.owner}`
  - Logs: About to call swap with destination address
- `DEBUG:Execute:SwapCompleted:${order.orderId}`
  - Logs: Swap call completed (no exception thrown)
- `DEBUG:Execute:OrderMarkedFilled:${order.orderId}`
  - Logs: Order marked as filled in storage

---

## Event Naming Convention

All debug events follow this pattern:
- `DEBUG:<Function>:<Action>:<Key>:<Value>:<Key>:<Value>`

Examples:
- `DEBUG:CheckExecute:Entry:Period:5:Thread:12:BotCount:3`
- `DEBUG:Schedule:BotCountIncremented:5→6`
- `DEBUG:Execute:PriceCheckFailed:BUY:1045>1050`

---

## Key Metrics Tracked

### Bot Execution Counter
- Incremented in `_scheduleNextCheck()` before each async call
- Provides count of how many times the automation loop has executed
- Helps identify if bot is actually being invoked

### Order Processing Statistics
- **Processed**: Total orders examined
- **Executed**: Successfully filled orders
- **Expired**: Orders that exceeded expiry time
- **Skipped**: Already filled/cancelled orders

### Slot Information
- **Current Period/Thread**: Where scheduling was triggered
- **Next Period/Thread**: When async call is scheduled to execute
- **Validity Window**: 10-period window for execution

### Price Validation
- **Current Tick**: Actual market price
- **Limit Tick**: User's desired execution price
- **Direction**: Whether swap goes token0→token1 or vice versa

---

## Debugging Workflow

### To trace a complete execution:

1. Look for `DEBUG:CheckExecute:Entry` to find when check started
2. Follow `DEBUG:CheckExecute:ProcessingOrder:${orderId}` entries for each order
3. Check `DEBUG:Execute:Entry` for execution attempts
4. See price validation events (`DEBUG:Execute:TickInfo`, `DEBUG:Execute:PriceCheckFailed/Passed`)
5. Look for `DEBUG:Execute:CallingSwap` to confirm swap was attempted
6. Check `DEBUG:Schedule:*` events to see if next check was scheduled
7. Track bot counter increment in `DEBUG:Schedule:BotCountIncremented`

### To diagnose failures:

1. **Bot not executing**: Check if `DEBUG:CheckExecute:Entry` appears in logs
2. **Orders not executing**: Look for `DEBUG:CheckExecute:OrderSkipped` or price check failures
3. **Price mismatches**: Compare `DEBUG:Execute:TickInfo` values with expected prices
4. **Scheduling issues**: Check `DEBUG:Schedule:AsyncCallIssued` to confirm next call was scheduled
5. **Pool issues**: Look for `DEBUG:Execute:PoolNotFound` or `DEBUG:Execute:GetStateFailed`

---

## Integration with Existing Events

Debug events complement existing events:
- `AutoChecker:NoPendingOrders` - Existing event when no orders
- `AutoChecker:Processed:...` - Existing summary event
- `AutoExecute:NoPool`, `AutoExecute:PriceTooHigh`, etc. - Existing execution events
- `AutoScheduled:Period:...` - Existing scheduling event
- `BotExecution:Count:...` - Bot counter increment event (from orderManager bot counter functions)

---

## Event Emission Best Practices Applied

1. **Granular tracking**: Events at each decision point
2. **State visibility**: Current values logged before/after changes
3. **Correlation**: Order ID included in all order-related events
4. **Context**: Period, thread, and timing information provided
5. **Counters**: Bot execution count tracked throughout
6. **Failure reasons**: Why execution failed is captured
7. **Transitions**: Before/after states for major operations
