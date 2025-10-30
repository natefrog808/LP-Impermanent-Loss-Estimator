# API Documentation

## Overview

The LP Impermanent Loss Estimator provides a REST API for calculating impermanent loss and fee APR estimates for liquidity provider positions.

**Base URL:** `https://your-domain.com`  
**Protocol:** HTTP/HTTPS, x402 compatible

---

## Endpoints

### 1. Calculate IL (`/calculate_il`)

Calculate impermanent loss and fee APR for a liquidity position.

#### Request

**Method:** `POST`  
**Content-Type:** `application/json`

**URL:**
```
POST /calculate_il
```

**Body Schema:**
```typescript
{
  pool_address?: string;          // Optional: LP pool address
  token0_symbol: string;           // Required: First token symbol
  token1_symbol: string;           // Required: Second token symbol
  token_weights?: [number, number]; // Optional: Token weights (default [0.5, 0.5])
  deposit_amounts: [number, number]; // Required: USD value of each token
  window_hours?: number;           // Optional: Historical window (default 168)
}
```

**Example Request:**
```bash
curl -X POST https://your-domain.com/calculate_il \
  -H "Content-Type: application/json" \
  -d '{
    "token0_symbol": "ETH",
    "token1_symbol": "USDC",
    "deposit_amounts": [5000, 5000],
    "window_hours": 168
  }'
```

#### Response

**Status Code:** `200 OK`

**Body Schema:**
```typescript
{
  output: {
    IL_percent: number;              // Impermanent loss percentage
    fee_apr_est: number;             // Estimated annual fee APR
    net_apr_est: number;             // Net APR (fees - IL)
    volume_window: number;           // Trading volume in time window
    price_change_percent: number;    // Price ratio change percentage
    il_annualized_percent: number;   // Annualized IL
    estimated_tvl: number;           // Estimated pool TVL
    estimated_daily_volume: number;  // Estimated daily volume
    fee_tier_percent: number;        // Pool fee tier percentage
    notes: string[];                 // Contextual notes and warnings
  },
  usage: {
    total_tokens: number;            // Token usage for billing
  }
}
```

**Example Response:**
```json
{
  "output": {
    "IL_percent": -2.1543,
    "fee_apr_est": 45.60,
    "net_apr_est": 34.12,
    "volume_window": 840000,
    "price_change_percent": 8.50,
    "il_annualized_percent": -11.48,
    "estimated_tvl": 10000000,
    "estimated_daily_volume": 120000,
    "fee_tier_percent": 0.300,
    "notes": [
      "⚠️ High impermanent loss - significant price divergence detected",
      "✅ Fee income exceeds annualized IL - profitable position",
      "Price ratio changed by 8.50% over the period",
      "Pool type: ETH/USDC with 0.30% fee tier"
    ]
  },
  "usage": {
    "total_tokens": 450
  }
}
```

#### Error Response

**Status Code:** `200 OK` (with error in output)

```json
{
  "output": {
    "error": "Failed to calculate IL: Invalid token symbol",
    "IL_percent": 0,
    "fee_apr_est": 0,
    "volume_window": 0,
    "notes": ["Error occurred during calculation"]
  },
  "usage": {
    "total_tokens": 100
  }
}
```

---

### 2. Echo (`/echo`)

Simple echo endpoint for testing connectivity.

#### Request

**Method:** `POST`  
**Content-Type:** `application/json`

**URL:**
```
POST /echo
```

**Body Schema:**
```typescript
{
  text: string;  // Any text to echo back
}
```

**Example Request:**
```bash
curl -X POST https://your-domain.com/echo \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello World"}'
```

#### Response

**Status Code:** `200 OK`

```json
{
  "output": {
    "text": "Hello World"
  },
  "usage": {
    "total_tokens": 11
  }
}
```

---

### 3. Health Check (`/health`)

Check if the service is running.

#### Request

**Method:** `GET` or `POST`

**URL:**
```
GET /health
```

#### Response

**Status Code:** `200 OK`

```json
{
  "output": {
    "status": "ok",
    "timestamp": 1699564800000
  },
  "usage": {
    "total_tokens": 10
  }
}
```

---

## x402 Protocol Usage

The API is accessible via the x402 protocol for agent-to-agent communication.

### x402 URL Format

```
x402://[domain]/[endpoint]
```

### Examples

