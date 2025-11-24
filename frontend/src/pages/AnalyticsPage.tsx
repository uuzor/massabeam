/**
 * Professional Analytics Page
 * Display DEX statistics, charts, and metrics
 */

import React, { useState } from 'react';
import { Card, Divider } from '../components';
import './AnalyticsPage.css';

interface MetricData {
  label: string;
  value: string;
  change: string;
  isPositive: boolean;
}

export const AnalyticsPage: React.FC = () => {
  const [timeframe, setTimeframe] = useState<'24h' | '7d' | '30d' | 'all'>('24h');

  // Mock data - replace with actual contract queries
  const metrics: MetricData[] = [
    { label: 'Total Value Locked', value: '$1,234,567', change: '+12.5%', isPositive: true },
    { label: 'Volume 24h', value: '$234,567', change: '+8.2%', isPositive: true },
    { label: 'Fees 24h', value: '$3,456', change: '+5.1%', isPositive: true },
    { label: 'Active Pools', value: '12', change: '+2', isPositive: true },
  ];

  const topPools = [
    { pair: 'MAS/USDC', tvl: '$500,000', volume: '$150,000', apr: '24.5%' },
    { pair: 'MAS/WETH', tvl: '$350,000', volume: '$80,000', apr: '18.2%' },
    { pair: 'USDC/WETH', tvl: '$200,000', volume: '$120,000', apr: '32.1%' },
  ];

  return (
    <div className="analytics-page">
      <div className="analytics-container">
        {/* Header */}
        <div className="analytics-header">
          <div>
            <h1 className="analytics-title">Analytics</h1>
            <p className="analytics-description">
              Real-time insights and performance metrics for MassaBeam DEX
            </p>
          </div>

          <div className="timeframe-selector">
            {(['24h', '7d', '30d', 'all'] as const).map((tf) => (
              <button
                key={tf}
                className={`timeframe-btn ${timeframe === tf ? 'active' : ''}`}
                onClick={() => setTimeframe(tf)}
              >
                {tf === 'all' ? 'All Time' : tf.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="metrics-grid">
          {metrics.map((metric, index) => (
            <Card key={index} className="metric-card">
              <div className="metric-label">{metric.label}</div>
              <div className="metric-value">{metric.value}</div>
              <div className={`metric-change ${metric.isPositive ? 'positive' : 'negative'}`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  {metric.isPositive ? (
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                  ) : (
                    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
                  )}
                  <polyline points={metric.isPositive ? "17 6 23 6 23 12" : "17 18 23 18 23 12"} />
                </svg>
                {metric.change}
              </div>
            </Card>
          ))}
        </div>

        {/* Charts Section */}
        <div className="charts-section">
          <Card className="chart-card">
            <div className="chart-header">
              <h2>Volume</h2>
              <div className="chart-legend">
                <span className="legend-item">
                  <span className="legend-dot" style={{ background: '#171717' }}></span>
                  Trading Volume
                </span>
              </div>
            </div>
            <Divider spacing="md" />
            <div className="chart-placeholder">
              <div className="chart-bars">
                {[40, 65, 45, 80, 55, 70, 60, 85, 50, 75, 90, 70].map((height, i) => (
                  <div
                    key={i}
                    className="chart-bar"
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
              <div className="chart-labels">
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
                <span>Sun</span>
              </div>
            </div>
          </Card>

          <Card className="chart-card">
            <div className="chart-header">
              <h2>Total Value Locked</h2>
              <div className="chart-legend">
                <span className="legend-item">
                  <span className="legend-dot" style={{ background: '#171717' }}></span>
                  TVL
                </span>
              </div>
            </div>
            <Divider spacing="md" />
            <div className="chart-placeholder">
              <div className="line-chart">
                <svg viewBox="0 0 300 100" className="chart-svg">
                  <polyline
                    points="0,80 25,60 50,65 75,45 100,50 125,35 150,40 175,25 200,30 225,20 250,25 275,15 300,20"
                    fill="none"
                    stroke="#171717"
                    strokeWidth="2"
                  />
                  <polyline
                    points="0,80 25,60 50,65 75,45 100,50 125,35 150,40 175,25 200,30 225,20 250,25 275,15 300,20 300,100 0,100"
                    fill="url(#gradient)"
                    opacity="0.1"
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#171717" />
                      <stop offset="100%" stopColor="#171717" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
          </Card>
        </div>

        {/* Top Pools */}
        <Card>
          <div className="section-header">
            <h2>Top Pools</h2>
            <a href="#" className="view-all-link">
              View All →
            </a>
          </div>
          <Divider spacing="md" />
          <div className="pools-table">
            <div className="table-header">
              <div className="table-cell">Pool</div>
              <div className="table-cell">TVL</div>
              <div className="table-cell">Volume 24h</div>
              <div className="table-cell">APR</div>
            </div>
            {topPools.map((pool, index) => (
              <div key={index} className="table-row">
                <div className="table-cell">
                  <div className="pool-pair">
                    <div className="pool-icons">
                      <div className="token-icon">💎</div>
                      <div className="token-icon">💰</div>
                    </div>
                    <span className="pool-name">{pool.pair}</span>
                  </div>
                </div>
                <div className="table-cell">{pool.tvl}</div>
                <div className="table-cell">{pool.volume}</div>
                <div className="table-cell">
                  <span className="apr-value">{pool.apr}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Additional Stats */}
        <div className="stats-grid">
          <Card>
            <div className="stat-item">
              <div className="stat-icon">💱</div>
              <div className="stat-content">
                <div className="stat-label">Total Swaps</div>
                <div className="stat-value">12,345</div>
                <div className="stat-change positive">+234 today</div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="stat-item">
              <div className="stat-icon">👥</div>
              <div className="stat-content">
                <div className="stat-label">Unique Users</div>
                <div className="stat-value">1,234</div>
                <div className="stat-change positive">+45 today</div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="stat-item">
              <div className="stat-icon">📊</div>
              <div className="stat-content">
                <div className="stat-label">Active Orders</div>
                <div className="stat-value">567</div>
                <div className="stat-change positive">+23 today</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
