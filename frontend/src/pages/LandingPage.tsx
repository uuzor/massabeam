/**
 * Professional Landing Page
 * Entry point for MassaBeam DEX
 */

import React from 'react';
import { Button, Card } from '../components';
import './LandingPage.css';

interface LandingPageProps {
  onConnectWallet: () => void;
  onNavigate: (page: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onConnectWallet, onNavigate }) => {
  const stats = [
    { label: 'Total Value Locked', value: '$1.2M+' },
    { label: 'Daily Volume', value: '$234K+' },
    { label: 'Active Pools', value: '12' },
    { label: 'Total Swaps', value: '12.3K+' },
  ];

  const features = [
    {
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
      title: 'Concentrated Liquidity',
      description:
        'Provide liquidity within specific price ranges for up to 4000x capital efficiency compared to traditional AMMs.',
    },
    {
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <line x1="12" y1="5" x2="12" y2="19" />
          <polyline points="5 12 12 5 19 12" />
        </svg>
      ),
      title: 'Automated Orders',
      description:
        'Set limit orders, DCA strategies, and grid trading bots that execute automatically without external keepers.',
    },
    {
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M12 2v6M12 18v4M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M2 12h6M18 12h4M4.93 19.07l4.24-4.24M14.83 9.17l4.24-4.24" />
        </svg>
      ),
      title: 'Low Fees',
      description: 'Trade with minimal fees (0.01%, 0.05%, 0.3%, 1%) and earn rewards as a liquidity provider.',
    },
    {
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      ),
      title: 'Non-Custodial',
      description: 'Your keys, your crypto. All trades execute through audited smart contracts on Massa blockchain.',
    },
  ];

  const howItWorks = [
    {
      number: '1',
      title: 'Connect Wallet',
      description: 'Connect your Massa wallet to start trading and providing liquidity.',
    },
    {
      number: '2',
      title: 'Choose Your Strategy',
      description: 'Swap tokens instantly, provide liquidity, or set up automated trading orders.',
    },
    {
      number: '3',
      title: 'Earn Rewards',
      description: 'Collect trading fees as a liquidity provider and profit from automated strategies.',
    },
  ];

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-badge">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Powered by Massa Blockchain
          </div>
          <h1 className="hero-title">
            The Most Advanced DEX
            <br />
            on Massa
          </h1>
          <p className="hero-description">
            Trade, earn, and automate with concentrated liquidity pools, limit orders, DCA strategies, and grid
            trading—all in one professional platform.
          </p>
          <div className="hero-actions">
            <Button size="lg" onClick={onConnectWallet}>
              Launch App
            </Button>
            <Button size="lg" variant="secondary" onClick={() => onNavigate('analytics')}>
              View Analytics
            </Button>
          </div>

          {/* Stats Bar */}
          <div className="stats-bar">
            {stats.map((stat, index) => (
              <div key={index} className="stat-item">
                <div className="stat-value">{stat.value}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="section-content">
          <div className="section-header-center">
            <h2 className="section-title">Why Choose MassaBeam</h2>
            <p className="section-description">
              Built with cutting-edge technology for traders who demand the best
            </p>
          </div>

          <div className="features-grid">
            {features.map((feature, index) => (
              <Card key={index} className="feature-card">
                <div className="feature-icon">{feature.icon}</div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works-section">
        <div className="section-content">
          <div className="section-header-center">
            <h2 className="section-title">How It Works</h2>
            <p className="section-description">Get started in three simple steps</p>
          </div>

          <div className="steps-container">
            {howItWorks.map((step, index) => (
              <div key={index} className="step-item">
                <div className="step-number">{step.number}</div>
                <h3 className="step-title">{step.title}</h3>
                <p className="step-description">{step.description}</p>
                {index < howItWorks.length - 1 && (
                  <svg className="step-arrow" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <Card className="cta-card">
          <div className="cta-content">
            <h2 className="cta-title">Ready to Start Trading?</h2>
            <p className="cta-description">
              Join thousands of traders on Massa's most advanced decentralized exchange
            </p>
            <div className="cta-actions">
              <Button size="lg" onClick={onConnectWallet}>
                Connect Wallet
              </Button>
              <Button size="lg" variant="ghost" onClick={() => onNavigate('pools')}>
                Explore Pools →
              </Button>
            </div>
          </div>
        </Card>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="footer-logo">MassaBeam</div>
            <p className="footer-tagline">The future of decentralized trading on Massa</p>
          </div>

          <div className="footer-links">
            <div className="footer-column">
              <h4>Product</h4>
              <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('swap'); }}>Swap</a>
              <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('pools'); }}>Pools</a>
              <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('orders'); }}>Orders</a>
              <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('analytics'); }}>Analytics</a>
            </div>

            <div className="footer-column">
              <h4>Resources</h4>
              <a href="https://docs.massa.net" target="_blank" rel="noopener noreferrer">Massa Docs</a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer">GitHub</a>
              <a href="#" onClick={(e) => e.preventDefault()}>Whitepaper</a>
              <a href="#" onClick={(e) => e.preventDefault()}>Audits</a>
            </div>

            <div className="footer-column">
              <h4>Community</h4>
              <a href="https://discord.gg/massa" target="_blank" rel="noopener noreferrer">Discord</a>
              <a href="https://twitter.com/MassaLabs" target="_blank" rel="noopener noreferrer">Twitter</a>
              <a href="https://t.me/massanetwork" target="_blank" rel="noopener noreferrer">Telegram</a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© 2024 MassaBeam. All rights reserved.</p>
          <div className="footer-bottom-links">
            <a href="#" onClick={(e) => e.preventDefault()}>Terms</a>
            <a href="#" onClick={(e) => e.preventDefault()}>Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
