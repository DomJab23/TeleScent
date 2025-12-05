#!/bin/bash
# Upload and test GSM connection on ESP32

echo "🚀 Uploading GSM Test Code to ESP32..."
echo ""
echo "Configuration:"
echo "  Host: 130.226.87.132"
echo "  Port: 5000"
echo "  Auth: Disabled"
echo ""
echo "=========================================="
echo ""

cd "/home/klaus/TeleScent/TeleScent/embedded /enose"

echo "Building and uploading..."
pio run -e gsm_test -t upload

echo ""
echo "=========================================="
echo "Starting serial monitor..."
echo "Watch for connection status..."
echo ""

pio device monitor
