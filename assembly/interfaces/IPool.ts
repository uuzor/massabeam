import { Address, call } from '@massalabs/massa-as-sdk';
import { u256, i128, u128, } from 'as-bignum/assembly';
import { Args, Result, Serializable } from '@massalabs/as-types';

/**
 * IPool Interface
 * Wrapper for Pool smart contract interactions
 * Allows type-safe initialization and function calls to deployed pool contracts
 */
export class IPool {
  _origin: Address;

  constructor(origin: Address) {
    this._origin = origin;
  }

  /**
   * Initialize the pool with token pair and fee information
   * Should be called immediately after pool creation via createSC
   *
   * @param factory - The factory contract address
   * @param token0 - First token address (lower address when sorted)
   * @param token1 - Second token address (higher address when sorted)
   * @param fee - Fee amount (500 = 0.05%, 3000 = 0.3%, 10000 = 1%)
   * @param tickSpacing - Tick spacing associated with the fee tier
   */
  init(
    factory: Address,
    token0: Address,
    token1: Address,
    fee: u64,
    tickSpacing: u64,
    coins: u64 = 0
  ): void {
    const args = new Args();
    args.add(factory);
    args.add(token0);
    args.add(token1);
    args.add(fee);
    args.add(tickSpacing);

    call(this._origin, 'constructor', args, coins);
  }

  /**
   * Add liquidity to the pool
   * Deposits tokens into a specific price range and receives LP tokens
   *
   * @param tickLower - Lower tick of the position
   * @param tickUpper - Upper tick of the position
   * @param amount0Desired - Desired amount of token0
   * @param amount1Desired - Desired amount of token1
   * @param amount0Min - Minimum amount of token0 to accept (slippage protection)
   * @param amount1Min - Minimum amount of token1 to accept (slippage protection)
   */
  mint(
    tickLower: i32,
    tickUpper: i32,
    amount0Desired: u256,
    amount1Desired: u256,
    amount0Min: u256,
    amount1Min: u256,
    coins: u64 = 0
  ): void {
    const args = new Args();
    args.add(tickLower);
    args.add(tickUpper);
    args.add(amount0Desired);
    args.add(amount1Desired);
    args.add(amount0Min);
    args.add(amount1Min);

    call(this._origin, 'mint', args, coins);
  }

  /**
   * Remove liquidity from the pool
   * Withdraws tokens from a specific position
   *
   * @param tickLower - Lower tick of the position
   * @param tickUpper - Upper tick of the position
   * @param liquidity - Amount of liquidity to remove
   */
  burn(
    tickLower: i32,
    tickUpper: i32,
    liquidity: u128,
    coins: u64 = 0
  ): void {
    const args = new Args();
    args.add(tickLower);
    args.add(tickUpper);
    args.add(liquidity);

    call(this._origin, 'burn', args, coins);
  }

  /**
   * Swap tokens through the pool
   * Exchanges one token for another
   *
   * @param zeroForOne - True if swapping token0 for token1, false otherwise
   * @param amountSpecified - Amount of input token (positive) or output token (negative)
   * @param sqrtPriceLimitX96 - Price limit to prevent excessive price movement
   */
  swap(
    recipient: string,
    zeroForOne: bool,
    amountSpecified: i128,
    sqrtPriceLimitX96: u256,
    coins: u64 = 0
  ): void {
    const args = new Args();
    args.add(recipient);
    args.add(zeroForOne);
    args.add(amountSpecified);
    args.add(sqrtPriceLimitX96);

    call(this._origin, 'swap', args, coins);
  }

  /**
   * Collect accumulated fees from a position
   * Withdraws fee rewards earned from providing liquidity
   *
   * @param owner - Owner of the position
   * @param tickLower - Lower tick of the position
   * @param tickUpper - Upper tick of the position
   */
  collect(
    owner: Address,
    tickLower: i32,
    tickUpper: i32,
    coins: u64 = 0
  ): void {
    const args = new Args();
    args.add(owner);
    args.add(tickLower);
    args.add(tickUpper);

    call(this._origin, 'collect', args, coins);
  }

  /**
   * Get the current pool state (price, tick, liquidity)
   * Read-only function
   */
  getState(): StaticArray<u8> {
    const args = new Args();
    return call(this._origin, 'getState', args, 0);
  }

  /**
   * Get position information for a liquidity provider
   * Read-only function
   */
  getPosition(owner: Address, tickLower: i32, tickUpper: i32): StaticArray<u8> {
    const args = new Args();
    args.add(owner);
    args.add(tickLower);
    args.add(tickUpper);

    return call(this._origin, 'getPosition', args, 0);
  }

  /**
   * Get current sqrt price (price in fixed-point Q64.96 format)
   */
  getSqrtPriceX96(): StaticArray<u8> {
    const args = new Args();
    return call(this._origin, 'getSqrtPriceX96', args, 0);
  }

  /**
   * Get current tick
   */
  getTick(): StaticArray<u8> {
    const args = new Args();
    return call(this._origin, 'getTick', args, 0);
  }

  /**
   * Get current liquidity in the pool
   */
  getLiquidity(): StaticArray<u8> {
    const args = new Args();
    return call(this._origin, 'getLiquidity', args, 0);
  }

  /**
   * Get token pair addresses
   */
  getTokens(): StaticArray<u8> {
    const args = new Args();
    return call(this._origin, 'getTokens', args, 0);
  }

  /**
   * Get fee amount
   */
  getFee(): StaticArray<u8> {
    const args = new Args();
    return call(this._origin, 'getFee', args, 0);
  }

  /**
   * Get complete pool state
   */
  getPoolState(): StaticArray<u8> {
    const args = new Args();
    return call(this._origin, 'getPoolState', args, 0);
  }

  /**
   * Get tick spacing
   */
  getTickSpacing(): StaticArray<u8> {
    const args = new Args();
    return call(this._origin, 'getTickSpacing', args, 0);
  }

  /**
   * Get factory address
   */
  getFactory(): StaticArray<u8> {
    const args = new Args();
    return call(this._origin, 'getFactory', args, 0);
  }

  /**
   * Get fee growth for token 0
   */
  getFeeGrowthGlobal0(): StaticArray<u8> {
    const args = new Args();
    return call(this._origin, 'getFeeGrowthGlobal0', args, 0);
  }

  /**
   * Get fee growth for token 1
   */
  getFeeGrowthGlobal1(): StaticArray<u8> {
    const args = new Args();
    return call(this._origin, 'getFeeGrowthGlobal1', args, 0);
  }

  /**
   * Get protocol fees accumulated
   */
  getProtocolFees(): StaticArray<u8> {
    const args = new Args();
    return call(this._origin, 'getProtocolFees', args, 0);
  }

  /**
   * Get max liquidity per tick
   */
  getMaxLiquidityPerTick(): StaticArray<u8> {
    const args = new Args();
    return call(this._origin, 'getMaxLiquidityPerTick', args, 0);
  }

  /**
   * Get tick information
   */
  getTickInfo(tick: i32): StaticArray<u8> {
    const args = new Args();
    args.add(tick);

    return call(this._origin, 'getTickInfo', args, 0);
  }
}