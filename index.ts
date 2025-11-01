import { createAgentApp } from '@lucid-dreams/agent-kit';
import { z } from 'zod';

// ============================================
// STEP 1: Environment & Configuration
// ============================================
console.log('[STARTUP] ===== LP IMPERMANENT LOSS ESTIMATOR =====');
console.log('[STARTUP] Step 1: Loading environment variables...');

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = '0.0.0.0'; // Railway requires binding to 0.0.0.0
const FACILITATOR_URL = process.env.FACILITATOR_URL || '';
const WALLET_ADDRESS = process.env.ADDRESS || '';
const NETWORK = process.env.NETWORK || 'base';
const DEFAULT_PRICE = process.env.DEFAULT_PRICE || '$0.10';

console.log('[CONFIG] Port:', PORT);
console.log('[CONFIG] Host:', HOST);
console.log('[CONFIG] Facilitator URL:', FACILITATOR_URL ? 'Set ✓' : 'Not set ✗');
console.log('[CONFIG] Wallet Address:', WALLET_ADDRESS ? 'Set ✓' : 'Not set ✗');
console.log('[CONFIG] Network:', NETWORK);
console.log('[CONFIG] Default Price:', DEFAULT_PRICE);

// ============================================
// STEP 2: Helper Functions
// ============================================
console.log('[STARTUP] Step 2: Setting up helper functions...');

interface TokenPriceData {
  current: number;
  historical: number;
}

interface PoolPosition {
  token0Symbol: string;
  token1Symbol: string;
  token0Amount: number;
  token1Amount: number;
  entryPriceRatio: number;
  daysHeld: number;
}

interface ILCalculation {
  token0Symbol: string;
  token1Symbol: string;
  initialValue: number;
  currentValue: number;
  hodlValue: number;
  impermanentLoss: number;
  impermanentLossPercent: number;
  estimatedFeeAPR: number;
  estimatedFeesEarned: number;
  netProfitLoss: number;
  netProfitLossPercent: number;
  recommendation: string;
  priceChange: {
    token0: number;
    token1: number;
    ratio: number;
  };
}

// Fetch historical and current prices from CoinGecko
async function fetchTokenPrices(
  token0: string,
  token1: string,
  daysAgo: number
): Promise<{ token0: TokenPriceData; token1: TokenPriceData }> {
  console.log(`[PRICE_FETCH] Fetching prices for ${token0}/${token1} (${daysAgo} days ago)`);
  
  const coinGeckoIds: Record<string, string> = {
    ETH: 'ethereum',
    WETH: 'ethereum',
    BTC: 'bitcoin',
    WBTC: 'wrapped-bitcoin',
    USDC: 'usd-coin',
    USDT: 'tether',
    DAI: 'dai',
  };

  const token0Id = coinGeckoIds[token0.toUpperCase()];
  const token1Id = coinGeckoIds[token1.toUpperCase()];

  if (!token0Id || !token1Id) {
    throw new Error(`Unsupported token pair: ${token0}/${token1}`);
  }

  const historicalDate = new Date();
  historicalDate.setDate(historicalDate.getDate() - daysAgo);
  const dateStr = historicalDate.toISOString().split('T')[0].split('-').reverse().join('-');

  const [token0Current, token1Current, token0Historical, token1Historical] = await Promise.all([
    fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${token0Id}&vs_currencies=usd`),
    fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${token1Id}&vs_currencies=usd`),
    fetch(`https://api.coingecko.com/api/v3/coins/${token0Id}/history?date=${dateStr}`),
    fetch(`https://api.coingecko.com/api/v3/coins/${token1Id}/history?date=${dateStr}`),
  ]);

  const [t0c, t1c, t0h, t1h] = await Promise.all([
    token0Current.json() as Promise<any>,
    token1Current.json() as Promise<any>,
    token0Historical.json() as Promise<any>,
    token1Historical.json() as Promise<any>,
  ]);

  return {
    token0: {
      current: t0c[token0Id]?.usd || 0,
      historical: t0h.market_data?.current_price?.usd || 0,
    },
    token1: {
      current: t1c[token1Id]?.usd || 0,
      historical: t1h.market_data?.current_price?.usd || 0,
    },
  };
}

