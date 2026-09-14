#!/bin/bash
# ============================================
# Etson Sales Agent — One-command local start
# ============================================
# Usage: ./start.sh
# Requires: Node.js 18+
#
# FIXED SARVAM WEBHOOK URL (set this ONCE — never changes):
#   https://etson-sarvam.loca.lt/api/webhooks/sarvam
# ============================================

set -e
DIR="$(cd "$(dirname "$0")" && pwd)"

SUBDOMAIN="etson-sales-agent-v1"
FIXED_TUNNEL_URL="https://${SUBDOMAIN}.loca.lt"
WEBHOOK_URL="${FIXED_TUNNEL_URL}/api/webhooks/sarvam"

echo ""
echo "🚀 Starting Etson Sales Agent"
echo "=================================================="

# Kill any existing processes on 3001/5173/3002
fuser -k 3001/tcp 2>/dev/null || true
fuser -k 5173/tcp 2>/dev/null || true
fuser -k 3002/tcp 2>/dev/null || true
pkill -f "localtunnel" 2>/dev/null || true
pkill -f "whatomate-proxy" 2>/dev/null || true
sleep 1

# ── Whatomate Docker (WhatsApp gateway) ──────────────────────────────────
echo "▶ Starting Whatomate (Docker)..."
docker compose up -d whatomate-db whatomate-redis whatomate > /dev/null 2>&1 || true
sleep 2
echo "  ✅ Whatomate: http://localhost:8080"

# ── Whatomate iframe proxy (strips X-Frame-Options) ──────────────────────
echo "▶ Starting Whatomate proxy (port 3002)..."
nohup node "$DIR/whatomate-proxy.js" > /tmp/etson-wa-proxy.log 2>&1 &
WA_PROXY_PID=$!
sleep 2
if curl -s --max-time 3 http://localhost:3002 > /dev/null 2>&1; then
  echo "  ✅ Whatomate Proxy: http://localhost:3002"
else
  echo "  ⚠️  Whatomate proxy starting..."
fi

# ── Backend ──────────────────────────────────────────────────────────
echo "▶ Starting backend..."
cd "$DIR/backend"
npm run dev > /tmp/etson-backend.log 2>&1 &
BACKEND_PID=$!
sleep 4

if curl -s http://localhost:3001/health > /dev/null 2>&1; then
  echo "  ✅ Backend: http://localhost:3001"
else
  echo "  ❌ Backend failed. Logs:"
  tail -20 /tmp/etson-backend.log
  kill $BACKEND_PID 2>/dev/null
  exit 1
fi

# ── Frontend ─────────────────────────────────────────────────────────
echo "▶ Starting frontend..."
cd "$DIR/frontend"
npm run dev > /tmp/etson-frontend.log 2>&1 &
FRONTEND_PID=$!
sleep 3
echo "  ✅ Frontend: http://localhost:5173"

# ── Fixed tunnel ──────────────────────────────────────────────────────
echo ""
echo "▶ Starting tunnel: ${FIXED_TUNNEL_URL}..."
npx localtunnel --port 3001 --subdomain "$SUBDOMAIN" > /tmp/etson-tunnel.log 2>&1 &
TUNNEL_PID=$!
sleep 7

# Check if localtunnel confirmed our URL (process-based, no external curl needed)
CONFIRMED_URL=$(grep -o "https://[^ ]*" /tmp/etson-tunnel.log 2>/dev/null | head -1)
TUNNEL_LIVE=false

if [ -n "$CONFIRMED_URL" ]; then
  TUNNEL_LIVE=true
fi

echo ""
echo "=================================================="
echo "✅ ALL SERVICES RUNNING"
echo "=================================================="
echo ""
echo "  📊 Dashboard : http://localhost:5173"
echo "  ⚙️  Backend   : http://localhost:3001"

if [ "$TUNNEL_LIVE" = true ]; then
  echo "  🌐 Tunnel    : ${CONFIRMED_URL} ✅"
else
  echo "  🌐 Tunnel    : ⚠️  Starting... (check /tmp/etson-tunnel.log)"
fi

echo ""
echo "=================================================="
echo "📡 SARVAM WEBHOOK — SET THIS ONCE, NEVER AGAIN"
echo "=================================================="
echo ""
echo "  ✅ Your permanent webhook URL:"
echo ""
echo "     ➡️  ${WEBHOOK_URL}"
echo ""
echo "  ⚡ This NEVER changes — set it once in Sarvam!"
echo ""
echo "  Setup (one time only):"
echo "  1. Go to https://indus.sarvam.ai"
echo "  2. Your agent → Tools → log_discovery_outcome → Edit"
echo "  3. API URL → paste: ${WEBHOOK_URL}"
echo "  4. Save → Done forever ✅"
echo ""
echo "  💡 TIP: If tunnel shows 503, just re-run ./start.sh"
echo "          (another localtunnel session may have been active)"
echo ""
echo "=================================================="
echo "Press Ctrl+C to stop all services"
echo ""

cleanup() {
  echo ""
  echo "Stopping services..."
  kill $BACKEND_PID $FRONTEND_PID $TUNNEL_PID $WA_PROXY_PID 2>/dev/null || true
  docker compose stop whatomate whatomate-db whatomate-redis > /dev/null 2>&1 || true
  echo "✅ All stopped."
  exit 0
}

trap cleanup INT TERM
wait
