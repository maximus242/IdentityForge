#!/bin/bash
# Helper script to run IdentityForge with the correct Node version

export PATH="/opt/homebrew/opt/node@20/bin:$PATH"

# Check if postgres is running
if ! brew services list | grep postgresql@15 | grep started > /dev/null; then
  echo "Starting PostgreSQL..."
  brew services start postgresql@15
  sleep 2
fi

# Run the command passed as arguments
if [ $# -eq 0 ]; then
  echo "Usage: ./run.sh <command>"
  echo "Examples:"
  echo "  ./run.sh npm run dev      # Run both web and mobile"
  echo "  ./run.sh npm run web      # Run web only"
  echo "  ./run.sh npm run mobile   # Run mobile only"
  exit 1
fi

exec "$@"
