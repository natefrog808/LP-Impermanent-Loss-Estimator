import { z } from "zod";
import { createAgentApp } from "@lucid-dreams/agent-kit";
import { createServer } from "node:http";

const { app, addEntrypoint } = createAgentApp({
  name: "lp-impermanent-loss-estimator",
  version: "0.1.0",
  description: "Calculate IL and fee APR for any LP position or simulated deposit",
});

// Core IL calculation for constant product AMM (x * y = k)
function calculateImpermanentLoss(
  priceRatio: number
): { ilPercent: number; hodlValue: number; lpValue: number } {
  // Price ratio = final_price / initial_price
  // IL formula: 2 * sqrt(price_ratio) / (1 + price_ratio) - 1
  const sqrtRatio = Math.sqrt(priceRatio);
  const lpValue = (2 * sqrtRatio) / (1 + priceRatio);
  const hodlValue = 1; // normalized
  const ilPercent = (lpValue - hodlValue) * 100;

  return { ilPercent, hodlValue, lpValue };
}

// Add health check endpoint
addEntrypoint({
  key: "health",
  description: "Health check endpoint",
  input: z.object({}).optional() as any,
  async handler() {
    return {
      output: { 
        status: "healthy",
        timestamp: Date.now(),
        version: "0.1.0"
      },
      usage: { total_tokens: 10 },
    };
  },
});

// Type definition for CoinGecko API response
interface CoinGeckoResponse {
  prices: [number, number][];
}

// Fetch historical price data from CoinGecko
async function fetchHistoricalPrices(
  token0Symbol: string,
  token1Symbol: string,
  daysBack: number
): Promise<{ initialRatio: number; finalRatio: number; prices: any[] }> {
  const coinGeckoIds: Record<string, string> = {
    ETH: "ethereum",
    WETH: "ethereum",
    BTC: "bitcoin",
    WBTC: "wrapped-bitcoin",
    USDC: "usd-coin",
    USDT: "tether",
    DAI: "dai",
    MATIC: "matic-network",
    LINK: "chainlink",
    UNI: "uniswap",
    AAVE: "aave",
    CRV: "curve-dao-token",
    BAL: "balancer",
  };

  const token0Id = coinGeckoIds[token0Symbol.toUpperCase()] || token0Symbol.toLowerCase();
  const token1Id = coinGeckoIds[token1Symbol.toUpperCase()] || token1Symbol.toLowerCase();

  try {
    // Fetch historical data for both tokens
    const [data0, data1] = await Promise.all([
      fetch(
        `https://api.coingecko.com/api/v3/coins/${token0Id}/market_chart?vs_currency=usd&days=${daysBack}`
      ).then((r) => r.json()) as Promise<CoinGeckoResponse>,
      fetch(
        `https://api.coingecko.com/api/v3/coins/${token1Id}/market_chart?vs_currency=usd&days=${daysBack}`
      ).then((r) => r.json()) as Promise<CoinGeckoResponse>,
    ]);

    if (!data0.prices || !data1.prices) {
      throw new Error("Failed to fetch price data");
    }

    // Calculate price ratios (token0/token1)
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
  } catch (error) {
    throw new Error(`Failed to fetch prices: ${error}`);
  }
}

// Estimate fee APR based on volume and TVL
function estimateFeeAPR(
  dailyVolume: number,
  tvl: number,
  feeTier: number = 0.003 // 0.3% default
): number {
  if (tvl === 0) return 0;
  
  // Annual fee revenue = daily volume * fee tier * 365
  const annualFees = dailyVolume * feeTier * 365;
  
  // APR = annual fees / TVL
  const apr = (annualFees / tvl) * 100;
  
  return apr;
}

// Simulate volume based on token pair characteristics
function estimatePoolMetrics(
  token0: string,
  token1: string,
  depositValue: number
): { estimatedTVL: number; estimatedDailyVolume: number; feeTier: number } {
  // Volume/TVL ratios for different pool types
  const poolTypes: Record<string, { volumeRatio: number; feeTier: number }> = {
    stablecoin: { volumeRatio: 0.5, feeTier: 0.0005 }, // USDC/USDT - high volume, low fee
    eth_stablecoin: { volumeRatio: 1.2, feeTier: 0.003 }, // ETH/USDC - very high volume
    eth_btc: { volumeRatio: 0.8, feeTier: 0.003 }, // ETH/WBTC - high volume
    major_major: { volumeRatio: 0.6, feeTier: 0.003 }, // UNI/LINK - good volume
    major_stable: { volumeRatio: 0.7, feeTier: 0.003 }, // AAVE/USDC - good volume
    default: { volumeRatio: 0.3, feeTier: 0.003 }, // Others - lower volume
  };

  const stablecoins = ["USDC", "USDT", "DAI"];
  const majorTokens = ["ETH", "WETH", "BTC", "WBTC", "MATIC", "LINK", "UNI", "AAVE"];

  let poolType = "default";

  if (stablecoins.includes(token0) && stablecoins.includes(token1)) {
    poolType = "stablecoin";
  } else if (
    (["ETH", "WETH"].includes(token0) && stablecoins.includes(token1)) ||
    (["ETH", "WETH"].includes(token1) && stablecoins.includes(token0))
  ) {
    poolType = "eth_stablecoin";
  } else if (
    (["ETH", "WETH"].includes(token0) && ["BTC", "WBTC"].includes(token1)) ||
    (["ETH", "WETH"].includes(token1) && ["BTC", "WBTC"].includes(token0))
  ) {
    poolType = "eth_btc";
  } else if (majorTokens.includes(token0) && majorTokens.includes(token1)) {
    poolType = "major_major";
  } else if (
    (majorTokens.includes(token0) && stablecoins.includes(token1)) ||
    (majorTokens.includes(token1) && stablecoins.includes(token0))
  ) {
    poolType = "major_stable";
  }

  const { volumeRatio, feeTier } = poolTypes[poolType];

  // Estimate TVL (assume user deposit is 0.1% of pool for calculation)
  const estimatedTVL = depositValue * 1000;

  // Estimate daily volume based on TVL
  const estimatedDailyVolume = estimatedTVL * volumeRatio;

  return { estimatedTVL, estimatedDailyVolume, feeTier };
}

