#!/bin/bash
# ============================================
# Etson Sales Agent — One-command local start
# ============================================
# Usage: ./start.sh
# Requires: Node.js 18+

set -e
DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "🚀 Starting Etson Sales Agent (100% local, real Sarvam data only)"
echo "=================================================="

# Start backend on port 3001
echo "▶ Starting backend..."
cd "$DIR/backend"
node --env-file=.env src/index.js &
BACKEND_PID=$!
sleep 2

# Verify backend started
if curl -s http://localhost:3001/api/leads > /dev/null 2>&1; then
  echo "  ✅ Backend: http://localhost:3001"
else
  echo "  ❌ Backend failed to start. Check logs."
  kill $BACKEND_PID 2>/dev/null
  exit 1
fi

# Start frontend on port 5173
echo "▶ Starting frontend..."
cd "$DIR/frontend"
npm run dev --silent &
FRONTEND_PID=$!
sleep 2
echo "  ✅ Frontend: http://localhost:5173"

# Start localtunnel so Sarvam can send webhooks
echo ""
echo "▶ Starting public tunnel for Sarvam webhooks..."
TUNNEL_URL=""
npx localtunnel --port 3001 --subdomain etson-sarvam > /tmp/tunnel.log 2>&1 &
TUNNEL_PID=$!
sleep 3
TUNNEL_URL=$(grep -o "https://[^ ]*" /tmp/tunnel.log 2>/dev/null | head -1)

if [ -z "$TUNNEL_URL" ]; then
  TUNNEL_URL="Run: npx localtunnel --port 3001"
fi

echo ""
echo "=================================================="
echo "✅ EVERYTHING IS RUNNING"
echo "=================================================="
echo ""
echo "  📊 Dashboard:   http://localhost:5173"
echo "  ⚙️  API:         http://localhost:3001"
echo "  🌐 Public URL:  $TUNNEL_URL"
echo ""
echo "=================================================="
echo "📡 SARVAM AI WEBHOOK SETUP"
echo "=================================================="
echo ""
echo "  Paste this URL in your Sarvam AI agent settings:"
echo ""
echo "  ➡️  $TUNNEL_URL/api/webhooks/sarvam"
echo ""
echo "  1. Go to: https://indus.sarvam.ai"
echo "  2. Click your Sales Discovery agent"
echo "  3. Settings → Webhook URL"
echo "  4. Paste the URL above and save"
echo ""
echo "  Once configured, every Sarvam call will auto-appear"
echo "  in your dashboard with full transcript + lead score!"
echo ""
echo "=================================================="
echo "Press Ctrl+C to stop all services"
echo ""

cleanup() {
  echo ""
  echo "Stopping all services..."
  kill $BACKEND_PID $FRONTEND_PID $TUNNEL_PID 2>/dev/null
  echo "Done."
  exit 0
}

trap cleanup INT TERM
wait
