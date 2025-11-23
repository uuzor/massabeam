# 🎨 MassaBeam DEX Frontend Architecture

## 📁 File Structure

```
frontend/src/
├── dex/
│   ├── components/          # Reusable UI components
│   │   ├── common/
│   │   │   ├── TokenSelector.tsx      # Token selection dropdown
│   │   │   ├── TokenInput.tsx         # Token amount input with balance
│   │   │   ├── PriceDisplay.tsx       # Price and exchange rate
│   │   │   ├── SlippageSettings.tsx   # Slippage tolerance settings
│   │   │   └── TransactionButton.tsx  # Connect/Approve/Swap button
│   │   ├── swap/
│   │   │   ├── SwapInterface.tsx      # Main swap UI
│   │   │   ├── SwapSettings.tsx       # Deadline, slippage
│   │   │   └── SwapSummary.tsx        # Swap details modal
│   │   ├── liquidity/
│   │   │   ├── AddLiquidity.tsx       # Add liquidity interface
│   │   │   ├── RemoveLiquidity.tsx    # Remove liquidity interface
│   │   │   ├── PositionCard.tsx       # LP position display
│   │   │   └── RangeSelector.tsx      # Price range selector (V3 style)
│   │   ├── limit-orders/
│   │   │   ├── LimitOrderForm.tsx     # Create limit order
│   │   │   ├── OrderBook.tsx          # Display active orders
│   │   │   ├── OrderCard.tsx          # Single order display
│   │   │   └── OrderHistory.tsx       # Past orders
│   │   ├── pools/
│   │   │   ├── PoolCard.tsx           # Pool stats card
│   │   │   ├── PoolList.tsx           # List of pools
│   │   │   └── PoolChart.tsx          # Price/volume charts
│   │   └── layout/
│   │       ├── Header.tsx             # Main navigation
│   │       ├── Sidebar.tsx            # Side navigation
│   │       └── Footer.tsx             # Footer with links
│   ├── pages/
│   │   ├── SwapPage.tsx               # /swap route
│   │   ├── PoolsPage.tsx              # /pools route
│   │   ├── LiquidityPage.tsx          # /liquidity route
│   │   ├── LimitOrdersPage.tsx        # /limit-orders route
│   │   └── PoolDetailPage.tsx         # /pool/:id route
│   ├── hooks/
│   │   ├── useWallet.ts               # Wallet connection hook
│   │   ├── useTokenBalance.ts         # Token balance fetching
│   │   ├── useSwap.ts                 # Swap logic
│   │   ├── useLiquidity.ts            # Liquidity management
│   │   ├── useLimitOrder.ts           # Limit order management
│   │   ├── usePool.ts                 # Pool data fetching
│   │   └── usePriceData.ts            # Price data and charts
│   ├── context/
│   │   ├── DEXContext.tsx             # Global DEX state
│   │   └── WalletContext.tsx          # Wallet state
│   ├── utils/
│   │   ├── contracts.ts               # Contract ABIs and addresses
│   │   ├── formatting.ts              # Number/date formatting
│   │   ├── calculations.ts            # Price calculations
│   │   └── validation.ts              # Input validation
│   └── types/
│       └── index.ts                   # TypeScript types
├── styles/
│   ├── dex.css                        # DEX-specific styles
│   └── components/                    # Component-specific styles
└── App.tsx                            # Main app with routing
```

## 🎨 Design System (Uniswap-inspired)

### Color Palette
```css
--primary: #FC74FE (Pink/Magenta - MassaBeam branding)
--secondary: #6366F1 (Indigo)
--success: #10B981 (Green)
--error: #EF4444 (Red)
--warning: #F59E0B (Amber)
--background: #0D111C (Dark blue-black)
--surface: #191B1F (Card background)
--surface-hover: #212429
--text-primary: #FFFFFF
--text-secondary: #98A1C0
--border: #2C2F36
```

### Components

#### 1. Swap Interface
- **Token Input Cards**: Glassmorphic design with gradient borders
- **Swap Button**: Large, centered, with loading states
- **Price Display**: Real-time exchange rate
- **Settings**: Slippage, deadline in modal
- **Transaction Summary**: Modal with breakdown

#### 2. Liquidity Interface
- **Concentrated Liquidity**: V3-style range selector
- **Min/Max Price**: Visual price range selection
- **Position Cards**: Display active positions with APR
- **Add/Remove Toggle**: Tab interface

#### 3. Limit Orders
- **Order Type Tabs**: BUY/SELL toggle
- **Price Input**: Limit price with current market price reference
- **Order Book**: List of active orders with cancel option
- **Order History**: Filled/cancelled orders
- **Order Cards**: Status badges (Active, Filled, Cancelled, Expired)

