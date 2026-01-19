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

# Start tunnel service (localhost.run - supports both HTTP and HTTPS)
if [ -n "$NGROK_AUTHTOKEN" ]; then
    echo "🔗 Starting localhost.run tunnel (HTTP/HTTPS support)..."
    
    # Kill any existing tunnel processes
    pkill -f "localhost.run" 2>/dev/null || true
    sleep 1
    
    # Start localhost.run tunnel in background
    echo "🔗 Launching localhost.run tunnel on port 5001..."
    nohup ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -R 80:localhost:5001 nokey@localhost.run > /tmp/tunnel.log 2>&1 &
    TUNNEL_PID=$!
    
    # Wait for tunnel to start and get URL
    echo "⏳ Waiting for localhost.run tunnel to establish..."
    for i in {1..15}; do
        sleep 2
        # Extract URL from tunnel log
        TUNNEL_URL=$(grep -o 'https://[^ ]*\.lhr\.life' /tmp/tunnel.log 2>/dev/null | head -1)
        
        if [ -n "$TUNNEL_URL" ]; then
            HTTP_URL=$(echo "$TUNNEL_URL" | sed 's/https:/http:/')
            echo "✅ localhost.run tunnel established!"
            echo "🌐 HTTP URL:  $HTTP_URL"
            echo "🌐 HTTPS URL: $TUNNEL_URL"
            echo "✨ Both URLs work - use HTTP for eNose, HTTPS for web browsers"
            echo ""
            break
        fi
        
        if [ $i -eq 15 ]; then
            echo "⚠️  Tunnel started but URL not available yet"
            echo "📋 Check logs: docker exec telescent-backend cat /tmp/tunnel.log"
            echo ""
        fi
    done
    
    # Monitor tunnel process and restart if it dies
    (
        while true; do
            sleep 30
            if ! kill -0 $TUNNEL_PID 2>/dev/null; then
                echo "⚠️  Tunnel process died, restarting..."
                nohup ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -R 80:localhost:5001 nokey@localhost.run > /tmp/tunnel.log 2>&1 &
                TUNNEL_PID=$!
                sleep 5
                TUNNEL_URL=$(grep -o 'https://[^ ]*\.lhr\.life' /tmp/tunnel.log 2>/dev/null | head -1)
                if [ -n "$TUNNEL_URL" ]; then
                    HTTP_URL=$(echo "$TUNNEL_URL" | sed 's/https:/http:/')
                    echo "✅ Tunnel restarted: $HTTP_URL (HTTP) / $TUNNEL_URL (HTTPS)"
                fi
            fi
        done
    ) &
else
    echo "⚠️  No NGROK_AUTHTOKEN provided (using it as tunnel enable flag)."
    echo "    To enable HTTP/HTTPS tunneling with localhost.run:"
    echo "    Set NGROK_AUTHTOKEN environment variable to any value (e.g., 'enable')"
    echo ""
    echo "    For now, the server is accessible at: http://localhost:5001"
fi

# Keep the container running by waiting for the Node.js server
wait $SERVER_PID
