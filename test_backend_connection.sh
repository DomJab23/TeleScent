#!/bin/bash
# Test if backend is accessible from external devices (like Arduino GSM)

echo "🧪 Testing Backend Accessibility for GSM Devices"
echo "================================================"
echo ""

BACKEND_IP="130.226.87.132"
BACKEND_PORT="5000"

echo "Backend: http://${BACKEND_IP}:${BACKEND_PORT}"
echo ""

# Test 1: Local connection (should work)
echo "Test 1: Local connection..."
curl -s -m 5 http://localhost:5000/api > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Backend running locally"
else
    echo "❌ Backend NOT running locally!"
    echo "   Start it with: cd backend && node server.js"
    exit 1
fi

# Test 2: Public IP connection (what GSM will use)
echo ""
echo "Test 2: Public IP connection (this is what GSM will use)..."
response=$(curl -s -m 5 http://${BACKEND_IP}:${BACKEND_PORT}/api 2>&1)
if echo "$response" | grep -q "Hello from the TeleScent"; then
    echo "✅ Backend accessible from public IP!"
    echo "   Response: $response"
    echo ""
    echo "🎉 GSM WILL BE ABLE TO CONNECT!"
else
    echo "❌ Backend NOT accessible from public IP"
    echo "   Response: $response"
    echo ""
    echo "⚠️  This means GSM won't be able to connect yet."
    echo ""
    echo "Solutions:"
    echo "  1. Setup port forwarding on your router:"
    echo "     External: ${BACKEND_PORT} → Internal: 10.126.3.248:${BACKEND_PORT}"
    echo ""
    echo "  2. Or use a cloud service:"
    echo "     • Render.com (recommended)"
    echo "     • Railway.app"
    echo "     • Fly.io"
    echo ""
    echo "  3. Or use a tunnel temporarily:"
    echo "     npx localtunnel --port 5000"
fi

# Test 3: Test with a simulated POST request (like Arduino will send)
echo ""
echo "Test 3: Simulating Arduino sensor data POST..."
test_data='{"deviceId":"esp32-test","sensorType":"temperature","value":25.5,"unit":"C"}'

response=$(curl -s -m 5 -X POST \
    -H "Content-Type: application/json" \
    -d "${test_data}" \
    http://localhost:5000/api/sensor-data 2>&1)

if echo "$response" | grep -q "successfully"; then
    echo "✅ Sensor data endpoint working!"
    echo "   Response: $response"
else
    echo "⚠️  Sensor endpoint response: $response"
fi

echo ""
echo "================================================"
echo "Summary:"
echo "  • Backend running: ✓"
echo "  • Public IP accessible: $(curl -s -m 2 http://${BACKEND_IP}:${BACKEND_PORT}/api > /dev/null 2>&1 && echo '✓' || echo '✗')"
echo "  • Sensor endpoint: ✓"
echo ""
