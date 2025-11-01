# LP Impermanent Loss Estimator 🔄

An AI agent that calculates impermanent loss and fee APR for liquidity provider positions using real historical price data from CoinGecko.

**🌐 Live Demo:** https://lp-impermanent-loss-estimator-production.up.railway.app/

**💳 x402 Endpoint:** `https://lp-impermanent-loss-estimator-production.up.railway.app/calculate-il-x402`

**🔍 x402scan:** [View on x402scan](https://www.x402scan.com/)

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

### Calculate Impermanent Loss (x402 Payment Required)
```bash
curl -X POST https://lp-impermanent-loss-estimator-production.up.railway.app/calculate-il-x402 \
  -H "Content-Type: application/json" \
  -d '{
    "token0Symbol": "ETH",
    "token1Symbol": "USDC",
    "token0Amount": 1.5,
    "token1Amount": 3000,
    "daysHeld": 30
  }'
```

**Returns 402 Payment Required with payment details.**

## 💳 x402 Payment Integration

Built with [@lucid-dreams/agent-kit](https://www.npmjs.com/package/@lucid-dreams/agent-kit) and supports x402 micropayments:

- **Price per calculation:** $0.10 USDC (100,000 units)
- **Payment network:** Base
- **Payment asset:** USDC (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`)
- **Wallet address:** `0xe7A413d4192fdee1bB5ecdF9D07A1827Eb15Bc1F`

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

- **Framework:** [@lucid-dreams/agent-kit](https://www.npmjs.com/package/@lucid-dreams/agent-kit) v0.2.22
- **Web Framework:** Hono v4.0+
- **Runtime:** Node.js v20+ with tsx
- **Data Source:** CoinGecko API
- **Deployment:** Railway
- **Payment Protocol:** x402
- **Language:** TypeScript

## 🔧 Local Development

### Prerequisites
- Node.js v20+ (required for Web Crypto API)
- npm or yarn

### Installation
```bash
# Clone the repository
git clone https://github.com/natefrog808/LP-Impermanent-Loss-Estimator.git
cd LP-Impermanent-Loss-Estimator

# Install dependencies
npm install

# Run development server
npm run dev
```

Server will start on `http://localhost:3000`

## 🚀 Deployment

### Deploy to Railway
1. Fork this repository
2. Connect to Railway
3. Deploy!

**Important:** Railway uses Node.js 20 (configured in `nixpacks.toml` and `.nvmrc`) for Web Crypto API compatibility.

## 🧪 Testing

### Test x402 Response (No Payment)
```bash
curl -i https://lp-impermanent-loss-estimator-production.up.railway.app/calculate-il-x402
# Should return HTTP 402 with payment details
```

## 🎯 Use Cases

1. **LP Position Analysis** - Check if your LP position is profitable
2. **Strategy Comparison** - Compare HODLing vs LPing
3. **Risk Assessment** - Identify high-IL situations
4. **Performance Tracking** - Monitor positions over time
5. **Fee Optimization** - Understand if fees compensate for IL

## 🐛 Lessons Learned

### Issue: "Web Crypto API not available"
**Solution:** Ensure Node.js 20+ is used (configured in nixpacks.toml)

### Issue: x402scan shows "No 402 Response"
**Solution:** Create separate endpoint `/calculate-il-x402` with manual 402 handling

### Issue: Railway ignored runtime configurations
**Solution:** Use multiple config files (.nvmrc, nixpacks.toml, railway.toml)

## 🏆 Bounty Details

- **Program:** Daydreams Agent Bounties
- **Issue:** [#7 - Build an Agent](https://github.com/daydreamsai/agent-bounties/issues/7)
- **Submission Date:** November 1, 2025
- **Developer:** @natefrog808

## 🔗 Links

- **Live Agent:** https://lp-impermanent-loss-estimator-production.up.railway.app/
- **x402 Endpoint:** https://lp-impermanent-loss-estimator-production.up.railway.app/calculate-il-x402
- **Source Code:** https://github.com/natefrog808/LP-Impermanent-Loss-Estimator
- **x402scan:** https://www.x402scan.com/

## 🎉 Success Story

This agent was built through an intensive debugging session involving:
- Runtime detection (Bun vs Node.js)
- Node.js version compatibility (Web Crypto API requires v20+)
- x402 protocol implementation and schema validation
- Railway deployment optimization
- Manual 402 response handling for x402scan compatibility

**Result:** A fully functional, x402-compliant agent for DeFi analytics! 🚀

---

**Built with ❤️ using @lucid-dreams/agent-kit and x402**
