# 🚀 MassaBeam DEX Deployment Guide

Complete guide for deploying MassaBeam DEX to Massa BuildNet.

## 📋 Prerequisites

1. **Node.js** (v16+)
2. **Massa Wallet** with testnet MAS tokens
3. **Environment Setup**

## ⚙️ Environment Configuration

### 1. Create `.env` File

Create a `.env` file in the project root:

```bash
# Massa Wallet Configuration
SECRET_KEY=your_secret_key_here
PUBLIC_KEY=your_public_key_here

# Network (buildnet or mainnet)
NETWORK=buildnet

# Optional: Custom RPC endpoint
# JSON_RPC_URL_PUBLIC=https://buildnet.massa.net/api/v2
```

### 2. Get Testnet Tokens

1. Visit Massa Discord: https://discord.gg/massa
2. Go to #faucet channel
3. Request testnet MAS: `!faucet your_address`
4. Wait for confirmation

## 🔨 Build Contracts

```bash
npm run build
```

This compiles all AssemblyScript contracts to WASM:
- `factory.wasm` - Pool factory
- `pool.wasm` - AMM pool implementation
- `orderManager.wasm` - Limit orders
- `MRC6909.wasm` - Multi-token standard

## 📦 Deploy to BuildNet

### Full DEX Deployment

Deploy Factory and OrderManager in one command:

```bash
npm run deploy:dex
```

This script will:
1. ✅ Deploy Factory contract
2. ✅ Enable fee tiers (0.05%, 0.3%, 1%)
3. ✅ Deploy OrderManager contract
4. ✅ Save deployment addresses to `deployments/buildnet-latest.json`
5. ✅ Create `frontend/.env.local` with contract addresses

### Expected Output

```
═══════════════════════════════════════════════════════
  MassaBeam DEX Deployment
═══════════════════════════════════════════════════════
Deployer Address: AS12...
Network: BuildNet

📦 Deploying Factory Contract...
✅ Factory deployed at: AS12tW9YgUbXAdM6nZpFWYU7cMfMhVqMdQD7bqw...

⚙️  Enabling Fee Tiers...
  - Enabling 0.05% (500 fee, 10 tick spacing)...
  ✅ 0.05% enabled
  - Enabling 0.3% (3000 fee, 60 tick spacing)...
  ✅ 0.3% enabled
  - Enabling 1% (10000 fee, 200 tick spacing)...
  ✅ 1% enabled

📦 Deploying OrderManager Contract...
✅ OrderManager deployed at: AS12xKpQXvU7tVvBnZNiRqFv8ShNfR8dPVD7bqw...

📄 Deployment info saved to: deployments/buildnet-1234567890.json
📄 Latest deployment info: deployments/buildnet-latest.json
📄 Frontend .env.local created at: frontend/.env.local

═══════════════════════════════════════════════════════
✅ MassaBeam DEX Deployment Successful!
═══════════════════════════════════════════════════════

📋 Contract Addresses:
   Factory:       AS12tW9YgUbXAdM6nZpFWYU7cMfMhVqMdQD7bqw...
   OrderManager:  AS12xKpQXvU7tVvBnZNiRqFv8ShNfR8dPVD7bqw...

🔧 Fee Tiers Enabled:
   0.05%  - Fee: 500   | Tick Spacing: 10
   0.3%   - Fee: 3000  | Tick Spacing: 60
   1%     - Fee: 10000 | Tick Spacing: 200
```

## 📝 Deployment Files

After deployment, you'll find:

```
deployments/
├── buildnet-1234567890.json  # Timestamped deployment
└── buildnet-latest.json      # Latest deployment (symlink)

frontend/
└── .env.local                # Auto-generated frontend config
```

### Deployment JSON Structure

```json
{
  "network": "buildnet",
  "deployedAt": "2024-01-01T12:00:00.000Z",
  "deployer": "AS12...",
  "contracts": {
    "factory": "AS12tW9YgUbXAdM6nZpFWYU7cMfMhVqMdQD7bqw...",
    "orderManager": "AS12xKpQXvU7tVvBnZNiRqFv8ShNfR8dPVD7bqw..."
  },
  "feeTiers": [
    { "fee": 500, "tickSpacing": 10, "label": "0.05%" },
    { "fee": 3000, "tickSpacing": 60, "label": "0.3%" },
    { "fee": 10000, "tickSpacing": 200, "label": "1%" }
  ]
}
```

## 🧪 Post-Deployment Testing

### 1. Verify Factory

Check that fee tiers are enabled:

