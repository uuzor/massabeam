import React, { useState, useEffect } from 'react';
import { ChevronDown, ArrowRightLeft, Clock, DollarSign, AlertCircle, CheckCircle, Zap, RotateCw, TrendingUp, Calendar, Activity } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { useToken } from '../hooks/useToken';
import { useRecurringOrderManager, RecurringOrder as RecurringOrderType, periodsToTime, calculateNextExecutionDate } from '../hooks/useRecurringOrderManager';
import { RECURRING_ORDER_MANAGER_ADDRESS } from '../constants/contracts';
import '../styles/RecurringOrder.css';
import { BUILDNET_TOKENS } from '@massalabs/massa-web3';

interface TokenOption {
  symbol: string;
  address: string;
  name: string;
}

interface OrderData {
  tokenIn: TokenOption | null;
  tokenOut: TokenOption | null;
  amountPerExecution: string;
  intervalDays: string;
  totalExecutions: string;
  balance: bigint | null;
}

export const RecurringOrder: React.FC<{ onBackClick: () => void }> = ({ onBackClick }) => {
  const { isConnected, userAddress, provider } = useWallet();

  // Smart contract hook
  const {
    createRecurringOrder,
    cancelRecurringOrder,
    getUserOrders,
    getOrderProgress,
    getBotExecutionCount,
    loading: contractLoading,
    error: contractError,
    txHash,
  } = useRecurringOrderManager(RECURRING_ORDER_MANAGER_ADDRESS, provider, userAddress);

  // Order data state
  const [order, setOrder] = useState<OrderData>({
    tokenIn: null,
    tokenOut: null,
    amountPerExecution: '',
    intervalDays: '7',
    totalExecutions: '12',
    balance: null,
  });

  // UI state
  const [showTokenInDropdown, setShowTokenInDropdown] = useState(false);
  const [showTokenOutDropdown, setShowTokenOutDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // User orders state
  const [userOrders, setUserOrders] = useState<RecurringOrderType[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderProgress, setOrderProgress] = useState<Map<string, any>>(new Map());
  const [botExecutionCount, setBotExecutionCount] = useState<number>(0);

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
  }, [order.tokenIn, userAddress]);

  // Fetch user's recurring orders
  useEffect(() => {
    if (userAddress && provider) {
      fetchUserOrders();
    }
  }, [userAddress, provider, getUserOrders]);

  // Fetch bot execution count
  useEffect(() => {
    if (provider) {
      const fetchBotCount = async () => {
        const count = await getBotExecutionCount();
        setBotExecutionCount(count);
      };
      fetchBotCount();

      // Update every 30 seconds
      const interval = setInterval(fetchBotCount, 30000);
      return () => clearInterval(interval);
    }
  }, [provider, getBotExecutionCount]);

  const fetchUserOrders = async () => {
    setOrdersLoading(true);
    try {
      const orders = await getUserOrders(100);
      setUserOrders(orders);

      // Fetch progress for each order
      const progressMap = new Map();
      for (const ord of orders) {
        if (ord.active) {
          const progress = await getOrderProgress(BigInt(ord.orderId));
          if (progress) {
            progressMap.set(ord.orderId, progress);
          }
        }
      }
      setOrderProgress(progressMap);
    } catch (err) {
      console.error('Error fetching user orders:', err);
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleTokenInSelect = (token: TokenOption) => {
    setOrder(prev => ({ ...prev, tokenIn: token }));
    setShowTokenInDropdown(false);
  };

  const handleTokenOutSelect = (token: TokenOption) => {
    setOrder(prev => ({ ...prev, tokenOut: token }));
    setShowTokenOutDropdown(false);
  };

  const switchTokens = () => {
    setOrder(prev => ({
      ...prev,
      tokenIn: prev.tokenOut,
      tokenOut: prev.tokenIn,
    }));
  };

  const handleSetMaxAmount = () => {
    if (order.balance) {
      const totalExecutions = parseInt(order.totalExecutions) || 1;
      const maxPerExecution = Number(order.balance) / BigInt(totalExecutions) / BigInt(1e9);
      setOrder(prev => ({
        ...prev,
        amountPerExecution: maxPerExecution.toString(),
      }));
    }
  };

  const calculateTotalAmount = (): string => {
    const amount = parseFloat(order.amountPerExecution) || 0;
    const executions = parseInt(order.totalExecutions) || 0;
    return (amount * executions).toFixed(2);
  };

  const calculateNextExecutionDate = (): string => {
    const days = parseInt(order.intervalDays) || 0;
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + days);
    return nextDate.toLocaleDateString();
  };

  const calculateEndDate = (): string => {
    const intervalDays = parseInt(order.intervalDays) || 0;
    const totalExecutions = parseInt(order.totalExecutions) || 0;
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + intervalDays * totalExecutions);
    return endDate.toLocaleDateString();
  };

  const isFormValid = (): boolean => {
    return !!(
      order.tokenIn &&
      order.tokenOut &&
      order.amountPerExecution &&
      parseFloat(order.amountPerExecution) > 0 &&
      parseInt(order.intervalDays) > 0 &&
      parseInt(order.totalExecutions) > 0 &&
      isConnected
    );
  };

  const handleCreateOrder = async () => {
    if (!isFormValid()) {
      setError('Please fill in all required fields');
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
      // Convert inputs to contract format
      const amountPerExecution = BigInt(Math.floor(parseFloat(order.amountPerExecution) * 1e9));

      // Convert days to periods (1 day ≈ 5400 periods at 16s/period)
      const intervalDays = parseInt(order.intervalDays);
      const periodsPerDay = 5400;
      const intervalPeriods = BigInt(intervalDays * periodsPerDay);

      const totalExecutions = BigInt(parseInt(order.totalExecutions));

      // Create order
      const orderId = await createRecurringOrder(
        order.tokenOut.address, // tokenIn (what we're spending)
        order.tokenIn.address,  // tokenOut (what we're buying)
        amountPerExecution,
        intervalPeriods,
        totalExecutions
      );

      if (orderId) {
        setSuccess(
          `Recurring order #${orderId} created successfully! Your DCA strategy is now active. ` +
          `Bot will execute ${order.totalExecutions} purchases of ${order.amountPerExecution} ${order.tokenOut.symbol} ` +
          `every ${order.intervalDays} days.`
        );

        // Refresh user orders
        await fetchUserOrders();

        // Reset form
        setTimeout(() => {
          setOrder({
            tokenIn: null,
            tokenOut: null,
            amountPerExecution: '',
            intervalDays: '7',
            totalExecutions: '12',
            balance: null,
          });
          setSuccess(null);
        }, 5000);
      } else {
        setError(contractError || 'Failed to create order');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create order');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm(`Are you sure you want to cancel order #${orderId}? Remaining funds will be refunded.`)) {
      return;
    }

    try {
      const success = await cancelRecurringOrder(BigInt(orderId));
      if (success) {
        setSuccess(`Order #${orderId} cancelled successfully. Refund processed.`);
        await fetchUserOrders();
      } else {
        setError(contractError || 'Failed to cancel order');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel order');
    }
  };

  const formatTokenAmount = (amount: bigint, decimals: number = 18): string => {
    return (Number(amount) / Math.pow(10, decimals)).toFixed(2);
  };

  const getOrderStatus = (order: RecurringOrderType): 'ACTIVE' | 'COMPLETED' | 'CANCELLED' => {
    if (order.cancelled) return 'CANCELLED';
    if (order.executedCount >= order.totalExecutions) return 'COMPLETED';
    if (order.active) return 'ACTIVE';
    return 'CANCELLED';
  };

  return (
    <div className="recurring-order-container">
      <div className="recurring-order-layout">
        <div className="recurring-order-main">
          {/* Header */}
          <div className="recurring-order-header">
            <button className="btn-back" onClick={onBackClick}>
              ← Back
            </button>
            <div>
              <h1>Dollar-Cost Averaging (DCA)</h1>
              <p>Set up automated periodic purchases to reduce market volatility impact</p>
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
                <span className="bot-value">{botExecutionCount}</span>
              </div>
            </div>
            <div className="bot-status-item">
              <TrendingUp className="bot-icon" size={20} />
              <div>
                <span className="bot-label">Active Orders</span>
                <span className="bot-value">{userOrders.filter(o => o.active).length}</span>
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

          {txHash && (
            <div className="alert alert-info">
              <CheckCircle size={18} />
              <p>Transaction: {txHash.slice(0, 20)}...</p>
            </div>
          )}

          {/* Main Form */}
          <div className="recurring-order-form">
            {/* Strategy Info */}
            <div className="form-section">
              <label className="form-label">What is DCA?</label>
              <div className="info-box">
                <RotateCw size={18} />
                <div>
                  <p>
                    Dollar-Cost Averaging (DCA) is a strategy to automatically buy a fixed amount of an asset at regular intervals.
                    This helps reduce the impact of market volatility and is ideal for long-term investors.
                  </p>
                </div>
              </div>
            </div>

            {/* Token Selection */}
            <div className="form-section">
              <label className="form-label">Token Pair</label>

              {/* Token to Buy (tokenIn) */}
              <div className="token-input-wrapper">
                <div className="token-selector-container">
                  <label className="input-sublabel">Token to Buy</label>
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
                      <span className="token-placeholder">Select Token</span>
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
              </div>

              {/* Switch Button */}
              <button className="token-switch-btn" onClick={switchTokens} title="Switch tokens">
                <ArrowRightLeft size={18} />
              </button>

              {/* Token to Spend (tokenOut) */}
              <div className="token-input-wrapper">
                <div className="token-selector-container">
                  <label className="input-sublabel">Pay With</label>
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
                      <span className="token-placeholder">Select Token</span>
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

                {order.tokenOut && order.balance !== null && (
                  <div className="balance-info">
                    <span className="balance-text">Balance: {(Number(order.balance) / 1e9).toFixed(2)} {order.tokenOut.symbol}</span>
                    <button className="btn-max" onClick={handleSetMaxAmount}>
                      Max
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* DCA Settings */}
            <div className="form-section">
              <label className="form-label">DCA Schedule</label>

              <div className="dca-settings-grid">
                <div className="setting-input">
                  <label className="setting-label">
                    <DollarSign size={16} />
                    Amount Per Purchase
                  </label>
                  <div className="input-with-unit">
                    <input
                      type="number"
                      placeholder="0.0"
                      value={order.amountPerExecution}
                      onChange={(e) => setOrder(prev => ({ ...prev, amountPerExecution: e.target.value }))}
                      className="setting-value"
                      step="0.01"
                      min="0"
                    />
                    <span className="unit">{order.tokenOut?.symbol || 'Token'}</span>
                  </div>
                </div>

                <div className="setting-input">
                  <label className="setting-label">
                    <Clock size={16} />
                    Interval (Days)
                  </label>
                  <input
                    type="number"
                    placeholder="7"
                    value={order.intervalDays}
                    onChange={(e) => setOrder(prev => ({ ...prev, intervalDays: e.target.value }))}
                    className="setting-value"
                    step="1"
                    min="1"
                    max="365"
                  />
                </div>

                <div className="setting-input">
                  <label className="setting-label">
                    <RotateCw size={16} />
                    Total Executions
                  </label>
                  <input
                    type="number"
                    placeholder="12"
                    value={order.totalExecutions}
                    onChange={(e) => setOrder(prev => ({ ...prev, totalExecutions: e.target.value }))}
                    className="setting-value"
                    step="1"
                    min="1"
                    max="365"
                  />
                </div>
              </div>
            </div>

            {/* Summary Section */}
            <div className="summary-section">
              <h3 className="summary-title">Order Summary</h3>

              <div className="summary-row">
                <span>Strategy</span>
                <span className="summary-value">
                  Buy {order.tokenIn?.symbol || 'Token'} with {order.tokenOut?.symbol || 'Token'}
                </span>
              </div>

              <div className="summary-row">
                <span>Per Purchase</span>
                <span className="summary-value">
                  {order.amountPerExecution || '0'} {order.tokenOut?.symbol || 'Token'}
                </span>
              </div>

              <div className="summary-row">
                <span>Total Investment</span>
                <span className="summary-value summary-highlight">
                  {calculateTotalAmount()} {order.tokenOut?.symbol || 'Token'}
                </span>
              </div>

              <div className="summary-row">
                <span>Frequency</span>
                <span className="summary-value">Every {order.intervalDays} days</span>
              </div>

              <div className="summary-row">
                <span>Total Purchases</span>
                <span className="summary-value">{order.totalExecutions} buys</span>
              </div>

              <div className="summary-divider"></div>

              <div className="summary-row">
                <span><Calendar size={14} /> First Purchase</span>
                <span className="summary-value">{calculateNextExecutionDate()}</span>
              </div>

              <div className="summary-row">
                <span><Calendar size={14} /> Final Purchase</span>
                <span className="summary-value">{calculateEndDate()}</span>
              </div>

              {order.balance !== null && order.amountPerExecution && (
                <div className="summary-row">
                  <span>Balance Check</span>
                  <span className={`summary-value ${parseFloat(calculateTotalAmount()) <= Number(order.balance) / 1e9 ? 'valid' : 'invalid'}`}>
                    {parseFloat(calculateTotalAmount()) <= Number(order.balance) / 1e9 ? '✅ Sufficient' : '❌ Insufficient'}
                  </span>
                </div>
              )}
            </div>

            {/* Info Box */}
            <div className="info-box">
              <AlertCircle size={18} />
              <div>
                <p>
                  <strong>How it works:</strong> Your DCA order will execute automatically at your specified intervals.
                  The autonomous bot (currently at {botExecutionCount} executions) will purchase your chosen amount at each interval until all executions are complete.
                  You can cancel anytime before execution to receive a refund.
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
                  Fill in all fields to continue
                </button>
              ) : (
                <>
                  <button
                    onClick={handleCreateOrder}
                    disabled={isLoading || contractLoading}
                    className="btn btn-primary"
                  >
                    {isLoading || contractLoading ? (
                      <>
                        <span className="spinner-small"></span>
                        Creating...
                      </>
                    ) : (
                      <>
                        <RotateCw size={16} />
                        Create DCA Order
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

        {/* Sidebar - Active DCA Orders */}
        <div className="recurring-order-sidebar">
          {/* DCA Info Card */}
          <div className="dca-info-card">
            <h3 className="card-title">About DCA</h3>
            <div className="dca-benefits">
              <div className="benefit-item">
                <span className="benefit-icon">📊</span>
                <span className="benefit-text">Reduces impact of market timing</span>
              </div>
              <div className="benefit-item">
                <span className="benefit-icon">🎯</span>
                <span className="benefit-text">Automatic periodic purchases</span>
              </div>
              <div className="benefit-item">
                <span className="benefit-icon">⏰</span>
                <span className="benefit-text">Set and forget strategy</span>
              </div>
              <div className="benefit-item">
                <span className="benefit-icon">💰</span>
                <span className="benefit-text">Lower average cost per token</span>
              </div>
            </div>
          </div>

          {/* Active Orders Card */}
          <div className="active-orders-card">
            <h3 className="card-title">Your DCA Orders ({userOrders.length})</h3>
            {ordersLoading ? (
              <div className="orders-loading">
                <p>Loading orders...</p>
              </div>
            ) : userOrders.length === 0 ? (
              <div className="orders-empty">
                <p>No DCA orders yet</p>
                <p className="orders-empty-subtitle">Create your first order to get started</p>
              </div>
            ) : (
              <div className="orders-list">
                {userOrders.map((userOrder) => {
                  const status = getOrderStatus(userOrder);
                  const progress = orderProgress.get(userOrder.orderId);
                  const progressPercent = progress?.progressPercentage || 0;

                  return (
                    <div key={userOrder.orderId} className="dca-order-item">
                      <div className="order-header">
                        <span className="order-id">#{userOrder.orderId}</span>
                        <span className={`order-status-badge ${status.toLowerCase()}`}>
                          {status}
                        </span>
                      </div>
                      <div className="order-details">
                        <div className="detail-row">
                          <span className="detail-label">Strategy</span>
                          <span className="detail-value">
                            Buy {/* Get symbol from address if possible */}
                          </span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Per Buy</span>
                          <span className="detail-value">{formatTokenAmount(userOrder.amountPerExecution)}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Progress</span>
                          <span className="detail-value">
                            {Number(userOrder.executedCount)}/{Number(userOrder.totalExecutions)}
                          </span>
                        </div>
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{ width: `${progressPercent}%` }}
                          ></div>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Interval</span>
                          <span className="detail-value">{periodsToTime(Number(userOrder.intervalPeriods))}</span>
                        </div>
                        {status === 'ACTIVE' && (
                          <button
                            className="btn-cancel-order"
                            onClick={() => handleCancelOrder(userOrder.orderId)}
                          >
                            Cancel Order
                          </button>
                        )}
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

export default RecurringOrder;