// Calculate IL using constant product formula (x * y = k)
function calculateImpermanentLoss(position: PoolPosition, prices: {
  token0: TokenPriceData;
  token1: TokenPriceData;
}): ILCalculation {
  console.log('[IL_CALC] Calculating impermanent loss...');
  
  const { token0Amount, token1Amount, daysHeld } = position;
  
  // Price change ratios
  const priceRatio = prices.token0.current / prices.token1.current;
  const entryRatio = prices.token0.historical / prices.token1.historical;
  const priceChangeRatio = priceRatio / entryRatio;

  // Initial portfolio value
  const initialValue = 
    token0Amount * prices.token0.historical + 
    token1Amount * prices.token1.historical;

  // HODL value (if held outside pool)
  const hodlValue = 
    token0Amount * prices.token0.current + 
    token1Amount * prices.token1.current;

  // Current pool value with IL effect
  // Using formula: V_pool = 2 * sqrt(k * P) where k = x * y, P = price ratio
  const k = token0Amount * token1Amount;
  const currentPoolValue = 2 * Math.sqrt(k * priceRatio) * prices.token1.current;

  // Impermanent Loss
  const impermanentLoss = currentPoolValue - hodlValue;
  const impermanentLossPercent = (impermanentLoss / hodlValue) * 100;

  // Estimate fee APR based on pool characteristics
  // Volatile pairs (BTC/ETH) ~= 0.3% fees → 20-40% APR
  // Stable pairs (USDC/USDT) ~= 0.01% fees → 2-5% APR
  const isStablePair = 
    ['USDC', 'USDT', 'DAI'].includes(position.token0Symbol.toUpperCase()) &&
    ['USDC', 'USDT', 'DAI'].includes(position.token1Symbol.toUpperCase());
  const estimatedFeeAPR = isStablePair ? 0.03 : 0.30; // 3% or 30%

  // Fees earned = (APR * initial value * days held) / 365
  const estimatedFeesEarned = (estimatedFeeAPR * initialValue * daysHeld) / 365;

  // Net P&L
  const netProfitLoss = impermanentLoss + estimatedFeesEarned;
  const netProfitLossPercent = (netProfitLoss / initialValue) * 100;

  // Recommendation logic
  let recommendation = '';
  if (impermanentLossPercent > -2 && estimatedFeesEarned > Math.abs(impermanentLoss)) {
    recommendation = '✅ Fees are covering IL well. Position looks healthy.';
  } else if (impermanentLossPercent < -10) {
    recommendation = '⚠️ Significant IL detected. Consider rebalancing if fees don\'t compensate.';
  } else {
    recommendation = '📊 Monitor closely. IL is moderate relative to fee earnings.';
  }

  return {
    token0Symbol: position.token0Symbol,
    token1Symbol: position.token1Symbol,
    initialValue,
    currentValue: currentPoolValue,
    hodlValue,
    impermanentLoss,
    impermanentLossPercent,
    estimatedFeeAPR: estimatedFeeAPR * 100, // Convert to percentage
    estimatedFeesEarned,
    netProfitLoss,
    netProfitLossPercent,
    recommendation,
    priceChange: {
      token0: ((prices.token0.current - prices.token0.historical) / prices.token0.historical) * 100,
      token1: ((prices.token1.current - prices.token1.historical) / prices.token1.historical) * 100,
      ratio: (priceChangeRatio - 1) * 100,
    },
  };
}

console.log('[STARTUP] Helper functions ready ✓');

// ============================================
// STEP 3: Create Agent App
// ============================================
console.log('[STARTUP] Step 3: Creating agent app...');

const app = createAgentApp({
  name: 'LP Impermanent Loss Estimator',
  description: 'Calculate impermanent loss and fee APR for liquidity provider positions using real historical price data',
  version: '1.0.0',
  paymentsConfig: {
    facilitatorUrl: FACILITATOR_URL || 'https://facilitator.cdp.coinbase.com',
    address: (WALLET_ADDRESS || '0xe7A413d4192fdee1bB5ecdf9D07A1827Eb15Bc1F') as `0x${string}`,
    network: NETWORK || 'base',
    defaultPrice: DEFAULT_PRICE || '$0.10',
  },
});

console.log('[STARTUP] Agent app created ✓');
console.log('[CONFIG] Payments enabled:', app.payments ? 'Yes ✓' : 'No ✗');

// Access the underlying Hono app for custom routes
const honoApp = app.app;

// ============================================
// x402scan Compatible Middleware
// ============================================
console.log('[STARTUP] Adding x402scan-compatible middleware...');

