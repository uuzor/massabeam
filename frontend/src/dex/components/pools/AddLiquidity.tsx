/**
 * Add Liquidity Component
 * Interface for adding concentrated liquidity to pools
 */

import React, { useState, useEffect, useMemo } from 'react';
import { usePool } from '../../hooks/usePool';
import { useFactory } from '../../hooks/useFactory';
import { Token, TOKENS, FEE_TIERS, FeeTier } from '../../utils/contracts';
import { formatTokenAmount, parseTokenAmount } from '../../utils/formatting';
import './AddLiquidity.css';

interface AddLiquidityProps {
  poolAddress?: string;
  tokenA?: Token;
  tokenB?: Token;
  fee?: number;
}

export function AddLiquidity({ poolAddress: initialPoolAddress, tokenA: initialTokenA, tokenB: initialTokenB, fee: initialFee }: AddLiquidityProps) {
  // Token selection
  const [tokenA, setTokenA] = useState(initialTokenA?.address || '');
  const [tokenB, setTokenB] = useState(initialTokenB?.address || '');
  const [selectedFee, setSelectedFee] = useState<FeeTier>(initialFee ?
    (Object.keys(FEE_TIERS).find(key => FEE_TIERS[key as FeeTier].fee === initialFee) as FeeTier || 'LOW')
    : 'LOW');

  // Amount inputs
  const [amount0, setAmount0] = useState('');
  const [amount1, setAmount1] = useState('');

  // Price range (ticks)
  const [tickLower, setTickLower] = useState(-887220); // Min tick
  const [tickUpper, setTickUpper] = useState(887220);  // Max tick
  const [priceRangeLower, setPriceRangeLower] = useState('');
  const [priceRangeUpper, setPriceRangeUpper] = useState('');

  // Pool state
  const [poolAddress, setPoolAddress] = useState(initialPoolAddress || '');
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const { isPoolExist } = useFactory();
  const { getPoolState, mint, getPosition, loading, error } = usePool(poolAddress);

  // Fetch pool address when tokens/fee change
  useEffect(() => {
    const fetchPoolAddress = async () => {
      if (!tokenA || !tokenB) return;

      try {
        const exists = await isPoolExist(tokenA, tokenB, FEE_TIERS[selectedFee].fee);
        if (exists) {
          // TODO: Get actual pool address from factory
          // For now, we'll need a getPool function in useFactory
          setMessage({ type: 'info', text: 'Pool found! Ready to add liquidity.' });
        } else {
          setMessage({ type: 'error', text: 'Pool does not exist. Please create it first.' });
        }
      } catch (err: any) {
        setMessage({ type: 'error', text: err.message });
      }
    };

    fetchPoolAddress();
  }, [tokenA, tokenB, selectedFee, isPoolExist]);

  // Get token objects
  const token0 = useMemo(() =>
    TOKENS.find(t => t.address === tokenA),
    [tokenA]
  );
  const token1 = useMemo(() =>
    TOKENS.find(t => t.address === tokenB),
    [tokenB]
  );

  // Calculate tick spacing based on fee tier
  const tickSpacing = FEE_TIERS[selectedFee].tickSpacing;

  // Handle price range inputs
  const handlePriceLowerChange = (value: string) => {
    setPriceRangeLower(value);
    if (value) {
      // Simplified: Convert price to tick
      // In production, use proper sqrt price math
      const price = parseFloat(value);
      const tick = Math.floor(Math.log(price) / Math.log(1.0001));
      const alignedTick = Math.floor(tick / tickSpacing) * tickSpacing;
      setTickLower(alignedTick);
    }
  };

  const handlePriceUpperChange = (value: string) => {
    setPriceRangeUpper(value);
    if (value) {
      const price = parseFloat(value);
      const tick = Math.floor(Math.log(price) / Math.log(1.0001));
      const alignedTick = Math.ceil(tick / tickSpacing) * tickSpacing;
      setTickUpper(alignedTick);
    }
  };

  // Set full range
  const handleFullRange = () => {
    setTickLower(-887220);
    setTickUpper(887220);
    setPriceRangeLower('');
    setPriceRangeUpper('');
    setMessage({ type: 'info', text: 'Full range selected (similar to Uniswap V2)' });
  };

  // Handle add liquidity
  const handleAddLiquidity = async () => {
    if (!tokenA || !tokenB) {
      setMessage({ type: 'error', text: 'Please select both tokens' });
      return;
    }

    if (!amount0 || !amount1) {
      setMessage({ type: 'error', text: 'Please enter amounts for both tokens' });
      return;
    }

    if (!poolAddress) {
      setMessage({ type: 'error', text: 'Pool not found' });
      return;
    }

    try {
      setMessage({ type: 'info', text: 'Adding liquidity...' });

      const amount0Parsed = parseTokenAmount(amount0, token0?.decimals || 18);
      const amount1Parsed = parseTokenAmount(amount1, token1?.decimals || 18);

      // Calculate liquidity amount (simplified)
      // In production, use proper liquidity calculation based on price range
      const liquidityAmount = (amount0Parsed + amount1Parsed) / BigInt(2);

      // TODO: Approve tokens before minting
      // await approveToken(token0.address, poolAddress, amount0Parsed);
      // await approveToken(token1.address, poolAddress, amount1Parsed);

      const opId = await mint(
        tokenA, // recipient (will be set to caller in contract)
        tickLower,
        tickUpper,
        liquidityAmount,
      );

      if (opId) {
        setMessage({ type: 'success', text: `Liquidity added! Operation: ${opId.slice(0, 8)}...` });
        setAmount0('');
        setAmount1('');
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to add liquidity' });
    }
  };

  return (
    <div className="add-liquidity-container">
      <div className="add-liquidity-card">
        <h2 className="add-liquidity-title">
          <span className="pool-icon">💧</span>
          Add Liquidity
        </h2>
        <p className="add-liquidity-description">
          Provide liquidity to earn trading fees. Choose your price range for concentrated liquidity.
        </p>

        {/* Token Selection */}
        <div className="token-pair-section">
          <div className="token-select-group">
            <label className="token-label">Token A</label>
            <select
              className="token-select"
              value={tokenA}
              onChange={(e) => setTokenA(e.target.value)}
              disabled={!!initialTokenA}
            >
              <option value="">Select token</option>
              {TOKENS.map((token) => (
                <option key={token.address} value={token.address}>
                  {token.symbol} - {token.name}
                </option>
              ))}
            </select>
          </div>

          <div className="token-select-group">
            <label className="token-label">Token B</label>
            <select
              className="token-select"
              value={tokenB}
              onChange={(e) => setTokenB(e.target.value)}
              disabled={!!initialTokenB}
            >
              <option value="">Select token</option>
              {TOKENS.map((token) => (
                <option key={token.address} value={token.address}>
                  {token.symbol} - {token.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Fee Tier */}
        <div className="fee-tier-section">
          <label className="token-label">Fee Tier</label>
          <div className="fee-tier-grid">
            {(Object.keys(FEE_TIERS) as FeeTier[]).map((tier) => (
              <button
                key={tier}
                className={`fee-tier-button ${selectedFee === tier ? 'selected' : ''}`}
                onClick={() => setSelectedFee(tier)}
                disabled={!!initialFee}
              >
                <div className="fee-tier-label">{FEE_TIERS[tier].label}</div>
                <div className="fee-tier-sublabel">{tier}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Price Range */}
        <div className="price-range-section">
          <div className="price-range-header">
            <label className="token-label">Price Range</label>
            <button className="full-range-button" onClick={handleFullRange}>
              Full Range
            </button>
          </div>

          <div className="price-range-inputs">
            <div className="price-input-group">
              <label className="price-label">Min Price</label>
              <input
                type="text"
                className="price-input"
                placeholder="0.0"
                value={priceRangeLower}
                onChange={(e) => handlePriceLowerChange(e.target.value)}
              />
              <div className="price-sublabel">
                {token1?.symbol} per {token0?.symbol}
              </div>
            </div>

            <div className="price-range-separator">↔</div>

            <div className="price-input-group">
              <label className="price-label">Max Price</label>
              <input
                type="text"
                className="price-input"
                placeholder="∞"
                value={priceRangeUpper}
                onChange={(e) => handlePriceUpperChange(e.target.value)}
              />
              <div className="price-sublabel">
                {token1?.symbol} per {token0?.symbol}
              </div>
            </div>
          </div>

          <div className="tick-info">
            <span>Tick Lower: {tickLower}</span>
            <span>Tick Upper: {tickUpper}</span>
          </div>
        </div>

        {/* Amount Inputs */}
        <div className="amounts-section">
          <div className="amount-input-group">
            <label className="token-label">{token0?.symbol || 'Token A'} Amount</label>
            <input
              type="text"
              className="amount-input"
              placeholder="0.0"
              value={amount0}
              onChange={(e) => setAmount0(e.target.value)}
            />
          </div>

          <div className="amount-input-group">
            <label className="token-label">{token1?.symbol || 'Token B'} Amount</label>
            <input
              type="text"
              className="amount-input"
              placeholder="0.0"
              value={amount1}
              onChange={(e) => setAmount1(e.target.value)}
            />
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`liquidity-message ${message.type}`}>
            {message.text}
          </div>
        )}

        {/* Add Liquidity Button */}
        <button
          className="add-liquidity-button"
          onClick={handleAddLiquidity}
          disabled={loading || !tokenA || !tokenB || !amount0 || !amount1}
        >
          {loading ? 'Adding Liquidity...' : 'Add Liquidity'}
        </button>

        {/* Info Box */}
        <div className="info-box">
          <h4>💡 Concentrated Liquidity Tips</h4>
          <ul>
            <li>Choose a price range where you expect most trading to occur</li>
            <li>Narrower ranges earn more fees but require active management</li>
            <li>Use "Full Range" for passive liquidity provision (like Uniswap V2)</li>
            <li>You'll earn fees proportional to your share of liquidity in the active price range</li>
            <li>Remember to approve both tokens before adding liquidity</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
