/**
 * Pool List Component
 * Displays a list of all available pools
 */

import React, { useState, useEffect } from 'react';
import { PoolCard } from './PoolCard';
import { Pool } from '../../types';
import { TOKENS } from '../../utils/contracts';
import './PoolList.css';

interface PoolListProps {
  onPoolClick?: (pool: Pool) => void;
}

export function PoolList({ onPoolClick }: PoolListProps) {
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'high-tvl' | 'high-volume'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch pools
  useEffect(() => {
    const fetchPools = async () => {
      setLoading(true);
      try {
        // TODO: Implement actual pool fetching from factory contract
        // For now, using mock data
        const mockPools: Pool[] = [
          {
            address: 'AS1...',
            token0: TOKENS[0], // WMAS
            token1: TOKENS[1], // USDC
            fee: 3000,
            tickSpacing: 60,
            liquidity: '1000000000000000000000',
            sqrtPrice: '79228162514264337593543950336',
            tick: 0,
            token0Price: 10.5,
            token1Price: 0.095,
            volumeUSD: 150000,
            tvlUSD: 500000,
          },
          {
            address: 'AS2...',
            token0: TOKENS[0], // WMAS
            token1: TOKENS[2], // WETH
            fee: 3000,
            tickSpacing: 60,
            liquidity: '500000000000000000000',
            sqrtPrice: '79228162514264337593543950336',
            tick: 100,
            token0Price: 0.005,
            token1Price: 200,
            volumeUSD: 80000,
            tvlUSD: 250000,
          },
          {
            address: 'AS3...',
            token0: TOKENS[1], // USDC
            token1: TOKENS[2], // WETH
            fee: 500,
            tickSpacing: 10,
            liquidity: '750000000000000000000',
            sqrtPrice: '79228162514264337593543950336',
            tick: -50,
            token0Price: 0.0005,
            token1Price: 2000,
            volumeUSD: 200000,
            tvlUSD: 800000,
          },
        ];

        setPools(mockPools);
      } catch (error) {
        console.error('Failed to fetch pools:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPools();
  }, []);

  // Filter pools
  const filteredPools = pools
    .filter((pool) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          pool.token0.symbol.toLowerCase().includes(query) ||
          pool.token0.name.toLowerCase().includes(query) ||
          pool.token1.symbol.toLowerCase().includes(query) ||
          pool.token1.name.toLowerCase().includes(query)
        );
      }
      return true;
    })
    .filter((pool) => {
      // Category filter
      if (filter === 'high-tvl') {
        return (pool.tvlUSD || 0) > 100000;
      }
      if (filter === 'high-volume') {
        return (pool.volumeUSD || 0) > 50000;
      }
      return true;
    })
    .sort((a, b) => {
      // Sort by TVL descending
      return (b.tvlUSD || 0) - (a.tvlUSD || 0);
    });

  return (
    <div className="pool-list-container">
      <div className="pool-list-header">
        <div className="header-left">
          <h2 className="pool-list-title">
            <span className="pool-icon">🌊</span>
            Liquidity Pools
          </h2>
          <p className="pool-list-description">
            Browse all available pools and their stats
          </p>
        </div>

        <div className="pool-count">
          {filteredPools.length} {filteredPools.length === 1 ? 'Pool' : 'Pools'}
        </div>
      </div>

      {/* Search and Filter */}
      <div className="pool-controls">
        <div className="search-box">
          <input
            type="text"
            className="search-input"
            placeholder="Search by token name or symbol..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <span className="search-icon">🔍</span>
        </div>

        <div className="filter-buttons">
          <button
            className={`filter-button ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All Pools
          </button>
          <button
            className={`filter-button ${filter === 'high-tvl' ? 'active' : ''}`}
            onClick={() => setFilter('high-tvl')}
          >
            High TVL
          </button>
          <button
            className={`filter-button ${filter === 'high-volume' ? 'active' : ''}`}
            onClick={() => setFilter('high-volume')}
          >
            High Volume
          </button>
        </div>
      </div>

      {/* Pool Grid */}
      {loading ? (
        <div className="pool-list-loading">
          <div className="loading-spinner"></div>
          <p>Loading pools...</p>
        </div>
      ) : filteredPools.length === 0 ? (
        <div className="pool-list-empty">
          <div className="empty-icon">📭</div>
          <h3>No pools found</h3>
          <p>
            {searchQuery
              ? 'Try adjusting your search query'
              : 'No pools match the selected filter'}
          </p>
        </div>
      ) : (
        <div className="pool-grid">
          {filteredPools.map((pool) => (
            <PoolCard
              key={pool.address}
              pool={pool}
              onClick={() => onPoolClick?.(pool)}
            />
          ))}
        </div>
      )}

      {/* Stats Summary */}
      {!loading && filteredPools.length > 0 && (
        <div className="pool-stats-summary">
          <div className="summary-stat">
            <div className="summary-label">Total TVL</div>
            <div className="summary-value">
              ${filteredPools.reduce((sum, p) => sum + (p.tvlUSD || 0), 0).toLocaleString()}
            </div>
          </div>
          <div className="summary-stat">
            <div className="summary-label">Total Volume 24h</div>
            <div className="summary-value">
              ${filteredPools.reduce((sum, p) => sum + (p.volumeUSD || 0), 0).toLocaleString()}
            </div>
          </div>
          <div className="summary-stat">
            <div className="summary-label">Active Pools</div>
            <div className="summary-value">{filteredPools.length}</div>
          </div>
        </div>
      )}
    </div>
  );
}