// Add x402-compliant response for the calculate-il endpoint
honoApp.post('/entrypoints/calculate-il', async (c) => {
  // Check if there's a payment header
  const paymentHeader = c.req.header('X-PAYMENT');
  
  if (!paymentHeader) {
    // Return 402 with x402scan-compliant schema
    return c.json({
      x402Version: 1,
      accepts: [{
        scheme: "exact",
        network: "base",
        maxAmountRequired: "100000", // $0.10 in USDC (6 decimals)
        resource: "/entrypoints/calculate-il",
        description: "Calculate impermanent loss and fee APR for liquidity provider positions using historical price data",
        mimeType: "application/json",
        payTo: "0xe7A413d4192fdee1bB5ecdF9D07A1827Eb15Bc1F",
        maxTimeoutSeconds: 300,
        asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
        outputSchema: {
          input: {
            type: "http",
            method: "POST",
            bodyType: "json",
            bodyFields: {
              token0Symbol: {
                type: "string",
                required: true,
                description: "First token symbol (e.g., ETH, BTC, USDC)",
                enum: ["ETH", "WETH", "BTC", "WBTC", "USDC", "USDT", "DAI"]
              },
              token1Symbol: {
                type: "string",
                required: true,
                description: "Second token symbol (e.g., USDC, USDT, DAI)",
                enum: ["ETH", "WETH", "BTC", "WBTC", "USDC", "USDT", "DAI"]
              },
              token0Amount: {
                type: "number",
                required: true,
                description: "Amount of first token in the pool (e.g., 1.5)"
              },
              token1Amount: {
                type: "number",
                required: true,
                description: "Amount of second token in the pool (e.g., 3000)"
              },
              daysHeld: {
                type: "number",
                required: true,
                description: "Number of days the position has been held (e.g., 30)"
              }
            }
          },
          output: {
            type: "object",
            properties: {
              token0Symbol: { type: "string" },
              token1Symbol: { type: "string" },
              initialValue: { type: "number", description: "Initial position value in USD" },
              currentValue: { type: "number", description: "Current pool value in USD" },
              hodlValue: { type: "number", description: "Value if held outside pool in USD" },
              impermanentLoss: { type: "number", description: "Impermanent loss in USD" },
              impermanentLossPercent: { type: "number", description: "Impermanent loss as percentage" },
              estimatedFeeAPR: { type: "number", description: "Estimated fee APR percentage" },
              estimatedFeesEarned: { type: "number", description: "Estimated fees earned in USD" },
              netProfitLoss: { type: "number", description: "Net profit/loss (IL + fees) in USD" },
              netProfitLossPercent: { type: "number", description: "Net profit/loss percentage" },
              recommendation: { type: "string", description: "Actionable recommendation" },
              priceChange: {
                type: "object",
                properties: {
                  token0: { type: "number", description: "Token0 price change %" },
                  token1: { type: "number", description: "Token1 price change %" },
                  ratio: { type: "number", description: "Price ratio change %" }
                }
              }
            }
          }
        },
        extra: {
          supportedTokens: ["ETH", "WETH", "BTC", "WBTC", "USDC", "USDT", "DAI"],
          dataSource: "CoinGecko API",
          calculationMethod: "Constant Product AMM Formula (x × y = k)"
        }
      }]
    }, 402);
  }
  
  // If payment header exists, process the calculation
  try {
    console.log('[HANDLER] calculate-il called with payment');
    const body = await c.req.json();
    
    const position: PoolPosition = {
      token0Symbol: body.token0Symbol,
      token1Symbol: body.token1Symbol,
      token0Amount: body.token0Amount,
      token1Amount: body.token1Amount,
      daysHeld: body.daysHeld,
      entryPriceRatio: 1,
    };

    const prices = await fetchTokenPrices(
      body.token0Symbol,
      body.token1Symbol,
      body.daysHeld
    );

    const result = calculateImpermanentLoss(position, prices);
    console.log('[HANDLER] Calculation complete:', result);
    
    return c.json(result);
  } catch (error: any) {
    console.error('[ERROR] Calculation failed:', error);
    return c.json({ error: error.message }, 500);
  }
});

console.log('[STARTUP] x402scan middleware added ✓');

// ============================================
// STEP 4: Define Entrypoints
// ============================================
console.log('[STARTUP] Step 4: Defining entrypoints...');

// Health check endpoint (using Hono app directly)
honoApp.get('/health', (c) => {
  console.log('[HEALTH] Health check requested');
  return c.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'LP Impermanent Loss Estimator',
    version: '1.0.0'
  });
});

console.log('[STARTUP] Entrypoints defined via custom middleware ✓');

// ============================================
// STEP 5: Start Server (Node.js compatible)
// ============================================
console.log('[STARTUP] Step 5: Starting server with Node.js...');

import { serve } from '@hono/node-server';

const server = serve({
  fetch: honoApp.fetch,
  port: PORT,
  hostname: HOST,
}, (info) => {
  console.log(`[SUCCESS] ✓ Server running at http://${info.address}:${info.port}`);
  console.log(`[SUCCESS] ✓ Health check: http://${info.address}:${info.port}/health`);
  console.log(`[SUCCESS] ✓ Entrypoints: http://${info.address}:${info.port}/entrypoints`);
  console.log('[SUCCESS] ===== READY TO ACCEPT REQUESTS =====');
});

// Keep-alive to prevent process from exiting
const keepAlive = setInterval(() => {
  console.log('[KEEPALIVE] Server is running...');
}, 30000); // Log every 30 seconds

// ============================================
// STEP 6: Graceful Shutdown
// ============================================
const shutdown = () => {
  console.log('[SHUTDOWN] Received shutdown signal');
  clearInterval(keepAlive);
  server.close(() => {
    console.log('[SHUTDOWN] Server stopped gracefully');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
