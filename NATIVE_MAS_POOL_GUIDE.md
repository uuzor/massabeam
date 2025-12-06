# Native MAS Pool Creation & Testing Guide

## Overview

This guide explains how native MAS tokens are handled in the MassaBeam DEX and provides step-by-step instructions for creating a pool with native MAS for testing.

---

## 🔍 How Native MAS Works in the Smart Contracts

### Native MAS Identifier
```typescript
const NATIVE_MAS_ADDRESS = 'NATIVE_MAS';
```

The smart contracts use the special identifier `'NATIVE_MAS'` to represent native MAS tokens instead of a token contract address.

### Token Transfer Logic

#### 1. **Transferring Tokens IN** (User → Pool)

```typescript
function transferTokensIn(token: string, from: string, amount: u256): void {
  if (token === NATIVE_MAS_ADDRESS) {
    // For native MAS: Check coins sent with transaction
    const coinsReceived = Context.transferredCoins();
    const amountU64 = amount.toU64();
    assert(coinsReceived >= amountU64, 'INSUFFICIENT_MAS_SENT');
  } else {
    // For MRC6909 tokens: Call transferFrom on token contract
    call(new Address(token), 'transferFrom', transferArgs, 0);
  }
}
```

**Key Points:**
- Native MAS is sent as coins with the transaction
- The contract checks `Context.transferredCoins()` matches the expected amount
- No `approve()` needed for native MAS transfers

#### 2. **Transferring Tokens OUT** (Pool → User)

```typescript
function transferTokensOut(token: string, to: string, amount: u256): void {
  if (token === NATIVE_MAS_ADDRESS) {
    // For native MAS: Direct coin transfer
    const amountU64 = amount.toU64();
    Coins.transferCoins(new Address(to), amountU64);
  } else {
    // For MRC6909 tokens: Call transferFrom
    call(new Address(token), 'transferFrom', transferArgs, 0);
  }
}
```

**Key Points:**
- Native MAS is sent directly using `Coins.transferCoins()`
- No token contract interaction needed

---

## 📦 WMAS (Wrapped MAS) Token

### What is WMAS?

WMAS is an ERC20-like wrapper for native MAS tokens. It allows native MAS to be used in smart contracts that expect standard token interfaces.

### WMAS Contract Functions

#### **Deposit** (MAS → WMAS)
```typescript
export function deposit(_: StaticArray<u8>): void {
  const recipient = Context.caller();
  const amount = Context.transferredCoins();

  // Calculate storage cost for new users
  const storageCost = computeStorageCost(recipient);
  assert(amount > storageCost, 'Amount must cover storage cost');

  const mintAmount = u256.fromU64(amount - storageCost);

  // Mint WMAS tokens
  _mint(recipient, mintAmount);

  generateEvent(`Deposit: ${recipient} wrapped ${amount} MAS -> ${mintAmount} WMAS`);
}
```

**Usage:**
```typescript
// Send MAS with the transaction to wrap it
await wmasContract.call('deposit', new Args(), {
  coins: Mas.fromString('100'), // Send 100 MAS
  maxGas: BigInt(100_000_000),
});
```

#### **Withdraw** (WMAS → MAS)
```typescript
export function withdraw(binaryArgs: StaticArray<u8>): void {
  const args = new Args(binaryArgs);
  const amountU64 = args.nextU64().expect('amount is missing');
  const recipient = new Address(args.nextString().expect('recipient is missing'));

  const amount = u256.fromU64(amountU64);
  const caller = Context.caller();

  // Burn WMAS tokens
  _burn(caller, amount);

  // Transfer MAS to recipient
  transferCoins(recipient, amountU64);

  generateEvent(`Withdraw: ${caller} unwrapped ${amount} WMAS -> ${amountU64} MAS`);
}
```

**Usage:**
```typescript
// Unwrap 100 WMAS back to 100 MAS
const args = new Args()
  .addU64(BigInt(100))
  .addString(userAddress);

await wmasContract.call('withdraw', args, {
  maxGas: BigInt(100_000_000),
});
```

---

## 🏊 Creating a Pool with Native MAS

### Option 1: Pool with Native MAS Directly

**Pool Pair:** `NATIVE_MAS / Token Address`

```typescript
// Create pool with native MAS and USDC token
const args = new Args()
  .addString('NATIVE_MAS')
  .addString('AS12tK9ykrBUJkZuFQwCFB7HpkPfL3eMJpmfWuVQkFCfcmfJD4Dj') // USDC address
  .addU64(BigInt(3000)); // 0.3% fee

const tx = await factoryContract.call('createPool', args, {
  coins: Mas.fromString('7'), // Storage cost
  maxGas: BigInt(1_000_000_000),
});
```

