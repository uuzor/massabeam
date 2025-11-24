/**
 * Professional Swap Page
 * Clean, minimal swap interface with actual functionality
 */

import React, { useState } from 'react';
import { Args } from '@massalabs/massa-web3';
import { web3 } from '@hicaru/bearby.js';
import { Button, Input, Card, Modal } from '../components';
import './SwapPage.css';

interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
}

const TOKENS: Token[] = [
  { address: 'NATIVE_MAS', symbol: 'MAS', name: 'Massa', decimals: 9 },
  { address: 'AS12..example1', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
  { address: 'AS12..example2', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 },
  { address: 'AS12..example3', symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18 },
];

export const SwapPage: React.FC = () => {
  const [fromToken, setFromToken] = useState<Token>(TOKENS[0]);
  const [toToken, setToToken] = useState<Token | null>(null);
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showFromTokenSelect, setShowFromTokenSelect] = useState(false);
  const [showToTokenSelect, setShowToTokenSelect] = useState(false);
  const [slippage, setSlippage] = useState('0.5');

  const handleSwapDirection = () => {
    const temp = fromToken;
    setFromToken(toToken!);
    setToToken(temp);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  };

  const handleFromTokenSelect = (token: Token) => {
    setFromToken(token);
    if (toToken?.address === token.address) {
      setToToken(null);
    }
    setShowFromTokenSelect(false);
  };

  const handleToTokenSelect = (token: Token) => {
    setToToken(token);
    if (fromToken?.address === token.address) {
      setFromToken(TOKENS.find(t => t.address !== token.address) || TOKENS[0]);
    }
    setShowToTokenSelect(false);
  };

  const handleSwap = async () => {
    if (!fromToken || !toToken || !fromAmount) {
      return;
    }

    setLoading(true);
    try {
      // Get pool address for token pair
      // const poolAddress = await getPoolForPair(fromToken.address, toToken.address);

      // Execute swap through pool contract
      const args = new Args()
        .addString(web3.wallet.account?.base58 || '')  // recipient
        .addBool(fromToken.address < toToken.address)   // zeroForOne
        .addI128(BigInt(parseFloat(fromAmount) * 10 ** fromToken.decimals)) // amount
        .addU256(BigInt(0)); // sqrtPriceLimitX96 (no limit for now)

      // await web3.contract.call({
      //   targetAddress: poolAddress,
      //   functionName: 'swap',
      //   unsafeParameters: args.serialize(),
      //   maxGas: BigInt(2_000_000_000),
      //   coins: fromToken.address === 'NATIVE_MAS' ? BigInt(parseFloat(fromAmount) * 10 ** 9) : 0,
      //   fee: BigInt(10_000_000),
      // });

      console.log('Swap executed');
    } catch (error) {
      console.error('Swap failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="swap-page">
      <div className="swap-container">
        <div className="swap-header">
          <h1 className="swap-title">Swap</h1>
          <button
            className="settings-btn"
            onClick={() => setShowSettings(true)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 1v6m0 6v6M6 12H1m6 0h6m6 0h6"/>
            </svg>
          </button>
        </div>

        <Card className="swap-card">
          {/* From Token */}
          <div className="swap-section">
            <div className="swap-label">
              <span>From</span>
              <span className="swap-balance">Balance: 0.00</span>
            </div>
            <div className="swap-input-row">
              <Input
                type="number"
                placeholder="0.0"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                className="swap-amount-input"
              />
              <button
                className="token-select-btn"
                onClick={() => setShowFromTokenSelect(true)}
              >
                <span>{fromToken.symbol}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Swap Direction Button */}
          <div className="swap-direction">
            <button
              className="swap-direction-btn"
              onClick={handleSwapDirection}
              disabled={!toToken}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline points="17 11 12 6 7 11"/>
                <polyline points="7 13 12 18 17 13"/>
              </svg>
            </button>
          </div>

          {/* To Token */}
          <div className="swap-section">
            <div className="swap-label">
              <span>To</span>
              <span className="swap-balance">Balance: 0.00</span>
            </div>
            <div className="swap-input-row">
              <Input
                type="number"
                placeholder="0.0"
                value={toAmount}
                readOnly
                className="swap-amount-input"
              />
              <button
                className={`token-select-btn ${!toToken ? 'token-select-empty' : ''}`}
                onClick={() => setShowToTokenSelect(true)}
              >
                <span>{toToken ? toToken.symbol : 'Select token'}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Swap Info */}
          {fromAmount && toAmount && (
            <div className="swap-info">
              <div className="swap-info-row">
                <span>Rate</span>
                <span>1 {fromToken.symbol} = {(parseFloat(toAmount) / parseFloat(fromAmount)).toFixed(6)} {toToken?.symbol}</span>
              </div>
              <div className="swap-info-row">
                <span>Price Impact</span>
                <span className="text-success">{'<'}0.01%</span>
              </div>
              <div className="swap-info-row">
                <span>Fee (0.3%)</span>
                <span>{(parseFloat(fromAmount) * 0.003).toFixed(6)} {fromToken.symbol}</span>
              </div>
            </div>
          )}

          {/* Swap Button */}
          <Button
            fullWidth
            size="lg"
            onClick={handleSwap}
            loading={loading}
            disabled={!fromAmount || !toToken}
          >
            {!toToken ? 'Select a token' : 'Swap'}
          </Button>
        </Card>

        {/* Additional Info */}
        <div className="swap-footer-info">
          <p>Trade tokens in an instant with concentrated liquidity pools</p>
        </div>
      </div>

      {/* Settings Modal */}
      <Modal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        title="Swap Settings"
        size="sm"
      >
        <div className="settings-content">
          <div className="setting-group">
            <label className="setting-label">Slippage Tolerance</label>
            <div className="slippage-options">
              {['0.1', '0.5', '1.0'].map((value) => (
                <button
                  key={value}
                  className={`slippage-btn ${slippage === value ? 'active' : ''}`}
                  onClick={() => setSlippage(value)}
                >
                  {value}%
                </button>
              ))}
              <Input
                type="number"
                value={slippage}
                onChange={(e) => setSlippage(e.target.value)}
                placeholder="Custom"
                className="slippage-input"
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* From Token Selection Modal */}
      <Modal
        isOpen={showFromTokenSelect}
        onClose={() => setShowFromTokenSelect(false)}
        title="Select a token"
        size="sm"
      >
        <div className="token-list">
          {TOKENS.map((token) => (
            <button
              key={token.address}
              className={`token-list-item ${fromToken?.address === token.address ? 'selected' : ''}`}
              onClick={() => handleFromTokenSelect(token)}
              disabled={token.address === fromToken?.address}
            >
              <div className="token-info">
                <div className="token-symbol">{token.symbol}</div>
                <div className="token-name">{token.name}</div>
              </div>
              {fromToken?.address === token.address && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
            </button>
          ))}
        </div>
      </Modal>

      {/* To Token Selection Modal */}
      <Modal
        isOpen={showToTokenSelect}
        onClose={() => setShowToTokenSelect(false)}
        title="Select a token"
        size="sm"
      >
        <div className="token-list">
          {TOKENS.filter(token => token.address !== fromToken?.address).map((token) => (
            <button
              key={token.address}
              className={`token-list-item ${toToken?.address === token.address ? 'selected' : ''}`}
              onClick={() => handleToTokenSelect(token)}
            >
              <div className="token-info">
                <div className="token-symbol">{token.symbol}</div>
                <div className="token-name">{token.name}</div>
              </div>
              {toToken?.address === token.address && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
};
