# Test Plan - Limit Order Bot Execution

## Prerequisites

1. **Build the updated contracts:**
   ```bash
   npm run build
   ```

2. **Verify compilation:**
   ```bash
   npx asc assembly/contracts/orderManager.ts \
     --lib node_modules \
     --disable warning=as-proto-null-check \
     -O3
   ```

---

## Test Sequence

### Phase 1: Deployment (Immediate)

```bash
npm run deploy
```

**Expected Output:**
- ✅ Factory deployed
- ✅ Pool created (WMAS/USDC, 0.3% fee)
- ✅ Swap executed (demonstrates pool is functional)
- ✅ Limit order created with ID 0
- ✅ Order stored with correct Q64.96 price format
- ✅ Bot scheduled for initial execution

**Check Log For:**
- `LimitOrderCreated:0:...` event
- `AutoScheduled:Period:...` event showing async call scheduled

---

### Phase 2: First Bot Execution (30 seconds later)

**Expected Behavior:**
- Bot runs at scheduled Period/Thread
- Checks order #0 against current market price
- Evaluates: Is currentTick ≤ limitTick? (for BUY order)

**Success Indicators:**
- `AutoChecker:Processed:1:Executed:...` event appears
- `AutoExecuted:0:...` event (order filled), OR
- `AutoExecute:PriceTooHigh:...` event (order not yet executable)
- `AutoScheduled:...` event (next check scheduled)
- **BotExecutionCount = 1** (confirmed after 1st check)

**Failure Indicators:**
- `"Too many events"` error in logs
- BotExecutionCount stays 0
- No AutoScheduled event appears
- AsyncCall fails with "Depth error"

---

### Phase 3: Second Bot Execution (60 seconds after deployment)

**Expected Behavior:**
- Bot executes again at rescheduled slot
- If order not filled, attempts another execution
- If still pending, reschedules again

**Success Indicators:**
- `AutoChecker:Processed:...` event appears
- **BotExecutionCount = 2** (incremented from 1)
- No "too many events" error
- Next AsyncCall scheduled successfully

**Critical Test:**
This phase proves the event reduction fix works. Without it, the 2nd execution would fail completely.

---

### Phase 4: Verification (Ongoing)

Run every 30 seconds:

```bash
npm run deploy
```

Look for the verification section that checks BotExecutionCount multiple times.

**Expected Pattern:**
```
Check 1: BotExecutionCount = 1
Check 2: BotExecutionCount = 2 (incremented)
Check 3: BotExecutionCount = 3 (incremented)
Check 4: BotExecutionCount = 4 (incremented)
...
```

If count increments each time, bot is working correctly.

---

## Event Log Analysis

### Success Case (Order Executes)

```
[DEPLOY] LimitOrderCreated:0:...:BUY:...
[DEPLOY] AutoScheduled:Period:3736210:Thread:20
[+30s]   AutoChecker:Processed:1:Executed:1:Expired:0
[+30s]   AutoExecuted:0:owner:1000
[+30s]   AutoScheduled:Period:3736210:Thread:21
[+60s]   AutoChecker:Processed:0:Executed:0:Expired:0
[+60s]   AutoScheduled:Period:3736210:Thread:22
```

**Interpretation:**
- Order 0 executed successfully after 1st check
- Bot continued scheduling (no event limit error)
- Subsequent checks process remaining orders

---

### Intermediate Case (Order Not Yet Executable)

```
[DEPLOY] LimitOrderCreated:0:...:BUY:...
[DEPLOY] AutoScheduled:Period:3736210:Thread:20
[+30s]   AutoChecker:Processed:1:Executed:0:Expired:0
[+30s]   AutoExecute:PriceTooHigh:0:currentTick:limitTick
[+30s]   AutoScheduled:Period:3736210:Thread:21
[+60s]   AutoChecker:Processed:1:Executed:0:Expired:0
[+60s]   AutoExecute:PriceTooHigh:0:currentTick:limitTick
[+60s]   AutoScheduled:Period:3736210:Thread:22
```

**Interpretation:**
- Price condition not met (market price too high for BUY)
- Order stays pending
- Bot continues checking on schedule
- No event errors occurred

---

### Failure Case (Before Fixes)

```
[DEPLOY] LimitOrderCreated:0:...:BUY:...
[DEPLOY] AutoScheduled:Period:3736210:Thread:20
[+30s]   AutoChecker:Processed:1:Executed:0:Expired:0
[+30s]   DEBUG:Execute:PriceCheckFailed:0:BUY:-110000>-1486618624
[+30s]   AutoScheduled:Period:3736210:Thread:21
[+30s]   ❌ ERROR: "Too many events for this operation"
[+60s]   AutoChecker:Processed:0:Executed:0:Expired:0
[+60s]   No new async call issued
[Forever] BotExecutionCount stays at 1
```

**Interpretation (FIXED NOW):**
- ✅ Price validation works (correct tick comparison)
- ✅ Event limit no longer exceeded
- ✅ Bot continues executing

---

## Debugging Checklist

If tests fail, check:

- [ ] **Compilation:** `npm run build` completes without errors
- [ ] **Deployment:** OrderManager deployed successfully
- [ ] **Pool Created:** WMAS/USDC pool exists
- [ ] **Order Created:** Order ID 0 created with status PENDING
- [ ] **Limit Price Format:** Order stores u256 value in Q64.96 format
  - Expected: ~79228162514264337593543950336 (for price 1.0)
  - Not: 1000000000000000000 (old wrong format)
- [ ] **First Bot Execution:** BotExecutionCount goes 0 → 1
- [ ] **Second Bot Execution:** BotExecutionCount goes 1 → 2
- [ ] **Event Logs:** No "Too many events" errors
- [ ] **Async Calls:** Multiple AsyncCall events in sequence

---

## Performance Metrics

### Expected Execution Time
- Order Creation: ~2-3 seconds
- Bot Execution Latency: 30 seconds (CHECK_INTERVAL_PERIODS = 5)
- Price Check Time: <100ms per order
- Total System Throughput: ~10 orders per 30-second cycle

### Resource Usage
- Events per execution: ~5-6 (down from 20+)
- Gas cost per check: ~300,000,000 (within budget)
- Storage per order: ~256 bytes

---

## Next Steps After Passing Tests

1. **Increase Order Volume:** Test with 5-10 orders simultaneously
2. **Test Order Expiry:** Create orders with short expiry times
3. **Test Order Cancellation:** Cancel orders before execution
4. **Test Price Range:** Create orders at various limit prices
5. **Load Test:** Run for extended period (hours) to verify stability
6. **Production Deployment:** Deploy to main network with monitoring

