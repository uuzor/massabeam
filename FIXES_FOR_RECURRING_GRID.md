# Fixes for Recurring and Grid Orders

## Analysis Summary

Both recurring and grid order contracts have similar issues to limit orders, but with key differences:

### Recurring Orders (recurringOrderManager.ts)
**Status: CLEAN - Does NOT need price validation fix**
- ✅ Uses `amountPerExecution` (u256) for swap amount
- ✅ Does NOT use price limits (takes any execution price)
- ✅ Executes at intervals regardless of price
- ✅ Already has asyncCall pattern (no sendMessage)
- ⚠️  Needs: Event reduction for sustainability

### Grid Orders (gridOrderManager.ts)
**Status: NEEDS FIXES**
- ❌ Uses `sendMessage` instead of `asyncCall` (OLD PATTERN)
- ⚠️  Uses price fields (gridLevels have prices)
- ⚠️  Needs: asyncCall migration + event reduction

---

## Fix #1: Recurring Orders - Debug Event Reduction

### Current Issue
Recurring orders are already functional for execution but emit too many debug events, limiting async execution cycles.

### Files to Modify
- `assembly/contracts/recurringOrderManager.ts`

### Changes Required

#### 1. checkAndExecuteRecurringOrders() (Line ~226-309)
**Current:** Clean execution, minimal events ✅
**Action:** Already optimized - NO CHANGES NEEDED

#### 2. _tryExecuteOrder() (Line ~576-617)
**Current:** Clean swap execution ✅
**Action:** Already optimized - NO CHANGES NEEDED

#### 3. _scheduleNextCheck() (Line ~539+)
**Status:** Needs to be checked for debug events

### Recommendation
Recurring orders are already well-optimized for event emission. Verify _scheduleNextCheck() and apply event reduction if needed.

---

## Fix #2: Grid Orders - asyncCall Migration + Event Reduction

### Critical Issues
1. **OLD PATTERN:** Uses `sendMessage` (deprecated/unsupported)
2. **NEEDS:** Migrate to `asyncCall` with Slot-based scheduling
3. **NEEDS:** Implement bot counter and event reduction

### Files to Modify
- `assembly/contracts/gridOrderManager.ts`

### Changes Required

#### 1. Update Imports (Line 17)
**Change from:**
```typescript
import {
  ...
  sendMessage,
} from '@massalabs/massa-as-sdk';
```

**Change to:**
```typescript
import {
  ...
  asyncCall,
  Slot,
} from '@massalabs/massa-as-sdk';
```

#### 2. Add Bot Counter Storage (Line ~31+)
**Add:**
```typescript
export const BOT_COUNTER = 'GRID_BOT_COUNTER';

// Bot counter functions (copy from orderManager.ts)
function _getBotExecutionCount(): u64 {
  if (Storage.has(stringToBytes(BOT_COUNTER))) {
    const stored = Storage.get(stringToBytes(BOT_COUNTER));
    return bytesToU64(stored);
  }
  return 0;
}

function _incrementBotExecutionCount(): void {
  const currentCount = _getBotExecutionCount();
  const newCount = currentCount + 1;
  Storage.set(stringToBytes(BOT_COUNTER), u64ToBytes(newCount));
  generateEvent(`GridBot:Count:${newCount}`);
}
```

#### 3. Replace sendMessage with asyncCall (Line ~560+)
**Change from:**
```typescript
function _scheduleNextCheck(): void {
  sendMessage(...);  // OLD PATTERN
}
```

**Change to:**
```typescript
function _scheduleNextCheck(periodDelay: u64): void {
  const currentPeriod = Context.currentPeriod();
  const currentThread = Context.currentThread();

  _incrementBotExecutionCount();

  // Calculate next slot
  let nextPeriod = currentPeriod;
  let nextThread = currentThread + 1;

  // Wrap thread if needed
  if (nextThread >= 32) {
    nextPeriod = currentPeriod + periodDelay;
    nextThread = 0;
  }

  // Schedule async call
  asyncCall(
    Context.callee(),
    'checkAndExecuteGrids',
    new Slot(nextPeriod, nextThread),
    new Slot(nextPeriod + 10, nextThread),
    EXECUTION_GAS_BUDGET,
    0,
    new Args().serialize(),
  );

  generateEvent(`GridAutoScheduled:Period:${nextPeriod}:Thread:${nextThread}`);
}
```

#### 4. Reduce Debug Events
Remove all granular DEBUG events, keep only summary events:
- ✅ Keep: `GridAutoChecker:Processed`
- ✅ Keep: `GridAutoExecuted`
- ✅ Keep: `GridAutoScheduled`
- ❌ Remove: All `DEBUG:*` grid events

