/* eslint-disable no-console */
import {
  Account,
  Args,
  Mas,
  SmartContract,
  JsonRpcProvider,

} from '@massalabs/massa-web3';
import { getScByteCode } from './utils';


const account = await Account.fromEnv();
const provider = JsonRpcProvider.buildnet(account);

console.log('Deploying contract...');

// const byteCode = getScByteCode('build', 'factory.wasm');

// const name = 'Massa';
// const constructorArgs = new Args().addString(name);

// const contract = await SmartContract.deploy(
//   provider,
//   byteCode,
//   constructorArgs,
//   { coins: Mas.fromString('0.1') },
// );

// console.log('Contract deployed at:', contract.address);

// const events = await provider.getEvents({
//   smartContractAddress: contract.address,
// });

// for (const event of events) {
//   console.log('Event message:', event.data);
// }


// Deployment configuration
const DEPLOYMENT_CONFIG = {
  factory: {
    coins: Mas.fromString('2'),
    maxGas: BigInt(3_000_000_000),
  },
  orderManager: {
    coins: Mas.fromString('2'),
    maxGas: BigInt(3_000_000_000),
  },
  enableFeeAmount: {
    maxGas: BigInt(3_000_000_000),
    fee: Mas.fromString('2'),
  },
};

// Fee tiers to enable
const FEE_TIERS = [
  { fee: 500, tickSpacing: 10, label: '0.05%' },    // LOWEST
  { fee: 3000, tickSpacing: 60, label: '0.3%' },    // LOW
  { fee: 10000, tickSpacing: 200, label: '1%' },    // MEDIUM
];
const WMAS_ADDRESS = 'AS12N76WPYB3QNYKGhV2jZuQs1djdhNJLQgnm7m52pHWecvvj1fCQ';
const USDC_ADDRESS = 'AS1nDAemyLSLUuNZ747Dt3NgzEC9WGCkmjRvY9hZwW2928Fxb4Fk';

/**
 * Deploy Factory contract
 */
