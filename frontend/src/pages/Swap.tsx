import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronDown, ArrowRightLeft, Info } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { useFactory } from '../hooks/useFactory';
import { usePool } from '../hooks/usePool';
import { useToken } from '../hooks/useToken';
import { Args, Mas, SmartContract } from '@massalabs/massa-web3';
import { NATIVE_MAS, TOKEN_OPTIONS } from '../constants/tokens';
import { FACTORY_ADDRESS } from '../constants/contracts';
import '../styles/Swap.css';

interface PoolOption {
  id: string;
  token0: string;
  token0Address: string;
  token1: string;
  token1Address: string;
  fee: string;
}

export const Swap: React.FC<{ onBackClick: () => void }> = ({ onBackClick }) => {
  const { isConnected, provider, userAddress } = useWallet();
  const { getPools } = useFactory(FACTORY_ADDRESS, isConnected, provider, userAddress);

  const [pools, setPools] = useState<PoolOption[]>([]);
  const [selectedPool, setSelectedPool] = useState<PoolOption | null>(null);
  const [showPoolDropdown, setShowPoolDropdown] = useState(false);

  const [amountIn, setAmountIn] = useState('');
  const [amountOut, setAmountOut] = useState('');
  const [swapDirection, setSwapDirection] = useState<'token0to1' | 'token1to0'>('token0to1');
  const [slippage, setSlippage] = useState('0.5');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [balance0, setBalance0] = useState<bigint | null>(null);
  const [balance1, setBalance1] = useState<bigint | null>(null);
  const [allowance, setAllowance] = useState<bigint | null>(null);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceImpact, setPriceImpact] = useState<number>(0);
  const [kit, setkit] = useState<boolean>(false);

  // Memoize pool and token addresses to prevent unnecessary hook re-initialization
  const poolAddress = useMemo(() => selectedPool?.id || '', [selectedPool?.id]);
  const token0Address = useMemo(() => selectedPool?.token0Address || '', [selectedPool?.token0Address]);
  const token1Address = useMemo(() => selectedPool?.token1Address || '', [selectedPool?.token1Address]);

  // Initialize usePool hook with selected pool address (or null)
  const poolHook = usePool(poolAddress, isConnected, provider, userAddress);

  // Initialize useToken hooks for both tokens
  const token0Hook = useToken(token0Address, isConnected, provider, userAddress);
  const token1Hook = useToken(token1Address, isConnected, provider, userAddress);

  // Load pool metadata when a pool is selected
  useEffect(() => {
    setkit(true);
    console.log('Loading pool metadata for:', selectedPool?.id, selectedPool?.id , selectedPool);
    if (selectedPool?.id && selectedPool?.token0Address) {
      const loadPoolMetadata = async () => {
        try {
          const metadata = await poolHook.getPoolMetadata();
          console.log('Pool metadata:', metadata);
          if (metadata) {
            setSelectedPool((prev) => {
              if (!prev || prev.id !== selectedPool.id) return prev;
              
              return {
                ...prev,
                token0Address: metadata.token0,
                token1Address: metadata.token1,
              };
            });
             setkit(false);
          }
        } catch (err) {
          console.error('Error loading pool metadata:', err);
        }
      };
      loadPoolMetadata();
    }
  }, [kit]);

  // Fetch pool price when pool changes
  useEffect(() => {
    if (!poolAddress) return;

    const fetchPrice = async () => {
      setPriceLoading(true);
      try {
        const sqrtPriceX96 = await poolHook.getSqrtPriceX96();
        console.log('Sqrt Price X96:', sqrtPriceX96);
        if (sqrtPriceX96) {
          const Q96 = Math.pow(2, 96);
          const sqrtPrice = Number(sqrtPriceX96) / Q96;
          const price = Math.pow(sqrtPrice, 2);
          console.log(price)
          setCurrentPrice(price);
        }
      } catch (err) {
        console.error('Error fetching pool price:', err);
      } finally {
        setPriceLoading(false);
      }
    };

    fetchPrice()
  }, [poolAddress, amountIn]);

  // Fetch token metadata when tokens change
  useEffect(() => {
    if (!token0Address || !token1Address) return;

    const fetchMetadata = async () => {
      try {
        const [symbol0, symbol1, balance0Result, balance1Result, allowance0Result] = await Promise.all([
          token0Hook.getSymbol(),
          token1Hook.getSymbol(),
          userAddress ? token0Hook.balanceOf(userAddress) : null,
          userAddress ? token1Hook.balanceOf(userAddress) : null,
          userAddress && poolAddress ? token0Hook.allowance(userAddress, poolAddress) : null,
        ]);

        // Update pool symbols
        if (symbol0 || symbol1) {
          setSelectedPool((prev) => {
            if (!prev) return prev;
            return { ...prev, token0: symbol0 || 'Token0', token1: symbol1 || 'Token1' };
          });
        }

        // Store balances and allowances
        setBalance0(balance0Result);
        setBalance1(balance1Result);
        setAllowance(swapDirection === 'token0to1' ? allowance0Result : null);
      } catch (err) {
        console.error('Error fetching token metadata:', err);
      }
    };

    fetchMetadata();
  }, [poolAddress]);

  // Calculate swap quote
  const calculateSwapQuote = useCallback(() => {
    if (!amountIn || !currentPrice || !selectedPool) {
      setAmountOut('');
      setPriceImpact(0);
      return;
    }

    try {
      const inputAmount = parseFloat(amountIn);
      if (isNaN(inputAmount) || inputAmount <= 0) {
        setAmountOut('');
        setPriceImpact(0);
        return;
      }

      // Get fee percent from selectedPool.fee (e.g., "0.3%")
      const feeMatch = selectedPool.fee.match(/(\d+\.?\d*)%/);
      const feePercent = feeMatch ? parseFloat(feeMatch[1]) / 100 : 0.003; // Default to 0.3% if parsing fails

      // Calculate gross output based on direction and current price
      let grossOutputAmount: number;
      if (swapDirection === 'token0to1') {
        // Token0 -> Token1: multiply by price
        grossOutputAmount = inputAmount * currentPrice;
      } else {
        // Token1 -> Token0: divide by price
        grossOutputAmount = inputAmount / currentPrice;
      }

      // Apply fee
      const outputAfterFee = grossOutputAmount * (1 - feePercent);

      // --- Price Impact Calculation ---
      // This is still an approximation for concentrated liquidity
      // A more accurate method would require simulating the swap through ticks,
      // which is complex for a client-side estimate.
      // For a simple estimate, we can compare the effective price with the market price.

      let effectivePrice: number;
      if (inputAmount > 0 && outputAfterFee > 0) {
        if (swapDirection === 'token0to1') {
          // Price of token1 per token0 (output/input)
          effectivePrice = outputAfterFee / inputAmount;
        } else {
          // Price of token0 per token1 (output/input)
          effectivePrice = inputAmount / outputAfterFee;
        }
      } else {
        effectivePrice = 0;
      }
      
      let calculatedPriceImpact = 0;
      if (currentPrice > 0 && effectivePrice > 0) {
        calculatedPriceImpact = Math.abs(((effectivePrice - currentPrice) / currentPrice) * 100);
        // Cap price impact for very small trades or extreme cases
        calculatedPriceImpact = Math.min(calculatedPriceImpact, 99); // Cap at 99%
      }
      setPriceImpact(calculatedPriceImpact);

      setAmountOut(outputAfterFee.toFixed(6));
    } catch (err) {
      console.error('Error calculating swap quote:', err);
      setAmountOut('');
      setPriceImpact(0);
    }
  }, [amountIn, currentPrice, selectedPool, swapDirection]);

  // Calculate swap quote when amountIn changes
  useEffect(() => {
    if (amountIn && currentPrice && selectedPool) {
      calculateSwapQuote();
    } else {
      setAmountOut('');
      setPriceImpact(0);
    }
  }, [amountIn, currentPrice, selectedPool]);

  // Load available pools
  useEffect(() => {
    loadPools();
  }, [isConnected, provider, userAddress]);

  const loadPools = async () => {
    if (!isConnected || !provider) return;

    try {
      const poolAddresses = await getPools();
      console.log('Pool addresses:', poolAddresses);

      // Create pool options with placeholder data
      const poolOptions: PoolOption[] = await Promise.all(
        poolAddresses.map(async (poolAddress) => {
          const poolMetadata = new SmartContract(provider, poolAddress);
          
          // Get token information from the pool contract
          const meta = await poolMetadata.read('getPoolMetadata', new Args());
          console.log('Pool metadata:', meta);
          const args = new Args(meta.value)
          let token0 = args.nextString()
          let token1 = args.nextString()
          return {
            id: poolAddress,
            token0: TOKEN_OPTIONS.find(token => token.address === token0)?.symbol || 'Unknown',
            token0Address: token0,
            token1: TOKEN_OPTIONS.find(token => token.address === token1)?.symbol || 'Unknown',
            token1Address: token1,
            fee: args.nextU64().toString(),
          };
        })
      );

      setPools(poolOptions);
    } catch (err) {
      console.error('Error loading pools:', err);
      setError('Failed to load pools');
    }
  };

  const toggleSwapDirection = () => {
    setSwapDirection(swapDirection === 'token0to1' ? 'token1to0' : 'token0to1');
    setAmountIn('');
    setAmountOut('');
    // Allowance will be updated automatically by the useEffect
  };

  // Memoize input and output tokens to prevent re-renders
  const inputToken = useMemo(() => {
    return swapDirection === 'token0to1'
      ? { symbol: selectedPool?.token0, balance: balance0 }
      : { symbol: selectedPool?.token1, balance: balance1 };
  }, [swapDirection, selectedPool?.token0, selectedPool?.token1, balance0, balance1]);

  const outputToken = useMemo(() => {
    return swapDirection === 'token0to1'
      ? { symbol: selectedPool?.token1, balance: balance1 }
      : { symbol: selectedPool?.token0, balance: balance0 };
  }, [swapDirection, selectedPool?.token0, selectedPool?.token1, balance0, balance1]);

  const handleSwap = async () => {
    if (!selectedPool || !amountIn || !isConnected) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    setError(null);
    setTxHash(null);

    try {
      if (!userAddress) {
        throw new Error('User address not available');
      }

      const amountInFloat = parseFloat(amountIn);
      if (isNaN(amountInFloat) || amountInFloat <= 0) {
        throw new Error('Invalid amount to swap.');
      }
      const amountInWei = BigInt(Math.floor(amountInFloat * 1e9));
      
      const inputTokenAddress = swapDirection === 'token0to1' ? selectedPool.token0Address : selectedPool.token1Address;
      const poolAddress = selectedPool.id;

      let coinsToSend: Mas | undefined = undefined;

      // Handle Native MAS input
      if (inputTokenAddress === NATIVE_MAS.address) {
        coinsToSend = Mas.fromUmas(amountInWei);
      } else {
        // Handle ERC-20 like token input: check and request allowance
        const inputTokenHook = swapDirection === 'token0to1' ? token0Hook : token1Hook;
        if (allowance !== null && allowance < amountInWei) {
          setError(`Requesting approval...`);
          setApprovalLoading(true);
          await inputTokenHook.increaseAllowance(poolAddress, amountInWei);
          setApprovalLoading(false);
        }
      }
      
      setError(null);

      const swapParams = {
        recipient: userAddress,
        zeroForOne: swapDirection === 'token0to1',
        amountSpecified: amountInWei,
        sqrtPriceLimitX96: BigInt(0), // No limit for demo
      };

      const txId = await poolHook.swap(swapParams, coinsToSend);

      if (txId) {
        setTxHash(txId);
        setAmountIn('');
        setAmountOut('');
        console.log('Swap executed successfully:', txId);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to execute swap';
      setError(message);
      console.error('Swap error:', err);
    } finally {
      setIsLoading(false);
      setApprovalLoading(false);
    }
  };

  return (
    <div className="swap-container">
      <div className="swap-wrapper">
        {/* Header */}
        <div className="swap-header">
          <button className="btn-back" onClick={onBackClick}>
            ← Back
          </button>
          <div>
            <h1>Swap Tokens</h1>
            <p>Exchange tokens at market price</p>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="alert alert-error">
            <p>{error}</p>
          </div>
        )}
        {txHash && (
          <div className="alert alert-success">
            <p>Swap executed successfully! TX: {txHash.slice(0, 8)}...</p>
          </div>
        )}

        {/* Pool Selection */}
        <div className="form-section">
          <label className="form-label">Select Pool</label>
          <div className="pool-selector-container">
            <button
              className="pool-selector"
              onClick={() => setShowPoolDropdown(!showPoolDropdown)}
            >
              {selectedPool ? (
                <>
                  <span className="pool-name">
                    {selectedPool.token0} / {selectedPool.token1}
                  </span>
                  <span className="pool-fee">{selectedPool.fee}</span>
                </>
              ) : (
                <span className="pool-placeholder">Select a pool</span>
              )}
              <ChevronDown size={18} />
            </button>

            {showPoolDropdown && (
              <div className="pool-dropdown">
                {pools.length === 0 ? (
                  <div className="dropdown-empty">No pools available</div>
                ) : (
                  <div className="dropdown-list">
                    {pools.map((pool) => (
                      <button
                        key={pool.id}
                        className={`dropdown-item ${
                          selectedPool?.id === pool.id ? 'selected' : ''
                        }`}
                        onClick={() => {
                          setSelectedPool(pool);
                          setShowPoolDropdown(false);
                        }}
                      >
                        <div className="pool-info">
                          <span className="pool-pair">
                            {pool.token0} / {pool.token1}
                          </span>
                          <span className="pool-fee">{pool.fee}</span>
                        </div>
                        <span className="pool-address">
                          {pool.id.slice(0, 8)}...
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {selectedPool && (
          <>
            {/* Swap Inputs */}
            <div className="form-section swap-form">
              {/* From Token */}
              <div className="swap-input-card">
                <div className="swap-input-label">
                  <span>From</span>
                  <div className="balance-info">
                    {inputToken.balance !== null && (
                      <span className="balance-text">
                        Balance: {(Number(inputToken.balance) / 1e8).toFixed(4)}
                      </span>
                    )}
                    <button
                      className="btn-max"
                      onClick={() => {
                        if (inputToken.balance) {
                          setAmountIn((Number(inputToken.balance) / 1e8).toString());
                        }
                      }}
                    >
                      Max
                    </button>
                  </div>
                </div>
                <input
                  type="number"
                  placeholder="0.0"
                  value={amountIn}
                  onChange={(e) => setAmountIn(e.target.value)}
                  className="swap-input"
                />
                <div className="token-display">{inputToken.symbol}</div>
              </div>

              {/* Swap Direction Toggle */}
              <button
                className="btn-swap-direction"
                onClick={toggleSwapDirection}
                disabled={!selectedPool}
              >
                <ArrowRightLeft size={20} />
              </button>

              {/* To Token */}
              <div className="swap-input-card">
                <div className="swap-input-label">
                  <span>To (estimated)</span>
                  <div className="balance-info">
                    {outputToken.balance !== null && (
                      <span className="balance-text">
                        Balance: {(Number(outputToken.balance) / 1e8).toFixed(4)}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    placeholder="0.0"
                    value={amountOut}
                    disabled
                    className="swap-input"
                  />
                  {priceLoading && amountIn && (
                    <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }}>
                      <span className="spinner-small"></span>
                    </div>
                  )}
                </div>
                <div className="token-display">{outputToken.symbol}</div>
              </div>
            </div>

            {/* Slippage Settings */}
            <div className="form-section">
              <label className="form-label">Slippage Tolerance</label>
              <div className="slippage-options">
                {['0.1', '0.5', '1.0'].map((value) => (
                  <button
                    key={value}
                    className={`slippage-btn ${slippage === value ? 'active' : ''}`}
                    onClick={() => setSlippage(value)}
                  >
                    {value}%
                  </button>
                ))}
                <input
                  type="number"
                  placeholder="Custom"
                  value={slippage}
                  onChange={(e) => setSlippage(e.target.value)}
                  className="slippage-custom"
                  step="0.1"
                  min="0"
                />
              </div>
            </div>

            {/* Summary */}
            <div className="summary-section">
              <div className="summary-row">
                <span>Pool Fee:</span>
                <span className="value">{selectedPool.fee}</span>
              </div>
              <div className="summary-row">
                <span>Slippage Tolerance:</span>
                <span className="value">{slippage}%</span>
              </div>
              <div className="summary-row">
                <span>Exchange Rate:</span>
                <span className="value">
                  {currentPrice && amountIn && amountOut ? (
                    swapDirection === 'token0to1'
                      ? `1 ${inputToken.symbol} ≈ ${(parseFloat(amountOut) / parseFloat(amountIn)).toFixed(4)} ${outputToken.symbol}`
                      : `1 ${inputToken.symbol} ≈ ${(parseFloat(amountOut) / parseFloat(amountIn)).toFixed(4)} ${outputToken.symbol}`
                  ) : (
                    '-'
                  )}
                </span>
              </div>
              {priceImpact > 0 && (
                <div className="summary-row">
                  <span>
                    <Info size={14} style={{ display: 'inline', marginRight: '4px' }} />
                    Price Impact:
                  </span>
                  <span className={`value ${priceImpact > 5 ? 'warning' : priceImpact > 10 ? 'error' : ''}`}>
                    {priceImpact.toFixed(2)}%
                  </span>
                </div>
              )}
              {amountOut && (
                <div className="summary-row">
                  <span>Minimum Received:</span>
                  <span className="value">
                    {(parseFloat(amountOut) * (1 - parseFloat(slippage) / 100)).toFixed(6)} {outputToken.symbol}
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="form-actions">
              <button
                className="btn btn-secondary"
                onClick={onBackClick}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSwap}
                disabled={isLoading || !amountIn}
              >
                {isLoading ? (
                  <>
                    <span className="spinner-small"></span>
                    Executing Swap...
                  </>
                ) : (
                  <>
                    <ArrowRightLeft size={16} />
                    Swap
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Swap;
