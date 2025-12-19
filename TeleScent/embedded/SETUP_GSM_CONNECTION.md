# GSM ESP32 Nano Connection Setup Guide

## Current Status
✅ Backend server is running on localhost:5000  
✅ GSM initialization code is enabled in main.cpp  
❌ Need to expose backend to internet for GSM access  

## Quick Connection Steps

### Step 1: Expose Your Backend to Internet

Choose ONE method:

#### Method A: LocalTunnel (Easiest - No signup required)
```bash
npx localtunnel --port 5000
```
- Will give you a URL like: `https://abc-xyz-123.loca.lt`
- Free and instant
- Keep this terminal open while testing

#### Method B: Direct IP (If your network allows)
```bash
# Your public IP: 130.226.87.132
# Make sure firewall allows port 5000
sudo ufw allow 5000/tcp
```

### Step 2: Update ESP32 Configuration

Edit: `embedded /enose/include/main.h`

**For LocalTunnel:**
```cpp
#define HOST_NAME "abc-xyz-123.loca.lt"  // Replace with your actual URL
#define PORT 80  // or 443 for HTTPS
```

**For Direct IP:**
```cpp
#define HOST_NAME "130.226.87.132"
#define PORT 5000
```

### Step 3: Run GSM Test

```bash
cd "/home/klaus/TeleScent/TeleScent/embedded /enose"
pio run -e gsm_test -t upload
pio device monitor
```

### Step 4: Watch for Success

Serial monitor should show:
```
✓ GSM module responding
✓ Signal quality good
✓ Network registered
✓ GPRS connected
✓ TCP connection established
✓ Data sent successfully
```

## Troubleshooting

### If backend not reachable from GSM:
1. Check tunnel is still running
2. Verify URL is correct (no https:// prefix in HOST_NAME)
3. Test URL from phone browser first
4. Check backend logs for incoming requests

### If GSM module not responding:
1. Check power (needs 3.7-4.2V, 2A capable)
2. Verify wiring: GPIO 8→RX, GPIO 9→TX
3. Check SIM card is inserted and activated
4. Ensure antenna is connected

### If authentication fails:
The backend requires JWT token. You need to:
1. Register a user via `/api/auth/register`
2. Get JWT token
3. Add token to ESP32 HTTP headers (needs code modification)

## Alternative: Test Without Authentication First

Temporarily disable auth for testing by modifying:
`backend/routes/sensor-data.js`

Remove `authenticateToken` middleware from the POST route.

## Ready to Upload?

Once you have your accessible URL:
1. Update `HOST_NAME` in `main.h`
2. Run: `pio run -t upload`
3. Monitor: `pio device monitor`
4. Watch serial output for connection status
