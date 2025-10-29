# Market Impact System Implementation Specification

## Core Mechanism
**0.2% Price Impact Per Trade**

### Implementation Code (MVP)
```typescript
// Location: package/feature/feature-nest-stock/src/stock.service.ts

const applyMarketImpact = (
  currentPrice: number,
  action: 'BUY' | 'SELL',
  volume?: number
): number => {
  const BASE_IMPACT = 0.002; // 0.2%
  const impact = action === 'BUY' ? 1 + BASE_IMPACT : 1 - BASE_IMPACT;
  return Math.round(currentPrice * impact);
};

// Update trade execution
async executeStockTrade(tradeData: StockTradeDto) {
  const { company, action, stockId } = tradeData;
  
  // Get current price
  const stock = await this.stockRepository.findById(stockId);
  const currentPrice = stock.companies[company][timeIdx].가격;
  
  // Apply market impact
  const newPrice = applyMarketImpact(currentPrice, action);
  
  // Update price in database
  await this.stockRepository.updatePrice(stockId, company, newPrice);
  
  // Broadcast price change via polling (automatic)
}
```

### Frontend Updates
```typescript
// Location: app/koi-client/src/page/@backoffice@screen@[partyId]/component/StockScreen/Table.tsx

// Add price change animation
const PriceChangeAnimation = styled.span<{change: 'up' | 'down'}>`
  animation: ${props => props.change === 'up' ? pulseGreen : pulseRed} 0.6s ease-out;
  font-weight: bold;
`;

// Display impact in trade feed
interface TradeFeedItem {
  player: string;
  action: 'BUY' | 'SELL';
  company: string;
  impact: string; // "+0.2%" or "-0.2%"
  newPrice: number;
  timestamp: Date;
}
```

### TV Dashboard Enhancements
```typescript
// Real-time impact visualization
interface MarketPressure {
  company: string;
  buyPressure: number;  // Number of recent buys
  sellPressure: number; // Number of recent sells
  trend: 'bullish' | 'bearish' | 'neutral';
  momentum: number; // 1-5 scale
}

// Add to Table.tsx
const TrendIndicator = ({ pressure }: { pressure: MarketPressure }) => (
  <TrendContainer>
    {pressure.trend === 'bullish' && '🚀'}
    {pressure.trend === 'bearish' && '📉'}
    <MomentumBar strength={pressure.momentum} />
  </TrendContainer>
);
```

## Phase 2 Enhancements (Optional)

### Consecutive Trade Decay
```typescript
interface PlayerTradeHistory {
  playerId: string;
  recentTrades: Array<{
    timestamp: Date;
    company: string;
    action: 'BUY' | 'SELL';
  }>;
}

const calculateImpactWithDecay = (
  baseImpact: number,
  playerHistory: PlayerTradeHistory,
  company: string
): number => {
  const recentSameTrades = playerHistory.recentTrades.filter(
    t => t.company === company && 
    Date.now() - t.timestamp.getTime() < 10000 // Last 10 seconds
  );
  
  const decayFactor = Math.pow(0.9, recentSameTrades.length);
  return baseImpact * decayFactor;
};
```

### Market Events Integration
```typescript
interface MarketEvent {
  type: 'BREAKING_NEWS' | 'MARKET_SHOCK' | 'INSIDER_INFO';
  affectedCompanies?: string[];
  impactMultiplier: number; // 1.5x, 2x, etc.
  duration: number; // seconds
}

// During event, modify impact
if (activeEvent && activeEvent.affectedCompanies.includes(company)) {
  impact *= activeEvent.impactMultiplier;
}
```

## Testing Scenarios
1. **Single Player**: Buy 10 times → Price should increase ~2%
2. **Group Rush**: 5 players buy simultaneously → ~1% immediate jump
3. **Pump & Dump**: Coordinated buy (10 trades) then sell → Price spike and crash
4. **Market Stability**: Mixed buy/sell → Price relatively stable

## Monitoring Metrics
- Average trades per minute
- Price volatility per stock
- Player influence distribution
- Collusion patterns (grouped trades)

## Rollback Plan
If 0.2% proves problematic:
- Config-based impact adjustment (no code change)
- Feature flag for instant enable/disable
- Revert to time-based price changes only