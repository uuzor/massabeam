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

    const fee = 3000n; // 0.3%
    const tickSpacing = 60n;
    const pool = await SmartContract.deploy(
        provider,
        poolByteCode,
        new Args().addString(WMAS_ADDRESS).addString(WMAS_ADDRESS).addString(USDC_ADDRESS).addU64(fee).addU64(tickSpacing),
        {
            coins: DEPLOYMENT_CONFIG.factory.coins,
            maxGas: DEPLOYMENT_CONFIG.factory.maxGas,
        },
    );

    console.log(pool.address);

    function log(message: string): void {
        console.log(`  ${message}`);
    }

    const poolContract = new SmartContract(provider, pool.address);


    // Query additional pool metadata
    const poolMetadataBytes = await poolContract.read('getPoolMetadata', new Args());
    console.log(poolMetadataBytes);
    const metadataArgs = new Args(poolMetadataBytes.value);
    const token0 = metadataArgs.nextString();
    const token1 = metadataArgs.nextString();
    const feeRead = metadataArgs.nextU64();
    const tickSpacingRead = metadataArgs.nextU64();
    const factoryRead = metadataArgs.nextString();

    log(`Pool Metadata:`);
    log(`  Token0: ${token0}`);
    log(`  Token1: ${token1}`);
    log(`  Fee: ${feeRead}`);
    log(`  Tick Spacing: ${tickSpacingRead}`);
    log(`  Factory: ${factoryRead}`);
    log('Pool metadata retrieved');


    // ========================================
    // ADD LIQUIDITY IMPLEMENTATION
    // ========================================
    log('\n📊 Adding Liquidity to Pool...');

    const token0Contract = new SmartContract(provider, token0);
    const token1Contract = new SmartContract(provider, token1);

    // Amount to approve and mint (100 tokens with 18 decimals)
    const liquidityAmount = BigInt('10000'); // 100 * 10^18

    // Step 1: Increase allowance for token0
    log(`Increasing allowance for Token0 (${token0})...`);
    const approveToken0Tx = await token0Contract.call(
        'increaseAllowance',
        new Args()
            .addString(pool.address)
            .addU256(liquidityAmount),
        {
            coins: Mas.fromString('0.1'),
            maxGas: BigInt(300_000_000),
        }
    );
    await approveToken0Tx.waitFinalExecution();
    log(`✅ Token0 allowance increased. Tx: ${approveToken0Tx.id}`);

    // Step 2: Increase allowance for token1
    log(`Increasing allowance for Token1 (${token1})...`);
    const approveToken1Tx = await token1Contract.call(
        'increaseAllowance',
        new Args()
            .addString(pool.address)
            .addU256(liquidityAmount),
        {
            coins: Mas.fromString('0.1'),
            maxGas: BigInt(300_000_000),
        }
    );
    await approveToken1Tx.waitFinalExecution();
    log(`✅ Token1 allowance increased. Tx: ${approveToken1Tx.id}`);

    // Step 3: Mint liquidity to the pool
    log(`Minting liquidity to pool...`);
    const userAddress = account.address?.toString() || '';
    const tickLower = BigInt(-887220); // Full range
    const tickUpper = BigInt(887220);

    const mintTx = await poolContract.call(
        'mint',
        new Args()
            .addString(userAddress)
            .addI32(tickLower)
            .addI32(tickUpper)
            .addU128(liquidityAmount),
        {
            coins: Mas.fromString('0.1'),
            maxGas: BigInt(300_000_000),
        }
    );

    await mintTx.getSpeculativeEvents();
    log(`✅ Liquidity minted successfully. Tx: ${mintTx.id}`);

    const createPoolEvents = await mintTx.getFinalEvents();
    log(`Received ${createPoolEvents.length} events`);

    for (const event of createPoolEvents) {
        log(event.data);
        if (event.data.includes('PoolCreated')) {
            log(event.data);
        }
    }

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
    // REMOVE LIQUIDITY IMPLEMENTATION
    // ========================================
    log('\n🔥 Removing Liquidity from Pool...');

    const tickLowerRemove = BigInt(-887220); // Full range (same as mint)
    const tickUpperRemove = BigInt(887220);
    const liquidityToRemove = BigInt('5000'); // Remove half of what we minted (10000)

    const burnTx = await poolContract.call(
        'burn',
        new Args()
            .addI32(tickLowerRemove)
            .addI32(tickUpperRemove)
            .addU128(liquidityToRemove),
        {
            coins: Mas.fromString('0.1'),
            maxGas: BigInt(300_000_000),
        }
    );

    await burnTx.waitFinalExecution();
    log(`✅ Liquidity removed successfully. Tx: ${burnTx.id}`);

    const burnEvents = await burnTx.getFinalEvents();
    log(`Received ${burnEvents.length} burn events`);

    for (const event of burnEvents) {
        log(event.data);
    }


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


    // const factoryContract = new SmartContract(provider, contract.address);
    // // const orderManagerContract = new SmartContract(provider, addresses.orderManager);
    // function log(message: string): void {
    //   console.log(`  ${message}`);
    // }

    // function logSection(title: string): void {
    //   console.log(`\n${'═'.repeat(80)}`);
    //   console.log(`  ${title}`);
    //   console.log(`${'═'.repeat(80)}`);
    // }
    // // ========================================
    // // STEP 2: Create Pool
    // // ========================================
    // logSection('🏊 STEP 2: CREATE POOL (WMAS/USDC, 0.3% fee)');


    // log(`Creating pool: WMAS/USDC`);
    // log(`Fee: 0.3 ${fee / 10000n}%`);
    // log(`Tick Spacing: ${tickSpacing}`);

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

    // for (const event of createPoolEvents) {
    //   log(event.data);
    //   if (event.data.includes('PoolCreated')) {
    //     log(event.data);
    //   }
    // }

    // log('Pool created');
    return "";
}

deployFactory();