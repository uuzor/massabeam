import React, { useState, useEffect } from 'react';
import { ChevronDown, ArrowRightLeft, TrendingUp, AlertCircle, CheckCircle, Grid3x3, Info, Activity, Zap } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { useFactory } from '../hooks/useFactory';
import { useToken } from '../hooks/useToken';
import { FACTORY_ADDRESS, GRID_ORDER_MANAGER_ADDRESS } from '../constants/contracts';
import '../styles/GridOrder.css';
import { Mas } from '@massalabs/massa-web3';
import { TOKEN_OPTIONS, NATIVE_MAS, TokenOption } from '../constants/tokens';
import { useGridOrderManager } from '../hooks/useGridOrderManager';

interface GridOrderData {
  tokenIn: TokenOption | null;
  tokenOut: TokenOption | null;
  lowerPrice: string;
  upperPrice: string;
  gridLevels: string;
  amountPerLevel: string;
  strategyType: 'RANGE' | 'DYNAMIC';
  balance: bigint | null;
}

interface UserGridOrder {
  id: string;
  tokenIn: string;
  tokenOut: string;
  lowerPrice: string;
  upperPrice: string;
  gridLevels: string;
  filledLevels: string;
  profitUSD: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
}

export const GridOrder: React.FC<{ onBackClick: () => void }> = ({ onBackClick }) => {
  const { isConnected, userAddress, provider, userMasBalance } = useWallet();
  const { getPools } = useFactory(FACTORY_ADDRESS, isConnected, provider, userAddress);

  // Grid order manager hook
  const {
    createGridOrder,
    getUserGrids: getManagerUserGrids, // Renamed to avoid conflict
    getGridStats,
    getBotExecutionCount,
    loading: gridManagerLoading,
    error: gridManagerError,
  } = useGridOrderManager(GRID_ORDER_MANAGER_ADDRESS, provider, userAddress);

  // Grid order data state
  const [order, setOrder] = useState<GridOrderData>({
    tokenIn: null,
    tokenOut: null,
    lowerPrice: '0.90',
    upperPrice: '1.10',
    gridLevels: '10',
    amountPerLevel: '',
    strategyType: 'RANGE',
    balance: null,
  });

  // UI state
  const [showTokenInDropdown, setShowTokenInDropdown] = useState(false);
  const [showTokenOutDropdown, setShowTokenOutDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // User grid orders state
  const [userGrids, setUserGrids] = useState<typeof GridOrder[]>([]); // Use GridOrder from hook
  const [gridsLoading, setGridsLoading] = useState(false);
  const [gridStats, setGridStats] = useState({ totalGrids: 0, activeGrids: 0, cancelledGrids: 0, botExecutions: 0 });


  // Token hooks
  const tokenInHook = useToken(order.tokenIn?.address || '', isConnected, provider, userAddress);

  // Fetch balance when tokenIn changes
  useEffect(() => {
    if (order.tokenIn && userAddress) {
      const fetchBalance = async () => {
        try {
          let bal: bigint | null = null;
          if (order.tokenIn?.address === NATIVE_MAS.address) {
            bal = userMasBalance;
          } else {
            bal = await tokenInHook.balanceOf(userAddress);
          }
          setOrder(prev => ({ ...prev, balance: bal }));
        } catch (err) {
          console.error('Error fetching balance:', err);
        }
      };
      fetchBalance();
    }
  }, [order.tokenIn, userAddress, userMasBalance, tokenInHook]);
 const fetchUserGrids = async () => {
        setGridsLoading(true);
        try {
          const fetchedGrids = await getManagerUserGrids(100); // Fetch actual grids
          setUserGrids(fetchedGrids);
        } catch (err) {
          console.error('Error fetching user grids:', err);
        } finally {
          setGridsLoading(false);
        }
      };
  // Fetch user's grid orders
  useEffect(() => {
    if (userAddress && getManagerUserGrids) {
     

      fetchUserGrids();
    }
  }, [userAddress, getManagerUserGrids]); // Add getManagerUserGrids to dependencies

  // Fetch grid stats
  useEffect(() => {
    if (getGridStats) {
      const fetchStats = async () => {
        const stats = await getGridStats();
        setGridStats(stats);
      };
      fetchStats();
      const interval = setInterval(fetchStats, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [getGridStats]);

  const handleTokenInSelect = (token: TokenOption) => {
    setOrder(prev => ({ ...prev, tokenIn: token }));
    setShowTokenInDropdown(false);
  };

  const handleTokenOutSelect = (token: TokenOption) => {
    setOrder(prev => ({ ...prev, tokenOut: token }));
    setShowTokenOutDropdown(false);
  };

  const switchTokens = () => {
    setOrder(prev => (
      {
        ...prev,
        tokenIn: prev.tokenOut,
        tokenOut: prev.tokenIn,
      }
    ));
  };

  const handleSetMaxAmount = () => {
    if (order.balance) {
      setOrder(prev => (
        {
          ...prev,
          amountPerLevel: (Number(order.balance) / 1e9).toString(),
        }
      ));
    }
  };

  const calculateTotalCapital = (): string => {
    const amount = parseFloat(order.amountPerLevel) || 0;
    const levels = parseInt(order.gridLevels) || 0;
    return (amount * levels).toFixed(2);
  };

  const calculateGridSpread = (): string => {
    const lower = parseFloat(order.lowerPrice) || 0;
    const upper = parseFloat(order.upperPrice) || 0;
    if (lower === 0) return '0';
    const spread = ((upper - lower) / lower) * 100;
    return spread.toFixed(2);
  };

  const calculatePriceStep = (): string => {
    const lower = parseFloat(order.lowerPrice) || 0;
    const upper = parseFloat(order.upperPrice) || 0;
    const levels = parseInt(order.gridLevels) || 1;
    if (lower === 0 || levels === 0) return '0';
    const step = (upper - lower) / levels;
    return step.toFixed(6);
  };

  const isFormValid = (): boolean => {
    const lower = parseFloat(order.lowerPrice) || 0;
    const upper = parseFloat(order.upperPrice) || 0;
    return !!(
      order.tokenIn &&
      order.tokenOut &&
      lower > 0 &&
      upper > lower &&
      order.gridLevels &&
      parseInt(order.gridLevels) > 0 &&
      order.amountPerLevel &&
      parseFloat(order.amountPerLevel) > 0 &&
      isConnected
    );
  };

  const handleCreateGridOrder = async () => {
    if (!isFormValid()) {
      setError('Please fill in all required fields correctly');
      return;
    }

    if (!order.tokenIn || !order.tokenOut) {
      setError('Please select both tokens');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const amountPerLevelFloat = parseFloat(order.amountPerLevel);
      const gridLevelsInt = parseInt(order.gridLevels);
      const lowerPriceFloat = parseFloat(order.lowerPrice);
      const upperPriceFloat = parseFloat(order.upperPrice);

      if (isNaN(amountPerLevelFloat) || amountPerLevelFloat <= 0 || isNaN(gridLevelsInt) || gridLevelsInt <= 0 || isNaN(lowerPriceFloat) || lowerPriceFloat <= 0 || isNaN(upperPriceFloat) || upperPriceFloat <= 0) {
        throw new Error('Invalid amount, levels, or price range.');
      }

      const amountPerLevelWei = BigInt(Math.floor(amountPerLevelFloat * 1e9));
      const totalAmountWei = BigInt(Math.floor(amountPerLevelFloat * gridLevelsInt * 1e9));

      const lowerPriceWei = BigInt(Math.floor(lowerPriceFloat * 1e9)); // Assuming price is also 18 decimals
      const upperPriceWei = BigInt(Math.floor(upperPriceFloat * 1e9)); // Assuming price is also 18 decimals

      let coinsToSend: Mas | undefined = undefined;

      // Check if tokenIn is NATIVE_MAS
      if (order.tokenIn.address === NATIVE_MAS.address) {
        coinsToSend = Mas.fromMas(totalAmountWei);
        // No allowance needed for native MAS, it's sent directly
      } else {
        // Perform allowance check for ERC-20 like tokens
        const allowance = await tokenInHook.allowance(userAddress, GRID_ORDER_MANAGER_ADDRESS);
        if (allowance === null || allowance < totalAmountWei) {
          setError(`Insufficient allowance for ${order.tokenIn.symbol}. Please approve the Grid Order Manager to spend your tokens.`);
          setIsLoading(false);
          // TODO: Add an approval step here
          return;
        }
      }

      // Create grid order
      const gridId = await createGridOrder(
        order.tokenIn.address,
        order.tokenOut.address,
        BigInt(gridLevelsInt),
        lowerPriceWei,
        upperPriceWei,
        amountPerLevelWei,
        coinsToSend
      );

      if (gridId) {
        setSuccess('Grid order created successfully! Your grid trading strategy is now active.');
        // Refresh user grids
        await fetchUserGrids();

        // Reset form
        setTimeout(() => {
          setOrder({
            tokenIn: null,
            tokenOut: null,
            lowerPrice: '0.90',
            upperPrice: '1.10',
            gridLevels: '10',
            amountPerLevel: '',
            strategyType: 'RANGE',
            balance: null,
          });
          setSuccess(null);
        }, 5000); // Increased timeout to see success message
      } else {
        setError(gridManagerError || 'Failed to create grid order');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create grid order');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid-order-container">
      <div className="grid-order-layout">
        <div className="grid-order-main">
          {/* Header */}
          <div className="grid-order-header">
            <button className="btn-back" onClick={onBackClick}>
              ← Back
            </button>
            <div>
              <h1>Grid Trading</h1>
              <p>Automate profit-taking with grid orders across a price range</p>
            </div>
          </div>

          {/* Bot Status Banner */}
          <div className="bot-status-banner">
            <div className="bot-status-item">
              <Activity className="bot-icon" size={20} />
              <div>
                <span className="bot-label">Bot Status</span>
                <span className="bot-value active">Active</span>
              </div>
            </div>
            <div className="bot-status-item">
              <Zap className="bot-icon" size={20} />
              <div>
                <span className="bot-label">Executions</span>
                <span className="bot-value">{gridStats.botExecutions}</span>
              </div>
            </div>
            <div className="bot-status-item">
              <Grid3x3 className="bot-icon" size={20} />
              <div>
                <span className="bot-label">Total Grids</span>
                <span className="bot-value">{gridStats.totalGrids}</span>
              </div>
            </div>
            <div className="bot-status-item">
              <TrendingUp className="bot-icon" size={20} />
              <div>
                <span className="bot-label">Active Grids</span>
                <span className="bot-value">{gridStats.activeGrids}</span>
              </div>
            </div>
          </div>

          {/* Alerts */}
          {error && (
            <div className="alert alert-error">
              <AlertCircle size={18} />
              <p>{error}</p>
            </div>
          )}

          {success && (
            <div className="alert alert-success">
              <CheckCircle size={18} />
              <p>{success}</p>
            </div>
          )}

          {/* Main Form */}
          <div className="grid-order-form">
            {/* Strategy Type */}
            <div className="form-section">
              <label className="form-label">Trading Strategy</label>
              <div className="strategy-selector">
                {(['RANGE', 'DYNAMIC'] as const).map((type) => (
                  <button
                    key={type}
                    className={`strategy-btn ${order.strategyType === type ? 'active' : ''}`}
                    onClick={() => setOrder(prev => ({ ...prev, strategyType: type }))}
                  >
                    <span className="strategy-icon">{type === 'RANGE' ? '📊' : '📈'}</span>
                    <span className="strategy-label">{type}</span>
                    <span className="strategy-desc">{type === 'RANGE' ? 'Fixed range' : 'Auto-scaling'}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Token Selection */}
            <div className="form-section">
              <label className="form-label">Token Pair</label>

              {/* Token In */}
              <div className="token-input-wrapper">
                <div className="token-selector-container">
                  <button
                    className="token-selector"
                    onClick={() => setShowTokenInDropdown(!showTokenInDropdown)}
                  >
                    {order.tokenIn ? (
                      <>
                        <span className="token-symbol">{order.tokenIn.symbol}</span>
                        <span className="token-name">{order.tokenIn.name}</span>
                      </>
                    ) : (
                      <span className="token-placeholder">Select Base Token</span>
                    )}
                    <ChevronDown size={18} />
                  </button>

                  {showTokenInDropdown && (
                    <div className="token-dropdown">
                      <div className="dropdown-list">
                        {TOKEN_OPTIONS.map((token) => (
                          <button
                            key={token.address}
                            className={`dropdown-item ${order.tokenIn?.address === token.address ? 'selected' : ''}`}
                            onClick={() => handleTokenInSelect(token)}
                          >
                            <div className="token-name">
                              <span className="token-sym">{token.symbol}</span>
                              <span className="token-addr">{token.address.slice(0, 8)}...</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {order.tokenIn && order.balance !== null && (
                  <div className="balance-info">
                    <span className="balance-text">Balance: {(Number(order.balance) / 1e9).toFixed(2)} {order.tokenIn.symbol}</span>
                    <button className="btn-max" onClick={handleSetMaxAmount}>
                      Max
                    </button>
                  </div>
                )}
              </div>

              {/* Switch Button */}
              <button className="token-switch-btn" onClick={switchTokens} title="Switch tokens">
                <ArrowRightLeft size={18} />
              </button>

              {/* Token Out */}
              <div className="token-input-wrapper">
                <div className="token-selector-container">
                  <button
                    className="token-selector"
                    onClick={() => setShowTokenOutDropdown(!showTokenOutDropdown)}
                  >
                    {order.tokenOut ? (
                      <>
                        <span className="token-symbol">{order.tokenOut.symbol}</span>
                        <span className="token-name">{order.tokenOut.name}</span>
                      </>
                    ) : (
                      <span className="token-placeholder">Select Quote Token</span>
                    )}
                    <ChevronDown size={18} />
                  </button>

                  {showTokenOutDropdown && (
                    <div className="token-dropdown">
                      <div className="dropdown-list">
                        {TOKEN_OPTIONS.map((token) => (
                          <button
                            key={token.address}
                            className={`dropdown-item ${order.tokenOut?.address === token.address ? 'selected' : ''}`}
                            onClick={() => handleTokenOutSelect(token)}
                          >
                            <div className="token-name">
                              <span className="token-sym">{token.symbol}</span>
                              <span className="token-addr">{token.address.slice(0, 8)}...</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Price Range */}
            <div className="form-section">
              <label className="form-label">Price Range</label>

              <div className="price-range-grid">
                <div className="price-input">
                  <label className="price-label">Lower Price</label>
                  <div className="input-with-unit">
                    <input
                      type="number"
                      placeholder="0.0"
                      value={order.lowerPrice}
                      onChange={(e) => setOrder(prev => ({ ...prev, lowerPrice: e.target.value }))}
                      className="price-value"
                      step="0.0001"
                      min="0"
                    />
                    <span className="unit">{order.tokenOut?.symbol || 'Token'}/{order.tokenIn?.symbol || 'Token'}</span>
                  </div>
                </div>

                <div className="price-input">
                  <label className="price-label">Upper Price</label>
                  <div className="input-with-unit">
                    <input
                      type="number"
                      placeholder="0.0"
                      value={order.upperPrice}
                      onChange={(e) => setOrder(prev => ({ ...prev, upperPrice: e.target.value }))}
                      className="price-value"
                      step="0.0001"
                      min="0"
                    />
                    <span className="unit">{order.tokenOut?.symbol || 'Token'}/{order.tokenIn?.symbol || 'Token'}</span>
                  </div>
                </div>
              </div>

              <div className="range-info">
                <div className="info-item">
                  <span className="info-label">Range Spread:</span>
                  <span className="info-value">{calculateGridSpread()}%</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Price Step:</span>
                  <span className="info-value">{calculatePriceStep()}</span>
                </div>
              </div>
            </div>

            {/* Grid Configuration */}
            <div className="form-section">
              <label className="form-label">Grid Configuration</label>

              <div className="grid-config-grid">
                <div className="config-input">
                  <label className="config-label">
                    <Grid3x3 size={16} />
                    Grid Levels
                  </label>
                  <input
                    type="number"
                    placeholder="10"
                    value={order.gridLevels}
                    onChange={(e) => setOrder(prev => ({ ...prev, gridLevels: e.target.value }))}
                    className="config-value"
                    step="1"
                    min="2"
                    max="100"
                  />
                </div>

                <div className="config-input">
                  <label className="config-label">
                    <TrendingUp size={16} />
                    Amount Per Level
                  </label>
                  <div className="input-with-unit">
                    <input
                      type="number"
                      placeholder="0.0"
                      value={order.amountPerLevel}
                      onChange={(e) => setOrder(prev => ({ ...prev, amountPerLevel: e.target.value }))}
                      className="config-value"
                      step="0.01"
                      min="0"
                    />
                    <span className="unit">{order.tokenIn?.symbol || 'Token'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary Section */}
            <div className="summary-section">
              <h3 className="summary-title">Grid Summary</h3>

              <div className="summary-row">
                <span>Token Pair</span>
                <span className="summary-value">
                  {order.tokenIn?.symbol || 'Token'} / {order.tokenOut?.symbol || 'Token'}
                </span>
              </div>

              <div className="summary-row">
                <span>Grid Levels</span>
                <span className="summary-value">{order.gridLevels || '0'} levels</span>
              </div>

              <div className="summary-row">
                <span>Per Level Amount</span>
                <span className="summary-value">
                  {order.amountPerLevel || '0'} {order.tokenIn?.symbol || 'Token'}
                </span>
              </div>

              <div className="summary-row">
                <span>Total Capital Required</span>
                <span className="summary-value">
                  {calculateTotalCapital()} {order.tokenIn?.symbol || 'Token'}
                </span>
              </div>

              <div className="summary-divider"></div>

              <div className="summary-row">
                <span>Lower Price</span>
                <span className="summary-value">{order.lowerPrice || '0'}</span>
              </div>

              <div className="summary-row">
                <span>Upper Price</span>
                <span className="summary-value">{order.upperPrice || '0'}</span>
              </div>

              <div className="summary-row">
                <span>Range Spread</span>
                <span className="summary-value">{calculateGridSpread()}%</span>
              </div>

              {order.balance !== null && order.amountPerLevel && (
                <div className="summary-row">
                  <span>Balance Check</span>
                  <span className={`summary-value ${Number(order.amountPerLevel) * parseInt(order.gridLevels || '1') <= Number(order.balance) / 1e9 ? 'valid' : 'invalid'}`}>
                    {Number(order.amountPerLevel) * parseInt(order.gridLevels || '1') <= Number(order.balance) / 1e9 ? '✅ Sufficient' : '❌ Insufficient'}
                  </span>
                </div>
              )}
            </div>

            {/* Info Box */}
            <div className="info-box">
              <Info size={18} />
              <div>
                <p>
                  <strong>How Grid Trading Works:</strong> Your bot will automatically place buy orders at every lower price level and sell orders at every upper price level.
                  As prices fluctuate, the bot captures profits from each grid level. Perfect for ranging markets!
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="form-actions">
              {!isConnected ? (
                <button className="btn btn-primary" disabled>
                  Connect Wallet to Continue
                </button>
              ) : !isFormValid() ? (
                <button className="btn btn-primary" disabled>
                  Fill in all fields correctly to continue
                </button>
              ) : (
                <>
                  <button
                    onClick={handleCreateGridOrder}
                    disabled={isLoading}
                    className="btn btn-primary"
                  >
                    {isLoading ? (
                      <>
                        <span className="spinner-small"></span>
                        Creating...
                      </>
                    ) : (
                      <>
                        <Grid3x3 size={16} />
                        Create Grid Order
                      </>
                    )}
                  </button>
                  <button onClick={onBackClick} className="btn btn-secondary">
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar - Grid Trading Info & Active Grids */}
        <div className="grid-order-sidebar">
          {/* Grid Trading Info Card */}
          <div className="grid-info-card">
            <h3 className="card-title">Grid Trading</h3>
            <div className="grid-tips">
              <div className="tip-item">
                <span className="tip-icon">💡</span>
                <span className="tip-text">Best for ranging markets</span>
              </div>
              <div className="tip-item">
                <span className="tip-icon">⚙️</span>
                <span className="tip-text">Automated buy/sell orders</span>
              </div>
              <div className="tip-item">
                <span className="tip-icon">📈</span>
                <span className="tip-text">Capture profits at each level</span>
              </div>
              <div className="tip-item">
                <span className="tip-icon">🔄</span>
                <span className="tip-text">Works 24/7 autonomously</span>
              </div>
            </div>
          </div>

          {/* Active Grids Card */}
          <div className="active-grids-card">
            <h3 className="card-title">Your Grids</h3>
            {gridsLoading ? (
              <div className="grids-loading">
                <p>Loading grids...</p>
              </div>
            ) : userGrids.length === 0 ? (
              <div className="grids-empty">
                <p>No active grids yet</p>
              </div>
            ) : (
              <div className="grids-list">
                {userGrids.map((grid) => {
                  const status = grid.cancelled ? 'CANCELLED' : grid.active ? 'ACTIVE' : 'INACTIVE';
                  // NOTE: To get token symbols, a mapping from address to symbol would be needed here.
                  // For now, showing truncated addresses.
                  const tokenInSymbol = grid.tokenIn.slice(0, 5) + '...';
                  const tokenOutSymbol = grid.tokenOut.slice(0, 5) + '...';

                  return (
                    <div key={grid.gridId} className="grid-item">
                      <div className="grid-header">
                        <span className={`grid-status-badge ${status.toLowerCase()}`}>
                          {status}
                        </span>
                      </div>
                      <div className="grid-details">
                        <div className="detail-row">
                          <span className="detail-label">Pair</span>
                          <span className="detail-value">{tokenInSymbol}/{tokenOutSymbol}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Levels</span>
                          <span className="detail-value">{grid.gridLevels.toString()}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Range</span>
                          <span className="detail-value">
                            {(Number(grid.lowerPrice) / 1e9).toFixed(4)} - {(Number(grid.upperPrice) / 1e9).toFixed(4)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GridOrder;
