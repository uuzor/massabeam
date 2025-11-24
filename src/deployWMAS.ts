/**
 * Deploy WMAS (Wrapped MAS) Token
 *
 * This script deploys the standard WMAS contract which wraps native MAS tokens.
 * WMAS is needed for DEX operations as it provides a standard MRC20 interface for the native token.
 */

import 'dotenv/config';
import { Account, Args, Mas, SmartContract, JsonRpcProvider, bytesToU256 } from '@massalabs/massa-web3';
import * as fs from 'fs';
import * as path from 'path';

// Token configuration
const TOKEN_NAME = 'Wrapped MAS';
const TOKEN_SYMBOL = 'WMAS';
const TOKEN_DECIMALS = 9; // MAS has 9 decimals
const TOTAL_SUPPLY = 0n; // WMAS starts with 0 supply, minted on deposit

async function main(): Promise<void> {
  console.log('🚀 Deploying WMAS (Wrapped MAS) Token\n');

  // Setup account and provider
  const account = await Account.fromEnv();
  const provider = JsonRpcProvider.buildnet(account);

  console.log(`📍 Deploying from: ${account.address}\n`);

  // Read WMAS contract bytecode
  const wasmPath = path.join(process.cwd(), 'build', 'WMAS.wasm');

  if (!fs.existsSync(wasmPath)) {
    console.error('❌ WMAS contract not found!');
    console.error(`   Expected at: ${wasmPath}`);
    console.error('\n💡 Please run "npm run build" first to compile contracts');
    process.exit(1);
  }

  const contractCode = fs.readFileSync(wasmPath);
  console.log(`✅ Loaded WMAS contract (${contractCode.length} bytes)\n`);

  // Deploy WMAS contract
  console.log('📦 Deploying WMAS contract...');
  const deploymentTx = await provider.sendSmartContract({
    fee: Mas.fromString('0.1'),
    maxGas: BigInt(500_000_000),
    contractCode,
    coins: Mas.fromString('0.1'),
    args: new Args()
      .addString(TOKEN_NAME)
      .addString(TOKEN_SYMBOL)
      .addU8(TOKEN_DECIMALS)
      .addU256(TOTAL_SUPPLY),
  });

  console.log(`   TX ID: ${deploymentTx.id}`);
  console.log('   ⏳ Waiting for finalization...\n');

  await deploymentTx.waitFinalExecution();
  const events = await deploymentTx.getFinalEvents();

  // Extract deployed contract address
  let contractAddress = '';
  for (const event of events) {
    if (event.data.includes('Contract deployed at address:')) {
      contractAddress = event.data.split('Contract deployed at address:')[1].trim();
      break;
    }
  }

  if (!contractAddress) {
    console.error('❌ Failed to extract contract address from events');
    process.exit(1);
  }

  console.log('✅ WMAS Deployed Successfully!\n');
  console.log(`📍 Contract Address: ${contractAddress}\n`);

  // Verify deployment by reading token info
  console.log('🔍 Verifying deployment...');
  const wmContract = new SmartContract(provider, contractAddress);

  const nameResult = await wmContract.read('name', new Args());
  const symbolResult = await wmContract.read('symbol', new Args());
  const decimalsResult = await wmContract.read('decimals', new Args());
  const totalSupplyResult = await wmContract.read('totalSupply', new Args());

  const name = new Args(nameResult.value).nextString();
  const symbol = new Args(symbolResult.value).nextString();
  const decimals = new Args(decimalsResult.value).nextU8();
  const totalSupply = bytesToU256(new Args(totalSupplyResult.value).nextBytes());

  console.log(`   Name: ${name}`);
  console.log(`   Symbol: ${symbol}`);
  console.log(`   Decimals: ${decimals}`);
  console.log(`   Total Supply: ${totalSupply}\n`);

  // Save deployment info
  const deploymentsDir = path.join(process.cwd(), 'deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deployment = {
    network: 'buildnet',
    timestamp: new Date().toISOString(),
    deployer: account.address,
    contracts: {
      wmas: contractAddress,
    },
    tokens: {
      WMAS: {
        address: contractAddress,
        name: TOKEN_NAME,
        symbol: TOKEN_SYMBOL,
        decimals: TOKEN_DECIMALS,
      },
    },
  };

  const deploymentPath = path.join(deploymentsDir, 'wmas-buildnet-latest.json');
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  console.log(`💾 Deployment info saved to: ${deploymentPath}\n`);

  // Display usage instructions
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📚 How to Use WMAS\n');
  console.log('1. Wrap MAS tokens (deposit):');
  console.log(`   const tx = await contract.call('deposit', new Args(), {`);
  console.log(`     coins: Mas.fromString('100'), // Wrap 100 MAS`);
  console.log(`     maxGas: BigInt(50_000_000)`);
  console.log(`   });`);
  console.log();
  console.log('2. Unwrap to get MAS back (withdraw):');
  console.log(`   const tx = await contract.call('withdraw',`);
  console.log(`     new Args()`);
  console.log(`       .addU64(100n * 10n ** 9n) // Amount in smallest units`);
  console.log(`       .addString('AS1...recipient'),`);
  console.log(`     { maxGas: BigInt(50_000_000) }`);
  console.log(`   );`);
  console.log();
  console.log('3. Use in your integration test:');
  console.log(`   const WMAS_ADDRESS = '${contractAddress}';`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('✨ Done!\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Deployment failed:', error);
    process.exit(1);
  });
