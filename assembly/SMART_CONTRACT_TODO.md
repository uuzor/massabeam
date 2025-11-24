# 🔧 Smart Contract TODO - What's Left to Complete

## Current Status Summary

### ✅ **Completed Contracts**
1. **Factory** - Pool creation and tracking ✓
2. **OrderManager** - Complete limit order system with BUY/SELL ✓
3. **MRC6909** - Multi-token standard implementation ✓
4. **Tick Library** - Liquidity tracking per tick ✓
5. **Position Library** - Position management (simplified math) ✓
6. **SwapMath Library** - Swap calculations (simplified math) ✓

### ⚠️ **Incomplete Contracts**
1. **Pool Contract** - Has scaffolding but 4 major TODOs

---

## 🚨 Pool Contract - Critical TODOs

The Pool contract (`assembly/contracts/pool.ts`) has function signatures and argument parsing complete, but needs implementation logic for all core functions.

### 1. **mint()** - Line 98
**Status:** Scaffolding only
**What's needed:**
```typescript
// TODO: Implement liquidity minting logic
// - Validate tick range (tickLower < tickUpper, within bounds)
// - Update tick state using Tick library
// - Calculate token amounts needed (use Position library)
// - Transfer tokens from user (MRC6909 or native MAS)
// - Update position storage
// - Update pool state (liquidity, sqrtPrice)
// - Mint position tokens (track ownership)
```

**Required integrations:**
- `Tick.update()` - Update tick liquidity
- `Position.getAmountsForLiquidity()` - Calculate token amounts
- Token transfers (MRC6909 `transferFrom` or `Coins.transferCoins`)
- Position storage (key: owner + tickLower + tickUpper)
- Pool state updates

**Current args parsed:**
- ✅ recipient: string
- ✅ tickLower: i32
- ✅ tickUpper: i32
- ✅ amount: u128 (liquidity)

---

### 2. **burn()** - Line 132
**Status:** Scaffolding only
**What's needed:**
```typescript
// TODO: Implement liquidity burning logic
// - Validate caller owns position
// - Load position from storage
// - Update tick state (decrease liquidity)
// - Calculate token amounts to return
// - Update position storage (or delete if liquidity = 0)
// - Update pool state
// - Track tokens owed (don't transfer yet - use collect())
```

**Required integrations:**
- Position ownership validation
- `Tick.update()` with negative liquidity delta
- `Position.getAmountsForLiquidity()` for amounts
- Position storage updates
- Track `tokensOwed0` and `tokensOwed1`

**Current args parsed:**
- ✅ tickLower: i32
- ✅ tickUpper: i32
- ✅ amount: u128 (liquidity to burn)

---

### 3. **swap()** - Line 169
**Status:** Scaffolding only - **Most complex function**
**What's needed:**
```typescript
// TODO: Implement swap logic
// - Validate price limit (sqrtPriceLimitX96)
// - Load pool state (current price, liquidity, tick)
// - Initialize swap state
// - LOOP through ticks until amount filled or price limit hit:
//   - Compute swap step using SwapMath.computeSwapStep()
//   - If crossing tick boundary:
//     - Load tick info
//     - Update liquidity (add/subtract tick.liquidityNet)
//     - Update tick fee growth
//   - Update pool state (sqrtPrice, tick)
// - Calculate final amounts (input/output)
// - Transfer tokens (input from user, output to recipient)
// - Update fee growth global trackers
// - Emit Swap event with amounts
```

**Required integrations:**
- `SwapMath.computeSwapStep()` - Calculate each swap step
- `Tick.cross()` - Handle tick crossings
- `SwapMath.getSqrtPriceAtTick()` and `getTickAtSqrtPrice()` - Conversions
- Token transfers (both directions)
- Pool state storage
- Fee growth tracking (global and per-tick)

**Current args parsed:**
- ✅ recipient: string
- ✅ zeroForOne: bool (swap direction)
- ✅ amountSpecified: i128 (positive = exact input, negative = exact output)
- ✅ sqrtPriceLimitX96: u256 (price limit)

**Complexity:** HIGH - This is the core AMM swap logic with concentrated liquidity

---

### 4. **collect()** - Line 210
**Status:** Scaffolding only
**What's needed:**
```typescript
// TODO: Implement fee collection logic
// - Load position from storage
// - Calculate fees owed using Position.updatePosition()
// - Determine amounts to collect (min of requested and owed)
// - Transfer tokens to recipient
// - Update position storage (reduce tokensOwed)
// - Emit Collect event with amounts
```

**Required integrations:**
- `Position.updatePosition()` - Calculate fees
- Position storage access
- Token transfers to recipient
- Position storage updates

**Current args parsed:**
- ✅ recipient: string
- ✅ tickLower: i32
- ✅ tickUpper: i32
- ✅ amount0Requested: u128
- ✅ amount1Requested: u128

---

## 📊 Pool State Storage Structure

Need to implement storage for:

```typescript
// Pool state (global)
class PoolState {
  sqrtPriceX96: u256;        // Current sqrt price
  tick: i32;                  // Current tick
  liquidity: u128;            // Active liquidity
  feeGrowthGlobal0X128: u256; // Fee growth token0
  feeGrowthGlobal1X128: u256; // Fee growth token1
}

// Position storage key format
const POSITION_KEY = `position:${owner}:${tickLower}:${tickUpper}`;

// Tick storage (already in Tick library)
const TICK_KEY = `tick:${tickIndex}`;
```

---

## 🔢 Math Libraries - Production Upgrade Needed

Both Position and SwapMath libraries are **functional but simplified**. For production, need proper Uniswap V3 math:

