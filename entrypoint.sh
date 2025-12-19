#!/bin/bash

set -e

echo "🚀 Starting TeleScent Backend..."

# Wait a bit for the system to be ready
sleep 1

echo "📦 Initializing database and creating admin user..."

# Run the create-admin script to initialize DB and create admin user
node create-admin.js || echo "⚠️  Admin creation skipped (may already exist)"

# Start the Node.js server in the background
echo "🌐 Starting Node.js server on port 5001..."
node server.js &
SERVER_PID=$!

# Wait for server to be ready
echo "⏳ Waiting for server to be ready..."
sleep 4

# Check if server is running
if ! kill -0 $SERVER_PID 2>/dev/null; then
    echo "❌ Server failed to start"
    exit 1
fi

echo "✅ Server is running on port 5001"
echo "📝 Default credentials: admin / admin"
echo ""

# Start ngrok with optional authtoken
if [ -n "$NGROK_AUTHTOKEN" ]; then
    echo "🔗 Starting ngrok tunnel with authtoken..."
    ngrok config add-authtoken "$NGROK_AUTHTOKEN" 2>/dev/null || true
    
    # Kill any existing ngrok processes
    pkill ngrok 2>/dev/null || true
    sleep 1
    
    # Start ngrok tunnel
    ngrok http 5001 &
    NGROK_PID=$!
    sleep 3
    
    # Try to get the public URL
    NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | grep -o '"public_url":"https://[^"]*' | head -1 | cut -d'"' -f4)
    
    if [ -n "$NGROK_URL" ]; then
        echo "✅ ngrok tunnel started successfully!"
        echo "🌐 Public URL: $NGROK_URL"
        echo "🌐 ngrok Web UI: http://localhost:4040"
    else
        echo "✅ ngrok tunnel started (waiting for URL...)"
        echo "🌐 Check ngrok Web UI at http://localhost:4040 for your public URL"
    fi
else
    echo "⚠️  No ngrok authtoken provided."
    echo "    To use ngrok tunneling:"
    echo "    1. Sign up at https://ngrok.com"
    echo "    2. Get your authtoken from https://dashboard.ngrok.com/auth/your-authtoken"
    echo "    3. Set NGROK_AUTHTOKEN in docker-compose.yml"
    echo ""
    echo "    For now, the server is accessible at: http://localhost:5001"
fi

# Keep the container running
wait $SERVER_PID
