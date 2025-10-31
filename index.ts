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
  paymentsConfig: FACILITATOR_URL && WALLET_ADDRESS ? {
    facilitatorUrl: FACILITATOR_URL,
    address: WALLET_ADDRESS as `0x${string}`,
    network: NETWORK,
    defaultPrice: DEFAULT_PRICE,
  } : undefined,
});

console.log('[STARTUP] Agent app created ✓');

// Access the underlying Hono app for custom routes
const honoApp = app.app;

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

// Main IL calculation entrypoint
app.addEntrypoint({
  key: 'calculate-il',
  name: 'Calculate Impermanent Loss',
  description: 'Calculates impermanent loss and fee APR for a liquidity provider position using historical price data from CoinGecko',
  price: '$0.10',
  handler: async (ctx) => {
    console.log('[HANDLER] calculate-il called');
    
    // Parse input from context
    const input = ctx.input as {
      token0Symbol: string;
      token1Symbol: string;
      token0Amount: number;
      token1Amount: number;
      daysHeld: number;
    };
    
    const position: PoolPosition = {
      ...input,
      entryPriceRatio: 1, // We'll derive this from historical prices
    };

    const prices = await fetchTokenPrices(
      input.token0Symbol,
      input.token1Symbol,
      input.daysHeld
    );

    const result = calculateImpermanentLoss(position, prices);
    console.log('[HANDLER] Calculation complete:', result);
    
    return result;
  },
});

console.log('[STARTUP] Entrypoints defined ✓');

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
