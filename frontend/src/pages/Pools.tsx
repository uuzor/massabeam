import React, { useState, useEffect } from 'react';
import { Plus, Search, TrendingUp, Loader } from 'lucide-react';
import { useFactory } from '../hooks/useFactory';
import { useWallet } from '../hooks/useWallet';
import { FACTORY_ADDRESS } from '../constants/contracts';
import '../styles/Pools.css';

interface PoolData {
  id: string;
  token0: string;
  token1: string;
  fee: string;
  tvl: string;
  volume24h: string;
  apr: string;
}

export const Pools: React.FC<{ onCreateClick: () => void; onAddLiquidityClick?: () => void; onRemoveLiquidityClick?: () => void }> = ({ onCreateClick, onAddLiquidityClick, onRemoveLiquidityClick }) => {
  const { isConnected, provider, userAddress } = useWallet();
  const { getPools } = useFactory(FACTORY_ADDRESS, isConnected, provider, userAddress);

  const [pools, setPools] = useState<PoolData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('tvl');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadPools = async () => {
      if (!isConnected || !provider) return;

      setIsLoading(true);
      try {
        const poolAddresses = await getPools();
        console.log('Pool addresses:', poolAddresses);

        // Fetch metadata for each pool
        const poolsData: PoolData[] = [];
        for (const poolAddress of poolAddresses) {
          try {
            // Parse metadata - using placeholder for now since contract parsing is complex
            const poolDetail: PoolData = {
              id: poolAddress,
              token0: 'Token0',
              token1: 'Token1',
              fee: '0.3%',
              tvl: '$0',
              volume24h: '$0',
              apr: '0%',
            };

            poolsData.push(poolDetail);
          } catch (error) {
            console.error(`Error fetching pool ${poolAddress}:`, error);
          }
        }

        setPools(poolsData);
      } catch (error) {
        console.error('Error loading pools:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPools();
  }, [isConnected, provider, userAddress, getPools]);

  // Filter pools based on search query
  const filteredPools = pools.filter((pool) =>
    pool.token0.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pool.token1.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pool.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort pools
  const sortedPools = [...filteredPools].sort((a, b) => {
    switch (sortBy) {
      case 'tvl':
        return (
          parseFloat(b.tvl?.replace('$', '').replace(',', '') || '0') -
          parseFloat(a.tvl?.replace('$', '').replace(',', '') || '0')
        );
      case 'volume':
        return (
          parseFloat(b.volume24h?.replace('$', '').replace(',', '') || '0') -
          parseFloat(a.volume24h?.replace('$', '').replace(',', '') || '0')
        );
      case 'apr':
        return (
          parseFloat(b.apr?.replace('%', '') || '0') -
          parseFloat(a.apr?.replace('%', '') || '0')
        );
      default:
        return 0;
    }
  });

  return (
    <div className="pools-container">
      <div className="pools-header">
        <div className="pools-title-section">
          <h1>Liquidity Pools</h1>
          <p>Manage and explore all available pools on Massa DeFi</p>
        </div>
        <button className="btn-create-pool" onClick={onCreateClick}>
          <Plus size={18} />
          Create Pool
        </button>
      </div>

      {/* Stats Cards */}
      <div className="pools-stats">
        <div className="stat-card">
          <div className="stat-label">Total Liquidity</div>
          <div className="stat-value">$0</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">24h Volume</div>
          <div className="stat-value">$0</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Pools</div>
          <div className="stat-value">{pools.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg Fee</div>
          <div className="stat-value">0.3%</div>
        </div>
      </div>

      {/* Filters */}
      <div className="pools-filters">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by token name or pool address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="sort-controls">
          <button
            className={`sort-btn ${sortBy === 'tvl' ? 'active' : ''}`}
            onClick={() => setSortBy('tvl')}
          >
            TVL
          </button>
          <button
            className={`sort-btn ${sortBy === 'volume' ? 'active' : ''}`}
            onClick={() => setSortBy('volume')}
          >
            Volume
          </button>
          <button
            className={`sort-btn ${sortBy === 'apr' ? 'active' : ''}`}
            onClick={() => setSortBy('apr')}
          >
            APR
          </button>
        </div>
      </div>

      {/* Pools Table */}
      {isLoading ? (
        <div className="loading-container">
          <Loader size={40} className="spinner" />
          <p>Loading pools...</p>
        </div>
      ) : sortedPools.length === 0 ? (
        <div className="empty-state">
          <TrendingUp size={48} />
          <h3>No Pools Found</h3>
          <p>
            {pools.length === 0
              ? 'No pools created yet. Be the first to create one!'
              : 'No pools match your search criteria.'}
          </p>
          <button className="btn-create-pool" onClick={onCreateClick}>
            <Plus size={18} />
            Create First Pool
          </button>
        </div>
      ) : (
        <div className="pools-table-wrapper">
          <table className="pools-table">
            <thead>
              <tr>
                <th>Pool</th>
                <th>Fee</th>
                <th>TVL</th>
                <th>24h Volume</th>
                <th>APR</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedPools.map((pool) => (
                <PoolRow
                  key={pool.id}
                  pool={pool}
                  onAddLiquidityClick={onAddLiquidityClick}
                  onRemoveLiquidityClick={onRemoveLiquidityClick}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

interface PoolRowProps {
  pool: PoolData;
  onAddLiquidityClick?: () => void;
  onRemoveLiquidityClick?: () => void;
}

const PoolRow: React.FC<PoolRowProps> = ({ pool, onAddLiquidityClick, onRemoveLiquidityClick }) => {
  return (
    <tr className="pool-row">
      <td className="pool-pair">
        <div className="token-pair">
          <span className="token-names">
            {pool.token0} / {pool.token1}
          </span>
          <span className="pool-address">{pool.id.slice(0, 8)}...</span>
        </div>
      </td>
      <td>
        <span className="fee-badge">{pool.fee}</span>
      </td>
      <td>
        <span className="value tvl">{pool.tvl}</span>
      </td>
      <td>
        <span className="value volume">{pool.volume24h}</span>
      </td>
      <td>
        <span className="value apr">{pool.apr}</span>
      </td>
      <td>
        <div className="action-buttons">
          <button
            className="btn-action"
            title="Add Liquidity"
            onClick={onAddLiquidityClick}
          >
            <Plus size={16} />
          </button>
          <button
            className="btn-action"
            title="Remove Liquidity"
            onClick={onRemoveLiquidityClick}
          >
            −
          </button>
        </div>
      </td>
    </tr>
  );
};

export default Pools;
