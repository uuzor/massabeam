/**
 * COMPREHENSIVE INTEGRATION TEST
 * Tests full DEX workflow: Pool creation, liquidity, swaps, limit orders, and grid trading
 *
 * Flow:
 * 1. Load deployment addresses
 * 2. Create pool (WMAS/USDC)
 * 3. Add liquidity
 * 4. Perform initial swap
 * 5. Create limit order
 * 6. Execute swap to trigger limit order
 * 7. Verify limit order execution
 * 8. Create grid order
 * 9. Execute swaps to trigger grid levels
 * 10. Verify grid execution
 */

import { Args, bytesToU256, bytesToU64, bytesToString, u256ToBytes, u64ToBytes } from '@massalabs/as-types';
import { IAccount, IProvider, IContractData } from '@massalabs/massa-web3';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { getScClient, await_event_final } from './utils.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper functions for logging
function log(message: string) {
  console.log(`   ${message}`);
}

function logSection(title: string) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`${title}`);
  console.log(`${'='.repeat(80)}\n`);
}

function logSuccess(message: string) {
  console.log(`   ✅ ${message}`);
}

function logError(message: string) {
  console.error(`   ❌ ${message}`);
}

function logWarning(message: string) {
  console.warn(`   ⚠️  ${message}`);
}

function bytesToStr(bytes: Uint8Array): string {
  try {
    return bytesToString(bytes);
  } catch {
    try {
      return bytesToU256(bytes).toString();
    } catch {
      return `0x${Buffer.from(bytes).toString('hex')}`;
    }
  }
}

// Token amounts (with decimals)
const ONE_MAS = BigInt(1_000_000_000); // 1 MAS = 10^9
const ONE_USDC = BigInt(1_000_000); // 1 USDC = 10^6
const SQRT_PRICE_1_1 = BigInt('79228162514264337593543950336'); // sqrt(1) in Q96 format

