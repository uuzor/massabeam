import React, { useState, useEffect } from 'react';
import { ChevronDown, Plus, Info } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { useFactory } from '../hooks/useFactory';
import { usePool } from '../hooks/usePool';
import { useToken } from '../hooks/useToken';
import { Mas } from '@massalabs/massa-web3';
import { NATIVE_MAS } from '../constants/tokens';
import { FACTORY_ADDRESS } from '../constants/contracts';
import '../styles/AddLiquidity.css';

interface PoolOption {
  id: string;
  token0: string;
  token0Address: string;
  token1: string;
  token1Address: string;
  fee: string;
}

export const AddLiquidity: React.FC<{ onBackClick: () => void }> = ({ onBackClick }) => {
  const { isConnected, provider, userAddress } = useWallet();
  const { getPools } = useFactory(FACTORY_ADDRESS, isConnected, provider, userAddress);

  const [pools, setPools] = useState<PoolOption[]>([]);
  const [selectedPool, setSelectedPool] = useState<PoolOption | null>(null);
  const [showPoolDropdown, setShowPoolDropdown] = useState(false);

  const [amount0, setAmount0] = useState('');
  const [amount1, setAmount1] = useState('');
  const [tickLower, setTickLower] = useState('-887220');
  const [tickUpper, setTickUpper] = useState('887220');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [balance0, setBalance0] = useState<bigint | null>(null);
  const [balance1, setBalance1] = useState<bigint | null>(null);
  const [allowance0, setAllowance0] = useState<bigint | null>(null);
  const [allowance1, setAllowance1] = useState<bigint | null>(null);
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
      if (!userAddress || !selectedPool || !provider) return;

      const { token0Address, token1Address, id: poolAddress } = selectedPool;
      const MAX_U256 = BigInt(2) ** BigInt(256) - BigInt(1);

      // Token 0
      if (token0Address === NATIVE_MAS.address) {
        // Assuming useWallet provides userMasBalance
        // setBalance0(userMasBalance); 
        setAllowance0(MAX_U256); // Native MAS doesn't require allowance
      } else {
        const symbol0 = await token0Hook.getSymbol();
        const balance0Result = await token0Hook.balanceOf(userAddress);
        const allowance0Result = await token0Hook.allowance(userAddress, poolAddress);
        setSelectedPool(prev => ({ ...prev, token0: symbol0 || 'Token0' }));
        setBalance0(balance0Result);
        setAllowance0(allowance0Result);
      }

      // Token 1
      if (token1Address === NATIVE_MAS.address) {
        // Assuming useWallet provides userMasBalance
        // setBalance1(userMasBalance);
        setAllowance1(MAX_U256); // Native MAS doesn't require allowance
      } else {
        const symbol1 = await token1Hook.getSymbol();
        const balance1Result = await token1Hook.balanceOf(userAddress);
        const allowance1Result = await token1Hook.allowance(userAddress, poolAddress);
        setSelectedPool(prev => ({ ...prev, token1: symbol1 || 'Token1' }));
        setBalance1(balance1Result);
        setAllowance1(allowance1Result);
      }
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

  const handleMint = async () => {
    if (!selectedPool || !amount0 || !amount1 || !isConnected) {
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

      const amount0Wei = BigInt(Math.floor(parseFloat(amount0) * 1e9));
      const amount1Wei = BigInt(Math.floor(parseFloat(amount1) * 1e9));
      let coinsToMint = Mas.fromMicroMas(0n);

      // Check and request allowance for token0 if it's not native MAS
      if (selectedPool.token0Address !== NATIVE_MAS.address) {
        if (allowance0 !== null && allowance0 < amount0Wei) {
          setError(`Requesting approval for ${selectedPool.token0}...`);
          setApprovalLoading(true);
          await token0Hook.increaseAllowance(selectedPool.id, amount0Wei);
          setApprovalLoading(false);
        }
      } else {
        coinsToMint = Mas.fromMicroMas(coinsToMint + amount0Wei);
      }

      // Check and request allowance for token1 if it's not native MAS
      if (selectedPool.token1Address !== NATIVE_MAS.address) {
        if (allowance1 !== null && allowance1 < amount1Wei) {
          setError(`Requesting approval for ${selectedPool.token1}...`);
          setApprovalLoading(true);
          await token1Hook.increaseAllowance(selectedPool.id, amount1Wei);
          setApprovalLoading(false);
        }
      } else {
        coinsToMint = Mas.fromMicroMas(coinsToMint + amount1Wei);
      }

      setError(null);

      const mintParams = {
        recipient: userAddress,
        tickLower: parseInt(tickLower),
        tickUpper: parseInt(tickUpper),
        liquidityDelta: amount0Wei, // Note: The contract might need adjustment if liquidityDelta is not based on one token amount
      };
      console.log('Mint params:', mintParams);
      console.log('Coins to mint:', coinsToMint);

      const txId = await poolHook.mint(mintParams, coinsToMint);

      if (txId) {
        setTxHash(txId);
        setAmount0('');
        setAmount1('');
        console.log('Liquidity added successfully:', txId);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add liquidity';
      setError(message);
      console.error('Mint error:', err);
    } finally {
      setIsLoading(false);
      setApprovalLoading(false);
    }
  };

  return (
    <div className="add-liquidity-container">
      <div className="add-liquidity-wrapper">
        {/* Header */}
        <div className="add-liquidity-header">
          <button className="btn-back" onClick={onBackClick}>
            ← Back
          </button>
          <div>
            <h1>Add Liquidity</h1>
            <p>Provide liquidity to earn trading fees</p>
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
            <p>Liquidity added successfully! TX: {txHash.slice(0, 8)}...</p>
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
            {/* Amount Inputs */}
            <div className="form-section">
              <label className="form-label">Amounts</label>

              {/* Token 0 Amount */}
              <div className="amount-input-group">
                <div className="amount-input-label">
                  <span>{selectedPool.token0}</span>
                  <div className="balance-info">
                    {balance0 !== null && (
                      <span className="balance-text">
                        Balance: {(Number(balance0) / 1e8).toFixed(4)}
                      </span>
                    )}
                    <button
                      className="btn-max"
                      onClick={() => {
                        if (balance0) {
                          setAmount0((Number(balance0) / 1e8).toString());
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
                  value={amount0}
                  onChange={(e) => setAmount0(e.target.value)}
                  className="amount-input"
                />
              </div>

              {/* Token 1 Amount */}
              <div className="amount-input-group">
                <div className="amount-input-label">
                  <span>{selectedPool.token1}</span>
                  <div className="balance-info">
                    {balance1 !== null && (
                      <span className="balance-text">
                        Balance: {(Number(balance1) / 1e8).toFixed(4)}
                      </span>
                    )}
                    <button
                      className="btn-max"
                      onClick={() => {
                        if (balance1) {
                          setAmount1((Number(balance1) / 1e8).toString());
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
                  value={amount1}
                  onChange={(e) => setAmount1(e.target.value)}
                  className="amount-input"
                />
              </div>
            </div>

            {/* Tick Range */}
            <div className="form-section">
              <label className="form-label">Price Range</label>
              <div className="info-box">
                <Info size={16} />
                <p>Set the tick range for your concentrated liquidity position</p>
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
                <span>Estimated Position:</span>
                <span className="value">
                  {amount0 && amount1
                    ? `${amount0} ${selectedPool.token0} / ${amount1} ${selectedPool.token1}`
                    : '-'}
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
                onClick={handleMint}
                disabled={isLoading || !amount0 || !amount1}
              >
                {isLoading ? (
                  <>
                    <span className="spinner-small"></span>
                    Adding Liquidity...
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    Add Liquidity
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

export default AddLiquidity;
