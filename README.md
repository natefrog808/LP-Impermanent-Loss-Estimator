# LP Impermanent Loss Estimator 🔄

An AI agent that calculates impermanent loss and fee APR for liquidity provider positions using real historical price data from CoinGecko.

**🌐 Live Demo:** `https://lp-impermanent-loss-estimator-production.up.railway.app`

**💰 Bounty:** [Daydreams Agent Bounties #7](https://github.com/daydreamsai/agent-bounties/issues/7)

## 🎯 What It Does

This agent helps liquidity providers understand their position performance by:
- Calculating impermanent loss using the constant product formula (x × y = k)
- Fetching real historical prices from CoinGecko API
- Estimating fee APR based on pool type (stable vs volatile pairs)
- Providing net P&L analysis (IL + fees)
- Giving actionable recommendations

## 🚀 Quick Start

### Health Check
```bash
curl https://lp-impermanent-loss-estimator-production.up.railway.app/health
```

### List Available Entrypoints
```bash
curl https://lp-impermanent-loss-estimator-production.up.railway.app/entrypoints
```

### Calculate Impermanent Loss
```bash
curl -X POST https://lp-impermanent-loss-estimator-production.up.railway.app/entrypoints/calculate-il \
  -H "Content-Type: application/json" \
  -d '{
    "token0Symbol": "ETH",
    "token1Symbol": "USDC",
    "token0Amount": 1.5,
    "token1Amount": 3000,
    "daysHeld": 30
  }'
```

**Example Response:**
```json
{
  "token0Symbol": "ETH",
  "token1Symbol": "USDC",
  "initialValue": 5025.50,
  "currentValue": 5150.25,
  "hodlValue": 5200.00,
  "impermanentLoss": -49.75,
  "impermanentLossPercent": -0.96,
  "estimatedFeeAPR": 30.0,
  "estimatedFeesEarned": 123.50,
  "netProfitLoss": 73.75,
  "netProfitLossPercent": 1.47,
  "recommendation": "✅ Fees are covering IL well. Position looks healthy.",
  "priceChange": {
    "token0": 5.2,
    "token1": 0.1,
    "ratio": 5.1
  }
}
```

## 💳 x402 Payment Integration

Built with [@lucid-dreams/agent-kit](https://www.npmjs.com/package/@lucid-dreams/agent-kit) and supports x402 micropayments:

- **Price per calculation:** $0.10 USDC
- **Payment network:** Base
- **Wallet address:** `0xe7A413d4192fdee1bB5ecdf9D07A1827Eb15Bc1F`

## 🪙 Supported Tokens

- **ETH / WETH** (Ethereum)
- **BTC / WBTC** (Bitcoin)
- **USDC** (USD Coin)
- **USDT** (Tether)
- **DAI** (Dai Stablecoin)

## 📊 How It Works

### 1. Fetch Historical Prices
Uses CoinGecko API to get token prices from `daysHeld` ago and current prices.

### 2. Calculate Impermanent Loss
Applies the constant product AMM formula:
```
V_pool = 2 × √(k × P_ratio) × P_token1
where k = x × y (constant product)
```

### 3. Estimate Fee APR
Models fee earnings based on pool type:
- **Volatile pairs** (ETH/BTC): ~30% APR
- **Stable pairs** (USDC/USDT): ~3% APR

### 4. Net P&L Analysis
```
Net P&L = Impermanent Loss + Fees Earned
```

### 5. Provide Recommendation
- ✅ Healthy: Fees covering IL well
- ⚠️ Warning: Significant IL detected
- 📊 Monitor: Moderate IL situation

## 🛠️ Technical Stack

- **Framework:** [@lucid-dreams/agent-kit](https://www.npmjs.com/package/@lucid-dreams/agent-kit) (Hono-based)
- **Runtime:** Node.js v20 with tsx
- **Data Source:** CoinGecko API
- **Deployment:** Railway
- **Payment Protocol:** x402
- **Language:** TypeScript

## 📁 Project Structure

```
.
├── index.ts           # Main application
├── package.json       # Dependencies
├── railway.json       # Railway configuration
├── nixpacks.toml      # Build configuration
└── README.md          # Documentation
```

## 🔧 Local Development

### Prerequisites
- Node.js v20+
- npm or yarn

### Installation
```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/lp-impermanent-loss-estimator.git
cd lp-impermanent-loss-estimator

# Install dependencies
npm install

# Run development server
npm run dev
```

### Environment Variables
```env
# Optional - for x402 payments
FACILITATOR_URL=https://facilitator.x402.io
ADDRESS=0xe7A413d4192fdee1bB5ecdf9D07A1827Eb15Bc1F
NETWORK=base
DEFAULT_PRICE=$0.10
```

## 🚀 Deployment

### Deploy to Railway
1. Fork this repository
2. Connect to Railway
3. Set environment variables
4. Deploy!

Railway will auto-detect the configuration from `nixpacks.toml`.

## 🧪 Testing

### Test with curl
```bash
# Basic calculation
curl -X POST https://YOUR_URL/entrypoints/calculate-il \
  -H "Content-Type: application/json" \
  -d '{
    "token0Symbol": "ETH",
    "token1Symbol": "USDC",
    "token0Amount": 2.0,
    "token1Amount": 5000,
    "daysHeld": 7
  }'
```

### Test with Daydreams Agent
```typescript
const result = await agent.call('calculate-il', {
  token0Symbol: 'ETH',
  token1Symbol: 'USDC',
  token0Amount: 1.5,
  token1Amount: 3000,
  daysHeld: 30
});
```

## 📖 Agent Discovery

This agent implements standard discovery endpoints:

- `GET /entrypoints` - List all available functions
- `GET /.well-known/agent.json` - Agent metadata
- `GET /.well-known/agent-card.json` - Agent card info

## 🎯 Use Cases

1. **LP Position Analysis** - Check if your LP position is profitable
2. **Strategy Comparison** - Compare HODLing vs LPing
3. **Risk Assessment** - Identify high-IL situations
4. **Performance Tracking** - Monitor positions over time
5. **Fee Optimization** - Understand if fees compensate for IL

## 🤝 Contributing

Contributions welcome! Please open an issue or PR.

## 📄 License

MIT

## 🏆 Bounty Details

- **Program:** Daydreams Agent Bounties
- **Issue:** [#7 - Build an Agent](https://github.com/daydreamsai/agent-bounties/issues/7)
- **Submission Date:** October 31, 2025
- **Developer:** Natefrog808

## 🔗 Links

- **Live Agent:** https://lp-impermanent-loss-estimator-production.up.railway.app/
- **Source Code:** https://github.com/natefrog808/lp-impermanent-loss-estimator
- **Bounty Issue:** https://github.com/daydreamsai/agent-bounties/issues/7
- **Agent Kit:** https://www.npmjs.com/package/@lucid-dreams/agent-kit

---

**Built with ❤️ using @lucid-dreams/agent-kit and x402**
