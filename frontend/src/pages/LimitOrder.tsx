import React, { useState, useEffect } from 'react';
import { ChevronDown, ArrowRightLeft, Clock, DollarSign, AlertCircle, CheckCircle, Zap, Activity, TrendingUp, Target } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { useToken } from '../hooks/useToken';
import {
  useLimitOrderManager,
  LimitOrder as LimitOrderType,
  formatPriceFromQ6496,
  priceToQ6496,
  getOrderStatus,
  getOrderTypeLabel,
  formatTokenAmount,
  calculateExpiryDate,
  isOrderExpired
} from '../hooks/useLimitOrderManager';
import { LIMIT_ORDER_MANAGER_ADDRESS } from '../constants/contracts';
import '../styles/LimitOrder.css';
import { Mas } from '@massalabs/massa-web3';
import { TOKEN_OPTIONS, NATIVE_MAS, TokenOption } from '../constants/tokens';

interface OrderData {
  tokenIn: TokenOption | null;
  tokenOut: TokenOption | null;
  amountIn: string;
  minAmountOut: string;
  limitPrice: string;
  orderType: 'BUY' | 'SELL';
  expiryDays: string;
  balance: bigint | null;
}

export const LimitOrder: React.FC<{ onBackClick: () => void }> = ({ onBackClick }) => {
  const { isConnected, userAddress, provider, userMasBalance } = useWallet();

  // Smart contract hook
  const {
    createLimitOrder,
    cancelLimitOrder,
    getUserOrders,
    getPendingOrdersCount,
    getBotExecutionCount,
    getOrderStats,
    loading: contractLoading,
    error: contractError,
    txHash,
  } = useLimitOrderManager(LIMIT_ORDER_MANAGER_ADDRESS, provider, userAddress);

  // Order data state
  const [order, setOrder] = useState<OrderData>({
    tokenIn: null,
    tokenOut: null,
    amountIn: '',
    minAmountOut: '',
    limitPrice: '',
    orderType: 'BUY',
    expiryDays: '1',
    balance: null,
  });

  // UI state
  const [showTokenInDropdown, setShowTokenInDropdown] = useState(false);
  const [showTokenOutDropdown, setShowTokenOutDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // User orders state
  const [userOrders, setUserOrders] = useState<LimitOrderType[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [botExecutionCount, setBotExecutionCount] = useState<number>(0);
  const [stats, setStats] = useState({ totalOrders: 0, pendingOrders: 0, filledOrders: 0, cancelledOrders: 0 });

  // Token hooks
  const tokenInHook = useToken(order.tokenIn?.address, isConnected, provider, userAddress);

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
  }, [order.tokenIn, userAddress, userMasBalance]);

  // Fetch user's orders
  useEffect(() => {
    if (userAddress && provider) {
      fetchUserOrders();
    }
  }, [userAddress, provider]);

  // Fetch bot execution count and stats
  useEffect(() => {
    if (provider) {
      const fetchStats = async () => {
        const [count, pending, orderStats] = await Promise.all([
          getBotExecutionCount(),
          getPendingOrdersCount(),
          getOrderStats(),
        ]);
        setBotExecutionCount(count);
        setPendingCount(pending);
        setStats(orderStats);
      };
      fetchStats();

      // Update every 30 seconds
      const interval = setInterval(fetchStats, 30000);
      return () => clearInterval(interval);
    }
  }, [provider, getBotExecutionCount, getPendingOrdersCount, getOrderStats]);

  const fetchUserOrders = async () => {
    setOrdersLoading(true);
    try {
      const orders = await getUserOrders(100);
      setUserOrders(orders);
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
      orderType: prev.orderType === 'BUY' ? 'SELL' : 'BUY',
    }));
  };

  const handleSetMaxAmount = () => {
    if (order.balance) {
      setOrder(prev => ({
        ...prev,
        amountIn: (Number(order.balance) / 1e9).toString(),
      }));
    }
  };

  const calculateExpiryTime = (): string => {
    const days = parseInt(order.expiryDays) || 0;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);
    return expiryDate.toLocaleDateString();
  };

  const calculateExpectedOutput = (): string => {
    if (!order.amountIn || !order.limitPrice) return '0';
    const amountIn = parseFloat(order.amountIn);
    const price = parseFloat(order.limitPrice);

    if (order.orderType === 'BUY') {
      // BUY: amountOut = amountIn / price
      return (amountIn / price).toFixed(4);
    } else {
      // SELL: amountOut = amountIn * price
      return (amountIn * price).toFixed(4);
    }
  };

  const isFormValid = (): boolean => {
    return !!(
      order.tokenIn &&
      order.tokenOut &&
      order.amountIn &&
      parseFloat(order.amountIn) > 0 &&
      order.limitPrice &&
      parseFloat(order.limitPrice) > 0 &&
      parseInt(order.expiryDays) > 0 &&
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
      const amountInFloat = parseFloat(order.amountIn);
      if (isNaN(amountInFloat) || amountInFloat <= 0) {
        throw new Error('Invalid amount to sell.');
      }
      const amountInWei = BigInt(Math.floor(amountInFloat * 1e9));

      const minAmountOut = order.minAmountOut
        ? BigInt(Math.floor(parseFloat(order.minAmountOut) * 1e9))
        : BigInt(0);

      // Convert limit price to Q64.96 format
      const limitPrice = priceToQ6496(parseFloat(order.limitPrice));

      // Order type: 0 = BUY, 1 = SELL
      const orderType = order.orderType === 'BUY' ? BigInt(0) : BigInt(1);

      // Expiry in seconds
      const expiryDays = parseInt(order.expiryDays);
      const expiry = BigInt(expiryDays * 24 * 60 * 60); // Convert days to seconds

      let coinsToSend: Mas | undefined = undefined;

      // Check if tokenIn is NATIVE_MAS
      if (order.tokenIn.address === NATIVE_MAS.address) {
        coinsToSend = Mas.fromMas(amountInWei);
        // No allowance needed for native MAS, it's sent directly
      } else {
        // Perform allowance check for ERC-20 like tokens
        const allowance = await tokenInHook.allowance(userAddress, LIMIT_ORDER_MANAGER_ADDRESS);
        if (allowance === null || allowance < amountInWei) {
          setError(`Insufficient allowance for ${order.tokenIn.symbol}. Please approve the Limit Order Manager to spend your tokens.`);
          setIsLoading(false);
          // TODO: Add an approval step here
          return;
        }
      }

      // Create order
      const orderId = await createLimitOrder(
        order.tokenIn.address,
        order.tokenOut.address,
        amountInWei,
        minAmountOut,
        limitPrice,
        orderType,
        expiry,
        coinsToSend
      );

      if (orderId) {
        setSuccess(
          `Limit order #${orderId} created successfully! ` +
          `${order.orderType} ${order.amountIn} ${order.tokenIn.symbol} for ${order.tokenOut.symbol} ` +
          `at price ${order.limitPrice}. Bot will execute when conditions match.`
        );

        // Refresh user orders
        await fetchUserOrders();

        // Reset form
        setTimeout(() => {
          setOrder({
            tokenIn: null,
            tokenOut: null,
            amountIn: '',
            minAmountOut: '',
            limitPrice: '',
            orderType: 'BUY',
            expiryDays: '1',
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
    if (!confirm(`Are you sure you want to cancel order #${orderId}? Tokens will be refunded.`)) {
      return;
    }

    try {
      const success = await cancelLimitOrder(BigInt(orderId));
      if (success) {
        setSuccess(`Order #${orderId} cancelled successfully. Tokens refunded.`);
        await fetchUserOrders();
      } else {
        setError(contractError || 'Failed to cancel order');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel order');
    }
  };

  const orderTypeInfo = {
    BUY: {
      description: 'Buy tokenOut with tokenIn at or below the limit price',
      icon: '📈',
    },
    SELL: {
      description: 'Sell tokenIn for tokenOut at or above the limit price',
      icon: '📉',
    },
  };

  return (
    <div className="limit-order-container">
      <div className="limit-order-layout">
        <div className="limit-order-main">
          {/* Header */}
          <div className="limit-order-header">
            <button className="btn-back" onClick={onBackClick}>
              ← Back
            </button>
            <div>
              <h1>Create Limit Order</h1>
              <p>Set your desired price and let the bot execute when conditions are met</p>
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
                <span className="bot-label">Pending Orders</span>
                <span className="bot-value">{pendingCount}</span>
              </div>
            </div>
            <div className="bot-status-item">
              <Target className="bot-icon" size={20} />
              <div>
                <span className="bot-label">Filled Orders</span>
                <span className="bot-value">{stats.filledOrders}</span>
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
          <div className="limit-order-form">
            {/* Order Type Selection */}
            <div className="form-section">
              <label className="form-label">Order Type</label>
              <div className="order-type-selector">
                {(['BUY', 'SELL'] as const).map((type) => (
                  <button
                    key={type}
                    className={`order-type-btn ${order.orderType === type ? 'active' : ''}`}
                    onClick={() => setOrder(prev => ({ ...prev, orderType: type }))}
                  >
                    <span className="type-icon">{orderTypeInfo[type].icon}</span>
                    <span className="type-label">{type}</span>
                  </button>
                ))}
              </div>
              <p className="type-description">{orderTypeInfo[order.orderType].description}</p>
            </div>

            {/* Token Selection */}
            <div className="form-section">
              <label className="form-label">Token Pair</label>

              {/* Token In */}
              <div className="token-input-wrapper">
                <div className="token-selector-container">
                  <label className="input-sublabel">
                    {order.orderType === 'BUY' ? 'Pay With' : 'Sell'}
                  </label>
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
                  <label className="input-sublabel">
                    {order.orderType === 'BUY' ? 'Buy' : 'Receive'}
                  </label>
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

            {/* Amount Inputs */}
            <div className="form-section">
              <label className="form-label">Order Details</label>

              <div className="amount-group">
                <div className="amount-input-wrapper">
                  <label className="input-label">Amount {order.orderType === 'BUY' ? 'to Pay' : 'to Sell'}</label>
                  <div className="input-with-unit">
                    <input
                      type="number"
                      placeholder="Enter amount"
                      value={order.amountIn}
                      onChange={(e) => setOrder(prev => ({ ...prev, amountIn: e.target.value }))}
                      className="amount-input"
                      step="0.01"
                      min="0"
                    />
                    <span className="unit">{order.tokenIn?.symbol || 'Token'}</span>
                  </div>
                </div>

                <div className="amount-input-wrapper">
                  <label className="input-label">Minimum to Receive</label>
                  <div className="input-with-unit">
                    <input
                      type="number"
                      placeholder="Optional (auto-calculated)"
                      value={order.minAmountOut}
                      onChange={(e) => setOrder(prev => ({ ...prev, minAmountOut: e.target.value }))}
                      className="amount-input"
                      step="0.01"
                      min="0"
                    />
                    <span className="unit">{order.tokenOut?.symbol || 'Token'}</span>
                  </div>
                  {order.amountIn && order.limitPrice && !order.minAmountOut && (
                    <div className="calculated-hint">
                      Expected: ~{calculateExpectedOutput()} {order.tokenOut?.symbol}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Price and Expiry */}
            <div className="form-section">
              <label className="form-label">Execution Settings</label>

              <div className="settings-group">
                <div className="setting-input">
                  <label className="setting-label">
                    <DollarSign size={16} />
                    Limit Price
                  </label>
                  <input
                    type="number"
                    placeholder="0.0000"
                    value={order.limitPrice}
                    onChange={(e) => setOrder(prev => ({ ...prev, limitPrice: e.target.value }))}
                    className="setting-value"
                    step="0.0001"
                    min="0"
                  />
                  <span className="setting-unit">{order.tokenOut?.symbol}/{order.tokenIn?.symbol}</span>
                  <div className="setting-hint">
                    {order.orderType === 'BUY'
                      ? 'Execute when price ≤ limit'
                      : 'Execute when price ≥ limit'}
                  </div>
                </div>

                <div className="setting-input">
                  <label className="setting-label">
                    <Clock size={16} />
                    Expiry
                  </label>
                  <div className="expiry-inputs">
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={order.expiryDays}
                      onChange={(e) => setOrder(prev => ({ ...prev, expiryDays: e.target.value }))}
                      className="expiry-days"
                    />
                    <span className="expiry-label">days</span>
                  </div>
                  <span className="expiry-date">{calculateExpiryTime()}</span>
                </div>
              </div>
            </div>

            {/* Summary Section */}
            <div className="summary-section">
              <h3 className="summary-title">Order Summary</h3>

              <div className="summary-row">
                <span>Type</span>
                <span className={`summary-value ${order.orderType.toLowerCase()}`}>
                  {order.orderType}
                </span>
              </div>

              {order.tokenIn && (
                <div className="summary-row">
                  <span>{order.orderType === 'BUY' ? 'Pay' : 'Sell'}</span>
                  <span className="summary-value">
                    {order.amountIn || '0'} {order.tokenIn.symbol}
                  </span>
                </div>
              )}

              {order.tokenOut && (
                <div className="summary-row">
                  <span>{order.orderType === 'BUY' ? 'Buy at least' : 'Receive at least'}</span>
                  <span className="summary-value">
                    {order.minAmountOut || calculateExpectedOutput()} {order.tokenOut.symbol}
                  </span>
                </div>
              )}

              {order.limitPrice && (
                <div className="summary-row">
                  <span>Limit Price</span>
                  <span className="summary-value summary-highlight">{order.limitPrice}</span>
                </div>
              )}

              {order.expiryDays && (
                <div className="summary-row">
                  <span>Expires</span>
                  <span className="summary-value">{calculateExpiryTime()}</span>
                </div>
              )}

              {order.balance !== null && order.amountIn && (
                <div className="summary-row">
                  <span>Balance Check</span>
                  <span className={`summary-value ${Number(order.amountIn) <= Number(order.balance) / 1e9 ? 'valid' : 'invalid'}`}>
                    {Number(order.amountIn) <= Number(order.balance) / 1e9 ? '✅ Sufficient' : '❌ Insufficient'}
                  </span>
                </div>
              )}
            </div>

            {/* Info Box */}
            <div className="info-box">
              <AlertCircle size={18} />
              <div>
                <p>
                  <strong>How it works:</strong> Your limit order will be monitored by the autonomous execution bot (currently at {botExecutionCount} executions).
                  When market conditions match your specified limit price, the order will be executed automatically.
                  You can cancel anytime before execution to receive a full refund.
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
                        <Zap size={16} />
                        Create Limit Order
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

        {/* Sidebar - User Orders */}
        <div className="limit-order-sidebar">
          {/* Stats Card */}
          <div className="stats-card">
            <h3 className="card-title">Order Statistics</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">Total Orders</span>
                <span className="stat-value">{stats.totalOrders}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Pending</span>
                <span className="stat-value stat-pending">{stats.pendingOrders}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Filled</span>
                <span className="stat-value stat-filled">{stats.filledOrders}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Cancelled</span>
                <span className="stat-value stat-cancelled">{stats.cancelledOrders}</span>
              </div>
            </div>
          </div>

          {/* User Orders Card */}
          <div className="orders-card">
            <h3 className="orders-card-title">Your Orders ({userOrders.length})</h3>
            {ordersLoading ? (
              <div className="orders-loading">
                <p>Loading orders...</p>
              </div>
            ) : userOrders.length === 0 ? (
              <div className="orders-empty">
                <p>No orders yet</p>
                <p className="orders-empty-subtitle">Create your first limit order to get started</p>
              </div>
            ) : (
              <div className="orders-list">
                {userOrders.map((userOrder) => {
                  const status = getOrderStatus(userOrder);
                  const orderTypeLabel = getOrderTypeLabel(userOrder.orderType);
                  const expiryDate = calculateExpiryDate(userOrder.createdAt, userOrder.expiry);
                  const expired = isOrderExpired(userOrder);

                  return (
                    <div key={userOrder.orderId} className="order-item">
                      <div className="order-header">
                        <span className="order-id">#{userOrder.orderId}</span>
                        <span className={`order-type-badge ${orderTypeLabel.toLowerCase()}`}>
                          {orderTypeLabel}
                        </span>
                        <span className={`order-status ${status.toLowerCase()}`}>
                          {status}
                        </span>
                      </div>
                      <div className="order-details">
                        <div className="order-detail-row">
                          <span className="detail-label">Amount</span>
                          <span className="detail-value">{formatTokenAmount(userOrder.amountIn)}</span>
                        </div>
                        <div className="order-detail-row">
                          <span className="detail-label">Limit Price</span>
                          <span className="detail-value">{formatPriceFromQ6496(userOrder.limitPrice)}</span>
                        </div>
                        <div className="order-detail-row">
                          <span className="detail-label">Min Receive</span>
                          <span className="detail-value">{formatTokenAmount(userOrder.minAmountOut)}</span>
                        </div>
                        {expiryDate && (
                          <div className="order-detail-row">
                            <span className="detail-label">Expires</span>
                            <span className="detail-value">{expiryDate.toLocaleDateString()}</span>
                          </div>
                        )}
                        {status === 'PENDING' && !expired && (
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

export default LimitOrder;
