/**
 * Create BUY Limit Order Test
 * Tests creating a buy limit order where user buys tokenOut with tokenIn at maximum price
 *
 * Example: Buy WMAS with 1000 USDC at maximum price of 10 USDC per WMAS
 *
 * Usage: npx tsx src/orders/test-create-buy-limit-order.ts
 */

import 'dotenv/config';
import {
  Account,
  Args,
  Mas,
  SmartContract,
  JsonRpcProvider,
  USDCe
} from '@massalabs/massa-web3';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Example token addresses (replace with actual deployed tokens)
// Token addresses
const TOKEN_A = 'AS1nDAemyLSLUuNZ747Dt3NgzEC9WGCkmjRvY9hZwW2928Fxb4Fk'; // USDC
const TOKEN_B = ""; // Second token

// Order Type Enum
const OrderType = {
  BUY: 0,
  SELL: 1,
};

function log(message: string): void {
  console.log(`  ${message}`);
}

function logSection(title: string): void {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`  ${title}`);
  console.log(`${'═'.repeat(70)}`);
}

async function main(): Promise<void> {
  logSection('🧪 TEST: CREATE BUY LIMIT ORDER');

  try {
    // Setup
    const account = await Account.fromEnv();
    const provider = JsonRpcProvider.buildnet(account);

    log(`Account: ${account.address.toString()}`);

    const balance = await provider.balanceOf([account.address.toString()]);
    log(`MAS Balance: ${balance[0].balance.toString()}`);

    // Load OrderManager address
    const addressesPath = path.join(__dirname, '..', '..', 'deployed-addresses.json');
    if (!fs.existsSync(addressesPath)) {
      throw new Error('deployed-addresses.json not found! Deploy contracts first.');
    }

    const deployed = JSON.parse(fs.readFileSync(addressesPath, 'utf-8'));
    const orderManagerAddress = deployed.contracts.orderManager;

    log(`OrderManager: ${orderManagerAddress}`);
    log(`Token In (USDC): ${USDC_TOKEN}`);
    log(`Token Out (WMAS): ${WMAS_TOKEN}`);

    const orderManager = new SmartContract(provider, orderManagerAddress);
    const tokenInContract = new SmartContract(provider, USDC_TOKEN);

    // Order parameters
    const amountIn = 1000n * 10n ** 6n; // 1000 USDC (6 decimals)
    const minAmountOut = 100n * 10n ** 18n; // Min 100 WMAS (18 decimals)
    const limitPrice = 10n * 10n ** 18n; // Max 10 USDC per WMAS (scaled by 10^18)
    const expiry = 0n; // No expiry

    logSection('📝 BUY ORDER DETAILS');
    log(`Spending: 1000 USDC`);
    log(`To Buy: Minimum 100 WMAS`);
    log(`Limit Price: 10 USDC per WMAS (maximum willing to pay)`);
    log(`Order Type: BUY`);
    log(`Expiry: Never`);

    // Step 1: Approve tokens
    log('\n1️⃣ Approving USDC tokens...');
    await tokenInContract.call(
      'increaseAllowance',
      new Args()
        .addString(orderManagerAddress)
        .addU256(amountIn),
      { coins: Mas.fromString('0.01') }
    );
    log('✅ USDC approved');

    // Step 2: Create buy limit order
    log('\n2️⃣ Creating BUY limit order...');

    const createOrderArgs = new Args()
      .addString(USDC_TOKEN)        // tokenIn
      .addString(WMAS_TOKEN)        // tokenOut
      .addU256(amountIn)            // amount to spend
      .addU256(minAmountOut)        // minimum to receive
      .addU256(limitPrice)          // limit price
      .addU8(OrderType.BUY)         // order type: BUY
      .addU64(expiry);              // expiry

    const tx = await orderManager.call('createLimitOrder', createOrderArgs, {
      coins: Mas.fromString('0.1'),
      maxGas: BigInt(2000000000),
    });

    await tx.waitFinalExecution();

    const events = await tx.getFinalEvents();
    console.log('\n📋 Events:');
    for (const event of events) {
      log(event.data);
    }

    log('\n✅ BUY Limit Order created successfully!');
    log('   Order will execute when market price <= 10 USDC per WMAS');
    log('   Example: If price drops to 9 USDC/WMAS, order can be filled');

    logSection('✨ TEST COMPLETE');

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
