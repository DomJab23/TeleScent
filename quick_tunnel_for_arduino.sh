#!/bin/bash
# Quick tunnel setup for Arduino testing

echo "🚀 Starting Quick Tunnel for Arduino Testing"
echo "============================================"
echo ""
echo "This creates a temporary public URL for your backend"
echo "Perfect for testing Arduino GSM connection"
echo ""

# Check if backend is running
if ! curl -s http://localhost:5000/api > /dev/null 2>&1; then
    echo "❌ Backend not running!"
    echo "Start it with: cd backend && node server.js &"
    exit 1
fi

echo "✅ Backend is running"
echo ""
echo "Starting tunnel..."
echo "Keep this terminal open during Arduino testing"
echo ""
echo "================================================"
echo ""

# Start cloudflared (works better than localtunnel)
if command -v cloudflared &> /dev/null; then
    echo "Using Cloudflare Tunnel..."
    cloudflared tunnel --url http://localhost:5000
elif command -v ngrok &> /dev/null; then
    echo "Using ngrok..."
    ngrok http 5000
elif command -v lt &> /dev/null; then
    echo "Using LocalTunnel..."
    lt --port 5000
else
    echo "No tunnel tool found. Installing localtunnel..."
    npx localtunnel --port 5000
fi
