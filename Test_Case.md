# Test Cases for LP Impermanent Loss Estimator

## Test Suite

### Test 1: Stable Pair (Low IL Expected)
**Input:**
```json
{
  "token0_symbol": "USDC",
  "token1_symbol": "USDT",
  "token_weights": [0.5, 0.5],
  "deposit_amounts": [10000, 10000],
  "window_hours": 168
}
```

**Expected Behavior:**
- IL_percent should be near 0 (< 0.5%)
- fee_apr_est should be moderate (15-25%)
- Low fee tier (0.05%)
- Notes should indicate "Low impermanent loss"

---

### Test 2: Volatile Pair (High IL Expected)
**Input:**
```json
{
  "token0_symbol": "ETH",
  "token1_symbol": "USDC",
  "token_weights": [0.5, 0.5],
  "deposit_amounts": [5000, 5000],
  "window_hours": 168
}
```

**Expected Behavior:**
- IL_percent may be significant (>1%)
- fee_apr_est should be high (40-60%)
- Standard fee tier (0.30%)
- Should show price change percentage
- May show "High impermanent loss" warning if price moved >10%

---

### Test 3: ETH/BTC Pair (Major Crypto)
**Input:**
```json
{
  "token0_symbol": "ETH",
  "token1_symbol": "WBTC",
  "token_weights": [0.5, 0.5],
  "deposit_amounts": [7500, 7500],
  "window_hours": 336
}
```

**Expected Behavior:**
- IL based on ETH/BTC ratio change
- High volume pool (0.8 ratio)
- Standard fee tier (0.30%)
- 14-day window (336 hours)

---

### Test 4: Long Window (30 days)
**Input:**
```json
{
  "token0_symbol": "UNI",
  "token1_symbol": "ETH",
  "token_weights": [0.5, 0.5],
  "deposit_amounts": [3000, 3000],
  "window_hours": 720
}
```

**Expected Behavior:**
- Larger volume_window (30 days worth)
- Annualized IL should account for 30-day period
- Should fetch 30 days of historical data

---

### Test 5: Small Deposit
**Input:**
```json
{
  "token0_symbol": "LINK",
  "token1_symbol": "ETH",
  "token_weights": [0.5, 0.5],
  "deposit_amounts": [500, 500],
  "window_hours": 168
}
```

**Expected Behavior:**
- Should still calculate correctly with smaller amounts
- TVL estimation scales with deposit
- Volume scales proportionally

---

### Test 6: Unequal Weights (Edge Case)
**Input:**
```json
{
  "token0_symbol": "ETH",
  "token1_symbol": "USDC",
  "token_weights": [0.8, 0.2],
  "deposit_amounts": [8000, 2000],
  "window_hours": 168
}
```

**Expected Behavior:**
- Should accept custom weights
- IL calculation still valid (assumes 50/50 for constant product)
- Total deposit value = 10000

---

### Test 7: Very Short Window (24 hours)
**Input:**
```json
{
  "token0_symbol": "ETH",
  "token1_symbol": "USDC",
  "token_weights": [0.5, 0.5],
  "deposit_amounts": [5000, 5000],
  "window_hours": 24
}
```

**Expected Behavior:**
- Should calculate for 1 day
- Annualized rates will be extrapolated
- Smaller volume_window
- May show different IL than weekly window

---

### Test 8: Error Handling - Invalid Token
**Input:**
```json
{
  "token0_symbol": "INVALID",
  "token1_symbol": "USDC",
  "token_weights": [0.5, 0.5],
  "deposit_amounts": [5000, 5000],
  "window_hours": 168
}
```

**Expected Behavior:**
- Should return error in output
- IL_percent: 0
- fee_apr_est: 0
- Notes should contain error message

---

## Validation Tests

### Validation 1: IL Formula Correctness

Test the core IL formula with known values:

```typescript
// If price doubles (ratio = 2.0):
// IL should be approximately -5.72%
const result = calculateImpermanentLoss(2.0);
// Expected: ilPercent ≈ -5.72
```

```typescript
// If price stays same (ratio = 1.0):
// IL should be 0%
const result = calculateImpermanentLoss(1.0);
// Expected: ilPercent = 0
```

```typescript
// If price halves (ratio = 0.5):
// IL should be approximately -5.72%
const result = calculateImpermanentLoss(0.5);
// Expected: ilPercent ≈ -5.72
```

```typescript
// If price 4x (ratio = 4.0):
// IL should be approximately -20%
const result = calculateImpermanentLoss(4.0);
// Expected: ilPercent ≈ -20
```

