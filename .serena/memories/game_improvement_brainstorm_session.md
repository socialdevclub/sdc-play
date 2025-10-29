# SDC-STOCK Game Improvement Brainstorming Session

## Session Context
- Date: 2025-10-29
- Focus: Making the stock trading party game more engaging for 15-player offline gatherings
- Game Duration: 45 minutes
- Setup: Players use smartphones to trade, TV dashboard shows real-time market status

## Key Discoveries

### 1. Game Context Understanding
- **Offline Party Game**: 15 players in same physical location
- **Dual Screen System**: Personal smartphones + shared TV dashboard
- **Social Dynamics**: Face-to-face information exchange, bluffing, alliances
- **Dedicated Host**: Separate game master controls the flow

### 2. Core Innovation: Real-Time Market Impact System
**Final Design Decision: 0.2% price impact per trade**
- Buy action: Price × 1.002
- Sell action: Price × 0.998
- Creates immediate feedback loop
- Enables market manipulation strategies
- Maintains balance (no single player can dominate)

### 3. Strategic Implications of 0.2% Impact
- 10 consecutive trades = ~2% price movement
- Group behavior (5 players) = ~1% immediate impact
- Full manipulation (50 trades) = ~10% maximum swing
- Sweet spot for 45-minute games with 15 players

## Proposed Features

### Phase 1 - Immediate Implementation
1. **Market Impact System** (0.2% per trade)
2. **Breaking News Events** (host-triggered market shocks)
3. **Real-time Power Rankings** (TV display)
4. **Trade Animation & Sound Effects**

### Phase 2 - Enhanced Engagement (1-2 weeks)
1. **Role System**:
   - Whales (3): 2x starting capital, public trades
   - Sharks (6): Extra information
   - Piranhas (6): Special ability cards

2. **Deal Making Time**: Official trading periods for public negotiations

3. **Host Dashboard**: 
   - Event triggers
   - Market manipulation tools
   - Phase management

### Phase 3 - Advanced Features
1. **Team Mode** (3 teams × 5 players)
2. **Scenario Mode** (historical market events)
3. **Achievement System**
4. **Season Rankings**

## Game Flow Optimization (45 minutes)
- 0-5 min: Quick onboarding
- 5-15 min: Information gathering phase
- 15-30 min: Trading war phase
- 30-40 min: Final battle phase
- 40-45 min: Results & highlights

## Technical Considerations
- WebSocket → Polling (current): Works fine for real-time updates
- TV Dashboard: Already has trade feed, hot stock indicators
- Mobile UI: Needs simplification for quick trades
- Server Load: 15 players × 20 trades = 300 total transactions

## Balancing Mechanisms Discussed
1. **Diminishing Returns**: Consecutive trades have reduced impact
2. **Trading Cooldown**: 3-second delay between trades
3. **Market Stabilization**: Gradual reversion to base price
4. **Volume-Based Impact**: Larger trades = bigger impact

## Final Recommendation
Start with pure 0.2% impact, no additional complexity. Monitor actual gameplay data and adjust based on:
- Initial phase engagement (too slow?)
- Collusion patterns (groups dominating?)
- End-game chaos (too volatile?)

## Code Architecture Notes
- Well-modularized React/NestJS structure
- Good separation: koi-client (frontend), koi-server (backend)
- Existing real-time polling system (1-second intervals)
- DynamoDB for game state management
- Type-safe with TypeScript throughout