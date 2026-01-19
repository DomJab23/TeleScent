# TeleScent Docker Deployment Guide

## Overview
TeleScent backend with automatic localhost.run HTTP/HTTPS tunnel for IoT device access.

## Features
✅ No authentication required - auto-login to dashboard
✅ HTTP tunnel support for eNose devices
✅ HTTPS support for web browsers
✅ Automatic tunnel reconnection
✅ Frontend build included
✅ SQLite database persistence

## Quick Start

### 1. Build and Run
```bash
docker-compose up --build
```

### 2. Get Your Tunnel URLs
Watch the logs for your public URLs:
```bash
docker logs -f telescent-backend
```

Look for lines like:
```
🌐 HTTP URL:  http://xxxxx.lhr.life
🌐 HTTPS URL: https://xxxxx.lhr.life
```

### 3. Access Your Application
- **Web Browser:** Use the HTTPS URL
- **eNose Device:** Use the HTTP URL
- **No Login Required:** Just click "SIGN IN" to access dashboard

## Configuration

### Environment Variables (docker-compose.yml)
- `NODE_ENV`: Set to `production`
- `PORT`: Backend port (default: 5001)
- `DOCKER_ENV`: Set to `true` for Docker environment
- `NGROK_AUTHTOKEN`: Set to any value (e.g., "enable") to enable tunnel

### Volumes
- `./backend/database.sqlite`: Database persistence
- `./collected_data`: Sensor data storage

## Tunneling Service

### localhost.run (Default)
- **Pros:** 
  - Free forever
  - Supports both HTTP and HTTPS
  - No signup required
  - Auto-reconnects
- **Cons:**
  - URL changes on restart
  - May have rate limits

### Getting a Stable URL
For a permanent domain, sign up at https://localhost.run/docs/forever-free/

## Commands

### View Logs
```bash
docker logs -f telescent-backend
```

### Check Tunnel Status
```bash
docker exec telescent-backend cat /tmp/tunnel.log
```

### Restart Container
```bash
docker-compose restart
```

### Rebuild Container
```bash
docker-compose up --build
```

### Stop Container
```bash
docker-compose down
```

## Troubleshooting

### Tunnel Not Connecting
1. Check logs: `docker logs telescent-backend`
2. Verify SSH is working: `docker exec telescent-backend ssh -V`
3. Check tunnel log: `docker exec telescent-backend cat /tmp/tunnel.log`

### Backend Not Starting
1. Check if port 5001 is available
2. View logs: `docker logs telescent-backend`
3. Verify database file permissions

### Login Issues
- No login required! Just click "SIGN IN" button
- If redirected back to login, check browser console for errors

## API Endpoints

All API endpoints available at your tunnel URL:

- `GET /api/sensor-data` - Get sensor readings
- `POST /api/sensor-data` - Post new sensor data
- `GET /api/stats` - Get statistics
- `POST /api/auth/login` - Auto-login (no credentials needed)

## IoT Device Configuration

Update your eNose device to POST data to:
```
http://xxxxx.lhr.life/api/sensor-data
```

Replace `xxxxx.lhr.life` with your actual HTTP tunnel URL from the logs.

## Production Notes

- For production use, consider upgrading to a paid tunnel service for stable URLs
- Enable proper authentication by reverting changes in `backend/routes/auth.js`
- Use environment variables for sensitive configuration
- Set up proper SSL certificates if self-hosting

## Updates

To update the application:
1. Pull latest changes
2. Rebuild: `docker-compose up --build`
3. Get new tunnel URL from logs

---
Generated: January 19, 2026
