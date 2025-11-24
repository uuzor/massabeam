/**
 * MassaBeam DEX - Main Application
 * Professional Vercel-inspired interface
 */

import { useState, useEffect } from 'react';
import { web3 } from '@hicaru/bearby.js';
import { Sidebar, Button } from './components';
import { SwapPage } from './pages/SwapPage';
import { OrdersPage } from './pages/OrdersPage';
import { PoolsPage } from './dex/pages';
import './App.css';

type Page = 'swap' | 'pools' | 'orders' | 'analytics';

export default function App() {
  const [activePage, setActivePage] = useState<Page>('swap');
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Connect Bearby Wallet
  async function connectWallet() {
    setLoading(true);
    try {
      const connected = await web3.wallet.connect();
      if (connected && web3.wallet.account?.base58) {
        setWalletAddress(web3.wallet.account.base58);
      }
    } catch (error) {
      console.error('Wallet connection failed:', error);
    }
    setLoading(false);
  }

  // Disconnect wallet
  function disconnectWallet() {
    setWalletAddress('');
  }

  // Check if wallet is already connected on mount
  useEffect(() => {
    if (web3.wallet.connected && web3.wallet.account?.base58) {
      setWalletAddress(web3.wallet.account.base58);
    }
  }, []);

  const sidebarItems = [
    {
      id: 'swap' as Page,
      label: 'Swap',
      path: '/swap',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <polyline points="17 1 21 5 17 9" />
          <path d="M3 11V9a4 4 0 0 1 4-4h14" />
          <polyline points="7 23 3 19 7 15" />
          <path d="M21 13v2a4 4 0 0 1-4 4H3" />
        </svg>
      ),
    },
    {
      id: 'pools' as Page,
      label: 'Pools',
      path: '/pools',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="6" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      ),
    },
    {
      id: 'orders' as Page,
      label: 'Orders',
      path: '/orders',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      ),
    },
    {
      id: 'analytics' as Page,
      label: 'Analytics',
      path: '/analytics',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      ),
    },
  ];

  const renderPage = () => {
    switch (activePage) {
      case 'swap':
        return <SwapPage />;
      case 'pools':
        return walletAddress ? (
          <PoolsPage />
        ) : (
          <div className="connect-prompt">
            <div className="connect-card">
              <h3>Connect Wallet</h3>
              <p>Connect your Bearby wallet to view and manage pools</p>
            </div>
          </div>
        );
      case 'orders':
        return <OrdersPage />;
      case 'analytics':
        return (
          <div className="coming-soon">
            <h2>Analytics</h2>
            <p>Charts and statistics coming soon</p>
          </div>
        );
      default:
        return <SwapPage />;
    }
  };

  return (
    <div className="app">
      <Sidebar
        items={sidebarItems}
        activeItem={activePage}
        onItemClick={(id) => setActivePage(id as Page)}
        logo={
          <div className="app-logo">
            <span className="logo-icon">⚡</span>
            <span className="logo-text">MassaBeam</span>
          </div>
        }
        footer={
          <div className="wallet-footer">
            {!web3.wallet.installed ? (
              <a
                href="https://chrome.google.com/webstore/detail/bearby/dpkadipdmpddoonoogbbmnhfnbgkmjcc"
                target="_blank"
                rel="noopener noreferrer"
                className="wallet-install-link"
              >
                Install Bearby
              </a>
            ) : walletAddress ? (
              <div className="wallet-connected">
                <div className="wallet-info">
                  <div className="wallet-label">Connected</div>
                  <div className="wallet-address-short">
                    {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                  </div>
                </div>
                <button className="wallet-disconnect-btn" onClick={disconnectWallet}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                </button>
              </div>
            ) : (
              <Button
                fullWidth
                size="sm"
                onClick={connectWallet}
                loading={loading}
              >
                Connect Wallet
              </Button>
            )}
          </div>
        }
      />

      <main className="app-main">{renderPage()}</main>
    </div>
  );
}
