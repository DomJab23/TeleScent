#!/bin/bash
# GSM Test Upload Script for Arduino Nano ESP32

export PATH="$HOME/.local/bin:$PATH"
cd "/home/klaus/TeleScent/TeleScent/embedded /enose"

echo "=========================================="
echo "  Arduino Nano ESP32 Upload Script"
echo "=========================================="
echo ""
echo "INSTRUCTIONS:"
echo "1. Hold down the BOOT button on Arduino"
echo "2. While holding BOOT, press and release RESET"
echo "3. Keep holding BOOT for 2 more seconds"
echo "4. Release BOOT"
echo "5. Press ENTER here to start upload"
echo ""
read -p "Press ENTER when Arduino is in bootloader mode..."

echo ""
echo "Checking for Arduino..."
PORT=$(ls /dev/ttyACM* 2>/dev/null | head -n1)

if [ -z "$PORT" ]; then
    echo "❌ ERROR: Arduino not found!"
    echo "   Please reconnect the USB cable and try again."
    exit 1
fi

echo "✓ Found Arduino at: $PORT"
echo ""
echo "Starting upload..."
echo ""

pio run -e gsm_test -t upload --upload-port "$PORT"

RESULT=$?

if [ $RESULT -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "✓✓✓ UPLOAD SUCCESSFUL! ✓✓✓"
    echo "=========================================="
    echo ""
    echo "Now opening serial monitor..."
    echo "Press Ctrl+C to exit monitor"
    echo ""
    sleep 2
    pio device monitor --port "$PORT" --baud 115200
else
    echo ""
    echo "=========================================="
    echo "❌ UPLOAD FAILED"
    echo "=========================================="
    echo ""
    echo "Troubleshooting:"
    echo "1. Try again with boot button method"
    echo "2. Check USB cable (needs data capability)"
    echo "3. Try a different USB port"
    echo "4. Unplug/replug Arduino and wait 10 seconds"
    exit 1
fi
