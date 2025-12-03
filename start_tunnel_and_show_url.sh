#!/bin/bash
# Start LocalTunnel and display the URL for GSM connection

echo "🚀 Starting LocalTunnel for GSM Backend Access..."
echo ""
echo "Port: 5000"
echo "Waiting for tunnel URL..."
echo ""
echo "=========================================="
echo ""

# Start localtunnel and show output
lt --port 5000

# The URL will be displayed by lt itself
# Keep this terminal open while testing GSM connection
