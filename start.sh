#!/bin/bash
# Quick start script for IdentityForge

cd "$(dirname "$0")"

echo "🚀 Starting IdentityForge..."
echo ""

# Set Node 20
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"

# Check Node version
NODE_VERSION=$(node -v)
echo "✓ Using Node $NODE_VERSION"

# Check if PostgreSQL is running
if ! pgrep -f postgres > /dev/null; then
  echo "⚠️  PostgreSQL not running, starting it..."
  /opt/homebrew/bin/brew services start postgresql@15
  echo "Waiting for PostgreSQL to start..."
  for i in {1..10}; do
    if pgrep -f postgres > /dev/null; then
      break
    fi
    sleep 1
  done
fi

if pgrep -f postgres > /dev/null; then
  echo "✓ PostgreSQL is running"
else
  echo "❌ Failed to start PostgreSQL"
  exit 1
fi

echo ""
echo "Starting web app on http://localhost:3001"
echo ""

npm run web