```typescript
import { Args, PublicAPI } from '@massalabs/massa-web3';

const client = new PublicAPI('https://buildnet.massa.net/api/v2');
const factoryAddress = 'AS12...'; // From deployment

// Check if 0.3% fee tier is enabled
const args = new Args().addU64(BigInt(3000));
const result = await client.executeReadOnlyCall({
  target: factoryAddress,
  func: 'feeAmountTickSpacing',
  parameter: args.serialize(),
  caller: 'AS12...',
});

console.log('Tick spacing for 0.3% fee:', result.value);
```

### 2. Create Test Pool

Create a WMAS/USDC pool with 0.3% fee:

```typescript
import { web3 } from '@hicaru/bearby.js';
import { Args } from '@massalabs/massa-web3';

const FACTORY_ADDRESS = 'AS12...';
const WMAS_ADDRESS = 'AS12...'; // Your WMAS token
const USDC_ADDRESS = 'AS12...'; // Your USDC token

const args = new Args()
  .addString(WMAS_ADDRESS)
  .addString(USDC_ADDRESS)
  .addU64(BigInt(3000)); // 0.3% fee

await web3.contract.call({
  targetAddress: FACTORY_ADDRESS,
  functionName: 'createPool',
  unsafeParameters: args.serialize(),
  maxGas: BigInt(4_000_000_000),
  coins: 0,
  fee: BigInt(100_000_000),
});
```

### 3. Test Limit Order

Create a buy limit order:

```typescript
const ORDER_MANAGER_ADDRESS = 'AS12...';

const args = new Args()
  .addString(USDC_ADDRESS)      // tokenIn (spending USDC)
  .addString(WMAS_ADDRESS)       // tokenOut (buying WMAS)
  .addU256(u256.fromU64(1000))  // amountIn
  .addU256(u256.fromU64(900))   // minAmountOut
  .addU256(u256.fromU64(1100))  // limitPrice
  .addU8(0)                      // OrderType.BUY
  .addU64(BigInt(Date.now() + 86400000)); // expiry (24h)

await web3.contract.call({
  targetAddress: ORDER_MANAGER_ADDRESS,
  functionName: 'createLimitOrder',
  unsafeParameters: args.serialize(),
  maxGas: BigInt(3_000_000_000),
  coins: 0,
  fee: BigInt(100_000_000),
});
```

## 🎯 Frontend Integration

The deployment script automatically creates `frontend/.env.local`:

```env
VITE_FACTORY_ADDRESS=AS12tW9YgUbXAdM6nZpFWYU7cMfMhVqMdQD7bqw...
VITE_ORDER_MANAGER_ADDRESS=AS12xKpQXvU7tVvBnZNiRqFv8ShNfR8dPVD7bqw...
VITE_API_URL=https://buildnet.massa.net/api/v2
```

Start the frontend:

```bash
cd frontend
npm install
npm run dev
```

Access at http://localhost:5173

## 🔍 Verification

### Check Deployment on Explorer

1. Visit https://buildnet-explorer.massa.net/
2. Search for your contract addresses
3. View contract creation transactions
4. Check contract bytecode

### Read Contract State

```bash
# Get factory owner
massa-cli contract read-only AS12... getOwner

# Get pool for token pair
massa-cli contract read-only AS12... getPool <token0> <token1> <fee>

# Get order details
massa-cli contract read-only AS12... getOrder <orderId>
```

## 🐛 Troubleshooting

### Deployment Fails

**Error: Insufficient balance**
- Get more testnet MAS from Discord faucet
- Check balance: `massa-cli wallet balance`

**Error: Transaction failed**
- Increase gas limit in deployment config
- Check network status: https://status.massa.net/

**Error: Contract already exists**
- You may have already deployed
- Check `deployments/buildnet-latest.json`

### Fee Tier Already Enabled

If you see warnings about fee tiers already enabled:
- This is normal on re-deployment
- Fee tiers persist on the Factory
- No action needed

### Missing .env File

```bash
cp .env.example .env
# Edit .env with your wallet keys
```

## 📚 Next Steps

1. ✅ Contracts deployed
2. 🎨 Test frontend locally
3. 🔄 Create initial pools
4. 💧 Add liquidity
5. 🔀 Test swaps
6. 📊 Test limit orders
7. 🌐 Deploy frontend to production

## 🔗 Useful Links

- Massa Docs: https://docs.massa.net
- Massa Explorer: https://buildnet-explorer.massa.net/
- Massa Discord: https://discord.gg/massa
- GitHub: https://github.com/massalabs

## 💡 Tips

- **Gas Limits:** Adjust in `src/deployDEX.ts` if needed
- **Fee Tiers:** Modify `FEE_TIERS` array before deployment
- **Re-deployment:** Each deployment creates new contracts
- **Testnet Reset:** BuildNet may reset, requiring re-deployment

---

**Need help?** Open an issue or ask in Massa Discord #dev-support
