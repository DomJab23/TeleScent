# TeleScent Backend - Render.com Deployment Guide

## 🚀 Quick Deploy to Render.com (10 minutes)

### Step 1: Commit Your Changes

```bash
cd /home/klaus/TeleScent/TeleScent
git add .
git commit -m "Add Render.com configuration for backend deployment"
git push origin main
```

### Step 2: Create Render Account & Deploy

1. **Go to:** https://render.com
2. **Sign up** with your GitHub account (DomJab23)
3. Click **"New +"** → **"Web Service"**
4. **Connect Repository:**
   - Click "Connect account" if needed
   - Select repository: `DomJab23/TeleScent`
   - Click "Connect"

5. **Configure Service:**
   ```
   Name:           telescent-backend
   Region:         Oregon (US West) - Free tier
   Branch:         main
   Root Directory: backend
   Runtime:        Node
   Build Command:  npm install
   Start Command:  node server.js
   Plan:           Free
   ```

6. **Add Environment Variables:**
   Click "Advanced" and add:
   ```
   NODE_ENV=production
   PORT=5000
   ```

7. **Click "Create Web Service"**
   - Deployment takes ~5 minutes
   - Watch the logs for completion

8. **Get Your URL:**
   - After deployment, you'll see: `https://telescent-backend-xxxx.onrender.com`
   - Test it: `https://telescent-backend-xxxx.onrender.com/api`

### Step 3: Update ESP32 Configuration

Once deployed, update your ESP32:

```cpp
// In: embedded /enose/include/main.h
#define HOST_NAME "telescent-backend-xxxx.onrender.com"  // Your Render URL (no https://)
#define PORT 443  // HTTPS port
```

### Step 4: Upload to ESP32

```bash
cd "/home/klaus/TeleScent/TeleScent/embedded /enose"
pio run -e gsm_test -t upload
pio device monitor
```

## 📋 Alternative: One-Click Deploy

Or use `render.yaml` (already created in repo root):

1. Go to: https://render.com/docs/deploy-yaml
2. Click: "New" → "Blueprint"
3. Connect GitHub repo
4. Render will auto-detect `render.yaml`
5. Click "Apply"

## ✅ Advantages of Render

- ✅ Free tier (750 hours/month - enough for testing)
- ✅ Automatic HTTPS
- ✅ Always online (no sleep after inactivity)
- ✅ Easy GitHub deployment
- ✅ Free SSL certificate
- ✅ Works globally (GSM from anywhere)

## 🔧 Troubleshooting

### If deployment fails:
1. Check logs in Render dashboard
2. Verify `package.json` exists in backend folder
3. Ensure all dependencies are listed

### If ESP32 can't connect:
1. Test URL in browser first
2. Make sure using `443` for HTTPS
3. Don't include `https://` in HOST_NAME
4. Check GSM has signal and data plan active

## 📊 Monitoring

After deployment, you can:
- View logs in Render dashboard
- See incoming requests from ESP32
- Check service status
- Monitor data usage

## 💰 Pricing

**Free Tier includes:**
- 750 hours/month (enough for 24/7)
- Automatic deploys
- Custom domains
- Free SSL

Perfect for your IoT project!
