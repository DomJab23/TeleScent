#!/bin/bash
# Test backend from another device on same network

LOCAL_IP="10.126.3.248"
PORT="5000"

echo "🏠 Testing Backend from Local Network"
echo "====================================="
echo ""
echo "Local IP: ${LOCAL_IP}:${PORT}"
echo ""

# Test local IP
response=$(curl -s -m 5 http://${LOCAL_IP}:${PORT}/api 2>&1)
if echo "$response" | grep -q "Hello from the TeleScent"; then
    echo "✅ Backend accessible on local network!"
    echo ""
    echo "📱 From another device (phone/tablet):"
    echo "   1. Connect to SAME WiFi network"
    echo "   2. Open browser"
    echo "   3. Go to: http://${LOCAL_IP}:${PORT}/api"
    echo "   4. Should see: {\"message\":\"Hello from TeleScent backend!\"}"
    echo ""
    echo "🔧 For Arduino WiFi testing:"
    echo "   Update main.h:"
    echo "   #define HOST_NAME \"${LOCAL_IP}\""
    echo "   #define PORT ${PORT}"
else
    echo "❌ Backend not accessible on local IP"
    echo "   Response: $response"
fi

echo ""
echo "📋 Quick Reference:"
echo "   Local testing:  http://${LOCAL_IP}:${PORT}"
echo "   Public IP:      http://130.226.87.132:${PORT} (needs port forwarding)"
echo "   For GSM:        Needs public URL (tunnel or cloud)"
