// PRODUCTION VERSION - Plain Hono (No agent-kit issues!)
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { z } from "zod";

const app = new Hono();

// Core IL calculation for constant product AMM
function calculateImpermanentLoss(priceRatio: number) {
  const sqrtRatio = Math.sqrt(priceRatio);
  const lpValue = (2 * sqrtRatio) / (1 + priceRatio);
  const hodlValue = 1;
  const ilPercent = (lpValue - hodlValue) * 100;
  return { ilPercent, hodlValue, lpValue };
}

// CoinGecko API interface
interface CoinGeckoResponse {
  prices: [number, number][];
}

async function fetchHistoricalPrices(
  token0Symbol: string,
  token1Symbol: string,
  daysBack: number
): Promise<{ initialRatio: number; finalRatio: number; prices: any[] }> {
  const coinGeckoIds: Record<string, string> = {
    ETH: "ethereum", WETH: "ethereum", BTC: "bitcoin", WBTC: "wrapped-bitcoin",
    USDC: "usd-coin", USDT: "tether", DAI: "dai", MATIC: "matic-network",
    LINK: "chainlink", UNI: "uniswap", AAVE: "aave", CRV: "curve-dao-token", BAL: "balancer",
  };

  const token0Id = coinGeckoIds[token0Symbol.toUpperCase()] || token0Symbol.toLowerCase();
  const token1Id = coinGeckoIds[token1Symbol.toUpperCase()] || token1Symbol.toLowerCase();

  const [data0, data1] = await Promise.all([
    fetch(`https://api.coingecko.com/api/v3/coins/${token0Id}/market_chart?vs_currency=usd&days=${daysBack}`).then(r => r.json()),
    fetch(`https://api.coingecko.com/api/v3/coins/${token1Id}/market_chart?vs_currency=usd&days=${daysBack}`).then(r => r.json()),
  ]);

  if (!data0.prices || !data1.prices) {
    throw new Error("Failed to fetch price data from CoinGecko");
  }

  const initialPrice0 = data0.prices[0][1];
  const initialPrice1 = data1.prices[0][1];
  const finalPrice0 = data0.prices[data0.prices.length - 1][1];
  const finalPrice1 = data1.prices[data1.prices.length - 1][1];

  const initialRatio = initialPrice0 / initialPrice1;
  const finalRatio = finalPrice0 / finalPrice1;

  return {
    initialRatio,
    finalRatio,
    prices: data0.prices.map((p: [number, number], i: number) => ({
      timestamp: p[0],
      ratio: p[1] / (data1.prices[i]?.[1] || data1.prices[data1.prices.length - 1][1]),
    })),
  };
}

function estimateFeeAPR(dailyVolume: number, tvl: number, feeTier: number = 0.003): number {
  if (tvl === 0) return 0;
  const annualFees = dailyVolume * feeTier * 365;
  return (annualFees / tvl) * 100;
}

function estimatePoolMetrics(token0: string, token1: string, depositValue: number) {
  const poolTypes: Record<string, { volumeRatio: number; feeTier: number }> = {
    stablecoin: { volumeRatio: 0.5, feeTier: 0.0005 },
    eth_stablecoin: { volumeRatio: 1.2, feeTier: 0.003 },
    eth_btc: { volumeRatio: 0.8, feeTier: 0.003 },
    major_major: { volumeRatio: 0.6, feeTier: 0.003 },
    major_stable: { volumeRatio: 0.7, feeTier: 0.003 },
    default: { volumeRatio: 0.3, feeTier: 0.003 },
  };

  const stablecoins = ["USDC", "USDT", "DAI"];
  const majorTokens = ["ETH", "WETH", "BTC", "WBTC", "MATIC", "LINK", "UNI", "AAVE"];
  let poolType = "default";

  if (stablecoins.includes(token0) && stablecoins.includes(token1)) poolType = "stablecoin";
  else if ((["ETH", "WETH"].includes(token0) && stablecoins.includes(token1)) || 
           (["ETH", "WETH"].includes(token1) && stablecoins.includes(token0))) poolType = "eth_stablecoin";
  else if ((["ETH", "WETH"].includes(token0) && ["BTC", "WBTC"].includes(token1)) || 
           (["ETH", "WETH"].includes(token1) && ["BTC", "WBTC"].includes(token0))) poolType = "eth_btc";
  else if (majorTokens.includes(token0) && majorTokens.includes(token1)) poolType = "major_major";
  else if ((majorTokens.includes(token0) && stablecoins.includes(token1)) || 
           (majorTokens.includes(token1) && stablecoins.includes(token0))) poolType = "major_stable";

  const { volumeRatio, feeTier } = poolTypes[poolType];
  const estimatedTVL = depositValue * 1000;
  const estimatedDailyVolume = estimatedTVL * volumeRatio;
  return { estimatedTVL, estimatedDailyVolume, feeTier };
}

// Routes
app.get("/", (c) => {
  return c.json({
    name: "LP Impermanent Loss Estimator",
    version: "1.0.0",
    description: "Calculate IL and fee APR for LP positions",
    endpoints: {
      "GET /": "API information",
      "GET /health": "Health check",
      "POST /health": "Health check (POST)",
      "POST /echo": "Echo test (FREE)",
      "POST /calculate_il": "Calculate impermanent loss ($0.01 USDC suggested)",
    },
    pricing: {
      health: "FREE",
      echo: "FREE",
      calculate_il: "$0.01 USDC per calculation (honor system)",
    },
    payment_address: process.env.X402_PAYMENT_ADDRESS || "0xe7A413d4192fdee1bB5ecdF9D07A1827Eb15Bc1F",
  });
});

