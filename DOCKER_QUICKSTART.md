# 🐳 TeleScent Docker Quick Start

Run the entire TeleScent system (backend + ML + ngrok) with one command!

## Prerequisites

- Docker Desktop installed
- Docker Compose v2+

## Quick Start

### 1. Start Everything

```bash
docker-compose up
```

That's it! The system will:
- ✅ Build backend with Node.js and Python
- ✅ Install all ML dependencies
- ✅ Start backend server on port 5001
- ✅ Create ngrok tunnel for remote access
- ✅ Serve frontend automatically

### 2. Access the Application

**Local Access:**
- Frontend: http://localhost:5001
- Ngrok Dashboard: http://localhost:4040

**Remote Access via ngrok:**
1. Open http://localhost:4040 in browser
2. Copy the ngrok URL (e.g., https://xxxx.ngrok-free.app)
3. Access TeleScent from anywhere using that URL

**Login:**
- Username: `admin`
- Password: `admin123`

### 3. Stop Everything

```bash
docker-compose down
```

---

## Optional: Configure ngrok Token

For persistent ngrok URLs (recommended for production):

1. Get free ngrok token: https://dashboard.ngrok.com/get-started/your-authtoken
2. Create `.env` file:
   ```bash
   cp .env.example .env
   ```
3. Edit `.env` and add your token:
   ```
   NGROK_AUTHTOKEN=your_token_here
   ```
4. Restart: `docker-compose up`

---

## Useful Commands

### View Logs
```bash
# All services
docker-compose logs -f

# Backend only
docker-compose logs -f backend

# ngrok only
docker-compose logs -f ngrok
```

### Rebuild After Changes
```bash
docker-compose up --build
```

### Run in Background
```bash
docker-compose up -d
```

### Check Status
```bash
docker-compose ps
```

### Stop and Remove Everything
```bash
docker-compose down -v
```

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   Docker Host                   │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │         telescent-backend                │  │
│  │  - Node.js backend (port 5001)          │  │
│  │  - Python ML service                     │  │
│  │  - Serves frontend                       │  │
│  │  - SQLite database                       │  │
│  └──────────────────────────────────────────┘  │
│                     ↓                           │
│  ┌──────────────────────────────────────────┐  │
│  │         telescent-ngrok                  │  │
│  │  - Tunnels port 5001                     │  │
│  │  - Dashboard on port 4040                │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
└─────────────────────────────────────────────────┘
         ↓                              ↓
    localhost:5001           https://xxxx.ngrok-free.app
   (local access)              (remote access)
```

---

## Arduino Configuration

Update your Arduino code to use the ngrok URL:

```cpp
// Get ngrok URL from http://localhost:4040
const char URLPOST[] = "http://your-ngrok-url.ngrok-free.app/api/sensor-data";
const char URLGET[] = "http://your-ngrok-url.ngrok-free.app/api/sensor-data/emitter";
```

---

## ML Model Deployment

The ML model is automatically deployed with:
- ✅ 19 engineered features
- ✅ Random Forest classifier
- ✅ Expected accuracy: 88-90%
- ✅ Confidence threshold: 80%

**Trained Scents:**
- Cinnamon
- Gingerbread
- Natural Orange (norange)
- Vanilla

---

## Troubleshooting

### Port 5001 already in use
```bash
# Stop local backend if running
Get-Process node | Stop-Process -Force

# Or change port in docker-compose.yml
ports:
  - "5002:5001"  # Use 5002 instead
```

### ngrok not working
- Check if you have ngrok authtoken set in `.env`
- View ngrok logs: `docker-compose logs ngrok`
- Access ngrok dashboard: http://localhost:4040

### Backend not starting
```bash
# View backend logs
docker-compose logs backend

# Rebuild
docker-compose up --build
```

### ML predictions not working
```bash
# Check Python is installed in container
docker-compose exec backend python3 --version

# Check ML model files exist
docker-compose exec backend ls -la /app/ml/model/
```

---

## Development Tips

### Hot Reload
Mount your code as volumes for development:
```yaml
volumes:
  - ./backend:/app/backend
  - ./ml:/app/ml
```

### Access Container Shell
```bash
# Backend container
docker-compose exec backend bash

# Check ML service
docker-compose exec backend python3 /app/ml/serve.py
```

---

## Production Deployment

For production:
1. Get ngrok paid plan for custom domains
2. Use environment variables for secrets
3. Set up proper logging
4. Configure database backups
5. Monitor with `docker-compose logs`

---

**Need help?** See the full documentation:
- Backend: `backend/README.md`
- ML Model: `ml/DEPLOYMENT_GUIDE.md`
- Frontend: `frontend/README.md`
