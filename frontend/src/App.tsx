import React, { useState, useEffect } from 'react';
import {
  Code,
  ChevronRight,
  Zap
} from 'lucide-react';
import './App.css';
import { Navbar } from './components/Navbar';
import PoolMint from './pages/PoolMint';
import { Pools } from './pages/Pools';
import { AddLiquidity } from './pages/AddLiquidity';
import { RemoveLiquidity } from './pages/RemoveLiquidity';
import { Swap } from './pages/Swap';
import { LimitOrder } from './pages/LimitOrder';
import { RecurringOrder } from './pages/RecurringOrder';
import { GridOrder } from './pages/GridOrder';
import { useWallet } from './hooks/useWallet';

type Page = 'landing' | 'mint' | 'swap' | 'pools' | 'liquidity' | 'remove-liquidity' | 'limit-order' | 'recurring-order' | 'grid-order' | 'orders';

const MassaBeamApp = () => {
  const [activePage, setActivePage] = useState<Page>('landing');
  const { userAddress, isConnected } = useWallet();

  useEffect(() => {
    if (isConnected && userAddress) {
      setActivePage('swap');
    }
  }, [isConnected, userAddress]);

  // Show landing page if not connected
  if (activePage === 'landing' && !isConnected) {
    return <LandingPage setActivePage={setActivePage} />;
  }

  return (
    <div className="app">
      <Navbar activePage={activePage} setActivePage={setActivePage} />

      <div className="app-main">
        <div className="page-content">
          {activePage === 'mint' && <PoolMint />}
          {activePage === 'swap' && <Swap onBackClick={() => setActivePage('pools')} />}
          {activePage === 'pools' && (
            <Pools
              onCreateClick={() => setActivePage('swap')}
              onAddLiquidityClick={() => setActivePage('liquidity')}
              onRemoveLiquidityClick={() => setActivePage('remove-liquidity')}
            />
          )}
          {activePage === 'liquidity' && <AddLiquidity onBackClick={() => setActivePage('pools')} />}
          {activePage === 'remove-liquidity' && <RemoveLiquidity onBackClick={() => setActivePage('pools')} />}
          {activePage === 'limit-order' && <LimitOrder onBackClick={() => setActivePage('pools')} />}
          {activePage === 'recurring-order' && <RecurringOrder onBackClick={() => setActivePage('pools')} />}
          {activePage === 'grid-order' && <GridOrder onBackClick={() => setActivePage('pools')} />}
          {activePage === 'orders' && <div className="coming-soon"><h2>📋 Orders</h2><p>Coming soon...</p></div>}
        </div>
      </div>
    </div>
  );
};