### Position Library (`assembly/libraries/position.ts`)
**Current:** Simplified half-and-half token amount calculations
**Production needs:**
- Proper Q96 sqrt price arithmetic
- Exact `getAmountsForLiquidity()` using:
  ```
  amount0 = liquidity * (sqrtPriceB - sqrtPriceA) / (sqrtPriceA * sqrtPriceB)
  amount1 = liquidity * (sqrtPriceB - sqrtPriceA)
  ```
- Exact `getLiquidityForAmounts()` formulas
- Proper fee calculation with 128-bit precision

### SwapMath Library (`assembly/libraries/swapMath.ts`)
**Current:** Linear approximations
**Production needs:**
- Proper tick-to-price conversion: `price = 1.0001^tick`
- Inverse: `tick = log(price) / log(1.0001)`
- Q96 fixed-point arithmetic throughout
- Exact swap step calculations
- Handle edge cases (overflow, underflow, rounding)

**References:**
- Uniswap V3 Core: `SqrtPriceMath.sol`, `SwapMath.sol`, `TickMath.sol`
- Q96 format: Uses 96 fractional bits for sqrt price representation

---

## 🎯 Implementation Priority

### Phase 1: Basic Pool Functions (High Priority)
1. **Implement `mint()`** - Required for pool frontend to work
   - Difficulty: Medium
   - Dependencies: Tick library ✓, Position library ✓, Token transfers
   - Estimated complexity: ~200-300 lines

2. **Implement `burn()`** - Required for removing liquidity
   - Difficulty: Medium
   - Dependencies: Same as mint()
   - Estimated complexity: ~150-200 lines

3. **Implement `collect()`** - Required for claiming fees
   - Difficulty: Easy
   - Dependencies: Position library ✓
   - Estimated complexity: ~100 lines

### Phase 2: Swap Implementation (Critical for DEX)
4. **Implement `swap()`** - Core AMM functionality
   - Difficulty: **HIGH** (most complex)
   - Dependencies: SwapMath ✓, Tick library ✓, Token transfers
   - Estimated complexity: ~400-500 lines with proper tick crossing logic

### Phase 3: Production Math (Optional for MVP)
5. **Upgrade Position math** - Exact token amount calculations
   - Difficulty: Medium
   - Required for: Production accuracy

6. **Upgrade SwapMath** - Proper Q96 tick math
   - Difficulty: High
   - Required for: Production accuracy and exact price execution

---

## 📝 Additional Contracts Needed

### 1. **PoolState.ts** (Helper)
Store and retrieve pool state efficiently:
```typescript
export class PoolState {
  sqrtPriceX96: u256;
  tick: i32;
  liquidity: u128;
  feeGrowthGlobal0X128: u256;
  feeGrowthGlobal1X128: u256;

  serialize(): StaticArray<u8> { /* ... */ }
  static deserialize(data: StaticArray<u8>): PoolState { /* ... */ }
}
```

### 2. **PositionManager.ts** (Optional)
Separate contract to manage positions as NFTs (Uniswap V3 style):
- Mint position NFTs
- Track token IDs
- Transfer positions
- View position data

**Status:** Not started
**Priority:** Medium (can track positions in Pool directly for MVP)

---

## 🧪 Testing Requirements

Once Pool functions are implemented, need to test:

1. **mint() tests:**
   - Single-sided liquidity (price below/above range)
   - Two-sided liquidity (price in range)
   - Multiple positions in same pool
   - Tick boundary cases

2. **burn() tests:**
   - Partial burn
   - Full burn
   - Position ownership validation
   - Tokens owed accumulation

3. **swap() tests:**
   - Simple swaps within one tick
   - Swaps crossing multiple ticks
   - Exact input vs exact output
   - Price limit enforcement
   - Fee accumulation

4. **collect() tests:**
   - Collect all fees
   - Partial fee collection
   - Multiple fee collections

5. **Integration tests:**
   - Full lifecycle: create pool → add liquidity → swap → collect fees → remove liquidity
   - Multiple LPs in same pool
   - Fee distribution correctness

---

## 📦 Files Status

```
assembly/
├── contracts/
│   ├── factory.ts          ✅ Complete
│   ├── pool.ts             ⚠️  Scaffolding only - 4 TODOs
│   ├── orderManager.ts     ✅ Complete
│   └── MRC6909.ts          ✅ Complete
├── libraries/
│   ├── tick.ts             ✅ Complete
│   ├── position.ts         ⚠️  Functional but simplified math
│   ├── swapMath.ts         ⚠️  Functional but simplified math
│   ├── tickMath.ts         ✅ Complete
│   ├── safeMath.ts         ✅ Complete
│   └── helpers.ts          ✅ Complete
└── storage/
    ├── factory.ts          ✅ Complete
    └── pool.ts             ✅ Complete
```

---

## 🚀 Next Steps

**Immediate:**
1. Implement `mint()` in Pool contract
2. Implement `burn()` in Pool contract
3. Implement `collect()` in Pool contract

**Critical:**
4. Implement `swap()` in Pool contract (most complex)

**Optional (Production):**
5. Upgrade Position library with exact Q96 math
6. Upgrade SwapMath library with exact tick math
7. Add PositionManager NFT contract

**Testing:**
8. Write comprehensive tests for all Pool functions
9. Integration testing with Factory and OrderManager

---

**Estimated effort:**
- mint/burn/collect: ~2-3 days of focused work
- swap: ~3-4 days (complex logic)
- Math upgrades: ~2-3 days
- Testing: ~2-3 days

**Total:** ~2 weeks for production-ready Pool contract with proper math
**MVP (simplified math):** ~1 week for basic functionality
