// TEST VERSION - WITHOUT AGENT-KIT
// Use this to see if agent-kit is causing the SIGTERM

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { z } from "zod";

console.log("🧪 TEST MODE: Running without @lucid-dreams/agent-kit");
console.log(`Node: ${process.version}`);
console.log(`CWD: ${process.cwd()}`);

const app = new Hono();

// Core IL calculation
function calculateImpermanentLoss(priceRatio: number) {
  const sqrtRatio = Math.sqrt(priceRatio);
  const lpValue = (2 * sqrtRatio) / (1 + priceRatio);
  const ilPercent = (lpValue - 1) * 100;
  return { ilPercent, lpValue };
}

// Health endpoint - BOTH GET AND POST
app.get("/health", (c) => {
  return c.json({ 
    status: "healthy", 
    timestamp: Date.now(),
    version: "test-without-agent-kit",
    method: "GET"
  });
});

app.post("/health", (c) => {
  return c.json({ 
    status: "healthy", 
    timestamp: Date.now(),
    version: "test-without-agent-kit",
    method: "POST"
  });
});

// Echo endpoint
app.post("/echo", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  return c.json({ 
    echo: body,
    timestamp: Date.now() 
  });
});

// Calculate IL endpoint
app.post("/calculate_il", async (c) => {
  try {
    const body = await c.req.json();
    
    // Simple test calculation
    const priceRatio = 1.1; // Simulate 10% price change
    const result = calculateImpermanentLoss(priceRatio);
    
    return c.json({
      success: true,
      test_mode: true,
      message: "This is a test response - agent-kit disabled",
      IL_percent: result.ilPercent.toFixed(4),
      price_change: "10%",
      input_received: body,
    });
  } catch (error) {
    return c.json({ 
      error: String(error),
      test_mode: true 
    }, 500);
  }
});

// Root endpoint
app.get("/", (c) => {
  return c.json({
    name: "LP Impermanent Loss Estimator (TEST MODE)",
    version: "test-without-agent-kit",
    status: "running",
    endpoints: {
      "GET /health": "Health check",
      "POST /health": "Health check (POST)",
      "POST /echo": "Echo test",
      "POST /calculate_il": "Calculate IL (test mode)",
    },
  });
});

const port = Number(process.env.PORT) || 3000;
const hostname = "0.0.0.0";

console.log("==============================================");
console.log("🧪 LP IL Estimator - TEST MODE");
console.log("==============================================");
console.log(`Port: ${port}`);
console.log(`Hostname: ${hostname}`);
console.log("Mode: WITHOUT @lucid-dreams/agent-kit");
console.log("----------------------------------------------");
console.log("Starting server...");

try {
  const server = serve(
    {
      fetch: app.fetch,
      port: port,
      hostname: hostname,
    },
    (info) => {
      console.log("✅ ✅ ✅ SERVER STARTED SUCCESSFULLY ✅ ✅ ✅");
      console.log(`URL: http://${hostname}:${info.port}`);
      console.log("Endpoints:");
      console.log("  GET  /           - Info");
      console.log("  GET  /health     - Health (GET)");
      console.log("  POST /health     - Health (POST)");
      console.log("  POST /echo       - Echo");
      console.log("  POST /calculate_il - Calculate (test)");
      console.log("==============================================");
      console.log("Waiting for requests...");
    }
  );

  // Keepalive
  const keepAlive = setInterval(() => {
    console.log(`⏰ Uptime: ${Math.floor(process.uptime())}s`);
  }, 30000);

  // Graceful shutdown
  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n⏸️ ${signal} - shutting down...`);
    clearInterval(keepAlive);
    server.close(() => {
      console.log("✅ Shutdown complete");
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
  
  process.on("uncaughtException", (err) => {
    console.error("💥 UNCAUGHT EXCEPTION:");
    console.error(err);
    shutdown("EXCEPTION");
  });
  
  process.on("unhandledRejection", (reason) => {
    console.error("💥 UNHANDLED REJECTION:");
    console.error(reason);
  });

  console.log("✅ Event handlers registered");
  console.log("✅ Server initialization complete");

} catch (error) {
  console.error("❌ FATAL ERROR:");
  console.error(error);
  process.exit(1);
}

export default app;