#### 4. Pool Information
- **TVL Display**: Total value locked
- **Volume Charts**: 24h, 7d, 30d
- **Fee Tier Badges**: 0.05%, 0.3%, 1%
- **APR Indicators**: Estimated returns
- **Liquidity Distribution**: Tick chart

## 🔄 User Flows

### Swap Flow
1. Select token pair
2. Enter amount
3. Review price/slippage
4. Approve tokens (if needed)
5. Execute swap
6. View transaction

### Add Liquidity Flow
1. Select pool or create new
2. Choose price range (V3)
3. Enter amounts
4. Preview position
5. Approve tokens
6. Add liquidity
7. Mint position NFT

### Limit Order Flow
1. Choose BUY or SELL
2. Enter amount and limit price
3. Set expiry (optional)
4. Review order
5. Approve tokens
6. Create order
7. Monitor in order book

## 📊 Data Display Features

### Pool Stats Cards
- **Liquidity**: $X.XX TVL
- **Volume 24h**: $X.XX
- **Fees 24h**: $X.XX
- **APR**: X.XX%
- **Price Change**: +X.XX%

### Chart Types
- **Price Chart**: Candlestick/Line
- **Volume Bars**: 24h trading volume
- **Liquidity Depth**: Buy/sell walls
- **TVL History**: Total value over time

### Order Book Display
```
┌─────────────────────────────────┐
│ Active Orders (12)              │
├─────────────────────────────────┤
│ BUY  100 USDC → WMAS @ 10.5    │
│ SELL 50 WMAS → USDC @ 11.2     │
│ BUY  200 USDC → WMAS @ 10.0    │
└─────────────────────────────────┘
```

## 🎯 Key Features

1. **Real-time Updates**
   - WebSocket for price feeds
   - Auto-refresh pool data every 10s
   - Live order book updates

2. **Responsive Design**
   - Mobile-first approach
   - Tablet breakpoints
   - Desktop optimal layout

3. **Accessibility**
   - ARIA labels
   - Keyboard navigation
   - Screen reader support

4. **Performance**
   - Code splitting by route
   - Lazy loading components
   - Optimized re-renders with useMemo/useCallback

5. **User Experience**
   - Toast notifications
   - Loading skeletons
   - Error boundaries
   - Transaction history

## 🚀 Implementation Priority

### Phase 1: Core Infrastructure
- [x] Types definitions
- [ ] Wallet connection
- [ ] Token selector
- [ ] Basic swap interface

### Phase 2: AMM Features
- [ ] Swap execution
- [ ] Add liquidity
- [ ] Remove liquidity
- [ ] Position management

### Phase 3: Limit Orders
- [ ] Order creation
- [ ] Order book display
- [ ] Order cancellation
- [ ] Order execution monitoring

### Phase 4: Advanced Features
- [ ] Charts and analytics
- [ ] Pool creation
- [ ] Advanced settings
- [ ] Transaction history

## 🛠️ Tech Stack

- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + Custom CSS
- **Components**: Radix UI + shadcn/ui
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Charts**: Recharts or lightweight-charts
- **Web3**: @massalabs/massa-web3
- **Wallet**: @hicaru/bearby.js
- **State**: React Context + hooks
- **Routing**: React Router (to be added)

## 📱 Responsive Breakpoints

```css
/* Mobile */
@media (max-width: 640px) { ... }

/* Tablet */
@media (min-width: 641px) and (max-width: 1024px) { ... }

/* Desktop */
@media (min-width: 1025px) { ... }

/* Large Desktop */
@media (min-width: 1440px) { ... }
```

## 🎨 Example Component: Swap Card

```tsx
<SwapCard>
  <TokenInput
    token={tokenIn}
    amount={amountIn}
    onTokenSelect={handleTokenInSelect}
    onAmountChange={handleAmountInChange}
    label="You pay"
  />

  <SwapArrowButton onClick={handleFlipTokens} />

  <TokenInput
    token={tokenOut}
    amount={amountOut}
    onTokenSelect={handleTokenOutSelect}
    readOnly
    label="You receive"
  />

  <PriceDisplay
    rate={exchangeRate}
    priceImpact={priceImpact}
  />

  <TransactionButton
    onClick={handleSwap}
    disabled={!isValid}
    loading={isLoading}
  >
    {buttonText}
  </TransactionButton>
</SwapCard>
```

This architecture provides a scalable, maintainable structure for the MassaBeam DEX frontend with excellent UX similar to Uniswap.
