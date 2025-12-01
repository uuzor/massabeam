import React, { useState, useEffect } from 'react';
import { ChevronDown, Plus, Info, Minus } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { useFactory } from '../hooks/useFactory';
import { usePool } from '../hooks/usePool';
import { useToken } from '../hooks/useToken';
import { FACTORY_ADDRESS } from '../constants/contracts';
import '../styles/RemoveLiquidity.css';

interface PoolOption {
  id: string;
  token0: string;
  token0Address: string;
  token1: string;
  token1Address: string;
  fee: string;
}

export const RemoveLiquidity: React.FC<{ onBackClick: () => void }> = ({ onBackClick }) => {
  const { isConnected, provider, userAddress } = useWallet();
  const { getPools } = useFactory(FACTORY_ADDRESS, isConnected, provider, userAddress);

  const [pools, setPools] = useState<PoolOption[]>([]);
  const [selectedPool, setSelectedPool] = useState<PoolOption | null>(null);
  const [showPoolDropdown, setShowPoolDropdown] = useState(false);

  const [liquidityAmount, setLiquidityAmount] = useState('');
  const [tickLower, setTickLower] = useState('-887220');
  const [tickUpper, setTickUpper] = useState('887220');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [positionLiquidity, setPositionLiquidity] = useState<bigint | null>(null);

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

  // Fetch position information when pool is selected with addresses
  useEffect(() => {
    if (selectedPool?.token0Address && selectedPool?.token1Address && userAddress) {
      fetchPositionInfo();
    }
  }, [selectedPool?.token0Address, selectedPool?.token1Address, userAddress]);

  const fetchPositionInfo = async () => {
    try {
      if (!userAddress) return;

      // Fetch position details
      const position = await poolHook.getPosition(userAddress, parseInt(tickLower), parseInt(tickUpper));

      if (position) {
        setPositionLiquidity(position.liquidity);
        // Update pool with actual symbols
        const symbol0 = await token0Hook.getSymbol();
        const symbol1 = await token1Hook.getSymbol();

        if ((symbol0 || symbol1) && selectedPool) {
          setSelectedPool({
            ...selectedPool,
            token0: symbol0 || 'Token0',
            token1: symbol1 || 'Token1',
          });
        }
      }
    } catch (err) {
      console.error('Error fetching position info:', err);
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

  const handleBurn = async () => {
    if (!selectedPool || !liquidityAmount || !isConnected) {
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

      const liquidityDelta = BigInt(Math.floor(parseFloat(liquidityAmount)));

      const burnParams = {
        tickLower: parseInt(tickLower),
        tickUpper: parseInt(tickUpper),
        liquidityDelta,
      };

      const txId = await poolHook.burn(burnParams);

      if (txId) {
        setTxHash(txId);
        setLiquidityAmount('');
        console.log('Liquidity removed successfully:', txId);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove liquidity';
      setError(message);
      console.error('Burn error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="remove-liquidity-container">
      <div className="remove-liquidity-wrapper">
        {/* Header */}
        <div className="remove-liquidity-header">
          <button className="btn-back" onClick={onBackClick}>
            ← Back
          </button>
          <div>
            <h1>Remove Liquidity</h1>
            <p>Withdraw your liquidity and collect fees</p>
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
            <p>Liquidity removed successfully! TX: {txHash.slice(0, 8)}...</p>
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
                )}\
              </div>
            )}
          </div>
        </div>

        {selectedPool && (
          <>
            {/* Position Info */}
            <div className="form-section">
              <label className="form-label">Your Position</label>
              <div className="position-info-box">
                <div className="position-stat">
                  <span className="stat-label">Current Liquidity</span>
                  <span className="stat-value">
                    {positionLiquidity !== null ? positionLiquidity.toString() : 'Loading...'}
                  </span>
                </div>
                <div className="position-stat">
                  <span className="stat-label">Pair</span>
                  <span className="stat-value">
                    {selectedPool.token0} / {selectedPool.token1}
                  </span>
                </div>
              </div>
            </div>

            {/* Liquidity Amount */}
            <div className="form-section">
              <label className="form-label">Amount to Remove</label>

              <div className="amount-input-group">
                <div className="amount-input-label">
                  <span>Liquidity</span>
                  <div className="balance-info">
                    {positionLiquidity !== null && (
                      <span className="balance-text">
                        Max: {positionLiquidity.toString()}
                      </span>
                    )}
                    <button
                      className="btn-max"
                      onClick={() => {
                        if (positionLiquidity) {
                          setLiquidityAmount(positionLiquidity.toString());
                        }
                      }}
                    >
                      Max
                    </button>
                  </div>
                </div>
                <input
                  type="number"
                  placeholder="0"
                  value={liquidityAmount}
                  onChange={(e) => setLiquidityAmount(e.target.value)}
                  className="amount-input"
                />
              </div>
            </div>

            {/* Tick Range */}
            <div className="form-section">
              <label className="form-label">Price Range</label>
              <div className="info-box">
                <Info size={16} />
                <p>The tick range for your liquidity position</p>
              </div>

              <div className="tick-inputs">
                <div className="tick-input-group">
                  <label>Lower Tick</label>
                  <input
                    type="number"
                    value={tickLower}
                    onChange={(e) => setTickLower(e.target.value)}
                    className="tick-input"
                  />
                </div>
                <div className="tick-input-group">
                  <label>Upper Tick</label>
                  <input
                    type="number"
                    value={tickUpper}
                    onChange={(e) => setTickUpper(e.target.value)}
                    className="tick-input"
                  />
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="summary-section">
              <div className="summary-row">
                <span>Pool Fee:</span>
                <span className="value">{selectedPool.fee}</span>
              </div>
              <div className="summary-row">
                <span>Amount to Remove:</span>
                <span className="value">
                  {liquidityAmount ? `${liquidityAmount}` : '-'}
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
                onClick={handleBurn}
                disabled={isLoading || !liquidityAmount}
              >
                {isLoading ? (
                  <>
                    <span className="spinner-small"></span>
                    Removing Liquidity...
                  </>
                ) : (
                  <>
                    <Minus size={16} />
                    Remove Liquidity
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

export default RemoveLiquidity;
