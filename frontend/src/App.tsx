/**
 * MassaBeam DEX - Main Application
 * A concentrated liquidity DEX on Massa blockchain
 */

import { useState, useEffect } from 'react';
import { web3 } from '@hicaru/bearby.js';
import { PoolsPage } from './dex/pages';
import './App.css';

export default function App() {
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>('');

  // Connect Bearby Wallet
  async function connectWallet() {
    setLoading(true);
    setMessage('');
    try {
      const connected = await web3.wallet.connect();
      if (connected && web3.wallet.account?.base58) {
        setWalletAddress(web3.wallet.account.base58);
        setMessage('Wallet connected successfully!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Connection rejected. Please try again.');
      }
    } catch (error) {
      setMessage('Error: ' + (error instanceof Error ? error.message : String(error)));
    }
    setLoading(false);
  }

  // Disconnect wallet
  function disconnectWallet() {
    setWalletAddress('');
    setMessage('Wallet disconnected');
    setTimeout(() => setMessage(''), 3000);
  }

  // Check if wallet is already connected on mount
  useEffect(() => {
    if (web3.wallet.connected && web3.wallet.account?.base58) {
      setWalletAddress(web3.wallet.account.base58);
    }
  }, []);

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-container">
          <div className="logo-section">
            <div className="logo">⚡</div>
            <div className="brand">
              <h1 className="brand-name">MassaBeam</h1>
              <p className="brand-tagline">Concentrated Liquidity DEX</p>
            </div>
          </div>

          <nav className="nav-links">
            <a href="#pools" className="nav-link active">Pools</a>
            <a href="#swap" className="nav-link">Swap</a>
            <a href="#orders" className="nav-link">Orders</a>
            <a href="#analytics" className="nav-link">Analytics</a>
          </nav>

          <div className="wallet-section">
            {!web3.wallet.installed ? (
              <a
                href="https://chrome.google.com/webstore/detail/bearby/dpkadipdmpddoonoogbbmnhfnbgkmjcc"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                Install Bearby
              </a>
            ) : walletAddress ? (
              <div className="wallet-connected">
                <div className="wallet-address">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </div>
                <button className="btn btn-secondary" onClick={disconnectWallet}>
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                className="btn btn-primary"
                onClick={connectWallet}
                disabled={loading}
              >
                {loading ? 'Connecting...' : 'Connect Wallet'}
              </button>
            )}
          </div>
        </div>

        {message && (
          <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
            {message}
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-container">
          <h2 className="hero-title">
            Trade, Earn, and Build on Massa
          </h2>
          <p className="hero-description">
            Experience concentrated liquidity AMM with automated limit orders, grid trading, and recurring buys.
            Maximize capital efficiency and earn more fees.
          </p>
          <div className="hero-stats">
            <div className="stat-card">
              <div className="stat-value">$0.00</div>
              <div className="stat-label">Total Value Locked</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">$0.00</div>
              <div className="stat-label">24h Volume</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">0</div>
              <div className="stat-label">Active Pools</div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="app-content">
        {walletAddress ? (
          <PoolsPage />
        ) : (
          <div className="connect-prompt">
            <div className="connect-card">
              <div className="connect-icon">🔌</div>
              <h3>Connect Your Wallet</h3>
              <p>Connect your Bearby wallet to start trading and providing liquidity</p>
              {!web3.wallet.installed ? (
                <a
                  href="https://chrome.google.com/webstore/detail/bearby/dpkadipdmpddoonoogbbmnhfnbgkmjcc"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-large btn-primary"
                >
                  Install Bearby Wallet
                </a>
              ) : (
                <button
                  className="btn btn-large btn-primary"
                  onClick={connectWallet}
                  disabled={loading}
                >
                  {loading ? 'Connecting...' : 'Connect Wallet'}
                </button>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-container">
          <div className="footer-section">
            <h4>MassaBeam DEX</h4>
            <p>Built on Massa blockchain</p>
          </div>
          <div className="footer-section">
            <h4>Features</h4>
            <ul>
              <li>Concentrated Liquidity</li>
              <li>Automated Orders</li>
              <li>Grid Trading</li>
              <li>Recurring Buys (DCA)</li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Resources</h4>
            <ul>
              <li><a href="#docs">Documentation</a></li>
              <li><a href="#github">GitHub</a></li>
              <li><a href="#discord">Discord</a></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