---

## Deployment Scripts Updates

### src/deploy.ts

Need to add/update sections for:

1. **Recurring Order Manager Deployment**
```typescript
const recurringOrderManagerByteCode = getScByteCode('build', 'recurringOrderManager.wasm');
const recurringManager = await SmartContract.deploy(
  provider,
  recurringOrderManagerByteCode,
  new Args().addString(factoryAddress),
  {
    coins: DEPLOYMENT_CONFIG.factory.coins,
    maxGas: DEPLOYMENT_CONFIG.factory.maxGas,
  }
);
console.log('Recurring Order Manager deployed at:', recurringManager.address);
```

2. **Grid Order Manager Deployment**
```typescript
const gridOrderManagerByteCode = getScByteCode('build', 'gridOrderManager.wasm');
const gridManager = await SmartContract.deploy(
  provider,
  gridOrderManagerByteCode,
  new Args().addString(factoryAddress),
  {
    coins: DEPLOYMENT_CONFIG.factory.coins,
    maxGas: DEPLOYMENT_CONFIG.factory.maxGas,
  }
);
console.log('Grid Order Manager deployed at:', gridManager.address);
```

3. **Create Test Recurring Order**
```typescript
// Create recurring BUY order (DCA strategy)
const createRecurringTx = await recurringManager.call(
  'createRecurringOrder',
  new Args()
    .addString(USDC_ADDRESS)
    .addString(WMAS_ADDRESS)
    .addU256(BigInt('100000000000000000')) // 100 USDC per execution
    .addU64(5) // Every 5 periods
    .addU64(10), // 10 total executions
  {
    coins: Mas.fromString('0.1'),
    maxGas: BigInt(300_000_000),
  }
);
```

4. **Create Test Grid Order**
```typescript
// Create grid trading order
const sqrtPrice96 = BigInt('79228162514264337593543950336');
const lowerPrice = BigInt('1') * sqrtPrice96; // 1.0
const upperPrice = BigInt('2') * sqrtPrice96; // 2.0

const createGridTx = await gridManager.call(
  'createGridOrder',
  new Args()
    .addString(USDC_ADDRESS)
    .addString(WMAS_ADDRESS)
    .addU64(5) // 5 grid levels
    .addU256(lowerPrice)
    .addU256(upperPrice)
    .addU256(BigInt('100000000000000000')), // 100 USDC per level
  {
    coins: Mas.fromString('0.1'),
    maxGas: BigInt(300_000_000),
  }
);
```

---

## Implementation Priority

### Phase 1: Recurring Orders (QUICK - 1 hour)
1. ✅ No changes needed - already optimized
2. ✅ Deploy and test

### Phase 2: Grid Orders (MEDIUM - 2-3 hours)
1. Update imports (asyncCall/Slot)
2. Add bot counter functions
3. Migrate _scheduleNextCheck() to asyncCall
4. Reduce debug events
5. Test deployment

### Phase 3: Deployment Testing (1-2 hours)
1. Update src/deploy.ts
2. Create test orders for all three types
3. Verify bot execution cycles
4. Monitor event logs

---

## Verification Checklist

### Recurring Orders
- [ ] Compilation succeeds
- [ ] Deployment succeeds
- [ ] Order created with correct intervals
- [ ] Executes at scheduled intervals
- [ ] executedCount increments properly
- [ ] Bot continues executing multiple cycles

### Grid Orders
- [ ] Compilation succeeds (after asyncCall migration)
- [ ] Deployment succeeds
- [ ] asyncCall imports resolve
- [ ] Bot counter initializes
- [ ] _scheduleNextCheck() uses asyncCall
- [ ] No sendMessage errors
- [ ] Execution cycles without event limit errors
- [ ] Grid levels track correctly

### All Order Types
- [ ] No "Too many events" errors
- [ ] BotCount increments properly
- [ ] AutoScheduled events appear
- [ ] Multiple execution cycles succeed
- [ ] Orders persist across cycles

---

## Summary

| Order Type | Price Fix | Event Reduction | asyncCall | Status |
|------------|-----------|-----------------|-----------|--------|
| Limit     | ✅ Done   | ✅ Done        | ✅ Done   | ✅ READY |
| Recurring | ❌ N/A    | ✅ N/A (clean) | ✅ Done   | ✅ READY |
| Grid      | ⚠️ TODO   | ✅ TODO        | ❌ TODO   | ⚠️ NEEDS WORK |

---

## Next Steps

1. Verify recurring order execution (test-ready)
2. Implement grid order fixes (code + test)
3. Deploy all three order types together
4. Run comprehensive system test
5. Monitor for event limit issues
6. Prepare for production deployment
