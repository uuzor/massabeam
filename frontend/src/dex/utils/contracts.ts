/**
 * Smart Contract Addresses and Utilities
 */

// Contract addresses - UPDATE THESE AFTER DEPLOYMENT
export const CONTRACTS = {
  factory: import.meta.env.VITE_FACTORY_ADDRESS || '',
  orderManager: import.meta.env.VITE_ORDER_MANAGER_ADDRESS || '',
  // Add deployed pool addresses dynamically
};

// Known tokens - UPDATE WITH DEPLOYED TOKEN ADDRESSES
export const TOKENS = {
  WMAS: {
    address: import.meta.env.VITE_WMAS_ADDRESS || '',
    symbol: 'WMAS',
    name: 'Wrapped MAS',
    decimals: 18,
    logoURI: '/tokens/wmas.svg',
  },
  USDC: {
    address: import.meta.env.VITE_USDC_ADDRESS || '',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    logoURI: '/tokens/usdc.svg',
  },
  // Add more tokens as needed
};

// Fee tiers (in hundredths of a bip, i.e., 1e-6)
export const FEE_TIERS = {
  LOWEST: { fee: 500, label: '0.05%', tickSpacing: 10 },
  LOW: { fee: 3000, label: '0.3%', tickSpacing: 60 },
  MEDIUM: { fee: 10000, label: '1%', tickSpacing: 200 },
} as const;

export type FeeTier = keyof typeof FEE_TIERS;

// API endpoints
export const API_URL = import.meta.env.VITE_API_URL || 'https://buildnet.massa.net/api/v2';

// Gas limits
export const GAS_LIMITS = {
  CREATE_POOL: BigInt(4_000_000_000),
  ADD_LIQUIDITY: BigInt(3_000_000_000),
  REMOVE_LIQUIDITY: BigInt(2_000_000_000),
  SWAP: BigInt(2_000_000_000),
  CREATE_ORDER: BigInt(2_000_000_000),
};

// Default fee
export const DEFAULT_FEE = BigInt(10_000_000); // 0.01 MAS
