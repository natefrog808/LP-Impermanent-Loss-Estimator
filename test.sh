#!/bin/bash

# Quick Test Script for LP IL Estimator
# Usage: ./test.sh

echo "🚀 LP Impermanent Loss Estimator - Quick Test"
echo "=============================================="
echo ""

# Check if jq is installed for pretty JSON
if ! command -v jq &> /dev/null; then
    echo "⚠️  Note: Install 'jq' for prettier output"
    echo "   macOS: brew install jq"
    echo "   Ubuntu: sudo apt install jq"
    echo ""
fi

# Set the base URL (change this after deployment)
BASE_URL="${1:-http://localhost:3000}"

echo "📍 Testing endpoint: $BASE_URL"
echo ""

# Test 1: Echo endpoint
echo "Test 1: Echo Endpoint"
echo "----------------------"
curl -s -X POST "$BASE_URL/echo" \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello World"}' | jq '.' 2>/dev/null || curl -s -X POST "$BASE_URL/echo" \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello World"}'
echo ""
echo ""

# Test 2: ETH/USDC Pool (Volatile)
echo "Test 2: ETH/USDC Pool (Volatile Pair)"
echo "--------------------------------------"
curl -s -X POST "$BASE_URL/calculate_il" \
  -H "Content-Type: application/json" \
  -d '{
    "token0_symbol": "ETH",
    "token1_symbol": "USDC",
    "deposit_amounts": [5000, 5000],
    "window_hours": 168
  }' | jq '.output' 2>/dev/null || curl -s -X POST "$BASE_URL/calculate_il" \
  -H "Content-Type: application/json" \
  -d '{
    "token0_symbol": "ETH",
    "token1_symbol": "USDC",
    "deposit_amounts": [5000, 5000],
    "window_hours": 168
  }'
echo ""
echo ""

# Test 3: USDC/USDT Pool (Stable)
echo "Test 3: USDC/USDT Pool (Stablecoin Pair)"
echo "-----------------------------------------"
curl -s -X POST "$BASE_URL/calculate_il" \
  -H "Content-Type: application/json" \
  -d '{
    "token0_symbol": "USDC",
    "token1_symbol": "USDT",
    "deposit_amounts": [10000, 10000],
    "window_hours": 168
  }' | jq '.output' 2>/dev/null || curl -s -X POST "$BASE_URL/calculate_il" \
  -H "Content-Type: application/json" \
  -d '{
    "token0_symbol": "USDC",
    "token1_symbol": "USDT",
    "deposit_amounts": [10000, 10000],
    "window_hours": 168
  }'
echo ""
echo ""

# Test 4: ETH/WBTC Pool (Crypto Pair)
echo "Test 4: ETH/WBTC Pool (Major Crypto Pair)"
echo "------------------------------------------"
curl -s -X POST "$BASE_URL/calculate_il" \
  -H "Content-Type: application/json" \
  -d '{
    "token0_symbol": "ETH",
    "token1_symbol": "WBTC",
    "deposit_amounts": [7500, 7500],
    "window_hours": 168
  }' | jq '.output' 2>/dev/null || curl -s -X POST "$BASE_URL/calculate_il" \
  -H "Content-Type: application/json" \
  -d '{
    "token0_symbol": "ETH",
    "token1_symbol": "WBTC",
    "deposit_amounts": [7500, 7500],
    "window_hours": 168
  }'
echo ""
echo ""

echo "✅ Tests complete!"
echo ""
echo "💡 Tips:"
echo "   - Negative IL_percent means loss from price divergence"
echo "   - Check if net_apr_est is positive (fees > IL)"
echo "   - Read the 'notes' array for insights"
echo ""
echo "📚 For more examples, see TEST_CASES.md"
echo "📖 For API docs, see API_DOCS.md"
echo ""