**Calculate IL:**
```
x402://your-domain.com/calculate_il
```

**Body:**
```json
{
  "token0_symbol": "ETH",
  "token1_symbol": "USDC",
  "deposit_amounts": [5000, 5000]
}
```

---

## Supported Tokens

The following tokens are supported with CoinGecko integration:

| Symbol | Name | CoinGecko ID |
|--------|------|--------------|
| ETH / WETH | Ethereum | ethereum |
| BTC / WBTC | Bitcoin | bitcoin / wrapped-bitcoin |
| USDC | USD Coin | usd-coin |
| USDT | Tether | tether |
| DAI | Dai | dai |
| MATIC | Polygon | matic-network |
| LINK | Chainlink | chainlink |
| UNI | Uniswap | uniswap |
| AAVE | Aave | aave |
| CRV | Curve DAO | curve-dao-token |
| BAL | Balancer | balancer |

**Note:** Additional tokens can be supported by providing the lowercase symbol (which will be used as the CoinGecko ID).

---

## Pool Types & Fee Tiers

The estimator automatically classifies pools based on token pairs:

| Pool Type | Fee Tier | Volume/TVL Ratio | Examples |
|-----------|----------|------------------|----------|
| Stablecoin | 0.05% | 0.5 | USDC/USDT, DAI/USDC |
| ETH/Stable | 0.30% | 1.2 | ETH/USDC, WETH/DAI |
| ETH/BTC | 0.30% | 0.8 | ETH/WBTC |
| Major/Major | 0.30% | 0.6 | UNI/LINK, AAVE/MATIC |
| Major/Stable | 0.30% | 0.7 | LINK/USDC, AAVE/DAI |
| Default | 0.30% | 0.3 | Other pairs |

---

## Rate Limits

### CoinGecko API Limits

**Free Tier:**
- 10-50 calls per minute
- No authentication required
- Sufficient for most use cases

**Pro Tier** (if implemented):
- 500+ calls per minute
- Requires API key
- Set via `COINGECKO_API_KEY` environment variable

### Application Rate Limits

No application-level rate limits by default. Implement as needed:

```typescript
// Example rate limiting
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/calculate_il', limiter);
```

---

## Error Codes

| Error Type | HTTP Status | Description |
|------------|-------------|-------------|
| Invalid Input | 200 | Validation error, check request body |
| Token Not Found | 200 | Token symbol not in CoinGecko |
| API Error | 200 | External API failure (CoinGecko) |
| Rate Limited | 429 | Too many requests (if implemented) |
| Server Error | 500 | Internal server error |

**Note:** All errors return 200 OK with error details in the response body for agent-kit compatibility.

---

## Examples by Use Case

### Use Case 1: Pre-Deposit Analysis

**Scenario:** User wants to know expected IL before depositing into ETH/USDC pool

```json
{
  "token0_symbol": "ETH",
  "token1_symbol": "USDC",
  "deposit_amounts": [10000, 10000],
  "window_hours": 168
}
```

**Interpretation:**
- If `net_apr_est > 0`: Position likely profitable
- If `IL_percent < -5%`: High risk of price divergence
- Check `notes` for specific warnings

---

### Use Case 2: Compare Multiple Pools

**Request 1: ETH/USDC**
```json
{
  "token0_symbol": "ETH",
  "token1_symbol": "USDC",
  "deposit_amounts": [5000, 5000],
  "window_hours": 168
}
```

**Request 2: ETH/WBTC**
```json
{
  "token0_symbol": "ETH",
  "token1_symbol": "WBTC",
  "deposit_amounts": [5000, 5000],
  "window_hours": 168
}
```

**Compare:**
- `net_apr_est` (higher is better)
- `IL_percent` (closer to 0 is better)
- `fee_apr_est` (fee income potential)

---

### Use Case 3: Historical Performance Check

**Scenario:** Check how pool performed over last 30 days

```json
{
  "token0_symbol": "UNI",
  "token1_symbol": "ETH",
  "deposit_amounts": [3000, 3000],
  "window_hours": 720
}
```

**Analyze:**
- `il_annualized_percent`: Extrapolated annual IL
- `volume_window`: Total trading volume
- Compare with actual returns if you were in the pool

---

### Use Case 4: Stablecoin Pool Safety Check

**Scenario:** Verify stablecoin pool has minimal IL

