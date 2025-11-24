/**
 * Pool Card Component
 * Displays pool information and stats
 */

import React from 'react';
import { Pool } from '../../types';
import { formatTokenAmount, formatUSD, formatPercentage } from '../../utils/formatting';
import { FEE_TIERS, FeeTier } from '../../utils/contracts';
import './PoolCard.css';

interface PoolCardProps {
  pool: Pool;
  onClick?: () => void;
}

export function PoolCard({ pool, onClick }: PoolCardProps) {
  // Get fee tier info
  const feeTierKey = Object.keys(FEE_TIERS).find(
    key => FEE_TIERS[key as FeeTier].fee === pool.fee
  ) as FeeTier | undefined;

  const feeTierLabel = feeTierKey ? FEE_TIERS[feeTierKey].label : `${pool.fee / 10000}%`;

  // Calculate APR (simplified - in production use actual fee earnings)
  const estimatedAPR = pool.volumeUSD && pool.tvlUSD
    ? ((pool.volumeUSD * (pool.fee / 1000000)) / pool.tvlUSD) * 365 * 100
    : 0;

  // Price change (simplified)
  const priceChange = 0; // TODO: Calculate from historical data

  return (
    <div className="pool-card" onClick={onClick}>
      <div className="pool-card-header">
        <div className="pool-tokens">
          <div className="token-pair">
            <span className="token-symbol">{pool.token0.symbol}</span>
            <span className="token-separator">/</span>
            <span className="token-symbol">{pool.token1.symbol}</span>
          </div>
          <div className="fee-badge">{feeTierLabel}</div>
        </div>

        <div className="pool-price">
          <div className="current-price">
            {pool.token0Price.toFixed(6)}
          </div>
          <div className="price-label">
            {pool.token1.symbol} per {pool.token0.symbol}
          </div>
        </div>
      </div>

      <div className="pool-stats">
        <div className="stat-item">
          <div className="stat-label">TVL</div>
          <div className="stat-value">
            {pool.tvlUSD ? formatUSD(pool.tvlUSD) : '-'}
          </div>
        </div>

        <div className="stat-item">
          <div className="stat-label">Volume 24h</div>
          <div className="stat-value">
            {pool.volumeUSD ? formatUSD(pool.volumeUSD) : '-'}
          </div>
        </div>

        <div className="stat-item">
          <div className="stat-label">Liquidity</div>
          <div className="stat-value">
            {formatTokenAmount(pool.liquidity, 18, 2)}
          </div>
        </div>

        <div className="stat-item">
          <div className="stat-label">APR</div>
          <div className="stat-value apr">
            {estimatedAPR > 0 ? formatPercentage(estimatedAPR) : '-'}
          </div>
        </div>
      </div>

      <div className="pool-card-footer">
        <div className="pool-tick-info">
          <span className="tick-label">Current Tick:</span>
          <span className="tick-value">{pool.tick}</span>
        </div>

        {onClick && (
          <button className="view-pool-button">
            View Pool →
          </button>
        )}
      </div>
    </div>
  );
}
