# TeleScent Internet Connectivity Guide

This guide explains how to connect to your TeleScent application over the internet using a SIM card connection (4G/5G or any mobile data).

## Overview

To make your app accessible over the internet via a SIM card, you need to:
1. Expose your backend server to the internet
2. Use a tunneling service or public IP
3. Configure CORS and security settings
4. Update the frontend to connect to the public URL

---

## Option 1: Using ngrok (Easiest for Development/Testing)

**ngrok** creates a public URL that tunnels to your localhost. Perfect for quick testing.

### Setup:
1. **Install ngrok**: Download from https://ngrok.com/download
2. **Authenticate**: 
   ```bash
   ngrok config add-authtoken YOUR_AUTH_TOKEN
   ```
3. **Start ngrok tunnel**:
   ```bash
   ngrok http 5000
   ```
   This will show you a public URL like: `https://abc123.ngrok.io`

### Configure Frontend:
In your frontend code, update the API base URL:
```javascript
// .env or config file
REACT_APP_API_URL=https://abc123.ngrok.io
```

### Pros:
- ✅ Instant setup (minutes)
- ✅ Works with any internet connection
- ✅ Automatic HTTPS
- ✅ Great for testing

### Cons:
- ❌ URL changes each restart (without paid plan)
- ❌ Limited bandwidth on free tier
- ❌ Not suitable for production

---

## Option 2: Dynamic DNS + Port Forwarding (Best for Home Setup)

Use your home internet provider's IP with dynamic DNS (your IP may change, so DNS updates automatically).

### Steps:

1. **Find your public IP**:
   ```bash
   curl ifconfig.me
   ```

2. **Set up Dynamic DNS**:
   - Sign up for a service like **No-IP**, **DuckDNS**, or **FreeDNS**
   - Configure your router to update your DNS record automatically
   - You'll get a domain like: `myapp.duckdns.org`

3. **Configure your router**:
   - Log into your router admin panel (usually 192.168.1.1)
   - Set up Port Forwarding:
     - External Port: `8080` (or any port)
     - Internal IP: Your machine's local IP (e.g., 192.168.1.100)
     - Internal Port: `5000`

4. **Update docker-compose.yml** if needed:
   ```yaml
   ports:
     - "8080:5000"  # Already configured
   ```

5. **Configure Frontend**:
   ```javascript
   REACT_APP_API_URL=https://myapp.duckdns.org:8080
   ```

### Pros:
- ✅ Free or cheap
- ✅ Stable domain
- ✅ Works globally
- ✅ No service dependency

### Cons:
- ❌ Requires router access
- ❌ ISP may block port forwarding
- ❌ Moderate setup complexity

---

## Option 3: Cloud Hosting (Best for Production)

Deploy to a cloud provider like AWS, DigitalOcean, Heroku, or Render.

### Example with DigitalOcean App Platform:

1. **Create a DigitalOcean account**
2. **Connect your GitHub repo**
3. **Deploy** with your `docker-compose.yml`
4. **Get public URL** automatically

### Update Backend for Production:

Modify `backend/server.js`:
```javascript
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';  // Listen on all interfaces

app.listen(PORT, HOST, () => {
  console.log(`Server running on ${HOST}:${PORT}`);
});
```

### Pros:
- ✅ Professional setup
- ✅ Scalable
- ✅ Always available
- ✅ Built-in SSL/HTTPS

### Cons:
- ❌ Monthly cost
- ❌ More complex setup
- ❌ Vendor lock-in

---

## Security Considerations

### 1. Enable HTTPS
Your backend already uses `cors()`, but ensure:

```javascript
// backend/server.js - Add to top
const https = require('https');
const fs = require('fs');
```

### 2. Update CORS for Public Access
```javascript
// backend/server.js
const allowedOrigins = [
  'http://localhost:3000',
  'https://myapp.duckdns.org',
  'https://abc123.ngrok.io',
  // Add other domains
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
```

### 3. Environment Variables
Create a `.env` file:
```
PORT=5000
JWT_SECRET=your-strong-secret-here-change-this
NODE_ENV=production
ALLOWED_ORIGINS=https://myapp.duckdns.org,https://abc123.ngrok.io
```

### 4. Rate Limiting
Add rate limiting to prevent abuse:
```bash
npm install express-rate-limit
```

```javascript
// backend/server.js
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

---

## Frontend Configuration

### Create `.env.production` in frontend directory:

```env
REACT_APP_API_URL=https://your-public-domain.com
REACT_APP_API_PORT=
HTTPS=true
```

### Update API calls in your React components:

```javascript
// Example API call
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

fetch(`${API_URL}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
  credentials: 'include' // Send cookies for authentication
})
```

---

## Testing Your Connection

### 1. From another device on same network:
```bash
curl http://YOUR_LOCAL_IP:8080/api
```

### 2. From outside network (via tunnel/public IP):
```bash
curl https://your-public-domain.com/api
```

### 3. From mobile device on cellular data:
- Use the public URL in your browser
- Monitor backend logs: `docker logs telescent-app`

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Connection refused" | Check firewall, verify port forwarding, ensure server is running |
| "CORS error" | Update CORS whitelist in `server.js` |
| "Certificate error" | Use HTTPS only, check SSL certificate validity |
| "Can't connect from phone" | Ensure you're using public URL, not localhost |
| "Connection works then stops" | Check IP hasn't changed (use dynamic DNS), check router |

---

## Recommended Setup for SIM Card Connectivity

**For your use case (accessing via SIM card):**

1. **Short-term testing**: Use **ngrok** (Option 1)
2. **Long-term home setup**: Use **Dynamic DNS + Port Forwarding** (Option 2)
3. **Production/Reliable**: Use **Cloud Hosting** (Option 3)

---

## Next Steps

Choose your preferred option and let me know if you need help implementing:
- Option 1: I'll help set up ngrok
- Option 2: I'll help with Dynamic DNS and router configuration
- Option 3: I'll help deploy to a cloud provider

---

## Additional Resources

- [ngrok Documentation](https://ngrok.com/docs)
- [DuckDNS Guide](https://www.duckdns.org/)
- [DigitalOcean App Platform](https://www.digitalocean.com/products/app-platform/)
- [Express CORS Documentation](https://expressjs.com/en/resources/middleware/cors.html)
