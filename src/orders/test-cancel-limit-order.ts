/**
 * Cancel Limit Order Test
 * Tests cancelling an existing limit order
 *
 * Usage: npx tsx src/orders/test-cancel-limit-order.ts <orderId>
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
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function log(message: string): void {
  console.log(`  ${message}`);
}

function logSection(title: string): void {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`  ${title}`);
  console.log(`${'═'.repeat(70)}`);
}

async function main(): Promise<void> {
  logSection('🧪 TEST: CANCEL LIMIT ORDER');

  try {
    // Get order ID from command line
    const orderIdArg = process.argv[2];
    if (!orderIdArg) {
      throw new Error('Please provide order ID: npx tsx src/orders/test-cancel-limit-order.ts <orderId>');
    }

    const orderId = BigInt(orderIdArg);

    // Setup
    const account = await Account.fromEnv();
    const provider = JsonRpcProvider.buildnet(account);

    log(`Account: ${account.address.toString()}`);
    log(`Order ID to cancel: ${orderId}`);

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

    const orderManager = new SmartContract(provider, orderManagerAddress);

    // Step 1: Get order details before cancellation
    log('\n1️⃣ Fetching order details...');
    const getOrderArgs = new Args().addU256(orderId);

    try {
      const orderData = await orderManager.read('getOrder', getOrderArgs);
      log('✅ Order found');
      // Could deserialize and display order details here
    } catch (error) {
      log('❌ Order not found or error fetching order');
      throw error;
    }

    // Step 2: Cancel the order
    log('\n2️⃣ Cancelling limit order...');

    const cancelOrderArgs = new Args().addU256(orderId);

    const tx = await orderManager.call('cancelLimitOrder', cancelOrderArgs, {
      coins: Mas.fromString('0.05'),
      maxGas: BigInt(2000000000),
    });

    await tx.waitFinalExecution();

    const events = await tx.getFinalEvents();
    console.log('\n📋 Events:');
    for (const event of events) {
      log(event.data);
    }

    log('\n✅ Limit Order cancelled successfully!');
    log('   Tokens have been returned to your wallet');

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