**Important Notes:**
- Use the string `'NATIVE_MAS'` as one of the token addresses
- The tokens will be automatically sorted by the factory
- Send MAS coins directly when adding liquidity or swapping

### Option 2: Pool with WMAS (Wrapped MAS)

**Pool Pair:** `WMAS Token Address / Other Token Address`

```typescript
// Create pool with WMAS and USDC token
const args = new Args()
  .addString('AS1wmasTokenAddress123...') // WMAS contract address
  .addString('AS12tK9ykrBUJkZuFQwCFB7HpkPfL3eMJpmfWuVQkFCfcmfJD4Dj') // USDC address
  .addU64(BigInt(3000)); // 0.3% fee

const tx = await factoryContract.call('createPool', args, {
  coins: Mas.fromString('7'), // Storage cost
  maxGas: BigInt(1_000_000_000),
});
```

**Important Notes:**
- WMAS behaves like a standard ERC20 token
- Users must `approve()` WMAS spending before swapping
- Need to wrap MAS first using `deposit()`

---

## 🧪 Testing Workflow

### Scenario 1: Test Native MAS Pool

#### Step 1: Deploy WMAS Token (Optional)
```bash
# Deploy WMAS contract
massa-sc deploy wmas.wasm

# Initialize WMAS
massa-sc call <WMAS_ADDRESS> constructor \
  --args "Wrapped MAS,WMAS,9"
```

#### Step 2: Create Native MAS Pool
```typescript
// Using the frontend or direct contract call
import { FACTORY_ADDRESS } from './constants/contracts';

const createNativeMasPool = async () => {
  const args = new Args()
    .addString('NATIVE_MAS')
    .addString(USDC_TOKEN_ADDRESS)
    .addU64(BigInt(3000)); // 0.3% fee

  const tx = await callContract(
    provider,
    FACTORY_ADDRESS,
    'createPool',
    args,
    Mas.fromString('7'),
    BigInt(1_000_000_000)
  );

  console.log('Pool created:', tx.id);

  // Get pool address
  const poolAddress = await getPoolAddress('NATIVE_MAS', USDC_TOKEN_ADDRESS, 3000);
  return poolAddress;
};
```

#### Step 3: Add Liquidity to Native MAS Pool
```typescript
const addLiquidityWithNativeMas = async (poolAddress: string, masAmount: string, tokenAmount: string) => {
  const args = new Args()
    .addString(userAddress)
    .addI32(BigInt(-887220)) // tickLower
    .addI32(BigInt(887220))  // tickUpper
    .addU128(BigInt(100000)); // liquidity

  // Send native MAS as coins with the transaction
  const tx = await callContract(
    provider,
    poolAddress,
    'mint',
    args,
    Mas.fromString(masAmount), // Send MAS here!
    BigInt(500_000_000)
  );

  console.log('Liquidity added:', tx.id);
};
```

#### Step 4: Swap with Native MAS
```typescript
const swapNativeMasForToken = async (poolAddress: string, masAmount: string) => {
  const args = new Args()
    .addString(userAddress) // recipient
    .addBool(true) // zeroForOne (MAS is token0)
    .addI128(i128.fromU64(parseFloat(masAmount) * 1e9)) // amount
    .addU256(u256.Zero); // sqrtPriceLimitX96 (no limit)

  // Send native MAS as coins
  const tx = await callContract(
    provider,
    poolAddress,
    'swap',
    args,
    Mas.fromString(masAmount), // Send MAS here!
    BigInt(300_000_000)
  );

  console.log('Swap executed:', tx.id);
};
```

---

## 📋 Testing Checklist

### Before Testing:
- [ ] Deploy WMAS token contract (if using WMAS)
- [ ] Deploy Factory contract
- [ ] Deploy Pool template contract
- [ ] Deploy test token (USDC, USDT, etc.)
- [ ] Fund test accounts with MAS tokens

### Pool Creation Tests:
- [ ] Create pool with `NATIVE_MAS / USDC`
- [ ] Verify pool address returned correctly
- [ ] Check pool metadata (tokens, fee, tick spacing)
- [ ] Verify pool appears in factory pool list

### Liquidity Tests:
- [ ] Add liquidity sending native MAS as coins
- [ ] Verify MAS deducted from user balance
- [ ] Verify USDC transferred via `transferFrom`
- [ ] Check position created correctly
- [ ] Remove liquidity and receive MAS back

### Swap Tests:
- [ ] Swap MAS → USDC (send MAS as coins)
- [ ] Swap USDC → MAS (receive MAS directly)
- [ ] Verify correct amounts in/out
- [ ] Check price updates correctly
- [ ] Verify fees accumulated

