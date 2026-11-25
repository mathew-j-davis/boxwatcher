#!/bin/bash
# Watch and rebuild all diagrams with auto-reload in browser

set -e

# Load configuration
CONFIG_FILE="boxwatcher.config.json"
if [ ! -f "$CONFIG_FILE" ]; then
    echo "⚠️  boxwatcher.config.json not found, using defaults"
    PORT=8080
    OPEN_PATH="/index.html"
    WATCH_DIR="diagram-definitions"
else
    # Extract config values using simple grep/sed (works without jq)
    PORT=$(grep '"port"' "$CONFIG_FILE" | sed 's/.*: *\([0-9]*\).*/\1/' | head -1)
    OPEN_PATH=$(grep '"open"' "$CONFIG_FILE" | sed 's/.*: *"\([^"]*\)".*/\1/' | head -1)
    WATCH_DIR=$(grep '"definitions"' "$CONFIG_FILE" | sed 's/.*: *"\([^"]*\)".*/\1/' | head -1)

    # Use defaults if extraction failed
    PORT=${PORT:-8080}
    OPEN_PATH=${OPEN_PATH:-/index.html}
    WATCH_DIR=${WATCH_DIR:-diagram-definitions}
fi

# Check dependencies
if ! command -v nodemon &> /dev/null; then
    echo "❌ nodemon not found. Install with:"
    echo "   npm install -g nodemon"
    exit 1
fi

if ! command -v live-server &> /dev/null; then
    echo "❌ live-server not found. Install with:"
    echo "   npm install -g live-server"
    exit 1
fi

echo "🔨 BoxWatcher - Watch and Serve"
echo "================================"
echo "Port: $PORT"
echo "Watch: $WATCH_DIR"
echo "================================"
echo ""

# Start live-server in background
echo "Starting live-server on http://localhost:$PORT..."
live-server output --port=$PORT --open=$OPEN_PATH --quiet &
LIVE_SERVER_PID=$!

# Cleanup on exit
trap "kill $LIVE_SERVER_PID 2>/dev/null" EXIT

# Watch for changes and rebuild all diagrams
echo "Watching $WATCH_DIR for changes..."
nodemon --watch $WATCH_DIR \
        --ext yaml,csv,json \
        --exec "node ./build-all.js"
