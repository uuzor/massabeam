# Limit Order Execution Failure Analysis

## Executive Summary

The bot successfully **detects and processes the order**, but **execution fails** due to **TWO distinct critical issues**:

1. **PRICE VALIDATION BUG** - Limit price converted incorrectly, causing false rejection
2. **TOO MANY EVENTS ERROR** - Async calls fail due to excessive debug event emission

---

## Issue #1: Price Validation Failure (THE PRIMARY BLOCKER)

### The Problem

```
DEBUG:Execute:TickInfo:0:Current:-110000:Limit:-1486618624:LimitPrice:1000000000000000000
DEBUG:Execute:PriceCheckFailed:0:BUY:-110000>-1486618624
AutoExecute:PriceTooHigh:0:-110000:-1486618624
```

**What happened:**
- Current tick: `-110000` (current market price)
- Limit tick: `-1486618624` (what user specified)
- BUY order check: `-110000 > -1486618624`? **YES, TRUE → REJECT**

**Why it's wrong:**
- User specified limitPrice: `0.0001`
- This was stored as: `1000000000000000000` (1e18, a huge value!)
- When converted via `getTickAtSqrtPrice(1000000000000000000)`, it produced: `-1486618624`
- This is NOT the correct tick for price 0.0001

### Root Cause: Incorrect Price Format

**Frontend sends (in wei):**
```
limitPrice: "0.0001" → stored as 1000000000000000000 (1e18)
```

**Smart contract expects (in Q64.96):**
```
sqrtPrice in Q64.96 format (79-digit number range)
```

**Current broken flow:**
```
User input: "0.0001" (decimal)
    ↓
Store in order: 1000000000000000000 (treated as 1e18, but should be Q64.96)
    ↓
Convert via getTickAtSqrtPrice(): -1486618624 (WRONG!)
    ↓
Compare with current tick: -110000
    ↓
Result: Order always rejects
```

### The Correct Flow Should Be

```
User input: "0.0001" (decimal price)
    ↓
Convert to Q64.96: 0.0001 × 2^96 = ~7922816251426433759354395033.6
    ↓
Store in order
    ↓
Convert via getTickAtSqrtPrice() to get actual tick
    ↓
Compare ticks correctly
    ↓
Execute or reject based on real price
```

### Evidence from Swap Event

The swap that **did execute** shows:
```
Swap:AU12B...aTZBVhKe:true:1000:992
```

This means:
- Input: 1000 (likely USDC with 18 decimals)
- Output: 992 (likely WMAS with 18 decimals)
- Price: ~0.992 WMAS per USDC

But the order was created with:
- Limit price: 0.0001 (willing to pay 0.0001 WMAS per USDC)
- Current market: 0.992 WMAS per USDC

**For a BUY order:**
- User wants: `0.0001 ≤ current price`
- Reality: `0.0001 ≤ 0.992` → **TRUE, SHOULD EXECUTE**
- Current code: `-110000 > -1486618624` → **FALSE, REJECTS**

---

## Issue #2: Too Many Events Error (THE SECONDARY BLOCKER)

### The Error

```json
{
  "massa_execution_error": "VM Error in Asynchronous Message context: Depth error: Runtime error: Too many event for this operation"
}
```

### What's Happening

The bot IS executing (`DEBUG:CheckExecute:Entry` appears), but when it tries to **reschedule itself** via `_scheduleNextCheck()`, it fails because:

```
Attempt 1 (First check):
  - Schedules next check with BotCount:1 ✅

Attempt 2 (Auto-rescheduled at thread 21):
  - Tries to schedule with BotCount:2 ❌ FAILS
  - Error: "Too many events"
```

### Root Cause: DEBUG EVENT EXPLOSION

Each execution generates approximately **15-20 debug events**:

**In checkAndExecutePendingOrders():**
1. `DEBUG:CheckExecute:Entry`
2. `DEBUG:CheckExecute:PendingOrders`
3. `DEBUG:CheckExecute:ProcessingOrder`
4. `DEBUG:CheckExecute:AttemptExecute`

**In _tryExecuteOrder():**
5. `DEBUG:Execute:Entry`
6. `DEBUG:Execute:FactoryAddress`
7. `DEBUG:Execute:TokenPair`
8. `DEBUG:Execute:PoolFound`
9. `DEBUG:Execute:CurrentSqrtPrice`
10. `DEBUG:Execute:SwapDirection`
11. `DEBUG:Execute:TickInfo`
12. `DEBUG:Execute:PriceCheckFailed` ← Due to bug
13. Other price validation events

**In _scheduleNextCheck():**
14. `DEBUG:Schedule:Entry`
15. `DEBUG:Schedule:Interval`
16. `DEBUG:Schedule:BotCountIncremented`
17. `DEBUG:Schedule:InitialSlot`
18. `DEBUG:Schedule:FinalSlot`
19. `DEBUG:Schedule:AsyncCallIssued`
20. `AutoScheduled` (original event)

**Total: ~20 events per execution × multiple attempts = TOO MANY for async context**

### Why It Matters

Massa blockchain limits events per async execution. The debug events overwhelm this limit, causing the async call to fail silently.

---

## Timeline of Failures

### Step 1: Order Creation ✅
```
Bot scheduled to run at Period:3736210, Thread:20
BotCount incremented: 0→1
Event limit OK (only ~10 events on main call)
```

