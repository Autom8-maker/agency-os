#!/bin/bash
# Agency OS V2 — Double-click to start
cd "$(dirname "$0")"

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
  echo ""
  echo "⚠  .env.local not found."
  echo "   Copy .env.local.example to .env.local and fill in your keys."
  echo ""
  read -p "Press Enter to open the file for editing..."
  cp .env.local.example .env.local
  open .env.local
  exit 1
fi

# Kill anything on port 3000
lsof -ti:3000 | xargs kill -9 2>/dev/null

echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║   Agency OS  →  http://localhost:3000 ║"
echo "  ╚══════════════════════════════════════╝"
echo ""

# Open browser after 2.5s
sleep 2.5 && open http://localhost:3000 &

# Start Next.js
npm run dev
