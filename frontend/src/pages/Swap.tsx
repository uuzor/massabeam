import React, { useState, useEffect } from 'react';
import { ChevronDown, ArrowRightLeft, Info } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { useFactory } from '../hooks/useFactory';
import { usePool } from '../hooks/usePool';
import { useToken } from '../hooks/useToken';
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

  // Initialize usePool hook with selected pool address (or null)
  const poolHook = usePool(
    selectedPool?.id || '',
    isConnected,
    provider,
    userAddress
  );

  // Initialize useToken hooks for both tokens
  const token0Hook = useToken(
    selectedPool?.token0Address || '',
    isConnected,
    provider,
    userAddress
  );

  const token1Hook = useToken(
    selectedPool?.token1Address || '',
    isConnected,
    provider,
    userAddress
  );

  // Load pool metadata when a pool is selected
  useEffect(() => {
    if (selectedPool?.id && !selectedPool?.token0Address) {
      const loadPoolMetadata = async () => {
        try {
          const metadata = await poolHook.getPoolMetadata();
          if (metadata && selectedPool) {
            setSelectedPool({
              ...selectedPool,
              token0Address: metadata.token0,
              token1Address: metadata.token1,
            });
          }
        } catch (err) {
          console.error('Error loading pool metadata:', err);
        }
      };
      loadPoolMetadata();
    }
  }, [selectedPool?.id, poolHook]);

  // Fetch token symbols and balances when pool is selected with addresses
  useEffect(() => {
    if (selectedPool?.token0Address && selectedPool?.token1Address) {
      fetchTokenMetadata();
    }
  }, [selectedPool?.token0Address, selectedPool?.token1Address]);

  const fetchTokenMetadata = async () => {
    try {
      // Fetch symbol and balance for token0
      const symbol0 = await token0Hook.getSymbol();
      const balance0Result = userAddress ? await token0Hook.balanceOf(userAddress) : null;
      const allowance0Result = userAddress && selectedPool ? await token0Hook.allowance(userAddress, selectedPool.id) : null;

      // Fetch symbol and balance for token1
      const symbol1 = await token1Hook.getSymbol();
      const balance1Result = userAddress ? await token1Hook.balanceOf(userAddress) : null;

      // Update selected pool with actual symbols
      if ((symbol0 || symbol1) && selectedPool) {
        setSelectedPool({
          ...selectedPool,
          token0: symbol0 || 'Token0',
          token1: symbol1 || 'Token1',
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

  // Load available pools
  useEffect(() => {
    loadPools();
  }, [isConnected, provider, userAddress, getPools]);

  const loadPools = async () => {
    if (!isConnected || !provider) return;

    try {
      const poolAddresses = await getPools();
      console.log('Pool addresses:', poolAddresses);

      // Create pool options with placeholder data
      const poolOptions: PoolOption[] = poolAddresses.map((poolAddress) => ({
        id: poolAddress,
        token0: 'Token0',
        token0Address: '', // Will be populated when pool is selected
        token1: 'Token1',
        token1Address: '', // Will be populated when pool is selected
        fee: '0.3%',
      }));

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
    // Update allowance for the new input token
    if (swapDirection === 'token0to1' && selectedPool && userAddress) {
      // Will load allowance for token1 next
      fetchTokenMetadata();
    }
  };

  const getInputToken = () => {
    return swapDirection === 'token0to1'
      ? { symbol: selectedPool?.token0, balance: balance0 }
      : { symbol: selectedPool?.token1, balance: balance1 };
  };

  const getOutputToken = () => {
    return swapDirection === 'token0to1'
      ? { symbol: selectedPool?.token1, balance: balance1 }
      : { symbol: selectedPool?.token0, balance: balance0 };
  };

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

      const amountInWei = BigInt(Math.floor(parseFloat(amountIn) * 1e18));
      const inputToken = swapDirection === 'token0to1' ? token0Hook : token1Hook;
      const poolAddress = selectedPool.id;

      // Check and request allowance
      if (allowance !== null && allowance < amountInWei) {
        setError(`Requesting approval...`);
        setApprovalLoading(true);
        await inputToken.increaseAllowance(poolAddress, amountInWei);
        setApprovalLoading(false);
      }

      setError(null);

      const swapParams = {
        recipient: userAddress,
        zeroForOne: swapDirection === 'token0to1',
        amountSpecified: amountInWei,
        sqrtPriceLimitX96: BigInt(0), // No limit for demo
      };

      const txId = await poolHook.swap(swapParams);

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

  const inputToken = getInputToken();
  const outputToken = getOutputToken();

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
                  <span>To</span>
                  <div className="balance-info">
                    {outputToken.balance !== null && (
                      <span className="balance-text">
                        Balance: {(Number(outputToken.balance) / 1e8).toFixed(4)}
                      </span>
                    )}
                  </div>
                </div>
                <input
                  type="number"
                  placeholder="0.0"
                  value={amountOut}
                  disabled
                  className="swap-input"
                />
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
                  {amountIn ? `1 ${inputToken.symbol} ≈ 0.99 ${outputToken.symbol}` : '-'}
                </span>
              </div>
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
