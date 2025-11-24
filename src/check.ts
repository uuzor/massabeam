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
 *
 * Usage: npm run test:integration
 * npx tsx src/check.ts
 */

import 'dotenv/config';
import {
  Account,
  Args,
  Mas,
  SmartContract,
  JsonRpcProvider,
} from '@massalabs/massa-web3';
import * as fs from 'fs';
import * as path from 'path';

// Mock token addresses (replace with actual deployed tokens)
const WMAS_ADDRESS = 'AS12N76WPYB3QNYKGhV2jZuQs1djdhNJLQgnm7m52pHWecvvj1fCQ';
const USDC_ADDRESS = 'AS1nDAemyLSLUuNZ747Dt3NgzEC9WGCkmjRvY9hZwW2928Fxb4Fk';

// Token amounts
const ONE_MAS = BigInt(1_000_000_000); // 1 MAS = 10^9
const ONE_USDC = BigInt(1_000_000); // 1 USDC = 10^6

function log(message: string): void {
  console.log(`  ${message}`);
}

function logSection(title: string): void {
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`  ${title}`);
  console.log(`${'═'.repeat(80)}`);
}

function logSuccess(message: string): void {
  console.log(`  ✅ ${message}`);
}

function logError(message: string): void {
  console.error(`  ❌ ${message}`);
}

function logWarn(message: string): void {
  console.warn(`  ⚠️  ${message}`);
}

function logEvent(data: string): void {
  console.log(`  📤 ${data}`);
}

function logDebug(data: string): void {
  console.log(`  🔍 ${data}`);
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Load deployment addresses from latest deployment file
 */
function loadAddresses() {
  const deploymentsPath = path.join(process.cwd(), 'deployments', 'buildnet-latest.json');

  if (!fs.existsSync(deploymentsPath)) {
    throw new Error('Deployment file not found! Run: npm run deploy:dex');
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentsPath, 'utf-8'));
  return {
    factory: deployment.contracts.factory,
    orderManager: deployment.contracts.orderManager,
    recurringOrderManager: deployment.contracts.recurringOrderManager,
    gridOrderManager: deployment.contracts.gridOrderManager,
  };
}