```json
{
  "token0_symbol": "USDC",
  "token1_symbol": "USDT",
  "deposit_amounts": [20000, 20000],
  "window_hours": 168
}
```

**Expected:**
- `IL_percent` very close to 0 (< 0.1%)
- `fee_apr_est` moderate (15-25%)
- Should see "Low impermanent loss" in notes

---

## Integration Examples

### JavaScript/TypeScript

```typescript
async function calculateIL(
  token0: string,
  token1: string,
  amounts: [number, number]
) {
  const response = await fetch('https://your-domain.com/calculate_il', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token0_symbol: token0,
      token1_symbol: token1,
      deposit_amounts: amounts,
      window_hours: 168
    })
  });
  
  const data = await response.json();
  return data.output;
}

// Usage
const result = await calculateIL('ETH', 'USDC', [5000, 5000]);
console.log(`IL: ${result.IL_percent}%`);
console.log(`Fee APR: ${result.fee_apr_est}%`);
console.log(`Net APR: ${result.net_apr_est}%`);
```

### Python

```python
import requests

def calculate_il(token0, token1, amounts):
    url = 'https://your-domain.com/calculate_il'
    payload = {
        'token0_symbol': token0,
        'token1_symbol': token1,
        'deposit_amounts': amounts,
        'window_hours': 168
    }
    
    response = requests.post(url, json=payload)
    return response.json()['output']

# Usage
result = calculate_il('ETH', 'USDC', [5000, 5000])
print(f"IL: {result['IL_percent']}%")
print(f"Fee APR: {result['fee_apr_est']}%")
print(f"Net APR: {result['net_apr_est']}%")
```

### cURL

```bash
#!/bin/bash

TOKEN0="ETH"
TOKEN1="USDC"
AMOUNT0=5000
AMOUNT1=5000

curl -X POST https://your-domain.com/calculate_il \
  -H "Content-Type: application/json" \
  -d "{
    \"token0_symbol\": \"$TOKEN0\",
    \"token1_symbol\": \"$TOKEN1\",
    \"deposit_amounts\": [$AMOUNT0, $AMOUNT1],
    \"window_hours\": 168
  }" | jq '.output'
```

---

## Best Practices

### 1. Caching

Cache responses to reduce API calls:

```typescript
const cache = new Map();
const CACHE_DURATION = 60000; // 1 minute

async function getCachedResult(key, fetchFn) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.time < CACHE_DURATION) {
    return cached.data;
  }
  
  const data = await fetchFn();
  cache.set(key, { data, time: Date.now() });
  return data;
}
```

### 2. Error Handling

Always handle errors gracefully:

```typescript
try {
  const result = await calculateIL('ETH', 'USDC', [5000, 5000]);
  if (result.error) {
    console.error('Calculation failed:', result.error);
    return;
  }
  // Process result
} catch (error) {
  console.error('Network error:', error);
}
```

### 3. Multiple Time Windows

Compare different time windows for better insight:

```typescript
const windows = [24, 168, 720]; // 1 day, 1 week, 30 days
const results = await Promise.all(
  windows.map(hours => 
    calculateIL('ETH', 'USDC', [5000, 5000], hours)
  )
);

// Compare trends across timeframes
```

### 4. Batch Requests

For multiple pools:

```typescript
const pools = [
  ['ETH', 'USDC'],
  ['ETH', 'WBTC'],
  ['UNI', 'ETH']
];

const results = await Promise.all(
  pools.map(([t0, t1]) => calculateIL(t0, t1, [5000, 5000]))
);

// Sort by net_apr_est to find best pool
results.sort((a, b) => b.net_apr_est - a.net_apr_est);
```

---

## Changelog

### Version 0.1.0 (Current)

**Features:**
- Initial release
- IL calculation for constant product AMMs
- Fee APR estimation
- Historical price data from CoinGecko
- Support for major tokens
- Intelligent pool classification
- x402 protocol compatibility

**Known Limitations:**
- TVL/Volume estimates based on heuristics
- Supports constant product AMMs only (not concentrated liquidity)
- Dependent on CoinGecko rate limits
- No real-time on-chain data

---

## Support

For issues, questions, or feature requests:
- Open an issue on GitHub
- Check documentation at README.md
- Review test cases at TEST_CASES.md
- See deployment guide at DEPLOYMENT.md

---

## License

MIT License - See LICENSE file for details
