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

    // After line 286 (where orderManager is deployed), add:
    // Deploy Recurring Order Manager
    console.log('\n📦 Deploying Recurring Order Manager...');
    const recurringOrderByteCode = getScByteCode('build', 'recurringOrderManager.wasm');
    const recurringManager = await SmartContract.deploy(
      provider,
      recurringOrderByteCode,
      new Args().addString("AS1AbR4B6Br6vpv67631vsRccNccNPz2bAXjucoa61cW7Z6kGhzY"), // Factory address
      {
        coins: DEPLOYMENT_CONFIG.factory.coins,
        maxGas: DEPLOYMENT_CONFIG.factory.maxGas,
      }
    );
    
    console.log('✅ Recurring Order Manager deployed at:', recurringManager.address);
    const recurringManagerContract = new SmartContract(provider, recurringManager.address);
    // 2. Create Test Recurring Order
    // After the limit order section (around line 478), add:
    // ========================================
    // CREATE RECURRING ORDER (DCA)
    // ========================================
    logSection('📋 CREATE RECURRING ORDER (DCA)');
    
    log(`Creating recurring BUY order (DCA strategy)...`);
    log(`  TokenIn: ${USDC_ADDRESS}`);
    log(`  TokenOut: ${WMAS_ADDRESS}`);
    log(`  Amount Per Execution: 100 USDC`);
    log(`  Interval: Every 5 periods (~80 seconds)`);
    log(`  Total Executions: 5 times`);
    
    const amountPerExecution = BigInt('100000000000000000'); // 100 tokens with 18 decimals
    const intervalPeriods = 5n; // Every 5 periods
    const totalExecutions = 5n; // Execute 5 times total
    
    const createRecurringTx = await recurringManagerContract.call(
      'createRecurringOrder',
      new Args()
        .addString(USDC_ADDRESS)    // tokenIn
        .addString(WMAS_ADDRESS)    // tokenOut
        .addU256(amountPerExecution)
        .addU64(intervalPeriods)
        .addU64(totalExecutions),
      {
        coins: Mas.fromString('0.1'),
        maxGas: BigInt(300_000_000),
      }
    );
    
    log(`Tx ID: ${createRecurringTx.id}`);
    await createRecurringTx.waitFinalExecution();
    log(`✅ Recurring order created successfully`);
    
    const createRecurringEvents = await createRecurringTx.getFinalEvents();
    log(`Received ${createRecurringEvents.length} events`);
    
    let recurringOrderId = BigInt(1);
    for (const event of createRecurringEvents) {
      log(`Event: ${event.data}`);
      if (event.data.includes('RecurringOrderCreated')) {
        const parts = event.data.split(':');
        if (parts.length > 1) {
          try {
            recurringOrderId = BigInt(parts[1]);
            log(`Extracted Recurring Order ID: ${recurringOrderId}`);
          } catch (e) {
            log(`Could not parse Recurring Order ID from event`);
          }
        }
      }
    }
    // 3. Read Recurring Order
    // ========================================
    // READ RECURRING ORDER
    // ========================================
    logSection('📖 READ RECURRING ORDER');
    
    if (recurringOrderId >= BigInt(0)) {
      log(`Reading recurring order #${recurringOrderId}...`);
    
      const readRecurringTx = await recurringManagerContract.read(
        'getRecurringOrder',
        new Args().addU256(recurringOrderId)
      );
    
      if (readRecurringTx.value && readRecurringTx.value.length > 0) {
        log(`✅ Recurring order found!`);
        
        const orderArgs = new Args(readRecurringTx.value);
        try {
          const retrievedOrderId = orderArgs.nextU256();
          const owner = orderArgs.nextString();
          const tokenIn = orderArgs.nextString();
          const tokenOut = orderArgs.nextString();
          const amountPerExecution = orderArgs.nextU256();
          const intervalPeriods = orderArgs.nextU64();
          const totalExecutions = orderArgs.nextU64();
          const executedCount = orderArgs.nextU64();
          const lastExecutionPeriod = orderArgs.nextU64();
          const active = orderArgs.nextBool();
          const cancelled = orderArgs.nextBool();
    
          log(`\n  Recurring Order Details:`);
          log(`    ID: ${retrievedOrderId}`);
          log(`    Owner: ${owner}`);
          log(`    TokenIn: ${tokenIn}`);
          log(`    TokenOut: ${tokenOut}`);
          log(`    Amount Per Execution: ${amountPerExecution}`);
          log(`    Interval: ${intervalPeriods} periods`);
          log(`    Total Executions: ${totalExecutions}`);
          log(`    Executed Count: ${executedCount}/${totalExecutions}`);
          log(`    Last Execution Period: ${lastExecutionPeriod}`);
          log(`    Progress: ${(Number(executedCount) / Number(totalExecutions) * 100).toFixed(1)}%`);
          log(`    Status: ${!active ? '✅ COMPLETED' : cancelled ? '❌ CANCELLED' : '⏳ ACTIVE'}`);
        } catch (e) {
          log(`Error parsing recurring order data: ${e}`);
        }
      } else {
        log(`❌ Recurring order not found`);
      }
    }
    // 4. Monitor Both Bots
    // Replace your current bot monitoring loop (lines 585-631) with:
    // ========================================
    // MONITOR BOTH BOTS (30 seconds intervals)
    // ========================================
    for (let i = 0; i < 10; i++) {
      logSection(`⏳ Waiting for bot execution (Iteration ${i + 1}/10)...`);
      log('Waiting 30 seconds to allow autonomous bots to process...');
      await new Promise(resolve => setTimeout(resolve, 30000));
      log('Wait complete. Checking bot counts...');
    
      logSection('🤖 BOT EXECUTION COUNTS');
    
     
    
      // Check Recurring Order Bot
      const recurringBotTx = await recurringManagerContract.read('getBotExecutionCount', new Args());
      if (recurringBotTx.value) {
        const recurringBotCount = new Args(recurringBotTx.value).nextU64();
        log(`Recurring Order Bot: ${recurringBotCount} executions`);
        if (recurringBotCount > 0n) {
          log(`  ✅ Recurring bot is active! (${recurringBotCount} executions)`);
        }
      }
    
      // Check recurring order progress
      const recurringProgressTx = await recurringManagerContract.read(
        'getRecurringOrder',
        new Args().addU256(recurringOrderId)
      );
      if (recurringProgressTx.value && recurringProgressTx.value.length > 0) {
        const orderArgs = new Args(recurringProgressTx.value);
        orderArgs.nextU256(); // orderId
        orderArgs.nextString(); // owner
        orderArgs.nextString(); // tokenIn
        orderArgs.nextString(); // tokenOut
        orderArgs.nextU256(); // amountPerExecution
        orderArgs.nextU64(); // intervalPeriods
        const totalExec = orderArgs.nextU64();
        const executedCount = orderArgs.nextU64();
        const active = orderArgs.nextBool();
        
        log(`\nRecurring Order Progress: ${executedCount}/${totalExec} executions`);
        log(`  Status: ${!active ? '✅ COMPLETED' : '⏳ ACTIVE'}`);
      }
    
      // Get events from both contracts
      logSection('📋 EVENTS');
      
     
    
      const recurringEvents = await provider.getEvents({
        smartContractAddress: recurringManagerContract.address
      });
      log(`\nRecurring Order Manager Events (${recurringEvents.length}):`);
      for (let event of recurringEvents) {
        if (!event.data.includes('CHANGE_OWNER')) {
          console.log(`  ${event.data}`);
        }
      }
    
      // Stop if both bots are done
     
      const recurringBotCountFinal = await recurringManagerContract.read('getBotExecutionCount', new Args());
      
   
      const recurringCount = new Args(recurringBotCountFinal.value).nextU64();
      
      if (recurringCount >= 5n) {
        log('\n✅ Both bots have executed successfully!');
   
        log(`  Recurring Bot: ${recurringCount} executions (5 DCA purchases complete)`);
        break;
      }
    }


    return "";
}

deployFactory();