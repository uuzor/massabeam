/**
 * Professional Orders Page
 * Manage limit orders, recurring orders (DCA), and grid trading
 */

import React, { useState } from 'react';
import { Button, Card, Input, Modal, Divider } from '../components';
import './OrdersPage.css';

type OrderTab = 'limit' | 'recurring' | 'grid' | 'my-orders';

interface LimitOrder {
  orderId: string;
  owner: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  limitPrice: string;
  orderType: 'BUY' | 'SELL';
  expiry: number;
  filled: boolean;
  cancelled: boolean;
}

interface RecurringOrder {
  orderId: string;
  owner: string;
  tokenIn: string;
  tokenOut: string;
  amountPerExecution: string;
  intervalPeriods: number;
  totalExecutions: number;
  executedCount: number;
  active: boolean;
}

interface GridOrder {
  gridId: string;
  owner: string;
  tokenIn: string;
  tokenOut: string;
  gridLevels: number;
  lowerPrice: string;
  upperPrice: string;
  amountPerLevel: string;
  active: boolean;
}

export const OrdersPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<OrderTab>('limit');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Mock data - replace with actual contract queries
  const [limitOrders] = useState<LimitOrder[]>([]);
  const [recurringOrders] = useState<RecurringOrder[]>([]);
  const [gridOrders] = useState<GridOrder[]>([]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'limit':
        return <LimitOrdersTab onCreateClick={() => setShowCreateModal(true)} />;
      case 'recurring':
        return <RecurringOrdersTab onCreateClick={() => setShowCreateModal(true)} />;
      case 'grid':
        return <GridOrdersTab onCreateClick={() => setShowCreateModal(true)} />;
      case 'my-orders':
        return <MyOrdersTab />;
      default:
        return null;
    }
  };

  return (
    <div className="orders-page">
      <div className="orders-container">
        {/* Header */}
        <div className="orders-header">
          <div>
            <h1 className="orders-title">Orders</h1>
            <p className="orders-description">
              Automate your trading with limit orders, DCA, and grid strategies
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>Create Order</Button>
        </div>

        {/* Tabs */}
        <div className="orders-tabs">
          <button
            className={`orders-tab ${activeTab === 'limit' ? 'active' : ''}`}
            onClick={() => setActiveTab('limit')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <line x1="12" y1="5" x2="12" y2="19" />
              <polyline points="5 12 12 5 19 12" />
            </svg>
            Limit Orders
          </button>
          <button
            className={`orders-tab ${activeTab === 'recurring' ? 'active' : ''}`}
            onClick={() => setActiveTab('recurring')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            Recurring (DCA)
          </button>
          <button
            className={`orders-tab ${activeTab === 'grid' ? 'active' : ''}`}
            onClick={() => setActiveTab('grid')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            Grid Trading
          </button>
          <button
            className={`orders-tab ${activeTab === 'my-orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('my-orders')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            My Orders
          </button>
        </div>

        {/* Tab Content */}
        <div className="orders-content">{renderTabContent()}</div>
      </div>

      {/* Create Order Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={`Create ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Order`}
        size="md"
      >
        <div className="create-order-content">
          <p>Order creation form will be implemented here.</p>
        </div>
      </Modal>
    </div>
  );
};

/* Tab Components */

const LimitOrdersTab: React.FC<{ onCreateClick: () => void }> = ({ onCreateClick }) => {
  return (
    <div className="order-tab-content">
      <Card>
        <div className="order-info-section">
          <div className="order-info-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <line x1="12" y1="5" x2="12" y2="19" />
              <polyline points="5 12 12 5 19 12" />
            </svg>
          </div>
          <h3>Limit Orders</h3>
          <p>
            Place buy or sell orders that execute automatically when the market reaches your target price.
            Perfect for entering positions at specific price levels.
          </p>
          <div className="order-features">
            <div className="feature-item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Buy below or sell above target price</span>
            </div>
            <div className="feature-item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Set optional expiration time</span>
            </div>
            <div className="feature-item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Automated execution via smart contract</span>
            </div>
          </div>
          <Button fullWidth onClick={onCreateClick}>
            Create Limit Order
          </Button>
        </div>
      </Card>

      <div className="empty-state">
        <div className="empty-icon">📋</div>
        <h3>No Active Limit Orders</h3>
        <p>Create your first limit order to get started</p>
      </div>
    </div>
  );
};

const RecurringOrdersTab: React.FC<{ onCreateClick: () => void }> = ({ onCreateClick }) => {
  return (
    <div className="order-tab-content">
      <Card>
        <div className="order-info-section">
          <div className="order-info-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </div>
          <h3>Recurring Orders (DCA)</h3>
          <p>
            Dollar Cost Average into positions by automatically buying fixed amounts at regular intervals.
            Reduce timing risk and smooth out entry prices.
          </p>
          <div className="order-features">
            <div className="feature-item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Buy at fixed intervals (hourly, daily, weekly)</span>
            </div>
            <div className="feature-item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Set total number of executions</span>
            </div>
            <div className="feature-item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Funds escrowed until completion</span>
            </div>
          </div>
          <Button fullWidth onClick={onCreateClick}>
            Create Recurring Order
          </Button>
        </div>
      </Card>

      <div className="empty-state">
        <div className="empty-icon">🔄</div>
        <h3>No Active Recurring Orders</h3>
        <p>Set up a DCA strategy to automate your investments</p>
      </div>
    </div>
  );
};

const GridOrdersTab: React.FC<{ onCreateClick: () => void }> = ({ onCreateClick }) => {
  return (
    <div className="order-tab-content">
      <Card>
        <div className="order-info-section">
          <div className="order-info-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
          </div>
          <h3>Grid Trading</h3>
          <p>
            Profit from market volatility by placing buy and sell orders at multiple price levels.
            Automatically buy dips and sell rallies within your price range.
          </p>
          <div className="order-features">
            <div className="feature-item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>2-50 grid levels between price range</span>
            </div>
            <div className="feature-item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Bidirectional trading (buy low, sell high)</span>
            </div>
            <div className="feature-item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Automated execution every ~48 seconds</span>
            </div>
          </div>
          <Button fullWidth onClick={onCreateClick}>
            Create Grid Order
          </Button>
        </div>
      </Card>

      <div className="empty-state">
        <div className="empty-icon">📊</div>
        <h3>No Active Grid Orders</h3>
        <p>Create a grid to profit from price volatility</p>
      </div>
    </div>
  );
};

const MyOrdersTab: React.FC = () => {
  return (
    <div className="order-tab-content">
      <div className="my-orders-header">
        <h2>All My Orders</h2>
        <div className="orders-filter">
          <Button variant="secondary" size="sm">
            Active
          </Button>
          <Button variant="ghost" size="sm">
            Completed
          </Button>
          <Button variant="ghost" size="sm">
            Cancelled
          </Button>
        </div>
      </div>

      <div className="empty-state">
        <div className="empty-icon">📭</div>
        <h3>No Orders Yet</h3>
        <p>Create your first order to start automated trading</p>
      </div>
    </div>
  );
};
