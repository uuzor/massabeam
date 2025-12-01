# Price Check Analysis: Limit Order vs Pool Structure

## Overview
This document analyzes how price validation is performed in the limit order execution and compares it with the pool structure to identify potential issues and inconsistencies.

---

## Pool Structure (pool.ts)

### PoolState Class
```typescript
class PoolState {
  public sqrtPriceX96: u256,    // Current price in Q64.96 format
  public tick: i32,              // Current tick
  public liquidity: u128,        // Current liquidity
}
```

**Key Properties:**
- `sqrtPriceX96`: Stored as **u256** in Q64.96 fixed-point format
- `tick`: Stored as **i32** integer tick
- Both are loaded from storage via `PoolState.load()`

### Pool State Retrieval
```typescript
// In pool.ts line 84-92
static load(): PoolState {
  if (!Storage.has(POOL_STATE_KEY)) {
    const defaultSqrtPrice = getSqrtPrice96(); // 2^96
    return new PoolState(defaultSqrtPrice, 0, u128.Zero);
  }
  const data = Storage.get(POOL_STATE_KEY);
  return PoolState.deserialize(data);
}
```

Pool state is serialized with 3 fields:
1. sqrtPriceX96 (u256)
2. tick (i32)
3. liquidity (u128)

---

## Limit Order Price Check (orderManager.ts)

### Entry Point
```typescript
// Line 823 - Get pool state
const stateData = pool.getState();
if (stateData.length == 0) {
  return false;
}

// Line 829-830 - Parse state
const stateArgs = new Args(stateData);
const currentSqrtPriceX96 = stateArgs.nextU256().expect('sqrtPriceX96 missing');
```

**Current Implementation:**
- Calls `pool.getState()` which returns serialized data
- Parses ONLY the first field (sqrtPriceX96) as u256
- Ignores tick and liquidity

### Price Conversion
```typescript
// Line 846-847
const currentTick = getTickAtSqrtPrice(currentSqrtPriceX96);
const limitTick = getTickAtSqrtPrice(order.limitPrice);
```

**Issue Identified:** The limit price is being converted using the same `getTickAtSqrtPrice()` function that expects a sqrt price in Q64.96 format, but `order.limitPrice` is likely a decimal price string (e.g., "0.99", "1.05").

### Price Validation
```typescript
// Lines 855-869
if (order.orderType == 0) {
  // BUY order: currentPrice <= limitPrice means currentTick <= limitTick
  if (currentTick > limitTick) {
    return false;
  }
} else {
  // SELL order: currentPrice >= limitPrice means currentTick >= limitTick
  if (currentTick < limitTick) {
    return false;
  }
}
```

---

## SwapMath Library Analysis (swapMath.ts)

### getSqrtPriceAtTick() - SIMPLIFIED Implementation
```typescript
export function getSqrtPriceAtTick(tick: i32): u256 {
  // Simplified: linear approximation
  // In production, use proper tick math with 1.0001^tick
  const base = getSqrtPrice96(); // 2^96 = 79228162514264337593543950336
  const tickAbs = tick >= 0 ? tick : -tick;
  const adjustment = u256.fromU32(u32(tickAbs));

  if (tick >= 0) {
    return SafeMathU256.add(base, adjustment);
  } else {
    return SafeMathU256.sub(base, adjustment);
  }
}
```

**Issue:** Uses **LINEAR approximation** instead of proper **exponential** (1.0001^tick) formula.

### getTickAtSqrtPrice() - SIMPLIFIED Implementation
```typescript
export function getTickAtSqrtPrice(sqrtPriceX96: u256): i32 {
  // Simplified: linear approximation
  const base = getSqrtPrice96(); // 2^96

  if (sqrtPriceX96 >= base) {
    const diff = SafeMathU256.sub(sqrtPriceX96, base);
    return i32(diff.toU32());
  } else {
    const diff = SafeMathU256.sub(base, sqrtPriceX96);
    return -i32(diff.toU32());
  }
}
```

**Issue:** Uses **LINEAR approximation** instead of proper **logarithmic** (log(sqrtPriceX96 / 2^96) / log(1.0001)) formula.

---

## Issues Identified

### 1. **CRITICAL: Order Limit Price Format Mismatch**

**Problem:**
```typescript
const limitTick = getTickAtSqrtPrice(order.limitPrice);
```

