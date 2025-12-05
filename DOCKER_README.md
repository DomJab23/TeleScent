# 🚀 TeleScent - One Command Docker Setup

## Quick Start

Run the entire TeleScent system (backend + frontend + ML) with **ONE command**:

```bash
./start-telescent.sh
```

That's it! 🎉

## What Gets Started

The script automatically:
1. ✅ Builds Docker images for backend and frontend
2. ✅ Starts Node.js backend server (port 5000)
3. ✅ Starts Python ML inference service
4. ✅ Starts React frontend with Nginx (port 3000)
5. ✅ Configures networking between services
6. ✅ Health checks all services

## Access Points

After running `./start-telescent.sh`:

- **Frontend Dashboard**: http://localhost:3000
- **Sensor Data Page**: http://localhost:3000/sensor-data
- **Backend API**: http://localhost:5000/api
- **ML Prediction**: Integrated in backend

## Prerequisites

### Required
- **Docker**: Install from https://docs.docker.com/get-docker/
- **Docker Compose**: Usually included with Docker Desktop

### Optional (for ML to work)
- **Trained ML Model**: Must exist at `ml/model/scent_pipeline.joblib`
  - If missing, run the Jupyter notebook: `ml/scentdetection.ipynb`
  - Execute all cells to train and save the model
  - The startup script will warn if model is missing

## Architecture

```
┌─────────────────┐
│   Arduino/ESP   │ ← Sends sensor data via HTTP POST
└────────┬────────┘
         │
         v
┌─────────────────────────────────────────────┐
│          Docker Network                      │
│                                              │
│  ┌──────────────────┐  ┌──────────────────┐│
│  │   Backend        │  │   Frontend       ││
│  │   (Node.js)      │  │   (React+Nginx)  ││
│  │                  │  │                  ││
│  │  ┌────────────┐  │  │  Port 3000 → 80 ││
│  │  │ Python ML  │  │  │                  ││
│  │  │ Service    │  │  │  Proxies /api    ││
│  │  └────────────┘  │  │  to backend      ││
│  │                  │←─┤                  ││
│  │  Port 5000       │  └──────────────────┘│
│  └──────────────────┘                       │
│          ↓                                   │
│  ┌──────────────────┐                       │
│  │   SQLite DB      │                       │
│  │   (Volume)       │                       │
│  └──────────────────┘                       │
└─────────────────────────────────────────────┘
```

## Docker Services

### Backend Container
- **Image**: Custom Node.js 20 + Python 3
- **Includes**:
  - Express.js server
  - Sensor data routes
  - Python virtual environment
  - ML inference service (serve.py)
  - scikit-learn, pandas, joblib
- **Port**: 5000
- **Volumes**:
  - `./ml/model` → ML model files (read-only)
  - `./backend/database.sqlite` → Persistent database

### Frontend Container
- **Image**: Nginx Alpine (lightweight)
- **Build**: Multi-stage (Node build → Nginx serve)
- **Port**: 3000 (mapped to 80 inside container)
- **Features**:
  - Optimized production React build
  - Gzip compression
  - API proxy to backend
  - Static asset caching

## Common Commands

### Start Services
```bash
./start-telescent.sh
```

### Stop Services
```bash
docker-compose -f docker-compose-ml.yml down
```

### View All Logs (Live)
```bash
docker-compose -f docker-compose-ml.yml logs -f
```

### View Backend Logs Only
```bash
docker-compose -f docker-compose-ml.yml logs -f backend
```

### View Frontend Logs Only
```bash
docker-compose -f docker-compose-ml.yml logs -f frontend
```

### Restart Services
```bash
docker-compose -f docker-compose-ml.yml restart
```

### Rebuild After Code Changes
```bash
docker-compose -f docker-compose-ml.yml down
docker-compose -f docker-compose-ml.yml build
docker-compose -f docker-compose-ml.yml up -d
```

### Check Service Status
```bash
docker-compose -f docker-compose-ml.yml ps
```

### Access Container Shell
```bash
# Backend
docker exec -it telescent-backend /bin/bash

# Frontend
docker exec -it telescent-frontend /bin/sh
```

## Testing

### Send Test Sensor Data
```bash
curl -X POST http://localhost:5000/api/sensor-data \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "EnoseDevice001",
    "timestamp": 25524,
    "temperature": 24.18,
    "humidity": 33.92,
    "pressure": 100.95,
    "gas": 1.15,
    "voc_raw": 24218,
    "nox_raw": 14243,
    "no2": 788,
    "ethanol": 913,
    "voc": 889,
    "co_h2": 513
  }'
```

### Check ML Prediction Response
```bash
curl -s -X POST http://localhost:5000/api/sensor-data \
  -H "Content-Type: application/json" \
  -d '{"device_id":"test","gas":1.15,"voc_raw":24218,"nox_raw":14243,"no2":788,"ethanol":913,"voc":889,"co_h2":513}' \
  | jq '.ml_prediction'
```

Expected response:
```json
{
  "scent": "icecream",
  "confidence": 0.398,
  "top_predictions": {
    "icecream": 0.398,
    "lemon": 0.249,
    "mango": 0.167
  }
}
```