addEntrypoint({
  key: "calculate_il",
  description: "Calculate impermanent loss and fee APR for LP position",
  input: z.object({
    pool_address: z.string().optional().describe("LP pool address (optional for simulation)"),
    token0_symbol: z.string().describe("First token symbol (e.g., ETH, USDC)"),
    token1_symbol: z.string().describe("Second token symbol (e.g., USDT, DAI)"),
    token_weights: z
      .array(z.number())
      .length(2)
      .default([0.5, 0.5])
      .describe("Token weight distribution (default 50/50)"),
    deposit_amounts: z
      .array(z.number())
      .length(2)
      .describe("Amount of each token in USD value"),
    window_hours: z.number().default(168).describe("Historical window in hours (default 7 days)"),
  }) as any,
  async handler({ input }: { input: any }) {
    try {
      const {
        token0_symbol,
        token1_symbol,
        token_weights,
        deposit_amounts,
        window_hours,
      } = input;

      // Convert hours to days
      const daysBack = Math.ceil(window_hours / 24);

      // Fetch historical price data
      const priceData = await fetchHistoricalPrices(token0_symbol, token1_symbol, daysBack);

      // Calculate price ratio change
      const priceRatio = priceData.finalRatio / priceData.initialRatio;

      // Calculate impermanent loss
      const ilResult = calculateImpermanentLoss(priceRatio);

      // Calculate total deposit value
      const totalDepositValue = deposit_amounts[0] + deposit_amounts[1];

      // Estimate pool metrics
      const poolMetrics = estimatePoolMetrics(
        token0_symbol,
        token1_symbol,
        totalDepositValue
      );

      // Calculate fee APR
      const feeAPR = estimateFeeAPR(
        poolMetrics.estimatedDailyVolume,
        poolMetrics.estimatedTVL,
        poolMetrics.feeTier
      );

      // Calculate net APR (fee APR can offset IL)
      const ilAnnualized = ilResult.ilPercent * (365 / daysBack);
      const netAPR = feeAPR + ilAnnualized;

      // Generate notes
      const notes = [];

      if (Math.abs(ilResult.ilPercent) < 1) {
        notes.push("Low impermanent loss - price ratio remained stable");
      } else if (Math.abs(ilResult.ilPercent) > 10) {
        notes.push(
          "⚠️ High impermanent loss - significant price divergence detected"
        );
      }

      if (feeAPR > Math.abs(ilAnnualized)) {
        notes.push("✅ Fee income exceeds annualized IL - profitable position");
      } else {
        notes.push("⚠️ IL may exceed fee income - consider rebalancing");
      }

      notes.push(
        `Price ratio changed by ${((priceRatio - 1) * 100).toFixed(2)}% over the period`
      );
      notes.push(
        `Pool type: ${token0_symbol}/${token1_symbol} with ${(poolMetrics.feeTier * 100).toFixed(2)}% fee tier`
      );

      // Calculate volume in window
      const volumeWindow = poolMetrics.estimatedDailyVolume * daysBack;

      return {
        output: {
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
        usage: {
          total_tokens: JSON.stringify(input).length + JSON.stringify(notes).length,
        },
      };
    } catch (error) {
      return {
        output: {
          error: `Failed to calculate IL: ${error}`,
          IL_percent: 0,
          fee_apr_est: 0,
          volume_window: 0,
          notes: ["Error occurred during calculation"],
        },
        usage: { total_tokens: 100 },
      };
    }
  },
});

// Simple echo endpoint for testing
addEntrypoint({
  key: "echo",
  description: "Echo a message",
  input: z.object({ text: z.string() }) as any,
  async handler({ input }: { input: any }) {
    return {
      output: { text: String(input.text ?? "") },
      usage: { total_tokens: String(input.text ?? "").length },
    };
  },
});

// Start the HTTP server using Node's native http module
const port = Number(process.env.PORT) || 3000;

console.log("🚀 Starting LP Impermanent Loss Estimator...");
console.log(`📊 Port: ${port}`);
console.log(`💰 Payment Address: ${process.env.X402_PAYMENT_ADDRESS || 'Not configured'}`);

// Create HTTP server
const server = createServer(app.fetch);

server.listen(port, "0.0.0.0", () => {
  console.log(`✅ Server running on http://0.0.0.0:${port}`);
  console.log("📡 Endpoints:");
  console.log("   POST /health - Health check");
  console.log("   POST /calculate_il - Calculate impermanent loss");
  console.log("   POST /echo - Echo test");
});

// Handle shutdown gracefully
process.on("SIGTERM", () => {
  console.log("⏸️  SIGTERM received, shutting down gracefully...");
  server.close(() => {
    console.log("✅ Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("⏸️  SIGINT received, shutting down gracefully...");
  server.close(() => {
    console.log("✅ Server closed");
    process.exit(0);
  });
});

// Handle errors
server.on("error", (error) => {
  console.error("❌ Server error:", error);
  process.exit(1);
});

export default app;