### WMAS Tests (if using wrapped):
- [ ] Wrap MAS to WMAS using `deposit()`
- [ ] Approve WMAS spending for pool
- [ ] Swap using WMAS like normal token
- [ ] Unwrap WMAS to MAS using `withdraw()`

---

## 💡 Key Differences: Native MAS vs WMAS

| Feature | Native MAS | WMAS |
|---------|-----------|------|
| **Pool Creation** | Use `'NATIVE_MAS'` string | Use WMAS contract address |
| **Approval** | Not needed | Required (`approve()` first) |
| **Transfer In** | Send coins with transaction | `transferFrom()` call |
| **Transfer Out** | `Coins.transferCoins()` | `transferFrom()` call |
| **Gas Cost** | Lower (direct transfer) | Higher (token contract calls) |
| **User Experience** | Simpler (no wrapping) | Extra step (wrap/unwrap) |

---

## 🔧 Frontend Implementation Example

### Creating Native MAS Pool in Frontend

```typescript
// frontend/src/utils/nativeMasPool.ts

import { Args, Mas } from '@massalabs/massa-web3';
import { FACTORY_ADDRESS } from '../constants/contracts';

export async function createNativeMasPool(
  provider: IProvider,
  tokenAddress: string,
  fee: number = 3000
): Promise<string> {
  const args = new Args()
    .addString('NATIVE_MAS')
    .addString(tokenAddress)
    .addU64(BigInt(fee));

  const tx = await callContract(
    provider,
    FACTORY_ADDRESS,
    'createPool',
    args,
    Mas.fromString('7'), // Storage cost
    BigInt(1_000_000_000)
  );

  // Extract pool address from event or query factory
  const poolKey = `${sortTokens('NATIVE_MAS', tokenAddress)}:${fee}`;
  const poolAddress = await getPoolAddress(provider, poolKey);

  return poolAddress;
}

export async function swapMasForToken(
  provider: IProvider,
  poolAddress: string,
  masAmount: string,
  recipient: string
): Promise<string> {
  const args = new Args()
    .addString(recipient)
    .addBool(true) // Assume MAS is token0
    .addI128(i128.fromU64(parseFloat(masAmount) * 1e9))
    .addU256(u256.Zero);

  const tx = await callContract(
    provider,
    poolAddress,
    'swap',
    args,
    Mas.fromString(masAmount), // Send MAS as coins!
    BigInt(300_000_000)
  );

  return tx.id;
}
```

---

## 🚀 Quick Start Commands

### 1. Create Native MAS/USDC Pool
```bash
# Using massa-sc CLI
massa-sc call <FACTORY_ADDRESS> createPool \
  --args "NATIVE_MAS,<USDC_ADDRESS>,3000" \
  --coins 7
```

### 2. Add Liquidity (Send 100 MAS)
```bash
massa-sc call <POOL_ADDRESS> mint \
  --args "<USER_ADDRESS>,-887220,887220,100000" \
  --coins 100
```

### 3. Swap 10 MAS for USDC
```bash
massa-sc call <POOL_ADDRESS> swap \
  --args "<USER_ADDRESS>,true,10000000000,0" \
  --coins 10
```

---

## ⚠️ Common Issues & Solutions

### Issue 1: "INSUFFICIENT_MAS_SENT"
**Cause:** Not sending enough MAS coins with the transaction
**Solution:** Include MAS amount in the `coins` parameter

### Issue 2: Pool Creation Fails
**Cause:** Tokens not properly sorted or pool already exists
**Solution:** Ensure `NATIVE_MAS` and token address are sorted, check if pool exists

### Issue 3: Swap Fails with Native MAS
**Cause:** Forgot to send MAS as coins with swap transaction
**Solution:** Add `coins: Mas.fromString(amount)` to the transaction

### Issue 4: Cannot Receive MAS from Pool
**Cause:** Pool contract doesn't have enough MAS balance
**Solution:** Ensure pool has liquidity and MAS was added correctly

---

## ✅ Summary

### To Create & Test Native MAS Pool:

1. **Use `'NATIVE_MAS'`** as the token identifier (not a contract address)
2. **Send MAS as coins** when calling `mint()` or `swap()`
3. **No approval needed** for native MAS transfers
4. **Receive MAS directly** as coins when swapping back
5. **Check `transferredCoins()`** in contract to verify MAS received

### Recommended for Testing:
- **Pool:** `NATIVE_MAS / USDC`
- **Fee:** 3000 (0.3%)
- **Initial Liquidity:** 100 MAS + 100 USDC
- **Test Swaps:** 1 MAS ↔ 1 USDC

The system is ready to handle native MAS pools for testing! 🚀
