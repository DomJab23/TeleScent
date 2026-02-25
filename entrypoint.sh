#!/bin/bash

set -e

echo "🚀 Starting TeleScent Backend..."

# In the Docker image, backend files are copied directly into /app (WORKDIR)
# so server.js is at /app/server.js - no need to cd into a subdirectory
if [ -f /app/create-admin.js ]; then
  echo "📦 Creating admin user..."
  node /app/create-admin.js || echo "⚠️  Admin creation skipped (may already exist)"
fi

echo "🌐 Starting Node.js server on port ${PORT:-5001}..."
cd /app
exec node server.js