- `order.limitPrice` appears to be a **decimal string** (e.g., "0.99", "1.05")
- `getTickAtSqrtPrice()` expects a **u256 in Q64.96 format**
- The price string is NOT being converted to Q64.96 format before calling getTickAtSqrtPrice()

**Expected Flow:**
```
User input: "0.99" (decimal price)
    ↓
Convert to Q64.96: multiply by 2^96
    ↓
Get tick: getTickAtSqrtPrice(sqrtPriceQ64.96)
    ↓
Compare: currentTick vs limitTick
```

**Actual Flow:**
```
User input: "0.99" (decimal price string)
    ↓
Pass directly to getTickAtSqrtPrice("0.99")  ← WRONG!
    ↓
Undefined behavior (converting string to u256)
```

### 2. **Simplified Math Functions**

**Problem:** SwapMath uses simplified linear approximations instead of proper Uniswap V3 math.

**Current (Simplified):**
- `getSqrtPriceAtTick()`: Linear approximation
  - Formula: `sqrtPrice = 2^96 ± tick`
  - Error grows exponentially with tick magnitude

- `getTickAtSqrtPrice()`: Linear approximation
  - Formula: `tick = sqrtPrice - 2^96`
  - Inverse is also linear

**Production (Correct):**
- `getSqrtPriceAtTick()`: Exponential formula
  - Formula: `sqrtPrice = 2^96 * 1.0001^tick`
  - Each tick represents exactly 0.01% price change

- `getTickAtSqrtPrice()`: Logarithmic formula
  - Formula: `tick = log(sqrtPrice / 2^96) / log(1.0001)`
  - Properly inverts the exponential

**Impact:**
- Price validation becomes increasingly inaccurate for large tick values
- At tick = 1000, error is ~1000 units in u256 space
- At tick = 10000, error is ~10000 units
- Makes orders execute at wrong prices

### 3. **Pool State Deserialization Incomplete**

**Problem:**
```typescript
const stateArgs = new Args(stateData);
const currentSqrtPriceX96 = stateArgs.nextU256().expect('sqrtPriceX96 missing');
// Never reads tick or liquidity!
```

**Issue:** Pool state includes 3 fields but only reads 1:
1. ✅ sqrtPriceX96 (u256) - READ
2. ❌ tick (i32) - NOT READ
3. ❌ liquidity (u128) - NOT READ

**Could Use Pool Tick Directly:**
```typescript
const stateArgs = new Args(stateData);
const currentSqrtPriceX96 = stateArgs.nextU256().expect('sqrtPriceX96 missing');
const currentTick = stateArgs.nextI32().expect('tick missing');
// Then use currentTick directly, no conversion needed!
```

---

## Recommended Fixes

### Fix 1: Correct Limit Price Conversion

**Current Code (WRONG):**
```typescript
const limitTick = getTickAtSqrtPrice(order.limitPrice);
```

**Fixed Code:**
```typescript
// Convert decimal price string to u256 in Q64.96 format
const limitPriceDecimal = parseFloat(order.limitPrice); // e.g., 0.99
const sqrtPrice96 = getSqrtPrice96(); // 2^96
const limitPriceQ64_96 = u256.fromF64(limitPriceDecimal * f64(sqrtPrice96));
const limitTick = getTickAtSqrtPrice(limitPriceQ64_96);
```

OR **Better: Use Pool's Tick Directly:**
```typescript
// Skip conversion entirely - pool already has accurate tick
const stateArgs = new Args(stateData);
const currentSqrtPriceX96 = stateArgs.nextU256().expect('sqrtPriceX96 missing');
const currentTick = stateArgs.nextI32().expect('tick missing');
// Store limit tick in order during creation via proper conversion
```

### Fix 2: Replace Simplified Math with Proper Uniswap V3 Formulas

**For getSqrtPriceAtTick():**
```typescript
export function getSqrtPriceAtTick(tick: i32): u256 {
  // Implement: sqrtPrice = 2^96 * 1.0001^tick
  // Using: sqrtPrice = 2^96 * exp(tick * ln(1.0001))
  // Or use lookup table for common ticks

  const base = getSqrtPrice96();
  if (tick == 0) return base;

  // For production: implement proper exponential math
  // Temporary: use better approximation
  const absRatio = u256.fromU32(u32(tick >= 0 ? tick : -tick));
  const ratio = SafeMathU256.mul(base, absRatio); // Better than adding

  return tick >= 0 ? ratio : SafeMathU256.div(base, ratio);
}
```