## Troubleshooting

### Services Won't Start

**Check Docker is running:**
```bash
docker ps
```

**Check logs for errors:**
```bash
docker-compose -f docker-compose-ml.yml logs
```

### ML Prediction Returns "error"

**Cause**: Model file missing or Python dependencies failed to install

**Solution 1**: Ensure model exists
```bash
ls -lh ml/model/scent_pipeline.joblib
```

**Solution 2**: Check backend logs
```bash
docker-compose -f docker-compose-ml.yml logs backend | grep ML
```

**Solution 3**: Access container and test Python
```bash
docker exec -it telescent-backend /bin/bash
/app/venv/bin/python3 /app/ml/serve.py < test.json
```

### Frontend Shows Blank Page

**Cause**: Build failed or Nginx misconfigured

**Solution**: Check build logs
```bash
docker-compose -f docker-compose-ml.yml logs frontend
```

### Port Already in Use

**Cause**: Another service using port 3000 or 5000

**Solution**: Stop conflicting services
```bash
# Find what's using the port
lsof -i :3000
lsof -i :5000

# Stop your local dev servers if running
pkill -f "node server.js"
pkill -f "react-scripts"
```

### Database Issues

**Reset database:**
```bash
docker-compose -f docker-compose-ml.yml down
rm backend/database.sqlite
docker-compose -f docker-compose-ml.yml up -d
```

## Development vs Production

### Development (Current Setup)
- Separate terminal windows
- Hot reload enabled
- Local file changes reflect immediately
- Run: `npm start` in backend and frontend

### Production (Docker)
- All services in containers
- Optimized builds
- No hot reload
- Persistent data via volumes
- Run: `./start-telescent.sh`

## Environment Variables

You can customize the setup by creating a `.env` file:

```bash
# .env
NODE_ENV=production
PORT=5000
FRONTEND_PORT=3000
```

Then use:
```bash
docker-compose -f docker-compose-ml.yml --env-file .env up -d
```

## File Structure

```
TeleScent/
├── start-telescent.sh          ← ONE COMMAND TO RUN
├── docker-compose-ml.yml       ← Service orchestration
├── Dockerfile.backend          ← Backend + ML image
├── Dockerfile.frontend         ← Frontend image
├── nginx.conf                  ← Nginx configuration
├── .dockerignore              ← Exclude unnecessary files
│
├── backend/
│   ├── server.js
│   ├── routes/
│   │   └── sensor-data.js     ← ML integration here
│   └── database.sqlite        ← Volume mounted
│
├── frontend/
│   ├── src/
│   │   └── pages/
│   │       └── SensorData.js  ← ML display page
│   └── build/                 ← Created during build
│
└── ml/
    ├── serve.py               ← ML inference script
    ├── model/
    │   ├── scent_pipeline.joblib
    │   └── label_encoder.joblib
    └── requirements.txt
```

## Performance

### Resource Usage
- **Backend**: ~150MB RAM, <5% CPU
- **Frontend**: ~50MB RAM, <1% CPU (Nginx)
- **Total**: ~200MB RAM

### Startup Time
- **First build**: 3-5 minutes (downloads images, installs dependencies)
- **Subsequent starts**: 10-20 seconds (uses cached images)

### Prediction Latency
- **ML inference**: 200-500ms per request
- **API response**: <1 second total

## Updating Code

After making code changes:

**Backend changes:**
```bash
docker-compose -f docker-compose-ml.yml restart backend
```

**Frontend changes:**
```bash
docker-compose -f docker-compose-ml.yml build frontend
docker-compose -f docker-compose-ml.yml up -d frontend
```

**ML model changes:**
Just replace the model file - it's volume-mounted, no rebuild needed!

## Production Deployment

For production (cloud/server):

1. **Set environment to production**
2. **Use secrets for sensitive data**
3. **Enable HTTPS with Let's Encrypt**
4. **Use proper logging**
5. **Set up monitoring**
6. **Configure backup for database**

Example production docker-compose (separate file):
```yaml
services:
  backend:
    restart: always
    environment:
      - NODE_ENV=production
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## Support

### Quick Help
```bash
./start-telescent.sh --help  # (if implemented)
```

### Logs Location
- **Backend**: `docker-compose logs backend`
- **Frontend**: `docker-compose logs frontend`
- **Build output**: Shown during `./start-telescent.sh`

### Common Issues
1. **Model not found**: Train model first
2. **Port in use**: Stop local dev servers
3. **Build fails**: Check Docker has enough space
4. **Python errors**: Check requirements.txt matches model

## Next Steps

After running `./start-telescent.sh`:

1. ✅ Open http://localhost:3000
2. ✅ Navigate to "Sensor Data" tab
3. ✅ Send test data with curl command above
4. ✅ Watch real-time ML predictions appear
5. ✅ Connect your Arduino to send real data

---

**That's it! One command, and you're running! 🚀**

For detailed ML integration info, see: `ML_INTEGRATION_README.md`