async function deployFactory(): Promise<string> {
  console.log('📦 Deploying Factory Contract...');

  const byteCode = getScByteCode('build', 'factory.wasm');
  const poolByteCode = getScByteCode('build', 'pool.wasm');
  const orderManagerByteCode = getScByteCode('build', 'orderManager.wasm');

  // const fee = 3000n; // 0.3%
  // const tickSpacing = 60n;
  // const pool = await SmartContract.deploy(
  //   provider,
  //   poolByteCode,
  //   new Args().addString(WMAS_ADDRESS).addString(WMAS_ADDRESS).addString(USDC_ADDRESS).addU64(fee).addU64(tickSpacing),
  //   {
  //     coins: DEPLOYMENT_CONFIG.factory.coins,
  //     maxGas: DEPLOYMENT_CONFIG.factory.maxGas,
  //   },
  // );

  // console.log(pool.address);

  // function log(message: string): void {
  //   console.log(`  ${message}`);
  // }

  // const poolContract = new SmartContract(provider, pool.address);


  // // Query additional pool metadata
  // const poolMetadataBytes = await poolContract.read('getPoolMetadata', new Args());
  // console.log(poolMetadataBytes);
  // const metadataArgs = new Args(poolMetadataBytes.value);
  // const token0 = metadataArgs.nextString();
  // const token1 = metadataArgs.nextString();
  // const feeRead = metadataArgs.nextU64();
  // const tickSpacingRead = metadataArgs.nextU64();
  // const factoryRead = metadataArgs.nextString();

  // log(`Pool Metadata:`);
  // log(`  Token0: ${token0}`);
  // log(`  Token1: ${token1}`);
  // log(`  Fee: ${feeRead}`);
  // log(`  Tick Spacing: ${tickSpacingRead}`);
  // log(`  Factory: ${factoryRead}`);
  // log('Pool metadata retrieved');


  // // ========================================
  // // ADD LIQUIDITY IMPLEMENTATION
  // // ========================================
  // log('\n📊 Adding Liquidity to Pool...');

  // const token0Contract = new SmartContract(provider, token0);
  // const token1Contract = new SmartContract(provider, token1);

  // // Amount to approve and mint (100 tokens with 18 decimals)
  const liquidityAmount = BigInt('10000'); // 100 * 10^18

  // // Step 1: Increase allowance for token0
  // log(`Increasing allowance for Token0 (${token0})...`);
  // const approveToken0Tx = await token0Contract.call(
  //   'increaseAllowance',
  //   new Args()
  //     .addString(pool.address)
  //     .addU256(liquidityAmount),
  //   {
  //     coins: Mas.fromString('0.1'),
  //     maxGas: BigInt(300_000_000),
  //   }
  // );
  // await approveToken0Tx.waitFinalExecution();
  // log(`✅ Token0 allowance increased. Tx: ${approveToken0Tx.id}`);

  // // Step 2: Increase allowance for token1
  // log(`Increasing allowance for Token1 (${token1})...`);
  // const approveToken1Tx = await token1Contract.call(
  //   'increaseAllowance',
  //   new Args()
  //     .addString(pool.address)
  //     .addU256(liquidityAmount),
  //   {
  //     coins: Mas.fromString('0.1'),
  //     maxGas: BigInt(300_000_000),
  //   }
  // );
  // await approveToken1Tx.waitFinalExecution();
  // log(`✅ Token1 allowance increased. Tx: ${approveToken1Tx.id}`);

  // // Step 3: Mint liquidity to the pool
  // log(`Minting liquidity to pool...`);
  // const userAddress = account.address?.toString() || '';
  // const tickLower = BigInt(-887220); // Full range
  // const tickUpper = BigInt(887220);

  // const mintTx = await poolContract.call(
  //   'mint',
  //   new Args()
  //     .addString(userAddress)
  //     .addI32(tickLower)
  //     .addI32(tickUpper)
  //     .addU128(liquidityAmount),
  //   {
  //     coins: Mas.fromString('0.1'),
  //     maxGas: BigInt(300_000_000),
  //   }
  // );

  // await mintTx.getSpeculativeEvents();
  // log(`✅ Liquidity minted successfully. Tx: ${mintTx.id}`);

  // const createPoolEvents = await mintTx.getFinalEvents();
  // log(`Received ${createPoolEvents.length} events`);

  // for (const event of createPoolEvents) {
  //   log(event.data);
  //   if (event.data.includes('PoolCreated')) {
  //     log(event.data);
  //   }
  // }

  // // ========================================
  // // SWAP IMPLEMENTATION
  // // ========================================
  // log('\n🔄 Executing Swap...');

  // const poolState = await poolContract.read('getPoolState', new Args());
  // const state = new Args(poolState.value);
  // // console.log(state.nextU256());
  // const cur = state.nextU256();
  // const currentSqrtPrice = cur - BigInt('10000');
  // console.log(currentSqrtPrice);
  // // Swap token0 for token1 (zeroForOne = true)
  // const swapAmount = BigInt('1000'); // Amount of token0 to swap
  // const sqrtPriceLimitX96 = 0n; // No price limit for demo

  // const swapTx = await poolContract.call(
  //   'swap',
  //   new Args()
  //     .addString("AU12BLexVqk9bBLH4VUHE36yJSe38zHvERCY8ofPWuXMNBaZNbjAf")
  //     .addBool(true) // zeroForOne: swap token0 for token1
  //     .addI128(swapAmount) // amountSpecified (positive = input, negative = output)
  //     .addU256(currentSqrtPrice), // sqrtPriceLimitX96 for slippage protection
  //   {
  //     coins: Mas.fromString('0.1'),
  //     maxGas: BigInt(300_000_000),
  //   }
  // );

  // await swapTx.waitFinalExecution();
  // log(`✅ Swap executed successfully. Tx: ${swapTx.id}`);

  // const swapEvents = await swapTx.getFinalEvents();
  // log(`Received ${swapEvents.length} swap events`);

  // for (const event of swapEvents) {
  //   log(event.data);
  // }

  // // ========================================
  // // REMOVE LIQUIDITY IMPLEMENTATION
  // // ========================================
  // log('\n🔥 Removing Liquidity from Pool...');

  // const tickLowerRemove = BigInt(-887220); // Full range (same as mint)
  // const tickUpperRemove = BigInt(887220);
  // const liquidityToRemove = BigInt('5000'); // Remove half of what we minted (10000)

  // const burnTx = await poolContract.call(
  //   'burn',
  //   new Args()
  //     .addI32(tickLowerRemove)
  //     .addI32(tickUpperRemove)
  //     .addU128(liquidityToRemove),
  //   {
  //     coins: Mas.fromString('0.1'),
  //     maxGas: BigInt(300_000_000),
  //   }
  // );

  // await burnTx.waitFinalExecution();
  // log(`✅ Liquidity removed successfully. Tx: ${burnTx.id}`);

  // const burnEvents = await burnTx.getFinalEvents();
  // log(`Received ${burnEvents.length} burn events`);

  // for (const event of burnEvents) {
  //   log(event.data);
  // }






  // // Factory constructor doesn't need arguments
  // const constructorArgs = new Args().addString(pool.address);

  // const contract = await SmartContract.deploy(
  //   provider,
  //   byteCode,
  //   constructorArgs,
  //   {
  //     coins: DEPLOYMENT_CONFIG.factory.coins,
  //     maxGas: DEPLOYMENT_CONFIG.factory.maxGas,
  //   },
  // );

  // console.log('✅ Factory deployed at:', contract.address);

  const order = await SmartContract.deploy(
    provider,
    orderManagerByteCode,
    new Args().addString("AS1AbR4B6Br6vpv67631vsRccNccNPz2bAXjucoa61cW7Z6kGhzY"),
    {
      coins: DEPLOYMENT_CONFIG.factory.coins,
      maxGas: DEPLOYMENT_CONFIG.factory.maxGas,
    },
  );


  const factoryContract = new SmartContract(provider, "AS1AbR4B6Br6vpv67631vsRccNccNPz2bAXjucoa61cW7Z6kGhzY");

  console.log(order.address);
  const orderManagerContract = new SmartContract(provider, order.address);

  function log(message: string): void {
    console.log(`  ${message}`);
  }

  function logSection(title: string): void {
    console.log(`\n${'═'.repeat(80)}`);
    console.log(`  ${title}`);
    console.log(`${'═'.repeat(80)}`);
  }
  // ========================================
  // STEP 2: Create Pool
  // ========================================
  logSection('🏊 STEP 2: CREATE POOL (WMAS/USDC, 0.3% fee)');
  const fee = 3000n; // 0.3%
  const tickSpacing = 60n;

  log(`Creating pool: WMAS/USDC`);
  log(`Fee: 0.3 ${fee / 10000n}%`);
  log(`Tick Spacing: ${tickSpacing}`);

  // const createPoolTx = await factoryContract.call(
  //   'createPool',
  //   new Args()
  //     .addString(WMAS_ADDRESS)
  //     .addString(USDC_ADDRESS)
  //     .addU64(fee)
  //     .addU64(tickSpacing),
  //   { coins: Mas.fromString('7'), maxGas: BigInt(1_000_000_000) }
  // );

  // log(`Tx ID: ${createPoolTx.id}`);
  // await createPoolTx.waitFinalExecution();

  // const createPoolEvents = await createPoolTx.getFinalEvents();
  // log(`Received ${createPoolEvents.length} events`);

  // let poolAddress  = "";

  // for (const event of createPoolEvents) {
  //   log(event.data);
  //   if (event.data.includes('PoolCreated')) {
  //     log(event.data);
  //     poolAddress = event.data.split(":")[-1];
  //   }
  // }

  log('Pool created');

  const poolContract = new SmartContract(provider, "AS12WBpwHxoXNPx2xsmCVoQFJwo8ZvHLyWZFFGYXzm6jotkA5UEAw");

  // // Step 3: Mint liquidity to the pool
  // log(`Minting liquidity to pool...`);
  // const userAddress = account.address?.toString() || '';
  // const tickLower = BigInt(-887220); // Full range
  // const tickUpper = BigInt(887220);

  // const mintTx = await poolContract.call(
  //   'mint',
  //   new Args()
  //     .addString(userAddress)
  //     .addI32(tickLower)
  //     .addI32(tickUpper)
  //     .addU128(liquidityAmount),
  //   {
  //     coins: Mas.fromString('0.1'),
  //     maxGas: BigInt(300_000_000),
  //   }
  // );

  // await mintTx.getSpeculativeEvents();
  // log(`✅ Liquidity minted successfully. Tx: ${mintTx.id}`);

  // const createPoolEventsMint = await mintTx.getFinalEvents();
  // log(`Received ${createPoolEventsMint.length} events`);

  // for (const event of createPoolEventsMint) {
  //   log(event.data);
  //   if (event.data.includes('PoolCreated')) {
  //     log(event.data);
  //   }
  // }

  // ========================================
  // SWAP IMPLEMENTATION
  // ========================================
  log('\n🔄 Executing Swap...');

  const poolState = await poolContract.read('getPoolState', new Args());
  const state = new Args(poolState.value);
  // console.log(state.nextU256());
  const cur = state.nextU256();
  const currentSqrtPrice = cur - BigInt('10000');
  console.log(currentSqrtPrice);
  // Swap token0 for token1 (zeroForOne = true)
  const swapAmount = BigInt('1000'); // Amount of token0 to swap
  const sqrtPriceLimitX96 = 0n; // No price limit for demo

  const swapTx = await poolContract.call(
    'swap',
    new Args()
      .addString("AU12BLexVqk9bBLH4VUHE36yJSe38zHvERCY8ofPWuXMNBaZNbjAf")
      .addBool(true) // zeroForOne: swap token0 for token1
      .addI128(swapAmount) // amountSpecified (positive = input, negative = output)
      .addU256(currentSqrtPrice), // sqrtPriceLimitX96 for slippage protection
    {
      coins: Mas.fromString('0.1'),
      maxGas: BigInt(300_000_000),
    }
  );

  await swapTx.waitFinalExecution();
  log(`✅ Swap executed successfully. Tx: ${swapTx.id}`);

  const swapEvents = await swapTx.getFinalEvents();
  log(`Received ${swapEvents.length} swap events`);

  for (const event of swapEvents) {
    log(event.data);
  }

  // ========================================
  // CREATE LIMIT ORDER
  // ========================================
  logSection('📋 CREATE LIMIT ORDER');

  log(`Creating limit BUY order...`);
  log(`  TokenIn: ${USDC_ADDRESS}`);
  log(`  TokenOut: ${WMAS_ADDRESS}`);
  log(`  Amount: 1000 USDC`);
  log(`  Limit Price: 0.0001 (willing to pay max 0.0001 WMAS per USDC)`);

  // Parameters for limit order
  const tokenInOrder = USDC_ADDRESS;
  const tokenOutOrder = WMAS_ADDRESS;
  const amountInOrder = BigInt('1000000000000000000'); // 1000 tokens with 18 decimals
  const minAmountOutOrder = BigInt('100000000000000000'); // Min 100 output tokens

  // Limit price in Q64.96 format
  // Q64.96 = price * 2^96
  // For price 0.0001: 0.0001 * 2^96 = 0.0001 * 79228162514264337593543950336
  // ≈ 7922816251426433759354395
  const sqrtPrice96 = BigInt('79228162514264337593543950336'); // 2^96
  const limitPriceDecimal = BigInt('1'); // Willing to pay 1 WMAS per USDC (market is ~0.992)
  const limitPriceOrder = limitPriceDecimal * sqrtPrice96; // Convert to Q64.96

  const orderTypeOrder = BigInt(0); // 0 = BUY, 1 = SELL
  const expiryOrder = BigInt(86400); // 24 hours from now

  const createOrderTx = await orderManagerContract.call(
    'createLimitOrder',
    new Args()
      .addString(tokenInOrder)
      .addString(tokenOutOrder)
      .addU256(amountInOrder)
      .addU256(minAmountOutOrder)
      .addU256(limitPriceOrder)
      .addU8(orderTypeOrder)
      .addU64(expiryOrder),
    {
      coins: Mas.fromString('0.1'),
      maxGas: BigInt(300_000_000),
    }
  );

  log(`Tx ID: ${createOrderTx.id}`);
  await createOrderTx.waitFinalExecution();
  log(`✅ Order created successfully`);

  const createOrderEvents = await createOrderTx.getFinalEvents();
  log(`Received ${createOrderEvents.length} events`);

  let orderId = BigInt(0);
  for (const event of createOrderEvents) {
    log(`Event: ${event.data}`);
    if (event.data.includes('LimitOrderCreated')) {
      // Extract orderId from event (format: LimitOrderCreated:orderId:owner:type:tokenIn:tokenOut)
      const parts = event.data.split(':');
      if (parts.length > 1) {
        try {
          orderId = BigInt(parts[1]);
          log(`Extracted Order ID: ${orderId}`);
        } catch (e) {
          log(`Could not parse Order ID from event`);
        }
      }
    }
  }

  // ========================================
  // READ LIMIT ORDER
  // ========================================
  logSection('📖 READ LIMIT ORDER');

  if (orderId >= BigInt(0)) {
    log(`Reading order #${orderId}...`);

    const readOrderTx = await orderManagerContract.read(
      'getOrder',
      new Args().addU256(orderId)
    );

    if (readOrderTx.value && readOrderTx.value.length > 0) {
      log(`✅ Order found!`);
      log(`Order data (serialized): ${readOrderTx.value.length} bytes`);

      // Parse order data
      const orderArgs = new Args(readOrderTx.value);
      try {
        const retrievedOrderId = orderArgs.nextU256();
        const owner = orderArgs.nextString();
        const tokenIn = orderArgs.nextString();
        const tokenOut = orderArgs.nextString();
        const amountIn = orderArgs.nextU256();
        const minAmountOut = orderArgs.nextU256();
        const limitPrice = orderArgs.nextU256();
        const orderType = orderArgs.nextU8();
        const expiry = orderArgs.nextU64();
        const filled = orderArgs.nextBool();
        const cancelled = orderArgs.nextBool();

        log(`\n  Order Details:`);
        log(`    ID: ${retrievedOrderId}`);
        log(`    Owner: ${owner}`);
        log(`    Type: ${orderType === BigInt(0) ? 'BUY' : 'SELL'}`);
        log(`    TokenIn: ${tokenIn}`);
        log(`    TokenOut: ${tokenOut}`);
        log(`    Amount: ${amountIn}`);
        log(`    Min Output: ${minAmountOut}`);
        log(`    Limit Price: ${limitPrice}`);
        log(`    Expiry: ${expiry}`);
        log(`    Status: ${filled ? '✅ FILLED' : cancelled ? '❌ CANCELLED' : '⏳ PENDING'}`);
      } catch (e) {
        log(`Error parsing order data: ${e}`);
      }
    } else {
      log(`❌ Order not found`);
    }
  } else {
    log(`⚠️  No order ID extracted from creation event`);
  }

  // ========================================
  // GET ORDER COUNT
  // ========================================
  logSection('📊 ORDER STATISTICS');

  const totalOrdersTx = await orderManagerContract.read(
    'getOrderCount',
    new Args()
  );
  if (totalOrdersTx.value) {
    const countArgs = new Args(totalOrdersTx.value);
    const totalOrders = countArgs.nextU256();
    log(`Total orders created: ${totalOrders}`);
  }

  const pendingOrdersTx = await orderManagerContract.read(
    'getPendingOrdersCount',
    new Args()
  );
  if (pendingOrdersTx.value) {
    const pendingArgs = new Args(pendingOrdersTx.value);
    const pendingOrders = pendingArgs.nextU64();
    log(`Pending orders: ${pendingOrders}`);
  }

  const activeOrdersTx = await orderManagerContract.read(
    'getActiveOrdersCount',
    new Args()
  );
  if (activeOrdersTx.value) {
    const activeArgs = new Args(activeOrdersTx.value);
    const activeOrders = activeArgs.nextU64();
    log(`Active orders: ${activeOrders}`);
  }

  // ========================================
  // CHECK BOT EXECUTION COUNT (Before Delay)
  // ========================================
  logSection('🤖 BOT EXECUTION COUNT (Before Delay)');

  const botCountTxBefore = await orderManagerContract.read(
    'getBotExecutionCount',
    new Args()
  );
  if (botCountTxBefore.value) {
    const botCountArgsBefore = new Args(botCountTxBefore.value);
    const botCountBefore = botCountArgsBefore.nextU64();
    log(`Bot execution count: ${botCountBefore}`);
  }

  // ========================================
  // WAIT FOR BOT EXECUTION (30 seconds delay)
  for (let i = 0; i < 2; i++) {
    // ========================================
    logSection('⏳ Waiting for bot execution...');
    log('Waiting 30 seconds to allow autonomous bot to process...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    log('Wait complete. Checking bot count again...');

    // ========================================
    // CHECK BOT EXECUTION COUNT (After Delay)
    // ========================================
    logSection('🤖 BOT EXECUTION COUNT (After Delay)');



    const botCountTxAfter = await orderManagerContract.read(
      'getBotExecutionCount',
      new Args()
    );
    if (botCountTxAfter.value) {
      const botCountArgsAfter = new Args(botCountTxAfter.value);
      const botCountAfter = botCountArgsAfter.nextU64();
      log(`Bot execution count: ${botCountAfter}`);

      if (botCountAfter > 1n) {
        log(`✅ Bot was active! Executions increased by ${botCountAfter - 1n}`);
      } else {
        log(`⚠️  Bot may not have executed (count unchanged)`);
      }
    }

    const events = await provider.getEvents({
      smartContractAddress : orderManagerContract.address
    });

    for ( let i of events){
      console.log(i.data);
    }


    const events2 = await provider.getEvents({
      smartContractAddress : poolContract.address
    });

    for ( let i of events2){
      console.log(i.data);
    }
  }



  return "";
}

deployFactory();