app.get("/health", (c) => {
  return c.json({ 
    status: "healthy", 
    timestamp: Date.now(),
    uptime: process.uptime(),
    version: "1.0.0",
  });
});

app.post("/health", (c) => {
  return c.json({ 
    status: "healthy", 
    timestamp: Date.now(),
    uptime: process.uptime(),
    version: "1.0.0",
  });
});

app.post("/echo", async (c) => {
  try {
    const body = await c.req.json();
    return c.json({ 
      echo: body,
      timestamp: Date.now(),
      pricing: "FREE",
    });
  } catch {
    return c.json({ echo: {}, timestamp: Date.now(), pricing: "FREE" });
  }
});

app.post("/calculate_il", async (c) => {
  try {
    const body = await c.req.json();
    const { token0_symbol, token1_symbol, deposit_amounts, window_hours = 168 } = body;

    if (!token0_symbol || !token1_symbol || !deposit_amounts || deposit_amounts.length !== 2) {
      return c.json({ 
        error: "Missing required fields: token0_symbol, token1_symbol, deposit_amounts[2]" 
      }, 400);
    }

    const daysBack = Math.ceil(window_hours / 24);
    const priceData = await fetchHistoricalPrices(token0_symbol, token1_symbol, daysBack);
    const priceRatio = priceData.finalRatio / priceData.initialRatio;
    const ilResult = calculateImpermanentLoss(priceRatio);
    const totalDepositValue = deposit_amounts[0] + deposit_amounts[1];
    const poolMetrics = estimatePoolMetrics(token0_symbol, token1_symbol, totalDepositValue);
    const feeAPR = estimateFeeAPR(poolMetrics.estimatedDailyVolume, poolMetrics.estimatedTVL, poolMetrics.feeTier);
    const ilAnnualized = ilResult.ilPercent * (365 / daysBack);
    const netAPR = feeAPR + ilAnnualized;

    const notes = [];
    if (Math.abs(ilResult.ilPercent) < 1) notes.push("Low impermanent loss - price ratio remained stable");
    else if (Math.abs(ilResult.ilPercent) > 10) notes.push("⚠️ High impermanent loss - significant price divergence");
    if (feeAPR > Math.abs(ilAnnualized)) notes.push("✅ Fee income exceeds annualized IL - profitable position");
    else notes.push("⚠️ IL may exceed fee income - consider rebalancing");
    notes.push(`Price ratio changed by ${((priceRatio - 1) * 100).toFixed(2)}% over the period`);
    notes.push(`Pool type: ${token0_symbol}/${token1_symbol} with ${(poolMetrics.feeTier * 100).toFixed(2)}% fee tier`);

    const volumeWindow = poolMetrics.estimatedDailyVolume * daysBack;

    return c.json({
      success: true,
      pricing_note: "Suggested price: $0.01 USDC per calculation (honor system for now)",
      data: {
        IL_percent: Number(ilResult.ilPercent.toFixed(4)),
        fee_apr_est: Number(feeAPR.toFixed(2)),
        net_apr_est: Number(netAPR.toFixed(2)),
        volume_window: Number(volumeWindow.toFixed(2)),
        price_change_percent: Number(((priceRatio - 1) * 100).toFixed(2)),
        il_annualized_percent: Number(ilAnnualized.toFixed(2)),
        estimated_tvl: Number(poolMetrics.estimatedTVL.toFixed(2)),
        estimated_daily_volume: Number(poolMetrics.estimatedDailyVolume.toFixed(2)),
        fee_tier_percent: Number((poolMetrics.feeTier * 100).toFixed(3)),
        notes: notes,
      },
    });
  } catch (error: any) {
    return c.json({ 
      success: false,
      error: error.message || "Failed to calculate impermanent loss",
    }, 500);
  }
});

// Server setup
const port = Number(process.env.PORT) || 3000;
const hostname = "0.0.0.0";

console.log("==============================================");
console.log("🚀 LP Impermanent Loss Estimator");
console.log("==============================================");
console.log(`📊 Port: ${port}`);
console.log(`🌐 Hostname: ${hostname}`);
console.log(`💰 Payment Address: ${process.env.X402_PAYMENT_ADDRESS || '0xe7A413d4192fdee1bB5ecdF9D07A1827Eb15Bc1F'}`);
console.log(`🔢 Node: ${process.version}`);
console.log("----------------------------------------------");
console.log("Starting server...");

try {
  const server = serve({ fetch: app.fetch, port, hostname }, (info) => {
    console.log("✅ SERVER READY AND LISTENING");
    console.log(`🌍 URL: http://${hostname}:${info.port}`);
    console.log("📡 Endpoints: GET /, GET+POST /health, POST /echo, POST /calculate_il");
    console.log("==============================================");
  });

  const keepAlive = setInterval(() => {
    console.log(`⏰ Uptime: ${Math.floor(process.uptime())}s`);
  }, 60000);

  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n⏸️ ${signal} received - shutting down gracefully...`);
    clearInterval(keepAlive);
    server.close(() => {
      console.log("✅ Server closed");
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("uncaughtException", (err) => {
    console.error("💥 UNCAUGHT EXCEPTION:", err);
    shutdown("EXCEPTION");
  });
  process.on("unhandledRejection", (reason) => {
    console.error("💥 UNHANDLED REJECTION:", reason);
  });

  console.log("✅ Server initialization complete");
} catch (error) {
  console.error("❌ FATAL ERROR:", error);
  process.exit(1);
}

export default app;