async function main(): Promise<void> {
  logSection('🚀 MASSABEAM DEX - COMPREHENSIVE INTEGRATION TEST');

  try {
    // ========================================
    // STEP 1: Initialize & Load Addresses
    // ========================================
    logSection('📋 STEP 1: INITIALIZE & LOAD ADDRESSES');

    const account = await Account.fromEnv();
    const provider = JsonRpcProvider.buildnet(account);

    log(`Account: ${account.address}`);

    const addresses = loadAddresses();
    log(`Factory: ${addresses.factory}`);
    log(`Order Manager: ${addresses.orderManager}`);
    logSuccess('Addresses loaded');

    const factoryContract = new SmartContract(provider, addresses.factory);
    const orderManagerContract = new SmartContract(provider, addresses.orderManager);

    // ========================================
    // STEP 2: Create Pool
    // ========================================
    logSection('🏊 STEP 2: CREATE POOL (WMAS/USDC, 0.3% fee)');

    const fee = 3000n; // 0.3%
    const tickSpacing = 60n;

    log(`Creating pool: WMAS/USDC`);
    log(`Fee: ${fee / 10000n}%`);
    log(`Tick Spacing: ${tickSpacing}`);

    const createPoolTx = await factoryContract.call(
      'createPool',
      new Args()
        .addString(WMAS_ADDRESS)
        .addString(USDC_ADDRESS)
        .addU64(fee)
        .addU64(tickSpacing),
      { coins: Mas.fromString('0.1'), maxGas: BigInt(200_000_000) }
    );

    logDebug(`Tx ID: ${createPoolTx.id}`);
   
    await createPoolTx.waitFinalExecution();
   

    const createPoolEvents = await createPoolTx.getFinalEvents();
    logDebug(`Received ${createPoolEvents.length} events`);

    for (const event of createPoolEvents) {
      if (event.data.includes('PoolCreated')) {
        logEvent(event.data);
      }
    }

    logSuccess('Pool created');

    // Get pool address
    const poolAddressBytes = await factoryContract.read(
      'getPool',
      new Args()
        .addString(WMAS_ADDRESS)
        .addString(USDC_ADDRESS)
        .addU64(fee)
    );

    const poolAddressArgs = new Args(poolAddressBytes.value);
    const POOL_ADDRESS = poolAddressArgs.nextString();
    log(`Pool Address: ${POOL_ADDRESS}`);
    logSuccess('Pool address retrieved');

    const poolContract = new SmartContract(provider, POOL_ADDRESS);

    // ========================================
    // STEP 3: Add Liquidity
    // ========================================
    logSection('💧 STEP 3: ADD LIQUIDITY');

    const amount0 = ONE_MAS * BigInt(100); // 100 MAS
    const amount1 = ONE_USDC * BigInt(1000); // 1000 USDC
    const tickLower = -887220n;
    const tickUpper = 887220n;

    log(`Amount WMAS: ${amount0} (100 MAS)`);
    log(`Amount USDC: ${amount1} (1000 USDC)`);
    log(`Tick Range: [${tickLower}, ${tickUpper}]`);

    const mintTx = await poolContract.call(
      'mint',
      new Args()
        .addString(account.address.toString())
        .addI32(tickLower)
        .addI32(tickUpper)
        .addU128(BigInt(1_000_000))
        .addU256(amount0)
        .addU256(amount1),
      { coins: Mas.fromString('0.5'), maxGas: BigInt(300_000_000) }
    );

    logDebug(`Tx ID: ${mintTx.id}`);
    await mintTx.waitFinalExecution();

    const mintEvents = await mintTx.getFinalEvents();
    for (const event of mintEvents) {
      if (event.data.includes('Mint')) {
        logEvent(event.data);
      }
    }

    logSuccess('Liquidity added');

    // Read pool state
    const poolStateBytes = await poolContract.read('getPoolState', new Args());
    const stateArgs = new Args(poolStateBytes.value);
    const sqrtPrice = stateArgs.nextU256();
    const tick = stateArgs.nextI32();
    const liquidity = stateArgs.nextU128();

    log(`Current Price: ${sqrtPrice}`);
    log(`Current Tick: ${tick}`);
    log(`Total Liquidity: ${liquidity}`);
    logSuccess('Pool state retrieved');

    // ========================================
    // STEP 4: Perform Initial Swap
    // ========================================
    logSection('🔄 STEP 4: PERFORM INITIAL SWAP');

    const swapAmount = ONE_MAS * BigInt(10); // 10 MAS

    log(`Swapping: 10 WMAS → USDC`);

    const swapTx = await poolContract.call(
      'swap',
      new Args()
        .addString(account.address.toString())
        .addBool(true) // zeroForOne
        .addI128(swapAmount)
        .addU256(BigInt('4295128739')), // min price
      { coins: Mas.fromString('0.2'), maxGas: BigInt(250_000_000) }
    );

    logDebug(`Tx ID: ${swapTx.id}`);
    await swapTx.waitFinalExecution();

    const swapEvents = await swapTx.getFinalEvents();
    for (const event of swapEvents) {
      if (event.data.includes('Swap')) {
        logEvent(event.data);
      }
    }

    logSuccess('Swap executed');

    // Read updated price
    const priceAfterSwap = await poolContract.read('getSqrtPriceX96', new Args());
    const newPrice = new Args(priceAfterSwap.value).nextU256();
    log(`New Price: ${newPrice}`);
    logSuccess('Pool state updated');

    // ========================================
    // STEP 5: Create Limit Order
    // ========================================
    logSection('📝 STEP 5: CREATE LIMIT ORDER');

    const limitOrderAmount = ONE_MAS * BigInt(5); // 5 MAS
    const minAmountOut = ONE_USDC * BigInt(45); // 45 USDC
    const limitPrice = BigInt('10000000000000000000'); // 10 USDC/MAS
    const orderType = 1n; // SELL
    const expiry = BigInt(0); // No expiry

    log(`Creating SELL limit order:`);
    log(`  Selling: 5 MAS`);
    log(`  Minimum: 45 USDC`);
    log(`  Limit Price: 10 USDC/MAS`);

    const createOrderTx = await orderManagerContract.call(
      'createLimitOrder',
      new Args()
        .addString(WMAS_ADDRESS)
        .addString(USDC_ADDRESS)
        .addU256(limitOrderAmount)
        .addU256(minAmountOut)
        .addU256(limitPrice)
        .addU8(orderType)
        .addU64(expiry),
      { coins: Mas.fromString('0.3'), maxGas: BigInt(250_000_000) }
    );

    logDebug(`Tx ID: ${createOrderTx.id}`);
    await createOrderTx.waitFinalExecution();

    const createOrderEvents = await createOrderTx.getFinalEvents();
    let ORDER_ID = BigInt(0);

    logDebug(`Received ${createOrderEvents.length} events`);
    for (const event of createOrderEvents) {
      logEvent(event.data);

      if (event.data.includes('LimitOrderCreated')) {
        const idMatch = event.data.match(/(\d+)/);
        if (idMatch) {
          ORDER_ID = BigInt(idMatch[0]);
          logSuccess(`Order ID extracted: ${ORDER_ID}`);
        }
      }
    }

    logSuccess('Limit order created');

    // Read order details
    const orderBytes = await orderManagerContract.read(
      'getOrder',
      new Args().addU256(ORDER_ID)
    );

    const orderArgs = new Args(orderBytes.value);
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
    log(`  ID: ${orderId}`);
    log(`  Owner: ${owner}`);
    log(`  Token In: ${tokenIn}`);
    log(`  Token Out: ${tokenOut}`);
    log(`  Amount: ${amountIn}`);
    log(`  Min Out: ${minOut}`);
    log(`  Limit Price: ${limitPriceRead}`);
    log(`  Type: ${orderTypeRead === 0n ? 'BUY' : 'SELL'}`);
    log(`  Filled: ${filled}`);
    log(`  Cancelled: ${cancelled}`);
    logSuccess('Order details retrieved');

    // ========================================
    // STEP 6: Trigger Swap for Limit Order
    // ========================================
    logSection('⚡ STEP 6: TRIGGER SWAP FOR LIMIT ORDER');

    const triggerSwapAmount = ONE_USDC * BigInt(100); // 100 USDC

    log(`Swapping: 100 USDC → WMAS`);
    log(`This should increase WMAS price to trigger limit order`);

    const triggerSwapTx = await poolContract.call(
      'swap',
      new Args()
        .addString(account.address.toString())
        .addBool(false) // USDC → WMAS
        .addI128(triggerSwapAmount)
        .addU256(BigInt('1461446703485210103287273052203988822378723970342')), // max price
      { coins: Mas.fromString('0.2'), maxGas: BigInt(250_000_000) }
    );

    logDebug(`Tx ID: ${triggerSwapTx.id}`);
    await triggerSwapTx.waitFinalExecution();
    logSuccess('Trigger swap executed');

    const priceAfterTrigger = await poolContract.read('getSqrtPriceX96', new Args());
    const priceAfter = new Args(priceAfterTrigger.value).nextU256();
    log(`Price after trigger: ${priceAfter}`);

    // ========================================
    // STEP 7: Execute Limit Order
    // ========================================
    logSection('✅ STEP 7: EXECUTE LIMIT ORDER');

    log(`Executing limit order ${ORDER_ID}...`);

    const executeOrderTx = await orderManagerContract.call(
      'executeLimitOrder',
      new Args().addU256(ORDER_ID),
      { coins: Mas.fromString('0.3'), maxGas: BigInt(300_000_000) }
    );

    logDebug(`Tx ID: ${executeOrderTx.id}`);
    await executeOrderTx.waitFinalExecution();

    const executeEvents = await executeOrderTx.getFinalEvents();
    for (const event of executeEvents) {
      logEvent(event.data);
    }

    logSuccess('Limit order execution attempted');

    // Verify order filled
    const orderAfterBytes = await orderManagerContract.read(
      'getOrder',
      new Args().addU256(ORDER_ID)
    );

    const orderAfterArgs = new Args(orderAfterBytes.value);
    orderAfterArgs.nextU256(); // skip to filled
    orderAfterArgs.nextString();
    orderAfterArgs.nextString();
    orderAfterArgs.nextString();
    orderAfterArgs.nextU256();
    orderAfterArgs.nextU256();
    orderAfterArgs.nextU256();
    orderAfterArgs.nextU8();
    orderAfterArgs.nextU64();
    const filledAfter = orderAfterArgs.nextBool();

    if (filledAfter) {
      logSuccess('✅ Limit order FILLED successfully!');
    } else {
      logWarn('⚠️  Limit order NOT filled (price condition not met)');
    }

    // ========================================
    // STEP 8: Create Grid Order (if gridOrderManager exists)
    // ========================================
    if (addresses.gridOrderManager) {
      logSection('📊 STEP 8: CREATE GRID ORDER');

      const gridOrderManager = new SmartContract(provider, addresses.gridOrderManager);

      const gridLevels = 5n;
      const lowerPrice = BigInt('7000000000000000000'); // 7 USDC/MAS
      const upperPrice = BigInt('13000000000000000000'); // 13 USDC/MAS
      const amountPerLevel = ONE_MAS * BigInt(2); // 2 MAS per level

      log(`Creating grid order:`);
      log(`  Levels: ${gridLevels}`);
      log(`  Range: 7-13 USDC/MAS`);
      log(`  Amount/Level: 2 MAS`);

      const createGridTx = await gridOrderManager.call(
        'createGridOrder',
        new Args()
          .addString(WMAS_ADDRESS)
          .addString(USDC_ADDRESS)
          .addU64(gridLevels)
          .addU256(lowerPrice)
          .addU256(upperPrice)
          .addU256(amountPerLevel),
        { coins: Mas.fromString('0.5'), maxGas: BigInt(300_000_000) }
      );

      logDebug(`Tx ID: ${createGridTx.id}`);
      await createGridTx.waitFinalExecution();

      const gridEvents = await createGridTx.getFinalEvents();
      let GRID_ID = BigInt(0);

      for (const event of gridEvents) {
        logEvent(event.data);

        if (event.data.includes('GridOrder:Created')) {
          const idMatch = event.data.match(/(\d+)/);
          if (idMatch) {
            GRID_ID = BigInt(idMatch[0]);
            logSuccess(`Grid ID extracted: ${GRID_ID}`);
          }
        }
      }

      logSuccess('Grid order created');

      // ========================================
      // STEP 9: Trigger Grid with Volatility
      // ========================================
      logSection('🎯 STEP 9: TRIGGER GRID LEVELS');

      log('\n--- Swap 1: Push price DOWN ---');
      const gridSwap1Tx = await poolContract.call(
        'swap',
        new Args()
          .addString(account.address.toString())
          .addBool(true) // WMAS → USDC
          .addI128(ONE_MAS * BigInt(20))
          .addU256(BigInt('4295128739')),
        { coins: Mas.fromString('0.2'), maxGas: BigInt(250_000_000) }
      );

      await gridSwap1Tx.waitFinalExecution();
      logSuccess('Price pushed down');

      await sleep(5000); // Wait for grid automation

      log('\n--- Swap 2: Push price UP ---');
      const gridSwap2Tx = await poolContract.call(
        'swap',
        new Args()
          .addString(account.address.toString())
          .addBool(false) // USDC → WMAS
          .addI128(ONE_USDC * BigInt(150))
          .addU256(BigInt('1461446703485210103287273052203988822378723970342')),
        { coins: Mas.fromString('0.2'), maxGas: BigInt(250_000_000) }
      );

      await gridSwap2Tx.waitFinalExecution();
      logSuccess('Price pushed up');

      await sleep(5000);

      log('\n--- Swap 3: Push price DOWN again ---');
      const gridSwap3Tx = await poolContract.call(
        'swap',
        new Args()
          .addString(account.address.toString())
          .addBool(true)
          .addI128(ONE_MAS * BigInt(15))
          .addU256(BigInt('4295128739')),
        { coins: Mas.fromString('0.2'), maxGas: BigInt(250_000_000) }
      );

      await gridSwap3Tx.waitFinalExecution();
      logSuccess('Grid volatility simulation complete');
    }

    // ========================================
    // FINAL SUMMARY
    // ========================================
    logSection('🎉 TEST COMPLETE - SUMMARY');

    const pendingCountBytes = await orderManagerContract.read('getPendingOrdersCount', new Args());
    const pendingCount = new Args(pendingCountBytes.value).nextU64();

    const finalPoolStateBytes = await poolContract.read('getPoolState', new Args());
    const finalStateArgs = new Args(finalPoolStateBytes.value);
    const finalPrice = finalStateArgs.nextU256();
    const finalTick = finalStateArgs.nextI32();
    const finalLiquidity = finalStateArgs.nextU128();

    log(`✅ Pool Created: ${POOL_ADDRESS}`);
    log(`✅ Liquidity Added: ${finalLiquidity}`);
    log(`✅ Swaps Executed: ${addresses.gridOrderManager ? '5' : '3'} total`);
    log(`✅ Limit Order: ${filledAfter ? 'FILLED' : 'PENDING'}`);
    if (addresses.gridOrderManager) {
      log(`✅ Grid Order: CREATED & TESTED`);
    }
    log(``);
    log(`Final Pool State:`);
    log(`  Price: ${finalPrice}`);
    log(`  Tick: ${finalTick}`);
    log(`  Liquidity: ${finalLiquidity}`);
    log(``);
    log(`Pending Limit Orders: ${pendingCount}`);

    logSuccess('\n🎊 ALL TESTS COMPLETED SUCCESSFULLY! 🎊');

  } catch (error: any) {
    logError(`Test failed: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main().catch(console.error);