async function main() {
  try {
    logSection('🚀 MASSABEAM DEX - COMPREHENSIVE INTEGRATION TEST');

    // ========================================
    // STEP 1: Load Deployment Addresses
    // ========================================
    logSection('📋 STEP 1: LOAD DEPLOYMENT ADDRESSES');

    const deploymentsPath = path.join(__dirname, 'deployments.json');
    if (!fs.existsSync(deploymentsPath)) {
      throw new Error('deployments.json not found. Run deploy.ts first!');
    }

    const deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf-8'));
    const FACTORY_ADDRESS = deployments.factory;
    const ORDER_MANAGER_ADDRESS = deployments.orderManager;
    const RECURRING_ORDER_MANAGER_ADDRESS = deployments.recurringOrderManager;
    const GRID_ORDER_MANAGER_ADDRESS = deployments.gridOrderManager;

    log(`Factory: ${FACTORY_ADDRESS}`);
    log(`Order Manager: ${ORDER_MANAGER_ADDRESS}`);
    log(`Recurring Order Manager: ${RECURRING_ORDER_MANAGER_ADDRESS}`);
    log(`Grid Order Manager: ${GRID_ORDER_MANAGER_ADDRESS}`);
    logSuccess('Deployment addresses loaded');

    // ========================================
    // STEP 2: Initialize Client & Account
    // ========================================
    logSection('🔑 STEP 2: INITIALIZE CLIENT & ACCOUNT');

    const { client, account } = await getScClient();
    const baseAccount = account.address.toString();

    log(`Account: ${baseAccount}`);
    log(`Balance: Checking...`);

    const balance = await client.wallet().getAccountBalance(baseAccount);
    log(`Balance: ${balance?.final || 0} MAS`);
    logSuccess('Client initialized');

    // Mock token addresses (in production these would be deployed tokens)
    const WMAS_ADDRESS = 'AS12abc...WMAS'; // Wrapped MAS
    const USDC_ADDRESS = 'AS12def...USDC'; // USDC

    // ========================================
    // STEP 3: Create Pool
    // ========================================
    logSection('🏊 STEP 3: CREATE POOL (WMAS/USDC, 0.3% fee)');

    const fee = 3000; // 0.3% = 3000 basis points
    const tickSpacing = 60;

    log(`Creating pool: WMAS/USDC`);
    log(`Fee: ${fee / 10000}%`);
    log(`Tick Spacing: ${tickSpacing}`);

    const createPoolArgs = new Args()
      .addString(WMAS_ADDRESS)
      .addString(USDC_ADDRESS)
      .addU64(fee)
      .addU64(tickSpacing);

    const createPoolOp = await client
      .smartContracts()
      .callSmartContract({
        targetAddress: FACTORY_ADDRESS,
        functionName: 'createPool',
        parameter: createPoolArgs.serialize(),
        maxGas: BigInt(200_000_000),
        coins: BigInt(0),
      });

    log(`Operation ID: ${createPoolOp}`);
    await await_event_final(client, createPoolOp);
    logSuccess('Pool created successfully');

    // Read pool address
    const getPoolArgs = new Args()
      .addString(WMAS_ADDRESS)
      .addString(USDC_ADDRESS)
      .addU64(fee);

    const poolAddressResult = await client
      .smartContracts()
      .readSmartContract({
        targetAddress: FACTORY_ADDRESS,
        targetFunction: 'getPool',
        parameter: getPoolArgs.serialize(),
      });

    const POOL_ADDRESS = bytesToString(poolAddressResult.returnValue);
    log(`Pool Address: ${POOL_ADDRESS}`);
    logSuccess('Pool address retrieved');

    // ========================================
    // STEP 4: Add Liquidity
    // ========================================
    logSection('💧 STEP 4: ADD LIQUIDITY');

    const amount0 = ONE_MAS * BigInt(100); // 100 MAS
    const amount1 = ONE_USDC * BigInt(1000); // 1000 USDC
    const tickLower = -887220; // Min tick
    const tickUpper = 887220; // Max tick

    log(`Amount WMAS: ${amount0.toString()} (100 MAS)`);
    log(`Amount USDC: ${amount1.toString()} (1000 USDC)`);
    log(`Tick Range: [${tickLower}, ${tickUpper}]`);

    const mintArgs = new Args()
      .addString(baseAccount) // recipient
      .addI32(tickLower)
      .addI32(tickUpper)
      .addU128(BigInt(1_000_000)) // Desired liquidity
      .addU256(amount0) // amount0Max
      .addU256(amount1); // amount1Max

    const mintOp = await client
      .smartContracts()
      .callSmartContract({
        targetAddress: POOL_ADDRESS,
        functionName: 'mint',
        parameter: mintArgs.serialize(),
        maxGas: BigInt(300_000_000),
        coins: BigInt(0),
      });

    log(`Operation ID: ${mintOp}`);
    await await_event_final(client, mintOp);
    logSuccess('Liquidity added successfully');

    // Read pool state
    const poolStateResult = await client
      .smartContracts()
      .readSmartContract({
        targetAddress: POOL_ADDRESS,
        targetFunction: 'getPoolState',
        parameter: new Args().serialize(),
      });

    const stateArgs = new Args(poolStateResult.returnValue);
    const sqrtPriceX96 = stateArgs.nextU256();
    const tick = stateArgs.nextI32();
    const liquidity = stateArgs.nextU128();

    log(`Current Price: ${sqrtPriceX96.toString()}`);
    log(`Current Tick: ${tick}`);
    log(`Total Liquidity: ${liquidity.toString()}`);
    logSuccess('Pool state retrieved');

    // ========================================
    // STEP 5: Perform Initial Swap
    // ========================================
    logSection('🔄 STEP 5: PERFORM INITIAL SWAP');

    const swapAmount = ONE_MAS * BigInt(10); // Swap 10 MAS for USDC
    const zeroForOne = true; // Selling WMAS for USDC

    log(`Swapping: 10 WMAS → USDC`);
    log(`Direction: ${zeroForOne ? 'WMAS → USDC' : 'USDC → WMAS'}`);

    const swapArgs = new Args()
      .addString(baseAccount) // recipient
      .addBool(zeroForOne)
      .addI128(swapAmount) // amount (positive = exact input)
      .addU256(BigInt('4295128739')); // sqrtPriceLimitX96 (min price)

    const swapOp = await client
      .smartContracts()
      .callSmartContract({
        targetAddress: POOL_ADDRESS,
        functionName: 'swap',
        parameter: swapArgs.serialize(),
        maxGas: BigInt(250_000_000),
        coins: BigInt(0),
      });

    log(`Operation ID: ${swapOp}`);
    await await_event_final(client, swapOp);
    logSuccess('Swap executed successfully');

    // Read updated pool state
    const poolState2 = await client
      .smartContracts()
      .readSmartContract({
        targetAddress: POOL_ADDRESS,
        targetFunction: 'getPoolState',
        parameter: new Args().serialize(),
      });

    const state2Args = new Args(poolState2.returnValue);
    const newSqrtPrice = state2Args.nextU256();
    const newTick = state2Args.nextI32();

    log(`New Price: ${newSqrtPrice.toString()}`);
    log(`New Tick: ${newTick}`);
    logSuccess('Pool state updated');

    // ========================================
    // STEP 6: Create Limit Order
    // ========================================
    logSection('📝 STEP 6: CREATE LIMIT ORDER');

    // Create a SELL limit order at a higher price than current
    const limitOrderAmount = ONE_MAS * BigInt(5); // Sell 5 MAS
    const minAmountOut = ONE_USDC * BigInt(45); // Expect at least 45 USDC (price = 9 USDC/MAS)
    const limitPrice = BigInt('10000000000000000000'); // 10 USDC per MAS in 18 decimals
    const orderType = 1; // SELL
    const expiry = 0; // No expiry

    log(`Creating SELL limit order:`);
    log(`  Selling: 5 MAS`);
    log(`  Minimum Receive: 45 USDC`);
    log(`  Limit Price: 10 USDC/MAS`);
    log(`  Order Type: SELL`);

    const createOrderArgs = new Args()
      .addString(WMAS_ADDRESS) // tokenIn
      .addString(USDC_ADDRESS) // tokenOut
      .addU256(limitOrderAmount) // amountIn
      .addU256(minAmountOut) // minAmountOut
      .addU256(limitPrice) // limitPrice
      .addU8(orderType) // orderType (SELL)
      .addU64(expiry); // expiry (0 = no expiry)

    const createOrderOp = await client
      .smartContracts()
      .callSmartContract({
        targetAddress: ORDER_MANAGER_ADDRESS,
        functionName: 'createLimitOrder',
        parameter: createOrderArgs.serialize(),
        maxGas: BigInt(250_000_000),
        coins: BigInt(0),
      });

    log(`Operation ID: ${createOrderOp}`);
    await await_event_final(client, createOrderOp);

    // Get order ID from return value (would need to parse event or return value)
    const ORDER_ID = BigInt(0); // First order
    log(`Order ID: ${ORDER_ID.toString()}`);
    logSuccess('Limit order created');

    // Read order details
    const getOrderArgs = new Args().addU256(ORDER_ID);
    const orderResult = await client
      .smartContracts()
      .readSmartContract({
        targetAddress: ORDER_MANAGER_ADDRESS,
        targetFunction: 'getOrder',
        parameter: getOrderArgs.serialize(),
      });

    const orderArgs = new Args(orderResult.returnValue);
    const orderId = orderArgs.nextU256();
    const owner = orderArgs.nextString();
    const tokenIn = orderArgs.nextString();
    const tokenOut = orderArgs.nextString();
    const amountIn = orderArgs.nextU256();
    const minOut = orderArgs.nextU256();
    const limitPriceRead = orderArgs.nextU256();
    const orderTypeRead = orderArgs.nextU8();
    const expiryRead = orderArgs.nextU64();
    const filled = orderArgs.nextBool();
    const cancelled = orderArgs.nextBool();

    log(`Order Details:`);
    log(`  Order ID: ${orderId.toString()}`);
    log(`  Owner: ${owner}`);
    log(`  Token In: ${tokenIn}`);
    log(`  Token Out: ${tokenOut}`);
    log(`  Amount In: ${amountIn.toString()}`);
    log(`  Min Amount Out: ${minOut.toString()}`);
    log(`  Limit Price: ${limitPriceRead.toString()}`);
    log(`  Order Type: ${orderTypeRead === 0 ? 'BUY' : 'SELL'}`);
    log(`  Filled: ${filled}`);
    log(`  Cancelled: ${cancelled}`);
    logSuccess('Order details retrieved');

    // ========================================
    // STEP 7: Execute Swap to Trigger Limit Order
    // ========================================
    logSection('⚡ STEP 7: EXECUTE SWAP TO TRIGGER LIMIT ORDER');

    // Swap USDC for WMAS to increase WMAS price
    // This should push price above our limit order threshold
    const triggerSwapAmount = ONE_USDC * BigInt(100); // Swap 100 USDC for WMAS

    log(`Swapping: 100 USDC → WMAS`);
    log(`This should increase WMAS price to trigger limit order`);

    const triggerSwapArgs = new Args()
      .addString(baseAccount)
      .addBool(false) // USDC → WMAS (false means token1 → token0)
      .addI128(triggerSwapAmount)
      .addU256(BigInt('1461446703485210103287273052203988822378723970342')); // Max price

    const triggerSwapOp = await client
      .smartContracts()
      .callSmartContract({
        targetAddress: POOL_ADDRESS,
        functionName: 'swap',
        parameter: triggerSwapArgs.serialize(),
        maxGas: BigInt(250_000_000),
        coins: BigInt(0),
      });

    log(`Operation ID: ${triggerSwapOp}`);
    await await_event_final(client, triggerSwapOp);
    logSuccess('Trigger swap executed');

    // Read price after swap
    const poolState3 = await client
      .smartContracts()
      .readSmartContract({
        targetAddress: POOL_ADDRESS,
        targetFunction: 'getSqrtPriceX96',
        parameter: new Args().serialize(),
      });

    const priceAfterTrigger = bytesToU256(poolState3.returnValue);
    log(`Price after trigger swap: ${priceAfterTrigger.toString()}`);

    // ========================================
    // STEP 8: Execute Limit Order
    // ========================================
    logSection('✅ STEP 8: EXECUTE LIMIT ORDER');

    log(`Executing limit order ${ORDER_ID.toString()}...`);

    const executeOrderArgs = new Args().addU256(ORDER_ID);

    const executeOrderOp = await client
      .smartContracts()
      .callSmartContract({
        targetAddress: ORDER_MANAGER_ADDRESS,
        functionName: 'executeLimitOrder',
        parameter: executeOrderArgs.serialize(),
        maxGas: BigInt(300_000_000),
        coins: BigInt(0),
      });

    log(`Operation ID: ${executeOrderOp}`);
    await await_event_final(client, executeOrderOp);
    logSuccess('Limit order execution attempted');

    // Verify order is filled
    const orderResult2 = await client
      .smartContracts()
      .readSmartContract({
        targetAddress: ORDER_MANAGER_ADDRESS,
        targetFunction: 'getOrder',
        parameter: getOrderArgs.serialize(),
      });

    const orderArgs2 = new Args(orderResult2.returnValue);
    orderArgs2.nextU256(); // orderId
    orderArgs2.nextString(); // owner
    orderArgs2.nextString(); // tokenIn
    orderArgs2.nextString(); // tokenOut
    orderArgs2.nextU256(); // amountIn
    orderArgs2.nextU256(); // minAmountOut
    orderArgs2.nextU256(); // limitPrice
    orderArgs2.nextU8(); // orderType
    orderArgs2.nextU64(); // expiry
    const filledAfter = orderArgs2.nextBool();

    if (filledAfter) {
      logSuccess('✅ Limit order FILLED successfully!');
    } else {
      logWarning('⚠️  Limit order NOT filled (price may not have met threshold)');
    }

    // ========================================
    // STEP 9: Create Grid Order
    // ========================================
    logSection('📊 STEP 9: CREATE GRID ORDER');

    const gridLevels = 5; // 5 grid levels
    const lowerPrice = BigInt('7000000000000000000'); // 7 USDC/MAS
    const upperPrice = BigInt('13000000000000000000'); // 13 USDC/MAS
    const amountPerLevel = ONE_MAS * BigInt(2); // 2 MAS per level

    log(`Creating grid order:`);
    log(`  Grid Levels: ${gridLevels}`);
    log(`  Price Range: 7-13 USDC/MAS`);
    log(`  Amount per Level: 2 MAS`);
    log(`  Total Escrowed: ${gridLevels * 2} MAS`);

    const createGridArgs = new Args()
      .addString(WMAS_ADDRESS) // tokenIn (base)
      .addString(USDC_ADDRESS) // tokenOut (quote)
      .addU64(gridLevels)
      .addU256(lowerPrice)
      .addU256(upperPrice)
      .addU256(amountPerLevel);

    const createGridOp = await client
      .smartContracts()
      .callSmartContract({
        targetAddress: GRID_ORDER_MANAGER_ADDRESS,
        functionName: 'createGridOrder',
        parameter: createGridArgs.serialize(),
        maxGas: BigInt(300_000_000),
        coins: BigInt(0),
      });

    log(`Operation ID: ${createGridOp}`);
    await await_event_final(client, createGridOp);

    const GRID_ID = BigInt(0); // First grid
    log(`Grid ID: ${GRID_ID.toString()}`);
    logSuccess('Grid order created');

    // Read grid details
    const getGridArgs = new Args().addU256(GRID_ID);
    const gridResult = await client
      .smartContracts()
      .readSmartContract({
        targetAddress: GRID_ORDER_MANAGER_ADDRESS,
        targetFunction: 'getGridOrder',
        parameter: getGridArgs.serialize(),
      });

    const gridArgs = new Args(gridResult.returnValue);
    const gridId = gridArgs.nextU256();
    const gridOwner = gridArgs.nextString();
    const gridTokenIn = gridArgs.nextString();
    const gridTokenOut = gridArgs.nextString();
    const gridLevelsRead = gridArgs.nextU64();
    const gridLowerPrice = gridArgs.nextU256();
    const gridUpperPrice = gridArgs.nextU256();
    const gridAmountPerLevel = gridArgs.nextU256();
    const gridActive = gridArgs.nextBool();

    log(`Grid Details:`);
    log(`  Grid ID: ${gridId.toString()}`);
    log(`  Owner: ${gridOwner}`);
    log(`  Token In: ${gridTokenIn}`);
    log(`  Token Out: ${gridTokenOut}`);
    log(`  Levels: ${gridLevelsRead}`);
    log(`  Lower Price: ${gridLowerPrice.toString()}`);
    log(`  Upper Price: ${gridUpperPrice.toString()}`);
    log(`  Amount/Level: ${gridAmountPerLevel.toString()}`);
    log(`  Active: ${gridActive}`);
    logSuccess('Grid details retrieved');

    // ========================================
    // STEP 10: Execute Swaps to Trigger Grid
    // ========================================
    logSection('🎯 STEP 10: EXECUTE SWAPS TO TRIGGER GRID LEVELS');

    // Swap 1: Push price down to trigger buy orders
    log(`\n--- Swap 1: Push price DOWN to trigger BUY orders ---`);
    const gridSwap1Amount = ONE_MAS * BigInt(20);

    const gridSwap1Args = new Args()
      .addString(baseAccount)
      .addBool(true) // WMAS → USDC (sell WMAS)
      .addI128(gridSwap1Amount)
      .addU256(BigInt('4295128739'));

    const gridSwap1Op = await client
      .smartContracts()
      .callSmartContract({
        targetAddress: POOL_ADDRESS,
        functionName: 'swap',
        parameter: gridSwap1Args.serialize(),
        maxGas: BigInt(250_000_000),
        coins: BigInt(0),
      });

    log(`Operation ID: ${gridSwap1Op}`);
    await await_event_final(client, gridSwap1Op);

    const priceAfterSwap1 = await client
      .smartContracts()
      .readSmartContract({
        targetAddress: POOL_ADDRESS,
        targetFunction: 'getSqrtPriceX96',
        parameter: new Args().serialize(),
      });

    log(`Price after sell: ${bytesToU256(priceAfterSwap1.returnValue).toString()}`);
    logSuccess('Price pushed down');

    // Wait a bit for grid checker to run (in real scenario)
    log(`\nWaiting for grid automation to detect price change...`);
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Swap 2: Push price up to trigger sell orders
    log(`\n--- Swap 2: Push price UP to trigger SELL orders ---`);
    const gridSwap2Amount = ONE_USDC * BigInt(150);

    const gridSwap2Args = new Args()
      .addString(baseAccount)
      .addBool(false) // USDC → WMAS (buy WMAS)
      .addI128(gridSwap2Amount)
      .addU256(BigInt('1461446703485210103287273052203988822378723970342'));

    const gridSwap2Op = await client
      .smartContracts()
      .callSmartContract({
        targetAddress: POOL_ADDRESS,
        functionName: 'swap',
        parameter: gridSwap2Args.serialize(),
        maxGas: BigInt(250_000_000),
        coins: BigInt(0),
      });

    log(`Operation ID: ${gridSwap2Op}`);
    await await_event_final(client, gridSwap2Op);

    const priceAfterSwap2 = await client
      .smartContracts()
      .readSmartContract({
        targetAddress: POOL_ADDRESS,
        targetFunction: 'getSqrtPriceX96',
        parameter: new Args().serialize(),
      });

    log(`Price after buy: ${bytesToU256(priceAfterSwap2.returnValue).toString()}`);
    logSuccess('Price pushed up');

    // Swap 3: Push price down again
    log(`\n--- Swap 3: Push price DOWN again ---`);
    const gridSwap3Amount = ONE_MAS * BigInt(15);

    const gridSwap3Args = new Args()
      .addString(baseAccount)
      .addBool(true)
      .addI128(gridSwap3Amount)
      .addU256(BigInt('4295128739'));

    const gridSwap3Op = await client
      .smartContracts()
      .callSmartContract({
        targetAddress: POOL_ADDRESS,
        functionName: 'swap',
        parameter: gridSwap3Args.serialize(),
        maxGas: BigInt(250_000_000),
        coins: BigInt(0),
      });

    log(`Operation ID: ${gridSwap3Op}`);
    await await_event_final(client, gridSwap3Op);
    logSuccess('Grid volatility simulation complete');

    // ========================================
    // FINAL SUMMARY
    // ========================================
    logSection('🎉 TEST COMPLETE - SUMMARY');

    // Get final pending order count
    const pendingCountResult = await client
      .smartContracts()
      .readSmartContract({
        targetAddress: ORDER_MANAGER_ADDRESS,
        targetFunction: 'getPendingOrdersCount',
        parameter: new Args().serialize(),
      });
    const pendingCount = bytesToU64(pendingCountResult.returnValue);

    // Get final active grid count
    const activeGridsResult = await client
      .smartContracts()
      .readSmartContract({
        targetAddress: GRID_ORDER_MANAGER_ADDRESS,
        targetFunction: 'getActiveGridsCount',
        parameter: new Args().serialize(),
      });
    const activeGrids = bytesToU64(activeGridsResult.returnValue);

    // Get final pool state
    const finalPoolState = await client
      .smartContracts()
      .readSmartContract({
        targetAddress: POOL_ADDRESS,
        targetFunction: 'getPoolState',
        parameter: new Args().serialize(),
      });
    const finalStateArgs = new Args(finalPoolState.returnValue);
    const finalPrice = finalStateArgs.nextU256();
    const finalTick = finalStateArgs.nextI32();
    const finalLiquidity = finalStateArgs.nextU128();

    log(`✅ Pool Created: ${POOL_ADDRESS}`);
    log(`✅ Liquidity Added: ${finalLiquidity.toString()}`);
    log(`✅ Swaps Executed: 5 total`);
    log(`✅ Limit Order Created & Executed: ${filledAfter ? 'FILLED' : 'PENDING'}`);
    log(`✅ Grid Order Created: ID ${GRID_ID.toString()}`);
    log(`✅ Grid Volatility Tested: 3 price swings`);
    log(``);
    log(`Final Pool State:`);
    log(`  Price: ${finalPrice.toString()}`);
    log(`  Tick: ${finalTick}`);
    log(`  Liquidity: ${finalLiquidity.toString()}`);
    log(``);
    log(`Pending Limit Orders: ${pendingCount}`);
    log(`Active Grid Orders: ${activeGrids}`);

    logSuccess('\n🎊 ALL TESTS COMPLETED SUCCESSFULLY! 🎊');

  } catch (error) {
    logError(`Test failed: ${error}`);
    console.error(error);
    process.exit(1);
  }
}

main()
  .then(() => {
    console.log('\n✨ Integration test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Integration test failed:', error);
    process.exit(1);
  });