**For getTickAtSqrtPrice():**
```typescript
export function getTickAtSqrtPrice(sqrtPriceX96: u256): i32 {
  // Implement: tick = log(sqrtPrice / 2^96) / log(1.0001)
  // Or use binary search with getSqrtPriceAtTick()

  const base = getSqrtPrice96();
  if (sqrtPriceX96 == base) return 0;

  // For production: implement proper logarithm
  // Temporary: use binary search
  let tick: i32 = 0;
  // ... binary search implementation ...
  return tick;
}
```

### Fix 3: Read Tick from Pool State

**Current (Incomplete):**
```typescript
const stateArgs = new Args(stateData);
const currentSqrtPriceX96 = stateArgs.nextU256().expect('sqrtPriceX96 missing');
const currentTick = getTickAtSqrtPrice(currentSqrtPriceX96); // Calculated
```

**Fixed (Direct):**
```typescript
const stateArgs = new Args(stateData);
const currentSqrtPriceX96 = stateArgs.nextU256().expect('sqrtPriceX96 missing');
const currentTick = stateArgs.nextI32().expect('tick missing'); // From pool
```

---

## Data Flow Comparison

### Current (PROBLEMATIC)
```
Pool Storage
├─ sqrtPriceX96 (u256)
├─ tick (i32)
└─ liquidity (u128)
    │
    ├─ Read sqrtPriceX96
    │
    ├─ Calculate tick = getTickAtSqrtPrice(sqrtPriceX96)
    │   ├─ Linear approximation
    │   └─ High error for large ticks
    │
    └─ Order limitPrice (decimal string)
       │
       ├─ Convert??? (no conversion happens!)
       │
       └─ Calculate limitTick = getTickAtSqrtPrice(limitPrice)
          └─ WRONG INPUT FORMAT!

Result: Price comparison is INCORRECT
```

### Correct (SHOULD BE)
```
Pool Storage
├─ sqrtPriceX96 (u256)
├─ tick (i32) ← USE THIS!
└─ liquidity (u128)
    │
    ├─ Read currentTick directly
    │
    └─ Order limitPrice (decimal string)
       │
       ├─ Convert to proper format at order creation
       │   └─ multiply by 2^96 for Q64.96
       │
       └─ Calculate limitTick = proper inverse formula
          └─ CORRECT!

Result: Price comparison is ACCURATE
```

---

## Summary Table

| Aspect | Current | Issue | Fix |
|--------|---------|-------|-----|
| **Limit Price Input** | Decimal string (e.g., "0.99") | Not converted to Q64.96 | Convert at order creation |
| **Tick Calculation** | From sqrtPrice via `getTickAtSqrtPrice()` | Linear approx, high error | Read directly from pool |
| **Math Functions** | Simplified linear | Inaccurate for large ticks | Implement exponential/logarithm |
| **Pool State Reading** | Only sqrtPriceX96 | Wastes available tick field | Read tick field directly |
| **Price Validation** | Tick comparison | Works IF conversions correct | Fix conversions first |

---

## Testing Recommendations

### Test Case 1: Price Conversion Accuracy
```
Input: limitPrice = "0.99"
Expected: Tick where sqrtPrice ≈ 0.99
Actual: Check if conversion produces correct tick
```

### Test Case 2: Tick Comparison Logic
```
BUY Order:
- currentPrice = 0.95, limitPrice = 0.99
- Expected: Execute (0.95 <= 0.99)
- Verify: currentTick <= limitTick

SELL Order:
- currentPrice = 1.05, limitPrice = 0.99
- Expected: Execute (1.05 >= 0.99)
- Verify: currentTick >= limitTick
```

### Test Case 3: Large Tick Values
```
Input: limitPrice = "10.0" or "0.1"
Expected: Math functions handle correctly
Actual: Check linear vs exponential differences
```

---

## Conclusion

**The price check logic is structurally correct** (BUY <= limitPrice, SELL >= limitPrice), but **the price conversion has multiple critical issues**:

1. **Limit price is never converted** from decimal to Q64.96 format
2. **Math functions use simplified approximations** causing inaccuracy
3. **Pool's tick field is not being used** even though it's available

These issues likely explain why orders are not executing even when prices should match.
