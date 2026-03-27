#!/bin/bash
cd "$(dirname "$0")"
echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║        Agency OS — Starting...       ║"
echo "  ╚══════════════════════════════════════╝"
echo ""

# Check for API key
if [ -z "$(grep 'ANTHROPIC_API_KEY=sk-' .env 2>/dev/null)" ]; then
  echo "  ⚠  No API key found in .env"
  echo "  Open agency-command-center/.env and set ANTHROPIC_API_KEY=sk-ant-..."
  echo ""
fi

# Kill any old instance on port 3000
lsof -ti:3000 | xargs kill -9 2>/dev/null

# Start server
node server.js &
SERVER_PID=$!
sleep 1

# Open browser
open http://localhost:3000

echo "  Server running. Close this window to stop Agency OS."
echo ""

# Keep terminal open and server alive
wait $SERVER_PID
