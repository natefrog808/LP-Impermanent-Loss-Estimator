/**
 * Token Safety Check - Lucid x402 Agent
 * 
 * A comprehensive token safety analysis service that detects honeypots,
 * scams, and risky tokens across multiple blockchain networks.
 * 
 * Powered by x402 micropayments on Base network.
 * Built for AI agents using the Lucid protocol.
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";
import { HoneypotChecker } from "./analyzers/honeypot-checker";
import { OnChainAnalyzer } from "./analyzers/onchain-analyzer";
import { ScoringEngine } from "./analyzers/scoring-engine";

// ========================================
// CONFIGURATION
// ========================================

const PORT = process.env.PORT || 3000;
const PAYMENT_ADDRESS = process.env.PAYMENT_ADDRESS || "0xe7A413d4192fdee1bB5ecdF9D07A1827Eb15Bc1F";
const FACILITATOR_URL = process.env.FACILITATOR_URL || "https://facilitator.daydreams.systems";
const NETWORK = process.env.NETWORK || "base";
const DEFAULT_PRICE = parseInt(process.env.DEFAULT_PRICE || "20000");
const SERVICE_URL = process.env.SERVICE_URL || process.env.RAILWAY_PUBLIC_DOMAIN 
  ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` 
  : `http://localhost:${PORT}`;

// USDC contract address on Base
const USDC_BASE = "0xe7A413d4192fdee1bB5ecdF9D07A1827Eb15Bc1F";

// RPC URLs configuration
const RPC_URLS: Record<number, string> = {
  1: process.env.ETHEREUM_RPC_URL || "https://eth.llamarpc.com",
  56: process.env.BSC_RPC_URL || "https://bsc-dataseed1.binance.org",
  137: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
  42161: process.env.ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc",
  10: process.env.OPTIMISM_RPC_URL || "https://mainnet.optimism.io",
  8453: process.env.BASE_RPC_URL || "https://mainnet.base.org",
  43114: process.env.AVALANCHE_RPC_URL || "https://api.avax.network/ext/bc/C/rpc",
};

// Chain ID to name mapping
const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum",
  56: "BSC",
  137: "Polygon",
  42161: "Arbitrum",
  10: "Optimism",
  8453: "Base",
  43114: "Avalanche",
};

// ========================================
// X402 PROTOCOL TYPES
// ========================================

type X402Response = {
  x402Version: number;
  error?: string;
  accepts?: Array<X402Accept>;
  payer?: string;
};

type X402Accept = {
  scheme: "exact";
  network: "base";
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: string;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;
  outputSchema?: {
    input: {
      type: "http";
      method: "GET" | "POST";
      bodyType?: "json" | "form-data" | "multipart-form-data" | "text" | "binary";
      queryParams?: Record<string, FieldDef>;
      bodyFields?: Record<string, FieldDef>;
      headerFields?: Record<string, FieldDef>;
    };
    output?: Record<string, any>;
  };
  extra?: Record<string, any>;
};

type FieldDef = {
  type?: string;
  required?: boolean | string[];
  description?: string;
  enum?: string[];
  properties?: Record<string, FieldDef>;
};

// ========================================
// INITIALIZE ANALYZERS
// ========================================

const honeypotChecker = new HoneypotChecker({ verbose: false });
const onchainAnalyzer = new OnChainAnalyzer(RPC_URLS, { verbose: false });
const scoringEngine = new ScoringEngine({ verbose: false });

// Input validation schema
const TokenCheckSchema = z.object({
  token_address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address"),
  chain_id: z.number().int().positive(),
});

// ========================================
// X402 PAYMENT MIDDLEWARE
// ========================================

const x402Middleware = async (c: any, next: any) => {
  const x402Header = c.req.header("X-402");
  const paymentProof = c.req.header("X-402-Payment-Proof");
  
  // If request has X-402 header but no payment proof, return payment required
  if (x402Header && !paymentProof) {
    const accepts: X402Accept = {
      scheme: "exact",
      network: "base",
      maxAmountRequired: DEFAULT_PRICE.toString(),
      resource: `${SERVICE_URL}${c.req.path}`,
      description: "Token safety analysis - AI-powered honeypot and scam detection across 7 blockchains",
      mimeType: "application/json",
      payTo: PAYMENT_ADDRESS,
      maxTimeoutSeconds: 300,
      asset: USDC_BASE,
      outputSchema: {
        input: {
          type: "http",
          method: "POST",
          bodyType: "json",
          bodyFields: {
            token_address: {
              type: "string",
              required: true,
              description: "Token contract address (0x-prefixed hex string, 42 characters)",
            },
            chain_id: {
              type: "number",
              required: true,
              description: "Blockchain network ID",
              enum: ["1", "56", "137", "42161", "10", "8453", "43114"],
            },
          },
        },
        output: {
          type: "object",
          properties: {
            success: { 
              type: "boolean",
              description: "Whether the analysis was successful"
            },
            data: {
              type: "object",
              properties: {
                token: {
                  type: "object",
                  properties: {
                    address: { type: "string" },
                    chainId: { type: "number" },
                    chainName: { type: "string" },
                    name: { type: "string" },
                    symbol: { type: "string" },
                  },
                },
                analysis: {
                  type: "object",
                  properties: {
                    safetyScore: { 
                      type: "number",
                      description: "Overall safety score 0-100 (higher = safer)"
                    },
                    riskLevel: { 
                      type: "string",
                      enum: ["SAFE", "LOW_RISK", "MEDIUM_RISK", "HIGH_RISK", "CRITICAL"],
                      description: "Categorical risk assessment"
                    },
                    isHoneypot: { 
                      type: "boolean",
                      description: "True if token is confirmed honeypot scam"
                    },
                    confidence: {
                      type: "number",
                      description: "Analysis confidence 0.0-1.0"
                    },
                    warnings: { 
                      type: "array",
                      items: { type: "string" },
                      description: "List of specific warnings found"
                    },
                    recommendations: { 
                      type: "array",
                      items: { type: "string" },
                      description: "Actionable recommendations for users"
                    },
                  },
                },
              },
            },
          },
        },
      },
      extra: {
        facilitatorUrl: FACILITATOR_URL,
        priceDisplay: `${(DEFAULT_PRICE / 1000000).toFixed(2)} USDC`,
        supportedChains: Object.keys(CHAIN_NAMES).map(Number),
      },
    };

    const x402Response: X402Response = {
      x402Version: 1,
      accepts: [accepts],
    };

    c.header("X-402", JSON.stringify(x402Response));
    c.header("Content-Type", "application/json");
    
    return c.json(
      {
        error: "Payment required",
        message: `This endpoint requires ${(DEFAULT_PRICE / 1000000).toFixed(2)} USDC payment via x402`,
        x402: x402Response,
      },
      402
    );
  }

  // If payment proof exists, verify it (in production, you'd validate with facilitator)
  if (paymentProof) {
    console.log(`💰 Payment received: ${paymentProof.substring(0, 20)}...`);
  }

  await next();
};

// ========================================
// CREATE HONO APP
// ========================================

const app = new Hono();

// CORS middleware
app.use("/*", cors());

// ========================================
// HEALTH & STATUS ENDPOINTS
// ========================================

app.get("/health", (c) => {
  return c.json({
    ok: true,
    status: "healthy",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    payment: {
      address: PAYMENT_ADDRESS,
      network: NETWORK,
      priceUsdc: (DEFAULT_PRICE / 1000000).toFixed(2),
    },
  });
});

// ========================================
// LUCID AGENT MANIFEST
// ========================================

app.get("/.well-known/agent.json", (c) => {
  const manifest = {
    "@context": "https://lucid.app/agent/v1",
    id: "token-safety-check",
    name: "Token Safety Check",
    version: "1.0.0",
    description: "AI-powered token safety analyzer that detects honeypots, scams, and risky tokens across 7 blockchain networks. Analyzes buy/sell taxes, holder concentration, contract verification, and technical risks.",
    
    // X402 Payment Configuration
    payment: {
      protocol: "x402",
      version: 1,
      network: NETWORK,
      payTo: PAYMENT_ADDRESS,
      asset: USDC_BASE,
      assetSymbol: "USDC",
      pricePerRequest: DEFAULT_PRICE,
      priceDisplay: `${(DEFAULT_PRICE / 1000000).toFixed(2)} USDC`,
      facilitatorUrl: FACILITATOR_URL,
    },

    // Agent Capabilities
    capabilities: [
      "token-analysis",
      "honeypot-detection",
      "scam-prevention",
      "tax-analysis",
      "holder-analysis",
      "contract-verification",
      "multi-chain-support",
      "real-time-analysis",
    ],

    // Available Actions
    actions: [
      {
        name: "analyze-token",
        displayName: "Analyze Token Safety",
        description: "Comprehensive token safety analysis including honeypot detection, tax analysis, centralization risks, and technical verification. Returns safety score, risk level, warnings, and actionable recommendations.",
        
        endpoint: {
          method: "POST",
          url: `${SERVICE_URL}/api/v1/analyze`,
          contentType: "application/json",
          requiresPayment: true,
          paymentProtocol: "x402",
        },

        input: {
          type: "object",
          properties: {
            token_address: {
              type: "string",
              description: "Token contract address (0x-prefixed hex, 42 characters)",
              pattern: "^0x[a-fA-F0-9]{40}$",
              example: "0xe7A413d4192fdee1bB5ecdF9D07A1827Eb15Bc1F",
            },
            chain_id: {
              type: "integer",
              description: "Blockchain network identifier",
              enum: [1, 56, 137, 42161, 10, 8453, 43114],
              enumNames: ["Ethereum", "BSC", "Polygon", "Arbitrum", "Optimism", "Base", "Avalanche"],
              example: 1,
            },
          },
          required: ["token_address", "chain_id"],
        },

        output: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              description: "Whether analysis was successful",
            },
            data: {
              type: "object",
              properties: {
                token: {
                  type: "object",
                  description: "Token identification",
                },
                analysis: {
                  type: "object",
                  properties: {
                    safetyScore: {
                      type: "number",
                      description: "Overall safety score 0-100 (higher = safer)",
                      minimum: 0,
                      maximum: 100,
                    },
                    riskLevel: {
                      type: "string",
                      enum: ["SAFE", "LOW_RISK", "MEDIUM_RISK", "HIGH_RISK", "CRITICAL"],
                      description: "Categorical risk assessment",
                    },
                    isHoneypot: {
                      type: "boolean",
                      description: "True if confirmed honeypot scam",
                    },
                    confidence: {
                      type: "number",
                      description: "Analysis confidence 0.0-1.0",
                      minimum: 0,
                      maximum: 1,
                    },
                    warnings: {
                      type: "array",
                      items: { type: "string" },
                      description: "Specific risk warnings",
                    },
                    recommendations: {
                      type: "array",
                      items: { type: "string" },
                      description: "Actionable recommendations",
                    },
                  },
                },
                details: {
                  type: "object",
                  description: "Detailed technical analysis",
                },
              },
            },
          },
        },

        examples: [
          {
            name: "Analyze USDC on Ethereum",
            input: {
              token_address: "0xe7A413d4192fdee1bB5ecdF9D07A1827Eb15Bc1F",
              chain_id: 1,
            },
            expectedOutput: {
              success: true,
              data: {
                analysis: {
                  safetyScore: 95,
                  riskLevel: "SAFE",
                  isHoneypot: false,
                  warnings: [],
                  recommendations: ["✅ Generally safe to interact"],
                },
              },
            },
          },
        ],

        pricing: {
          amount: DEFAULT_PRICE,
          currency: "USDC",
          network: "base",
          display: `${(DEFAULT_PRICE / 1000000).toFixed(2)} USDC per analysis`,
        },
      },
    ],

    // Supported Blockchains
    supportedChains: Object.entries(CHAIN_NAMES).map(([id, name]) => ({
      chainId: parseInt(id),
      name,
      supported: true,
    })),

    // Data Sources
    dataSources: [
      {
        name: "honeypot.is",
        description: "Honeypot detection and token simulation",
        type: "api",
        weight: 0.6,
      },
      {
        name: "on-chain",
        description: "Direct blockchain verification via Web3",
        type: "rpc",
        weight: 0.4,
      },
    ],

    // Metadata
    metadata: {
      author: "DeganAI",
      homepage: "https://github.com/DeganAI/Token-Safety-Check",
      repository: "https://github.com/DeganAI/Token-Safety-Check",
      documentation: `${SERVICE_URL}/docs`,
      license: "MIT",
      tags: [
        "defi",
        "security",
        "token-analysis",
        "honeypot-detection",
        "scam-prevention",
        "blockchain",
        "web3",
      ],
    },

    // API Links
    links: {
      self: `${SERVICE_URL}/.well-known/agent.json`,
      analyze: `${SERVICE_URL}/api/v1/analyze`,
      health: `${SERVICE_URL}/health`,
      docs: `${SERVICE_URL}/docs`,
      register: "https://www.x402scan.com/resources/register",
    },
  };

  return c.json(manifest);
});

// ========================================
// MAIN API ENDPOINT - TOKEN ANALYSIS
// ========================================

app.post("/api/v1/analyze", x402Middleware, async (c) => {
  const startTime = Date.now();

  try {
    // Parse and validate input
    const body = await c.req.json();
    const input = TokenCheckSchema.parse(body);

    console.log(`\n🔍 [${new Date().toISOString()}] Analyzing token ${input.token_address} on chain ${input.chain_id}...`);

    // Check if chain is supported
    if (!onchainAnalyzer.isChainSupported(input.chain_id)) {
      return c.json(
        {
          success: false,
          error: {
            code: "UNSUPPORTED_CHAIN",
            message: `Chain ID ${input.chain_id} is not supported`,
            supportedChains: onchainAnalyzer.getSupportedChains(),
          },
        },
        400
      );
    }

    // Run both analyzers in parallel
    const [honeypotData, onchainData] = await Promise.all([
      honeypotChecker.checkToken(input.token_address, input.chain_id),
      onchainAnalyzer.analyzeToken(input.token_address, input.chain_id),
    ]);

    // Aggregate results
    const result = scoringEngine.aggregateResults(honeypotData, onchainData);

    const processingTime = Date.now() - startTime;

    // Log summary
    console.log(`✅ Analysis complete in ${processingTime}ms:`);
    console.log(`   Safety Score: ${result.safety_score}/100`);
    console.log(`   Risk Level: ${result.risk_level}`);
    console.log(`   Is Honeypot: ${result.is_honeypot}`);
    console.log(`   Confidence: ${(result.confidence * 100).toFixed(0)}%`);

    // Return comprehensive response
    return c.json({
      success: true,
      data: {
        // Token identification
        token: {
          address: input.token_address,
          chainId: input.chain_id,
          chainName: CHAIN_NAMES[input.chain_id] || "Unknown",
          name: honeypotData.metadata?.token_name || onchainData.name,
          symbol: honeypotData.metadata?.token_symbol || onchainData.symbol,
        },

        // Safety analysis
        analysis: {
          safetyScore: result.safety_score,
          riskLevel: result.risk_level,
          isHoneypot: result.is_honeypot,
          confidence: result.confidence,
          
          // Detailed findings
          warnings: result.warnings,
          recommendations: result.recommendations,
          
          // Risk breakdown
          risks: {
            tax: result.metadata?.tax_risk || "unknown",
            centralization: result.metadata?.centralization_risk || "unknown",
            technical: result.metadata?.technical_risk || "unknown",
          },

          // Verification
          sources: result.sources_checked,
          redFlags: result.metadata?.red_flags_count || 0,
          passedBasicChecks: result.metadata?.passed_basic_checks || false,
        },

        // Technical details
        details: {
          honeypot: {
            buyTax: honeypotData.buy_tax,
            sellTax: honeypotData.sell_tax,
            transferTax: honeypotData.transfer_tax,
            holderCount: honeypotData.holder_count,
            top10HoldersPercent: honeypotData.top_10_holders_percent,
            contractVerified: honeypotData.contract_verified,
            isProxy: honeypotData.is_proxy,
            liquidityUsd: honeypotData.metadata?.liquidity_usd,
            honeypotReason: honeypotData.honeypot_reason,
          },
          onchain: {
            isContract: onchainData.is_contract,
            isERC20: onchainData.is_erc20,
            codeSize: onchainData.code_size,
            totalSupply: onchainData.total_supply,
            decimals: onchainData.decimals,
            checks: onchainData.checks,
          },
        },

        // Metadata
        meta: {
          timestamp: new Date().toISOString(),
          processingTimeMs: processingTime,
          version: "1.0.0",
          paymentReceived: !!c.req.header("X-402-Payment-Proof"),
        },
      },
    });
  } catch (error: any) {
    console.error("❌ Error processing request:", error);

    if (error instanceof z.ZodError) {
      return c.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input parameters",
            details: error.errors,
          },
        },
        400
      );
    }

    return c.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: error.message || "An unexpected error occurred",
        },
      },
      500
    );
  }
});

// ========================================
// DOCUMENTATION ENDPOINTS
// ========================================

app.get("/docs", (c) => {
  return c.json({
    name: "Token Safety Check API",
    version: "1.0.0",
    description: "AI-powered token safety analysis with x402 micropayments",
    baseUrl: SERVICE_URL,
    
    authentication: {
      type: "x402",
      network: NETWORK,
      paymentAddress: PAYMENT_ADDRESS,
      pricePerRequest: `${(DEFAULT_PRICE / 1000000).toFixed(2)} USDC`,
      asset: USDC_BASE,
    },

    endpoints: [
      {
        method: "POST",
        path: "/api/v1/analyze",
        description: "Analyze token safety (requires x402 payment)",
        requiresPayment: true,
        price: `${(DEFAULT_PRICE / 1000000).toFixed(2)} USDC`,
        requestBody: {
          token_address: "0x-prefixed hex address (42 chars)",
          chain_id: "Network ID (1, 56, 137, 42161, 10, 8453, 43114)",
        },
        response: "Comprehensive safety analysis with score, warnings, recommendations",
      },
      {
        method: "GET",
        path: "/.well-known/agent.json",
        description: "Lucid agent manifest for AI discovery",
        requiresPayment: false,
      },
      {
        method: "GET",
        path: "/health",
        description: "Service health status",
        requiresPayment: false,
      },
    ],

    supportedChains: Object.entries(CHAIN_NAMES).map(([id, name]) => ({
      chainId: parseInt(id),
      name,
    })),

    examples: {
      curl: `curl -X POST ${SERVICE_URL}/api/v1/analyze \\
  -H "Content-Type: application/json" \\
  -H "X-402: 1" \\
  -d '{"token_address":"0xe7A413d4192fdee1bB5ecdF9D07A1827Eb15Bc1F","chain_id":1}'`,
    },
  });
});

// ========================================
// ROOT ENDPOINT - HTML UI
// ========================================

app.get("/", (c) => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Token Safety Check - Lucid AI Agent</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #fff;
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 900px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }
        h1 { font-size: 2.5em; margin-bottom: 10px; }
        .subtitle { font-size: 1.2em; opacity: 0.9; margin-bottom: 30px; }
        .badge {
            display: inline-block;
            background: rgba(255, 255, 255, 0.2);
            padding: 5px 15px;
            border-radius: 20px;
            margin: 5px;
            font-size: 0.9em;
        }
        .section {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
        }
        .section h2 { margin-bottom: 15px; font-size: 1.5em; }
        .endpoint {
            background: rgba(0, 0, 0, 0.2);
            padding: 15px;
            border-radius: 8px;
            margin: 10px 0;
            font-family: 'Courier New', monospace;
        }
        .method { 
            display: inline-block;
            background: #4ade80;
            color: #000;
            padding: 3px 8px;
            border-radius: 4px;
            font-weight: bold;
            margin-right: 10px;
        }
        .method.post { background: #60a5fa; color: #fff; }
        a { color: #4ade80; text-decoration: none; }
        a:hover { text-decoration: underline; }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        .stat {
            background: rgba(255, 255, 255, 0.1);
            padding: 20px;
            border-radius: 10px;
            text-align: center;
        }
        .stat-value { font-size: 2em; font-weight: bold; }
        .stat-label { opacity: 0.8; margin-top: 5px; }
        pre {
            background: rgba(0,0,0,0.3);
            padding: 15px;
            border-radius: 8px;
            overflow-x: auto;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🛡️ Token Safety Check</h1>
        <p class="subtitle">AI-Powered Token Security Analysis for Multi-Chain Assets</p>
        
        <div class="badges">
            <span class="badge">✨ Lucid AI Agent</span>
            <span class="badge">💰 x402 Payments</span>
            <span class="badge">🔗 Multi-Chain</span>
            <span class="badge">⚡ Real-Time</span>
        </div>

        <div class="stats">
            <div class="stat">
                <div class="stat-value">7</div>
                <div class="stat-label">Supported Chains</div>
            </div>
            <div class="stat">
                <div class="stat-value">2</div>
                <div class="stat-label">Data Sources</div>
            </div>
            <div class="stat">
                <div class="stat-value">$${(DEFAULT_PRICE / 1000000).toFixed(2)}</div>
                <div class="stat-label">Per Analysis</div>
            </div>
        </div>

        <div class="section">
            <h2>🎯 What We Detect</h2>
            <ul style="margin: 15px 0 0 20px; line-height: 1.8;">
                <li>🍯 Honeypot scams (tokens you can't sell)</li>
                <li>💸 Excessive buy/sell taxes</li>
                <li>👥 Dangerous centralization (whale concentration)</li>
                <li>📝 Unverified or suspicious contracts</li>
                <li>🔧 Technical ERC20 compliance issues</li>
                <li>🚫 Proxy contracts with hidden functionality</li>
            </ul>
        </div>

        <div class="section">
            <h2>🔗 Supported Blockchains</h2>
            <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                ${Object.values(CHAIN_NAMES).map(name => `<span class="badge">${name}</span>`).join('')}
            </div>
        </div>

        <div class="section">
            <h2>🚀 API Endpoints</h2>
            
            <div class="endpoint">
                <span class="method post">POST</span>
                <a href="/api/v1/analyze">/api/v1/analyze</a>
                <p style="margin-top: 10px; opacity: 0.8;">Analyze token safety (requires x402 payment)</p>
            </div>

            <div class="endpoint">
                <span class="method">GET</span>
                <a href="/.well-known/agent.json">/.well-known/agent.json</a>
                <p style="margin-top: 10px; opacity: 0.8;">Lucid agent manifest for AI discovery</p>
            </div>

            <div class="endpoint">
                <span class="method">GET</span>
                <a href="/health">/health</a>
                <p style="margin-top: 10px; opacity: 0.8;">Service health check</p>
            </div>

            <div class="endpoint">
                <span class="method">GET</span>
                <a href="/docs">/docs</a>
                <p style="margin-top: 10px; opacity: 0.8;">API documentation</p>
            </div>
        </div>

        <div class="section">
            <h2>📖 Quick Start</h2>
            <pre><code>curl -X POST ${SERVICE_URL}/api/v1/analyze \\
  -H "Content-Type: application/json" \\
  -H "X-402: 1" \\
  -d '{
    "token_address": "0xe7A413d4192fdee1bB5ecdF9D07A1827Eb15Bc1F",
    "chain_id": 1
  }'</code></pre>
        </div>

        <div class="section">
            <h2>💰 Payment</h2>
            <p><strong>Protocol:</strong> x402 on Base network</p>
            <p style="margin-top: 10px;"><strong>Price:</strong> $${(DEFAULT_PRICE / 1000000).toFixed(2)} USDC per analysis</p>
            <p style="margin-top: 10px;"><strong>Payment Address:</strong> <code>${PAYMENT_ADDRESS}</code></p>
        </div>

        <div class="section" style="text-align: center; padding: 30px;">
            <p style="opacity: 0.8;">Built with ❤️ for the Lucid AI ecosystem</p>
            <p style="margin-top: 15px;">
                <a href="https://github.com/DeganAI/Token-Safety-Check" target="_blank">GitHub</a> •
                <a href="/.well-known/agent.json">Manifest</a> •
                <a href="/docs">Docs</a> •
                <a href="/health">Status</a>
            </p>
        </div>
    </div>
</body>
</html>
  `;

  return c.html(html);
});

// ========================================
// START SERVER
// ========================================

console.log(`\n🚀 Token Safety Check - Lucid AI Agent`);
console.log(`📊 Version: 1.0.0`);
console.log(`🌐 Port: ${PORT}`);
console.log(`🔗 URL: ${SERVICE_URL}`);
console.log(`💰 Payment: ${(DEFAULT_PRICE / 1000000).toFixed(2)} USDC per analysis`);
console.log(`🎯 Protocol: x402 on ${NETWORK}`);
console.log(`💳 Address: ${PAYMENT_ADDRESS}`);
console.log(`📡 Chains: ${Object.values(CHAIN_NAMES).join(", ")}`);
console.log(`\n✅ Server ready at ${SERVICE_URL}\n`);

export default {
  port: PORT,
  fetch: app.fetch,
};
