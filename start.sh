#!/bin/bash
# Start Etson Sales Agent locally
# Usage: ./start.sh

echo "🚀 Starting Etson Sales Agent..."

# Start backend
cd "$(dirname "$0")/backend"
node --env-file=.env src/index.js &
BACKEND_PID=$!
echo "✅ Backend running at http://localhost:3001 (PID: $BACKEND_PID)"

# Start frontend
cd "$(dirname "$0")/frontend"
npm run dev &
FRONTEND_PID=$!
echo "✅ Frontend running at http://localhost:5173 (PID: $FRONTEND_PID)"

echo ""
echo "📡 To receive real Sarvam AI calls, run in another terminal:"
echo "   ngrok http 3001"
echo "   Then set the webhook URL in Sarvam to: <your-ngrok-url>/api/webhooks/sarvam"
echo ""
echo "Press Ctrl+C to stop both servers"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Stopped.'" INT TERM
wait