### Step 2: First Auto-Execution ⚠️
```
Bot runs at Period:3736210, Thread:20
Generates ~20 debug events
Price check FAILS due to bug (Issue #1)
Attempts to reschedule at Thread:21
FAILS: Too many events (Issue #2)
Bot stops, count stays at 1
```

### Step 3-N: No Further Execution ❌
```
Since rescheduling failed, no more async calls are issued
Order remains pending forever
Bot count never increments beyond 1
```

---

## The Fix Strategy

### Primary Fix: Correct Price Conversion

**Location:** `orderManager.ts` line 847

**Current (BROKEN):**
```typescript
const limitTick = getTickAtSqrtPrice(order.limitPrice);
// order.limitPrice is "1000000000000000000" (wrong format!)
```

**Must Fix To (OPTION 1 - Convert during order creation):**
```typescript
// In createLimitOrder(), convert decimal price to Q64.96:
const limitPriceDecimal = parseFloat(order.limitPrice); // e.g., 0.0001
const sqrtPrice96 = getSqrtPrice96(); // 2^96
const limitPriceSqrtX96 = u256.fromU64(u64(limitPriceDecimal * f64(sqrtPrice96)));
// Store limitPriceSqrtX96 in order instead of decimal string
```

**Then in _tryExecuteOrder():**
```typescript
const limitTick = getTickAtSqrtPrice(order.limitPriceSqrtX96); // Now correct
```

**Or (OPTION 2 - Use pool's tick directly):**
```typescript
// Don't convert at all - read tick directly from pool
const stateArgs = new Args(stateData);
const currentSqrtPriceX96 = stateArgs.nextU256().expect('sqrtPriceX96 missing');
const currentTick = stateArgs.nextI32().expect('tick missing'); // Direct from pool!
// No conversion needed, ticks are already correct
```

### Secondary Fix: Reduce Debug Events

**Approach:** Remove or conditionally emit debug events

**Option A - Keep critical events only:**
```typescript
function checkAndExecutePendingOrders() {
  // Keep only essential events:
  generateEvent(`DEBUG:CheckExecute:Processed:${processed}:Executed:${executed}`);
  // Remove: DEBUG:CheckExecute:Entry, DEBUG:CheckExecute:ProcessingOrder, etc.
}

function _tryExecuteOrder() {
  // Keep only critical failure reasons:
  if (currentTick > limitTick) {
    generateEvent(`AutoExecute:PriceTooHigh:${order.orderId}`);
    // Remove: DEBUG:Execute:TickInfo, DEBUG:Execute:PriceCheckFailed, etc.
    return false;
  }
}

function _scheduleNextCheck() {
  // Minimal events:
  generateEvent(`AutoScheduled:${nextPeriod}:${nextThread}`);
  // Remove: All DEBUG:Schedule:* events
}
```

**Option B - Conditional events (only for development):**
```typescript
const DEBUG_MODE = false; // Set to false in production

if (DEBUG_MODE) {
  generateEvent(`DEBUG:CheckExecute:Entry:${botCount}`);
}
```

---

## Verification: Data Mismatch

### What We Know:

1. **Swap that succeeded:**
   - Input: 1000 tokens
   - Output: 992 tokens
   - Implied price: ~0.992

2. **Limit order created:**
   - Type: BUY
   - Amount: 1000 USDC
   - Limit price: 0.0001 (user willing to buy at 0.0001 WMAS/USDC)
   - Min output: 100 WMAS (at price 0.0001: 1000 × 0.0001 = 0.1, stored as 100)

3. **Bot execution check:**
   - Current tick: -110000 (from Q64.96 conversion of 79228162514264337593543840336)
   - Limit tick: -1486618624 (from Q64.96 conversion of 1000000000000000000)
   - BUY check: current (-110000) > limit (-1486618624)? YES → REJECT

4. **The contradiction:**
   - Current price (0.992) << Limit price (0.0001)?
   - Should execute immediately? ✅
   - Actual check result? ❌ REJECT

**This confirms the price format mismatch.**

---

## Summary of Issues and Fixes

| Issue | Current | Impact | Fix |
|-------|---------|--------|-----|
| **Price Format** | Decimal stored as 1e18, converted as u256 | Order always rejects | Convert to Q64.96 or use pool's tick |
| **Tick Conversion** | Wrong input format to getTickAtSqrtPrice() | Produces invalid tick | Use correct price format |
| **Debug Events** | ~20 per execution | Async fails with "too many events" | Reduce or conditionally emit |
| **Event Loop** | Can't reschedule if first reschedule fails | Bot stops permanently | Fix both issues so rescheduling succeeds |

---

## Next Steps

1. **CRITICAL:** Fix price format (Issue #1)
   - Implement proper Q64.96 conversion
   - Or switch to using pool's tick directly

2. **IMPORTANT:** Reduce debug events (Issue #2)
   - Remove granular DEBUG:Execute:* events
   - Keep only summary and error events
   - Or use conditional compilation for debug mode

3. **VERIFY:** Test with realistic prices
   - Current price: 0.992
   - Try limit orders at 0.99, 1.0, 1.01
   - Verify execution happens at correct prices

4. **MONITOR:** Check bot count increments
   - Should increase with each execution
   - Should not hit event limits
