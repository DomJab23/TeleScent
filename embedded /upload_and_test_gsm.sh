#!/bin/bash
# Upload GSM code to ESP32 and test Render.com connection

echo "🚀 Uploading GSM Code to ESP32"
echo "=============================="
echo ""
echo "Configuration:"
echo "  Backend: https://telescent-backend.onrender.com"
echo "  Host: telescent-backend.onrender.com"
echo "  Port: 443 (HTTPS)"
echo ""
echo "This will:"
echo "  1. Build the GSM test code"
echo "  2. Upload to ESP32"
echo "  3. Start serial monitor"
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."
echo ""

cd "/home/klaus/TeleScent/TeleScent/embedded /enose"

echo "Building and uploading..."
pio run -e gsm_test -t upload

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Upload successful!"
    echo ""
    echo "Starting serial monitor..."
    echo "Watch for:"
    echo "  ✓ GSM module responding"
    echo "  ✓ Signal quality"
    echo "  ✓ Network registration"
    echo "  ✓ GPRS connection"
    echo "  ✓ TCP connection to telescent-backend.onrender.com"
    echo "  ✓ Data sent successfully"
    echo ""
    echo "Press Ctrl+] to exit monitor"
    echo ""
    sleep 2
    pio device monitor
else
    echo ""
    echo "❌ Upload failed!"
    echo "Check:"
    echo "  - ESP32 is connected via USB"
    echo "  - Correct port permissions"
    echo "  - PlatformIO is installed"
fi
