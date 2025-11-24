/**
 * Create Pool Component
 * Interface for creating new liquidity pools
 */

import { useState } from 'react';
import { useFactory } from '../../hooks/useFactory';
import { FEE_TIERS, TOKENS, type FeeTier } from '../../utils/contracts';
import './CreatePool.css';

export function CreatePool() {
  const [tokenA, setTokenA] = useState('');
  const [tokenB, setTokenB] = useState('');
  const [selectedFee, setSelectedFee] = useState<FeeTier>('LOW');
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState('');

  const { createPool, isPoolExist, loading } = useFactory();

  const handleCreatePool = async () => {
    setMessage('');

    // Validation
    if (!tokenA || !tokenB) {
      setMessage('Please select both tokens');
      return;
    }

    if (tokenA === tokenB) {
      setMessage('Tokens must be different');
      return;
    }

    setCreating(true);

    try {
      // Check if pool already exists
      const exists = await isPoolExist(
        tokenA,
        tokenB,
        FEE_TIERS[selectedFee].fee
      );

      if (exists) {
        setMessage('Pool already exists for this token pair and fee tier');
        setCreating(false);
        return;
      }

      // Create pool
      await createPool(tokenA, tokenB, FEE_TIERS[selectedFee].fee);

      setMessage('Pool created successfully! 🎉');

      // Reset form
      setTimeout(() => {
        setTokenA('');
        setTokenB('');
        setMessage('');
      }, 3000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create pool';
      setMessage(`Error: ${errorMsg}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="create-pool-container">
      <div className="create-pool-card">
        <h2 className="create-pool-title">
          <span className="pool-icon">🏊</span>
          Create New Pool
        </h2>

        <p className="create-pool-description">
          Create a liquidity pool for any token pair. Choose a fee tier based on expected volatility.
        </p>

        {/* Token A Selection */}
        <div className="token-select-section">
          <label className="token-label">Token A</label>
          <select
            className="token-select"
            value={tokenA}
            onChange={(e) => setTokenA(e.target.value)}
            disabled={creating}
          >
            <option value="">Select Token</option>
            {Object.entries(TOKENS).map(([key, token]) => (
              <option key={key} value={token.address}>
                {token.symbol} - {token.name}
              </option>
            ))}
          </select>
        </div>

        {/* Swap Icon */}
        <div className="swap-icon-container">
          <span className="swap-icon">⇄</span>
        </div>

        {/* Token B Selection */}
        <div className="token-select-section">
          <label className="token-label">Token B</label>
          <select
            className="token-select"
            value={tokenB}
            onChange={(e) => setTokenB(e.target.value)}
            disabled={creating}
          >
            <option value="">Select Token</option>
            {Object.entries(TOKENS).map(([key, token]) => (
              <option key={key} value={token.address}>
                {token.symbol} - {token.name}
              </option>
            ))}
          </select>
        </div>

        {/* Fee Tier Selection */}
        <div className="fee-tier-section">
          <label className="token-label">Fee Tier</label>
          <div className="fee-tier-grid">
            {(Object.keys(FEE_TIERS) as FeeTier[]).map((tier) => (
              <button
                key={tier}
                className={`fee-tier-button ${selectedFee === tier ? 'selected' : ''}`}
                onClick={() => setSelectedFee(tier)}
                disabled={creating}
              >
                <div className="fee-tier-label">{FEE_TIERS[tier].label}</div>
                <div className="fee-tier-sublabel">
                  {tier === 'LOWEST' && 'Best for stable pairs'}
                  {tier === 'LOW' && 'Best for most pairs'}
                  {tier === 'MEDIUM' && 'Best for volatile pairs'}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Create Button */}
        <button
          className="create-pool-button"
          onClick={handleCreatePool}
          disabled={creating || loading || !tokenA || !tokenB}
        >
          {creating ? 'Creating Pool...' : 'Create Pool'}
        </button>

        {/* Message Display */}
        {message && (
          <div className={`create-pool-message ${message.includes('Error') ? 'error' : 'success'}`}>
            {message}
          </div>
        )}

        {/* Info Box */}
        <div className="info-box">
          <h4>💡 Pool Creation Tips</h4>
          <ul>
            <li>Creating a pool is permissionless - anyone can create any pair</li>
            <li>Choose fee tier based on expected trading volatility</li>
            <li>0.05% - Stable pairs (USDC/USDT)</li>
            <li>0.3% - Standard pairs (WMAS/USDC)</li>
            <li>1% - Exotic/volatile pairs</li>
            <li>After creation, you'll need to add initial liquidity</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
