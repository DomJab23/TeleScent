# GSM Cellular Connection Setup Guide

## The Problem
GSM uses **cellular data network** (like 4G/LTE), NOT your local WiFi.
The ESP32 needs to reach your backend via the **internet**.

## Solutions for GSM Cellular Access

### ✅ RECOMMENDED: Free Cloud Hosting

Deploy your backend to get a permanent public URL:

#### Option A: Render.com (Easiest)
1. Go to: https://render.com
2. Sign up (free)
3. New > Web Service
4. Connect GitHub repo: DomJab23/TeleScent
5. Root Directory: `backend`
6. Build Command: `npm install`
7. Start Command: `node server.js`
8. Deploy (takes ~5 min)
9. Get URL: `https://telescent-xxxx.onrender.com`

#### Option B: Railway.app
1. Go to: https://railway.app
2. Sign up with GitHub
3. New Project > Deploy from GitHub
4. Select TeleScent repo
5. Add `backend` service
6. Deploy
7. Get URL: `https://telescent-production.railway.app`

#### Option C: Fly.io
```bash
cd /home/klaus/TeleScent/TeleScent/backend
fly launch --name telescent
fly deploy
# Get URL: https://telescent.fly.dev
```

### 🔧 Alternative: Public IP + Port Forwarding

If your network allows incoming connections:

**Your Public IP:** 130.226.87.132

**Steps:**
1. Open port 5000 on firewall:
   ```bash
   sudo ufw allow 5000/tcp
   sudo ufw status
   ```

2. Configure router port forwarding (if behind NAT):
   - External port: 5000
   - Internal IP: 10.126.3.248
   - Internal port: 5000

3. Update ESP32:
   ```cpp
   #define HOST_NAME "130.226.87.132"
   #define PORT 5000
   ```

4. Test from phone (using mobile data):
   ```
   http://130.226.87.132:5000/api
   ```

⚠️ **Security Warning:** Exposing port 5000 directly is less secure.

## After Deployment

### 1. Update ESP32 Configuration

Edit: `/home/klaus/TeleScent/TeleScent/embedded /enose/include/main.h`

```cpp
#define HOST_NAME "your-app.onrender.com"  // Your deployed URL (no https://)
#define PORT 443  // Use 443 for HTTPS, 80 for HTTP
```

### 2. Upload to ESP32

```bash
cd "/home/klaus/TeleScent/TeleScent/embedded /enose"
pio run -e gsm_test -t upload
pio device monitor
```

### 3. Watch Serial Monitor

You should see:
- ✓ GSM module responding
- ✓ Signal strength good
- ✓ Network registered
- ✓ GPRS connected (cellular data)
- ✓ TCP connection to your server
- ✓ Data sent successfully

## Important Notes

### Authentication Issue
Your backend requires JWT authentication. For initial testing:

**Option 1: Disable auth for testing**
Edit: `backend/routes/sensor-data.js`
Change:
```javascript
router.post('/', authenticateToken, async (req, res) => {
```
To:
```javascript
router.post('/', async (req, res) => {
```

**Option 2: Add auth to ESP32 (proper way)**
You'll need to:
1. Register a device user
2. Get JWT token
3. Add `Authorization: Bearer <token>` header to ESP32 requests

### Data Costs
GSM uses cellular data. Each sensor reading uses ~1-2 KB.
- 1000 readings ≈ 1-2 MB data
- Make sure SIM has active data plan

## Quick Decision Guide

**Best for you:** Use Render.com or Railway.app
- ✅ Free
- ✅ Always online
- ✅ HTTPS included
- ✅ No router config needed
- ✅ Works from anywhere
- ✅ Takes 10 minutes to setup

**Only use Public IP if:**
- ❌ You don't want to create account
- ❌ You have router access
- ❌ Your ISP allows port forwarding
- ❌ You're okay with security risks
