/**
 * Smart Contract Addresses
 *
 * Centralized contract address management for the MassaBeam DeFi platform.
 * Update these addresses when deploying to different networks (buildnet/mainnet).
 */

// Factory Contract - Creates and manages liquidity pools
export const FACTORY_ADDRESS = "AS1AbR4B6Br6vpv67631vsRccNccNPz2bAXjucoa61cW7Z6kGhzY";

// Order Manager Contracts
export const LIMIT_ORDER_MANAGER_ADDRESS = "AS1m4L153vHWgSdD2zbtVSXn5d5JEN7zawTcq9mkSbTFfVkT94VT"; // TODO: Update with deployed address
export const RECURRING_ORDER_MANAGER_ADDRESS = "AS12GAPUyEoQLtTH8Q6mSipPTnX7vfCPGGs1EhScRxrJFocRWrgxw";
export const GRID_ORDER_MANAGER_ADDRESS = "AS1AbR4B6Br6vpv67631vsRccNccNPz2bAXjucoa61cW7Z6kGhzY"; // TODO: Update with actual deployed address

// Network Configuration
export const NETWORK = "buildnet"; // Change to "mainnet" for production

/**
 * Contract Addresses by Network
 *
 * Allows easy switching between different network deployments
 */
export const CONTRACT_ADDRESSES = {
  buildnet: {
    factory: "AS1AbR4B6Br6vpv67631vsRccNccNPz2bAXjucoa61cW7Z6kGhzY",
    limitOrderManager: "AS1m4L153vHWgSdD2zbtVSXn5d5JEN7zawTcq9mkSbTFfVkT94VT",
    recurringOrderManager: "AS12GAPUyEoQLtTH8Q6mSipPTnX7vfCPGGs1EhScRxrJFocRWrgxw",
    gridOrderManager: "AS12GAPUyEoQLtTH8Q6mSipPTnX7vfCPGGs1EhScRxrJFocRWrgxw",
  },
  mainnet: {
    factory: "AS1...", // TODO: Deploy to mainnet
    limitOrderManager: "AS1...",
    recurringOrderManager: "AS1...",
    gridOrderManager: "AS1...",
  }
} as const;

/**
 * Get contract address for current network
 */
export function getContractAddress(contractName: keyof typeof CONTRACT_ADDRESSES.buildnet): string {
  return CONTRACT_ADDRESSES[NETWORK][contractName];
}

/**
 * Validate contract address format
 */
export function isValidMassaAddress(address: string): boolean {
  return /^AS1[A-Za-z0-9]{48,51}$/.test(address);
}

/**
 * Contract deployment information
 */
export const DEPLOYMENT_INFO = {
  network: NETWORK,
  deployedAt: new Date("2025-01-28"), // Update with actual deployment date
  version: "1.0.0",
  contracts: {
    factory: {
      address: FACTORY_ADDRESS,
      deployed: true,
      verified: true,
    },
    limitOrderManager: {
      address: LIMIT_ORDER_MANAGER_ADDRESS,
      deployed: false, // TODO: Set to true after deployment
      verified: false,
    },
    recurringOrderManager: {
      address: RECURRING_ORDER_MANAGER_ADDRESS,
      deployed: true,
      verified: true,
    },
    gridOrderManager: {
      address: GRID_ORDER_MANAGER_ADDRESS,
      deployed: false, // TODO: Set to true after deployment
      verified: false,
    },
  },
} as const;
