import React, { useEffect, useState } from 'react';
import { ChevronDown, ArrowUpDown, Zap } from 'lucide-react';
import '../styles/PoolMint.css';
import { useFactory } from '../hooks/useFactory';
import { useWallet } from '../hooks/useWallet';
import { FACTORY_ADDRESS } from '../constants/contracts';

import { TOKEN_OPTIONS, TokenOption } from '../constants/tokens';

const PoolMint = () => {
  const [token0, setToken0] = useState<TokenOption | null>(null);
  const [token1, setToken1] = useState<TokenOption | null>(null);
  const [fee, setFee] = useState<'500' | '3000' | '10000'>('3000');
  const [showToken0Dropdown, setShowToken0Dropdown] = useState(false);
  const [showToken1Dropdown, setShowToken1Dropdown] = useState(false);
  const {isConnected, provider, userAddress} = useWallet()
  const {createPool} = useFactory(FACTORY_ADDRESS, isConnected, provider, userAddress)

  
  const tokenOptions = TOKEN_OPTIONS;

  const switchTokens = () => {
    const temp = token0;
    setToken0(token1);
    setToken1(temp);
  };

  const handleToken0Select = (token: TokenOption) => {
    setToken0(token);
    setShowToken0Dropdown(false);
  };

  const handleToken1Select = (token: TokenOption) => {
    setToken1(token);
    setShowToken1Dropdown(false);
  };


  const createPoolTx = async ()=>{
    const id =await createPool(
        token0.address,
        token1.address,
        Number(fee)
    )
    console.log("Pool created with id", id)
  }


  const feeOptions = [
    { value: '500', label: '0.05%', apr: '0.1%' },
    { value: '3000', label: '0.3%', apr: '0.3%' },
    { value: '10000', label: '1%', apr: '1%' }
  ];

  return (
    <div className="pool-mint-container">
      <div className="pool-mint-wrapper">
        {/* Header */}
        <div className="pool-mint-header">
          <h1>Create Liquidity Pool</h1>
          <p>Provide liquidity and earn trading fees on your capital</p>
        </div>

        {/* Main Form */}
        <div className="pool-mint-form">
          {/* Token Selection Section */}
          <div className="form-section">
            <label className="form-label">Token Pair</label>

            {/* Token 0 */}
            <div className="token-input-wrapper">
              <div className="token-selector-container">
                <button
                  className="token-selector"
                  onClick={() => setShowToken0Dropdown(!showToken0Dropdown)}
                >
                  {token0 ? (
                    <>
                      <span className="token-symbol">{token0.symbol}</span>
                    </>
                  ) : (
                    <span className="token-placeholder">Select Token</span>
                  )}
                  <ChevronDown size={18} />
                </button>

                {/* Dropdown for Token 0 */}
                {showToken0Dropdown && (
                  <div className="token-dropdown">
                    <div className="dropdown-search">
                      <input
                        type="text"
                        placeholder="Search tokens..."
                        className="dropdown-input"
                      />
                    </div>
                    <div className="dropdown-list">
                      {tokenOptions.map((token) => (
                        <button
                          key={token.address}
                          className={`dropdown-item ${token0?.address === token.address ? 'selected' : ''}`}
                          onClick={() => handleToken0Select(token)}
                        >
                          <span className="token-name">
                            <span className="token-sym">{token.symbol}</span>
                            <span className="token-addr">{token.address.slice(0, 8)}...</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Switch Button */}
            <button className="token-switch-btn" onClick={switchTokens}>
              <ArrowUpDown size={18} />
            </button>

            {/* Token 1 */}
            <div className="token-input-wrapper">
              <div className="token-selector-container">
                <button
                  className="token-selector"
                  onClick={() => setShowToken1Dropdown(!showToken1Dropdown)}
                >
                  {token1 ? (
                    <>
                      <span className="token-symbol">{token1.symbol}</span>
                    </>
                  ) : (
                    <span className="token-placeholder">Select Token</span>
                  )}
                  <ChevronDown size={18} />
                </button>

                {/* Dropdown for Token 1 */}
                {showToken1Dropdown && (
                  <div className="token-dropdown">
                    <div className="dropdown-search">
                      <input
                        type="text"
                        placeholder="Search tokens..."
                        className="dropdown-input"
                      />
                    </div>
                    <div className="dropdown-list">
                      {tokenOptions.map((token) => (
                        <button
                          key={token.address}
                          className={`dropdown-item ${token1?.address === token.address ? 'selected' : ''}`}
                          onClick={() => handleToken1Select(token)}
                        >
                          <span className="token-name">
                            <span className="token-sym">{token.symbol}</span>
                            <span className="token-addr">{token.address.slice(0, 8)}...</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Fee Tier Selection */}
          <div className="form-section">
            <label className="form-label">Fee Tier</label>
            <div className="fee-tiers">
              {feeOptions.map((option) => (
                <button
                  key={option.value}
                  className={`fee-tier-btn ${fee === option.value ? 'active' : ''}`}
                  onClick={() => setFee(option.value as '500' | '3000' | '10000')}
                >
                  <span className="fee-label">{option.label}</span>
                  <span className="fee-apr">{option.apr}</span>
                </button>
              ))}
            </div>
            <p className="fee-description">
              {fee === '500' && 'Best for stable pairs with high trading volume'}
              {fee === '3000' && 'Most common choice for volatile pairs'}
              {fee === '10000' && 'For highly volatile or exotic pairs'}
            </p>
          </div>


          {/* Action Buttons */}
          <div className="form-actions">
            {!token0 || !token1 ? (
              <button className="btn btn-primary" disabled>
                Select Tokens to Continue
              </button>
            ) : (
              <>
                <button onClick={createPoolTx} className="btn btn-primary">
                  <Zap size={16} />
                  Create Pool
                </button>
                <button className="btn btn-secondary">
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default PoolMint;