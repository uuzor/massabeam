/* eslint-disable no-console */
/**
 * MassaBeam DEX Deployment Script
 * Deploys Factory and OrderManager contracts
 */

import {
  Account,
  Args,
  Mas,
  SmartContract,
  JsonRpcProvider,
  parseMas,
  formatMas
} from '@massalabs/massa-web3';
import { getScByteCode } from './utils';
import * as fs from 'fs';
import * as path from 'path';

// Initialize account and provider
const account = await Account.fromEnv();
const provider = JsonRpcProvider.buildnet(account);

console.log('═══════════════════════════════════════════════════════');
console.log('  MassaBeam DEX Deployment');
console.log('═══════════════════════════════════════════════════════');
console.log('Deployer Address:', account.address);
console.log('Network: BuildNet');
console.log('');

// Deployment configuration
const DEPLOYMENT_CONFIG = {
  factory: {
    coins: Mas.fromString('0.1'),
    maxGas: BigInt(3_000_000_000),
  },
  orderManager: {
    coins: Mas.fromString('0.1'),
    maxGas: BigInt(3_000_000_000),
  },
  enableFeeAmount: {
    maxGas: BigInt(2_000_000_000),
    fee: Mas.fromString('0.01'),
  },
};

// Fee tiers to enable
const FEE_TIERS = [
  { fee: 500, tickSpacing: 10, label: '0.05%' },    // LOWEST
  { fee: 3000, tickSpacing: 60, label: '0.3%' },    // LOW
  { fee: 10000, tickSpacing: 200, label: '1%' },    // MEDIUM
];

/**
 * Deploy Factory contract
 */
async function deployFactory(): Promise<string> {
  console.log('📦 Deploying Factory Contract...');

  const byteCode = getScByteCode('build', 'factory.wasm');

  // Factory constructor doesn't need arguments
  const constructorArgs = new Args();

  const contract = await SmartContract.deploy(
    provider,
    byteCode,
    constructorArgs,
    {
      coins: DEPLOYMENT_CONFIG.factory.coins,
      maxGas: DEPLOYMENT_CONFIG.factory.maxGas,
    },
  );

  console.log('✅ Factory deployed at:', contract.address);
  return contract.address;
}

/**
 * Enable fee amounts on Factory
 */
async function enableFeeAmounts(factoryAddress: string): Promise<void> {
  console.log('\n⚙️  Enabling Fee Tiers...');

  for (const tier of FEE_TIERS) {
    try {
      console.log(`  - Enabling ${tier.label} (${tier.fee} fee, ${tier.tickSpacing} tick spacing)...`);

      const args = new Args()
        .addU64(BigInt(tier.fee))
        .addU64(BigInt(tier.tickSpacing));

      await provider.callSC({
        target: factoryAddress,
        func: 'enableFeeAmount',
        parameter: args.serialize(),
        coins: 0n,
        maxGas: DEPLOYMENT_CONFIG.enableFeeAmount.maxGas,
        fee: Mas.fromMas(DEPLOYMENT_CONFIG.enableFeeAmount.fee),
      });

      console.log(`  ✅ ${tier.label} enabled`);
    } catch (error: any) {
      console.log(`  ⚠️  ${tier.label} may already be enabled or error occurred:`, error.message);
    }
  }
}

/**
 * Deploy OrderManager contract
 */
async function deployOrderManager(factoryAddress: string): Promise<string> {
  console.log('\n📦 Deploying OrderManager Contract...');

  const byteCode = getScByteCode('build', 'orderManager.wasm');

  // OrderManager constructor needs factory address
  const constructorArgs = new Args()
    .addString(factoryAddress);

  const contract = await SmartContract.deploy(
    provider,
    byteCode,
    constructorArgs,
    {
      coins: DEPLOYMENT_CONFIG.orderManager.coins,
      maxGas: DEPLOYMENT_CONFIG.orderManager.maxGas,
    },
  );

  console.log('✅ OrderManager deployed at:', contract.address);
  return contract.address;
}

/**
 * Save deployment addresses to file
 */
function saveDeploymentInfo(
  factoryAddress: string,
  orderManagerAddress: string,
): void {
  const deploymentInfo = {
    network: 'buildnet',
    deployedAt: new Date().toISOString(),
    deployer: account.address,
    contracts: {
      factory: factoryAddress,
      orderManager: orderManagerAddress,
    },
    feeTiers: FEE_TIERS,
  };

  const outputDir = path.join(process.cwd(), 'deployments');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputFile = path.join(outputDir, `buildnet-${Date.now()}.json`);
  fs.writeFileSync(outputFile, JSON.stringify(deploymentInfo, null, 2));

  console.log('\n📄 Deployment info saved to:', outputFile);

  // Also save to a "latest" file for easy access
  const latestFile = path.join(outputDir, 'buildnet-latest.json');
  fs.writeFileSync(latestFile, JSON.stringify(deploymentInfo, null, 2));
  console.log('📄 Latest deployment info:', latestFile);
}

/**
 * Create .env.local file for frontend
 */
function createFrontendEnv(
  factoryAddress: string,
  orderManagerAddress: string,
): void {
  const envContent = `# MassaBeam DEX Contract Addresses (BuildNet)
# Auto-generated on ${new Date().toISOString()}

VITE_FACTORY_ADDRESS=${factoryAddress}
VITE_ORDER_MANAGER_ADDRESS=${orderManagerAddress}
VITE_API_URL=https://buildnet.massa.net/api/v2
`;

  const frontendEnvPath = path.join(process.cwd(), 'frontend', '.env.local');
  fs.writeFileSync(frontendEnvPath, envContent);

  console.log('\n📄 Frontend .env.local created at:', frontendEnvPath);
}

/**
 * Main deployment function
 */
async function main() {
  try {
    // Step 1: Deploy Factory
    const factoryAddress = await deployFactory();

    // Step 2: Enable fee tiers
    await enableFeeAmounts(factoryAddress);

    // Step 3: Deploy OrderManager
    const orderManagerAddress = await deployOrderManager(factoryAddress);

    // Step 4: Save deployment info
    saveDeploymentInfo(factoryAddress, orderManagerAddress);

    // Step 5: Create frontend env file
    createFrontendEnv(factoryAddress, orderManagerAddress);

    // Success summary
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ MassaBeam DEX Deployment Successful!');
    console.log('═══════════════════════════════════════════════════════');
    console.log('\n📋 Contract Addresses:');
    console.log('   Factory:      ', factoryAddress);
    console.log('   OrderManager: ', orderManagerAddress);
    console.log('\n🔧 Fee Tiers Enabled:');
    FEE_TIERS.forEach((tier) => {
      console.log(`   ${tier.label.padEnd(6)} - Fee: ${tier.fee.toString().padEnd(5)} | Tick Spacing: ${tier.tickSpacing}`);
    });
    console.log('\n📝 Next Steps:');
    console.log('   1. Update frontend/.env.local with contract addresses (done)');
    console.log('   2. Create pools using the Factory contract');
    console.log('   3. Test limit orders using OrderManager');
    console.log('   4. Add liquidity to pools');
    console.log('\n💡 Example: Create a WMAS/USDC pool with 0.3% fee:');
    console.log(`   npm run create-pool -- ${factoryAddress} <WMAS_ADDRESS> <USDC_ADDRESS> 3000`);
    console.log('');

  } catch (error: any) {
    console.error('\n❌ Deployment failed:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run deployment
main();
