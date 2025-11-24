/**
 * Pools Page
 * Main page for pool management - view, create, and add liquidity
 */

import React, { useState } from 'react';
import { PoolList } from '../components/pools/PoolList';
import { CreatePool } from '../components/pools/CreatePool';
import { AddLiquidity } from '../components/pools/AddLiquidity';
import { Pool } from '../types';
import './PoolsPage.css';

type ViewMode = 'list' | 'create' | 'add-liquidity';

export function PoolsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);

  const handlePoolClick = (pool: Pool) => {
    setSelectedPool(pool);
    setViewMode('add-liquidity');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedPool(null);
  };

  return (
    <div className="pools-page">
      {/* Navigation Tabs */}
      <div className="pools-nav">
        <div className="pools-nav-container">
          <button
            className={`nav-tab ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
          >
            <span className="tab-icon">🌊</span>
            Browse Pools
          </button>
          <button
            className={`nav-tab ${viewMode === 'create' ? 'active' : ''}`}
            onClick={() => setViewMode('create')}
          >
            <span className="tab-icon">➕</span>
            Create Pool
          </button>
          <button
            className={`nav-tab ${viewMode === 'add-liquidity' ? 'active' : ''}`}
            onClick={() => setViewMode('add-liquidity')}
          >
            <span className="tab-icon">💧</span>
            Add Liquidity
          </button>
        </div>
      </div>

      {/* Page Content */}
      <div className="pools-content">
        {viewMode === 'list' && <PoolList onPoolClick={handlePoolClick} />}

        {viewMode === 'create' && (
          <div className="pools-section">
            <button className="back-button" onClick={handleBackToList}>
              ← Back to Pools
            </button>
            <CreatePool />
          </div>
        )}

        {viewMode === 'add-liquidity' && (
          <div className="pools-section">
            <button className="back-button" onClick={handleBackToList}>
              ← Back to Pools
            </button>
            {selectedPool ? (
              <AddLiquidity
                poolAddress={selectedPool.address}
                tokenA={selectedPool.token0}
                tokenB={selectedPool.token1}
                fee={selectedPool.fee}
              />
            ) : (
              <AddLiquidity />
            )}
          </div>
        )}
      </div>

      {/* Info Banner */}
      <div className="pools-info-banner">
        <div className="info-banner-content">
          <div className="info-icon">💡</div>
          <div className="info-text">
            <h4>Concentrated Liquidity AMM</h4>
            <p>
              MassaBeam uses concentrated liquidity similar to Uniswap V3. Provide liquidity in
              specific price ranges to maximize capital efficiency and earn more fees.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
