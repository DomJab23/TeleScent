# 🚀 TeleScent Quick Start - One Command!

## Run Everything

```bash
./start-telescent.sh
```

## What You Get

✅ Backend (Node.js + Python ML) → http://localhost:5000  
✅ Frontend (React) → http://localhost:3000  
✅ ML Predictions → Automatic  
✅ Database → SQLite (persistent)  
✅ All services networked together

## First Time Setup

```bash
# 1. Clone repo (if not done)
git clone <repo-url>
cd TeleScent

# 2. Train ML model (if not done)
cd ml
jupyter notebook scentdetection.ipynb
# Run all cells to save model

# 3. Start everything
cd ..
./start-telescent.sh
```

## Common Commands

| Command | Description |
|---------|-------------|
| `./start-telescent.sh` | Start all services |
| `docker-compose -f docker-compose-ml.yml down` | Stop all services |
| `docker-compose -f docker-compose-ml.yml logs -f` | View logs |
| `docker-compose -f docker-compose-ml.yml restart` | Restart services |
| `docker-compose -f docker-compose-ml.yml ps` | Check status |

## Test It

```bash
# Send test sensor data
curl -X POST http://localhost:5000/api/sensor-data \
  -H "Content-Type: application/json" \
  -d '{"device_id":"test","gas":1.15,"voc_raw":24218,"nox_raw":14243,"no2":788,"ethanol":913,"voc":889,"co_h2":513}'

# Open browser
open http://localhost:3000/sensor-data
```

## Troubleshooting

### Ports already in use
```bash
# Kill local dev servers
pkill -f "node server.js"
pkill -f "npm start"
```

### ML model missing
```bash
ls ml/model/scent_pipeline.joblib
# If missing, train the model first (see above)
```

### Check service health
```bash
docker-compose -f docker-compose-ml.yml ps
docker-compose -f docker-compose-ml.yml logs backend | tail -20
```

## File Structure

```
TeleScent/
├── start-telescent.sh         ← RUN THIS!
├── docker-compose-ml.yml      ← Docker config
├── Dockerfile.backend         ← Backend image
├── Dockerfile.frontend        ← Frontend image
├── nginx.conf                 ← Nginx config
│
├── backend/                   ← Node.js API
├── frontend/                  ← React UI
└── ml/                        ← Python ML
    └── model/                 ← Trained model
        ├── scent_pipeline.joblib
        └── label_encoder.joblib
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 3000 | React app with Nginx |
| Backend | 5000 | Express API + ML inference |
| Database | N/A | SQLite (in backend container) |

## Development vs Docker

### Development (Separate terminals)
```bash
# Terminal 1
cd backend && npm start

# Terminal 2  
cd frontend && npm start
```

### Docker (One command)
```bash
./start-telescent.sh
```

## Architecture

```
Arduino → Backend:5000 → Python ML
                ↓
             SQLite
                ↑
           Frontend:3000
```

## Need Help?

- **Full docs**: See `DOCKER_README.md`
- **ML integration**: See `ML_INTEGRATION_README.md`
- **Setup summary**: See `INTEGRATION_SUMMARY.md`
- **Logs**: `docker-compose -f docker-compose-ml.yml logs -f`

---

**One command. That's it.** 🎉
