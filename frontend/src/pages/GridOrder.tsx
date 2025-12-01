import React, { useState, useEffect } from 'react';
import { ChevronDown, ArrowRightLeft, TrendingUp, AlertCircle, CheckCircle, Grid3x3, Info } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { useFactory } from '../hooks/useFactory';
import { useToken } from '../hooks/useToken';
import { FACTORY_ADDRESS, GRID_ORDER_MANAGER_ADDRESS } from '../constants/contracts';
import '../styles/GridOrder.css';
import { BUILDNET_TOKENS } from '@massalabs/massa-web3';

interface TokenOption {
  symbol: string;
  address: string;
  name: string;
}

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
  const { isConnected, userAddress, provider } = useWallet();
  const { getPools } = useFactory(FACTORY_ADDRESS, isConnected, provider, userAddress);

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
  const [userGrids, setUserGrids] = useState<UserGridOrder[]>([]);
  const [gridsLoading, setGridsLoading] = useState(false);

  // Token hooks
  const tokenInHook = useToken(order.tokenIn?.address || '', isConnected, userAddress);

  // Fetch balance when tokenIn changes
  useEffect(() => {
    if (order.tokenIn && userAddress) {
      const fetchBalance = async () => {
        try {
          const bal = await tokenInHook.balanceOf(userAddress);
          setOrder(prev => ({ ...prev, balance: bal }));
        } catch (err) {
          console.error('Error fetching balance:', err);
        }
      };
      fetchBalance();
    }
  }, [userAddress]);

  // Fetch user's grid orders
  useEffect(() => {
    if (userAddress) {
      const fetchUserGrids = async () => {
        setGridsLoading(true);
        try {
          // Mock user grid orders - in real implementation, fetch from contract
          const mockGrids: UserGridOrder[] = [
            {
              id: '1',
              tokenIn: 'USDC',
              tokenOut: 'WMAS',
              lowerPrice: '0.85',
              upperPrice: '1.15',
              gridLevels: '20',
              filledLevels: '12',
              profitUSD: '245.50',
              status: 'ACTIVE',
              createdAt: new Date(Date.now() - 604800000).toLocaleDateString(),
            },
            {
              id: '2',
              tokenIn: 'WMAS',
              tokenOut: 'USDC',
              lowerPrice: '0.95',
              upperPrice: '1.05',
              gridLevels: '15',
              filledLevels: '15',
              profitUSD: '189.75',
              status: 'COMPLETED',
              createdAt: new Date(Date.now() - 2592000000).toLocaleDateString(),
            },
          ];
          setUserGrids(mockGrids);
        } catch (err) {
          console.error('Error fetching user grids:', err);
        } finally {
          setGridsLoading(false);
        }
      };

      fetchUserGrids();
    }
  }, [userAddress]);

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
          amountPerLevel: (Number(order.balance) / 1e18).toString(),
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

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Placeholder for actual grid order creation
      // In real implementation, this would call the gridOrderManager contract
      console.log('Creating grid order:', {
        tokenIn: order.tokenIn?.address,
        tokenOut: order.tokenOut?.address,
        lowerPrice: order.lowerPrice,
        upperPrice: order.upperPrice,
        gridLevels: order.gridLevels,
        amountPerLevel: order.amountPerLevel,
        strategyType: order.strategyType,
      });

      setSuccess('Grid order created successfully! Your grid trading strategy is now active.');

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
      }, 3000);
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
                        {Object.entries(BUILDNET_TOKENS).map(([symbol, address]) => ({
                          symbol,
                          address,
                          name: symbol
                        })).map((token) => (
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
                    <span className="balance-text">Balance: {(Number(order.balance) / 1e18).toFixed(2)} {order.tokenIn.symbol}</span>
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
                        {Object.entries(BUILDNET_TOKENS).map(([symbol, address]) => ({
                          symbol,
                          address,
                          name: symbol
                        })).map((token) => (
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
                  <span className={`summary-value ${Number(order.amountPerLevel) * parseInt(order.gridLevels || '1') <= Number(order.balance) / 1e18 ? 'valid' : 'invalid'}`}>
                    {Number(order.amountPerLevel) * parseInt(order.gridLevels || '1') <= Number(order.balance) / 1e18 ? '✅ Sufficient' : '❌ Insufficient'}
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
                {userGrids.map((grid) => (
                  <div key={grid.id} className="grid-item">
                    <div className="grid-header">
                      <span className={`grid-status-badge ${grid.status.toLowerCase()}`}>
                        {grid.status}
                      </span>
                    </div>
                    <div className="grid-details">
                      <div className="detail-row">
                        <span className="detail-label">Pair</span>
                        <span className="detail-value">{grid.tokenIn}/{grid.tokenOut}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Levels</span>
                        <span className="detail-value">{grid.filledLevels}/{grid.gridLevels}</span>
                      </div>
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${(parseInt(grid.filledLevels) / parseInt(grid.gridLevels)) * 100}%`
                          }}
                        ></div>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Profit</span>
                        <span className="detail-value profit">${grid.profitUSD}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Range</span>
                        <span className="detail-value">{grid.lowerPrice} - {grid.upperPrice}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GridOrder;
