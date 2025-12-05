# Arduino ESP32 GSM Connection Setup - On Device Guide

## 📋 What You Need on the Arduino Device

### Hardware Required:
1. ✅ Arduino ESP32 Nano
2. ✅ SIM800L GSM module
3. ✅ Activated SIM card with data plan
4. ✅ GSM antenna
5. ✅ Power supply (3.7-4.2V, 2A capable)
6. ✅ USB cable

### Wiring Connections:
```
ESP32 GPIO 8 (TX)  →  SIM800L RX
ESP32 GPIO 9 (RX)  →  SIM800L TX
SIM800L VCC        →  3.7-4.2V Power (NOT 5V!)
SIM800L GND        →  ESP32 GND
Antenna            →  SIM800L ANT connector
```

## 💻 Software Setup on Arduino Device

### Step 1: Install PlatformIO

**Option A: VS Code + PlatformIO Extension**
```bash
# Install VS Code
# Then install PlatformIO IDE extension from VS Code marketplace
```

**Option B: PlatformIO Core (command line)**
```bash
pip install platformio
# Or
python3 -m pip install platformio
```

### Step 2: Clone the Repository

```bash
git clone https://github.com/DomJab23/TeleScent.git
cd TeleScent
```

### Step 3: Update Configuration

**Edit:** `embedded /enose/include/main.h`

Change these lines:
```cpp
#define HOST_NAME "telescent-backend.onrender.com"
#define PORT 443
```

**✅ Already configured!** (Backend URL is set)

### Step 4: Build and Upload

**Connect ESP32 via USB**, then run:

```bash
cd "embedded /enose"

# Build and upload
pio run -e gsm_test -t upload

# Monitor serial output
pio device monitor
```

### Step 5: Watch Serial Monitor

You should see:
```
========================================
   GSM/SIM800L Test & Verification
========================================

[TEST 1/6] AT Command Test
✓ GSM module responding to AT commands

[TEST 2/6] Signal Quality Test
Signal Strength (RSSI): 18 (58%)
✓ Fair signal quality

[TEST 3/6] Network Registration Test
Registration Status: 1 - Registered, home network
✓ Successfully registered!

[TEST 4/6] GPRS Connection Test
✓ GPRS connection established!

[TEST 5/6] TCP Connection Test
Connecting to: telescent-backend.onrender.com:443
✓ TCP connection established!

[TEST 6/6] Data Transmission Test
Sending test data: {...}
✓ Data sent successfully!
```

## 🔧 Troubleshooting

### If "No response from GSM module":
- Check power supply (needs 2A capability)
- Verify RX/TX wiring (crossed)
- Check SIM800L LED (should blink)

### If "No signal (RSSI: 99)":
- Check antenna is connected
- Wait 30-60 seconds after power on
- Move to better signal location
- Verify SIM works in phone first

### If "GPRS connection failed":
- Check SIM has active data plan
- Verify account has credit
- Disable PIN on SIM card

### If "TCP connection failed":
- Test backend: https://telescent-backend.onrender.com/api
- Should return: {"message":"Hello from the TeleScent backend!"}
- Wait a moment and retry (Render cold start)

## 📱 Quick Test Without Arduino

Test backend from any device:

**Using browser:**
```
https://telescent-backend.onrender.com/api
```

**Using curl:**
```bash
curl https://telescent-backend.onrender.com/api
```

**Test sensor endpoint:**
```bash
curl -X POST https://telescent-backend.onrender.com/api/sensor-data \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"test","sensorType":"temp","value":25}'
```

## 🎯 Summary - What Arduino Needs

| Item | Status | Notes |
|------|--------|-------|
| Backend URL | ✅ Set | telescent-backend.onrender.com |
| Port | ✅ Set | 443 (HTTPS) |
| Authentication | ✅ Disabled | For testing |
| Code | ✅ Ready | In GitHub repo |
| Hardware | ⚠️ Check | SIM card, antenna, power |

## 📦 Files You Need

All code is in GitHub repo: `DomJab23/TeleScent`

**Key files:**
- `embedded /enose/src/main.cpp` - Main code
- `embedded /enose/include/main.h` - Configuration (HOST_NAME)
- `embedded /enose/test/test_gsm.cpp` - GSM test code
- `embedded /enose/platformio.ini` - Build config

## ✨ Quick Start Commands

On the Arduino device:

```bash
# 1. Clone repo
git clone https://github.com/DomJab23/TeleScent.git
cd TeleScent

# 2. Navigate to embedded code
cd "embedded /enose"

# 3. Upload GSM test
pio run -e gsm_test -t upload

# 4. Monitor output
pio device monitor
```

That's it! The Arduino will connect to your cloud backend via GSM! 📡