// Landing Page Component
function LandingPage({setActivePage}) {
  const { connect, loading, isConnected } = useWallet();

 useEffect(()=>{
  if(isConnected ){
    setActivePage("swap")
  }
 }, [isConnected])
  

  return (
    <div className="landing-page">
      {/* Grid Overlay */}
      <div className="grid-overlay"></div>

      {/* Navigation */}
      <nav className="navbar">
        <div className="container">
          <div className="nav-inner">
            <div className="nav-brand">
              <Zap size={20} />
              <span>Massa DeFi</span>
            </div>
            <div className="nav-links">
              <a href="#features" className="nav-link">Features</a>
              <a href="#stats" className="nav-link">Stats</a>
              <a href="#docs" className="nav-link">Docs</a>
            </div>
            <button
              className="btn-launch"
              onClick={connect}
              disabled={loading}
            >
              {loading ? 'Connecting...' : 'Launch App'}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section section">
        <div className="container">
          <div className="hero-grid">
            {/* Left: Hero Content */}
            <div>
              <div className="status-badge">
                <span className="status-dot"></span>
                <span className="status-text">🚀 Now Live on Massa Buildnet</span>
              </div>

              <h1 className="hero-title">
                <span>Autonomous</span>
                <span className="gradient-text"> DeFi Redefined</span>
              </h1>

              <p className="hero-desc">
                Experience the future of decentralized finance with self-executing limit orders, intelligent DCA strategies, leveraged yield farming, and continuous arbitrage opportunities on the Massa blockchain.
              </p>

              <div className="cta-group">
                <button
                  className="btn btn-primary"
                  onClick={connect}
                  disabled={loading}
                >
                  {loading ? 'Connecting...' : 'Launch Protocol'}
                  <ChevronRight size={16} />
                </button>
                <button className="btn btn-outline">
                  Learn More
                  <Code size={16} />
                </button>
              </div>
            </div>

            {/* Right: Quick Stats Cards */}
            <div className="hero-stats-cards">
              <div className="stat-card">
                <span className="stat-emoji">⚡</span>
                <div className="stat-card-content">
                  <div className="stat-card-label">Zero-Slippage AMM</div>
                  <div className="stat-card-value">$2.4M TVL</div>
                </div>
              </div>
              <div className="stat-card">
                <span className="stat-emoji">🎯</span>
                <div className="stat-card-content">
                  <div className="stat-card-label">Autonomous Orders</div>
                  <div className="stat-card-value">1,247 Active</div>
                </div>
              </div>
              <div className="stat-card">
                <span className="stat-emoji">📈</span>
                <div className="stat-card-content">
                  <div className="stat-card-label">Yield Farming</div>
                  <div className="stat-card-value">45.2% APR</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Revolutionary Features Section */}
      <section id="features" className="section features-bg">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Revolutionary Features</h2>
            <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '16px', marginTop: '8px' }}>
              Built on Massa's unique autonomous smart contract capabilities
            </p>
            <div className="title-underline"></div>
          </div>

          <div className="grid-3">
            {[
              {
                emoji: '🎯',
                title: 'Autonomous Limit Orders',
                description: 'Set limit orders that execute themselves when conditions are met. No need for external keepers or manual intervention.',
                tags: ['Self-executing', 'Gas optimized']
              },
              {
                emoji: '📊',
                title: 'Smart DCA Strategies',
                description: 'Dollar-cost averaging with built-in stop-loss and take-profit mechanisms. Automated execution based on your parameters.',
                tags: ['Stop-loss protection', 'Take-profit automation']
              },
              {
                emoji: '⚡',
                title: 'Leveraged Yield Farming',
                description: 'Amplify your yields with up to 3x leverage. Advanced liquidation protection and insurance fund backing.',
                tags: ['Up to 3x leverage', 'Insurance protected']
              },
              {
                emoji: '🔄',
                title: 'Continuous Arbitrage',
                description: 'Automated arbitrage opportunities across pools with MEV protection and flash loan integration for maximum capital efficiency.',
                tags: ['MEV protected', 'Flash loans enabled']
              },
              {
                emoji: '🛡️',
                title: 'Zero-Slippage Trading',
                description: 'Advanced AMM with concentrated liquidity and dynamic fee adjustment for optimal trading experience.',
                tags: ['Dynamic fees', 'Concentrated liquidity']
              },
              {
                emoji: '🏦',
                title: 'Institutional Grade',
                description: 'Built with enterprise-level security, comprehensive analytics, and professional-grade risk management tools.',
                tags: ['Audited contracts', 'Risk management']
              },
            ].map((feature, idx) => (
              <div key={idx} className="feature-card">
                <div className="card-hover-glow"></div>
                <div style={{ fontSize: '32px', marginBottom: '16px' }}>{feature.emoji}</div>
                <h3 className="card-title">{feature.title}</h3>
                <p className="card-desc">{feature.description}</p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '16px' }}>
                  {feature.tags.map((tag, tidx) => (
                    <span key={tidx} style={{
                      fontSize: '12px',
                      padding: '4px 8px',
                      background: 'rgba(29, 230, 118, 0.15)',
                      color: 'hsl(var(--primary))',
                      borderRadius: '4px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Stats Section */}
      <section className="section">
        <div className="container">
          <div className="stats-grid">
            {[
              { label: 'Total Value Locked', value: '$0' },
              { label: '24h Volume', value: '$0' },
              { label: 'Active Orders', value: '0' },
              { label: 'Total Users', value: '0' },
            ].map((stat, idx) => (
              <div key={idx} className="stat-item">
                <div className="stat-label">{stat.label}</div>
                <div className="stat-value">{stat.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="section features-bg">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">How Autonomous Execution Works</h2>
            <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '16px', marginTop: '8px' }}>
              Powered by Massa's unique autonomous smart contract technology
            </p>
            <div className="title-underline"></div>
          </div>

          <div className="how-it-works-grid">
            {[
              {
                number: '01',
                title: 'Set Your Strategy',
                description: 'Configure your limit orders, DCA parameters, or yield farming positions with your desired conditions and risk parameters.'
              },
              {
                number: '02',
                title: 'Autonomous Monitoring',
                description: 'Massa\'s autonomous smart contracts continuously monitor market conditions, prices, and your strategy parameters without external intervention.'
              },
              {
                number: '03',
                title: 'Automatic Execution',
                description: 'When conditions are met, your strategies execute automatically with optimal timing and gas efficiency, maximizing your returns.'
              },
            ].map((step, idx) => (
              <div key={idx} className="how-it-works-card">
                <div className="how-step-number">{step.number}</div>
                <h3 className="card-title">{step.title}</h3>
                <p className="card-desc">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section">
        <div className="container" style={{ textAlign: 'center', maxWidth: '800px' }}>
          <h2 className="section-title">Ready to Experience Autonomous DeFi?</h2>
          <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '18px', marginBottom: '32px', lineHeight: '1.6' }}>
            Join thousands of users already earning with intelligent automation
          </p>
          <button
            className="btn btn-primary"
            onClick={connect}
            disabled={loading}
            style={{ fontSize: '16px', padding: '18px 40px' }}
          >
            {loading ? 'Connecting...' : 'Launch Protocol'}
            <ChevronRight size={18} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Zap size={18} />
                <span style={{ fontWeight: 700 }}>Massa DeFi</span>
              </div>
              <p className="footer-text">Built on Massa Blockchain</p>
            </div>
            <div className="social-links">
              <a href="#docs" className="social-icon">Documentation</a>
              <a href="#github" className="social-icon">GitHub</a>
              <a href="#discord" className="social-icon">Discord</a>
              <a href="#twitter" className="social-icon">Twitter</a>
            </div>
          </div>
          <div style={{ textAlign: 'center', paddingTop: '24px', borderTop: '1px solid hsl(var(--border))', marginTop: '24px', fontSize: '12px', color: 'hsl(var(--text-disabled))' }}>
            © 2024 Massa DeFi Protocol. Built on Massa Blockchain.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default MassaBeamApp;