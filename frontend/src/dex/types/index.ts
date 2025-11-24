/**
 * DEX Types
 * All TypeScript interfaces and types for the MassaBeam DEX
 */

export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

export interface Pool {
  address: string;
  token0: Token;
  token1: Token;
  fee: number;
  tickSpacing: number;
  liquidity: string;
  sqrtPrice: string;
  tick: number;
  token0Price: number;
  token1Price: number;
  volumeUSD?: number;
  tvlUSD?: number;
}

export interface Position {
  id: string;
  pool: Pool;
  owner: string;
  tickLower: number;
  tickUpper: number;
  liquidity: string;
  token0Amount: string;
  token1Amount: string;
  feesEarned0: string;
  feesEarned1: string;
}

export enum OrderType {
  BUY = 0,
  SELL = 1,
}

export interface LimitOrder {
  orderId: string;
  owner: string;
  tokenIn: Token;
  tokenOut: Token;
  amountIn: string;
  minAmountOut: string;
  limitPrice: string;
  orderType: OrderType;
  expiry: number;
  filled: boolean;
  cancelled: boolean;
  createdAt?: number;
}

export interface SwapRoute {
  path: Token[];
  pools: Pool[];
  amountIn: string;
  amountOut: string;
  priceImpact: number;
}

export interface PriceData {
  current: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
}

export interface WalletState {
  connected: boolean;
  address: string | null;
  balance: string;
  tokenBalances: Map<string, string>;
}

export interface TransactionState {
  hash?: string;
  status: 'pending' | 'success' | 'failed';
  message?: string;
}