---

### Validation 2: Fee APR Logic

Test fee APR calculation:

```typescript
// High volume pool
const apr1 = estimateFeeAPR(
  1000000,  // $1M daily volume
  10000000, // $10M TVL
  0.003     // 0.3% fee
);
// Expected: ~10.95% APR

// Low volume pool
const apr2 = estimateFeeAPR(
  100000,   // $100k daily volume
  5000000,  // $5M TVL
  0.003     // 0.3% fee
);
// Expected: ~2.19% APR
```

---

### Validation 3: Pool Type Classification

Test pool classification logic:

```typescript
// Stablecoin pool
const metrics1 = estimatePoolMetrics("USDC", "USDT", 10000);
// Expected: feeTier = 0.0005, volumeRatio = 0.5

// ETH/Stablecoin pool
const metrics2 = estimatePoolMetrics("ETH", "USDC", 10000);
// Expected: feeTier = 0.003, volumeRatio = 1.2

// Major/Major pool
const metrics3 = estimatePoolMetrics("LINK", "UNI", 10000);
// Expected: feeTier = 0.003, volumeRatio = 0.6
```

---

## Integration Tests

### Integration 1: Full E2E Test
```bash
# Start server
npm run dev

# Test endpoint
curl -X POST http://localhost:3000/calculate_il \
  -H "Content-Type: application/json" \
  -d '{
    "token0_symbol": "ETH",
    "token1_symbol": "USDC",
    "deposit_amounts": [5000, 5000],
    "window_hours": 168
  }'
```

**Expected Response:**
- HTTP 200 OK
- Valid JSON response
- All required fields present
- IL_percent is a number
- Notes array contains strings

---

### Integration 2: Echo Test
```bash
curl -X POST http://localhost:3000/echo \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello World"}'
```

**Expected Response:**
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

## Performance Tests

### Performance 1: Response Time
- Average response should be < 3 seconds
- 95th percentile < 5 seconds
- Network latency to CoinGecko is main bottleneck

### Performance 2: Concurrent Requests
- Should handle 10+ concurrent requests
- No memory leaks
- Proper error handling

---

## Accuracy Validation

### Accuracy Test 1: Compare with Known Pool

Use a real pool with known data:
- Uniswap V2 ETH/USDC pool on Ethereum
- Compare calculated IL with actual IL from pool analytics
- Target: <10% error margin

### Accuracy Test 2: Backtesting

For historical period with known outcomes:
1. Get historical prices for date range
2. Calculate predicted IL
3. Compare with actual pool performance
4. Measure error percentage

**Example:**
- Period: Jan 1 - Jan 7, 2024
- Pair: ETH/USDC
- Known ETH price change: +5%
- Known actual IL: ~0.06%
- Calculated IL should be within ±0.006%

---

## Edge Cases

### Edge Case 1: Price Doesn't Change
- ratio = 1.0
- IL should be exactly 0%

### Edge Case 2: Extreme Price Movement
- ratio = 100 (100x increase)
- Should not error
- IL should be very negative

### Edge Case 3: Zero TVL
- Should not divide by zero
- Should return 0 APR

### Edge Case 4: Negative Amounts
- Should handle validation error
- Zod should reject negative deposits

---

## Security Tests

### Security 1: Input Validation
- Test SQL injection attempts in token symbols
- Test XSS in text fields
- Verify Zod schema prevents invalid inputs

### Security 2: Rate Limiting
- Test CoinGecko rate limits
- Verify graceful handling of 429 errors
- Test fallback behavior

---

## Checklist for Acceptance

- [ ] All test cases pass
- [ ] IL formula validated against known values
- [ ] Fee APR calculation verified
- [ ] Pool type classification working
- [ ] Error handling covers edge cases
- [ ] Response times < 3 seconds average
- [ ] Backtesting shows <10% error
- [ ] Documentation complete
- [ ] x402 compatible
- [ ] Deployable to production

---

## Running Tests

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run manual tests
node test-runner.js

# Check TypeScript
npm run build
```

---

## Notes for Reviewers

1. **CoinGecko Dependency**: Free tier has rate limits. Production might need Pro tier.
2. **TVL Estimation**: Uses heuristics since we don't have on-chain data access.
3. **Historical Accuracy**: Limited to CoinGecko's historical data availability.
4. **AMM Type**: Currently supports constant product (x*y=k) AMMs only.
5. **Real-time Prices**: Not real-time; uses latest historical data from CoinGecko.

---

**Test Coverage Target: 90%+**
**Acceptance Criteria: All core tests passing**
