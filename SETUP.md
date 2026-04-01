# 🏭 ZINABEL - Setup & Installation Guide

## 📋 Table of Contents
- [Quick Start](#quick-start)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running Locally](#running-locally)
- [Docker Setup](#docker-setup)
- [Troubleshooting](#troubleshooting)

---

## ⚡ Quick Start (Local - Windows)

```powershell
# 1. Activate virtual environment
.venv\Scripts\Activate.ps1

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure .env (see Configuration section)
# Edit .env with your settings

# 4. Run the application
python START_DEBUG.py
```

Access at: **http://localhost:3000**

---

## 📦 Prerequisites

### Windows (Local Development)
- Python 3.8+
- Node.js 16+
- Brave Browser (or Chrome)
- ChromeDriver v146 (in `ChromDriver manager/` folder)

### Docker (Production)
- Docker Desktop
- Docker Compose

---

## 🔧 Installation

### Step 1: Clone & Setup Virtual Environment

```powershell
# Create virtual environment
python -m venv .venv

# Activate it
.venv\Scripts\Activate.ps1

# Install Python packages
pip install -r requirements.txt

# Navigate to frontend and install Node dependencies
cd frontend
npm install
cd ..
```

### Step 2: Prepare ChromeDriver

The system supports two modes:

#### Option A: Use Local ChromeDriver (Recommended)
```
ChromDriver manager/
  ├── chromedriver-win64/
  │   └── chromedriver.exe      (Windows)
  └── chromedriver-linux64/
      └── chromedriver          (Linux/Docker)
```

The driver is auto-detected based on your OS!

#### Option B: Let webdriver-manager auto-download
If you don't have a local driver, the system will automatically download it.

---

## ⚙️ Configuration

### .env File (Windows Local Development)

Create/update `.env` in the project root:

```env
# Server port
PORT=5000

# Browser configuration (Windows only)
BRAVE_PATH=C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe

# Optional: Explicit ChromeDriver path
# If not set, auto-detection will be used (local project folder > webdriver-manager)
CHROMEDRIVER_PATH=ChromDriver manager/chromedriver-win64/chromedriver.exe

# Optional: Online system credentials (for auto-sync without manual login)
ONLINE_USERNAME=your_username
ONLINE_PASSWORD=your_password
```

### For Docker
The `.env` is automatically overridden by the Dockerfile:
```dockerfile
ENV CHROMEDRIVER_PATH=/usr/local/bin/chromedriver
ENV BRAVE_PATH=/usr/bin/chromium
```

---

## 🚀 Running Locally

### Option 1: Full Stack (Frontend + Backend)
```powershell
python START_DEBUG.py
```

This will:
1. Start Flask backend on `http://localhost:5000`
2. Start Vite frontend on `http://localhost:3000` (or `3001` if port in use)
3. Auto-open browser

### Option 2: Backend Only
```powershell
cd backend
python run_app.py
```

### Option 3: Frontend Only
```powershell
cd frontend
npm run dev
```

---

## 🐳 Docker Deployment

### Build & Run

```powershell
# Build and run in background
docker compose up --build -d

# View logs
docker logs -f <container_id>

# Stop
docker compose down
```

**Access at:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

### Docker Volumes
- `zinabel_data:/app/database` - Persistent database storage

---

## 🔐 Login

ZINABEL uses **external authentication** from https://onetechapp.ma/sageb2b

- **Username**: Your account username
- **Password**: Your account password
- **Auto-sync**: Enabled by default (syncs every 1 minute)

### Credentials

Set online credentials in `.env` (optional):
```env
ONLINE_USERNAME=your_username
ONLINE_PASSWORD=your_password
```

If not set, you'll need to login through the UI every time.

---

## 📊 API Documentation

### Base URL
- **Local**: `http://localhost:5000/api`
- **Docker**: `http://backend:5000/api`

### Key Endpoints
- `POST /api/auth/login` - User authentication
- `GET /api/orders` - List orders
- `GET /api/products` - List products
- `GET /api/warehouse/locations` - Warehouse locations
- `GET /api/stock/alerts` - Low stock alerts

Full docs: Check backend routes in `backend/app.py`

---

## 🆘 Troubleshooting

### "ChromeDriver not found"
1. Ensure `ChromDriver manager/` folder exists with the correct drivers
2. Or set `CHROMEDRIVER_PATH` in `.env` to your local ChromeDriver path
3. Or let webdriver-manager auto-download it

### "Backend not responding"
1. Check if backend is running: `http://localhost:5000`
2. Verify port 5000 is not in use
3. Check logs: `python START_DEBUG.py`

### "Frontend can't connect to backend (Docker)"
1. Ensure both containers are running: `docker ps`
2. Check frontend env var: `VITE_API_URL=http://backend:5000`
3. View logs: `docker logs <container_id>`

### "Port already in use"
```powershell
# Find process using port
netstat -ano | findstr :5000

# Kill it
taskkill /PID <PID> /F
```

### "Database locked"
1. Stop all instances
2. Delete `database/zinabel.db` (if testing)
3. Restart

---

## 📁 Project Structure

```
ZINABEL SYSTEM/
├── backend/                 # Flask API
│   ├── api/
│   │   ├── routes/         # API endpoints
│   │   └── models/         # Data models
│   ├── utils/
│   │   └── online_system.py # Selenium login
│   └── run_app.py          # Backend entry point
├── frontend/               # React + Vite
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── hooks/
│   └── package.json
├── ChromDriver manager/    # Browser drivers
├── database/              # SQLite database
├── requirements.txt       # Python dependencies
├── docker-compose.yml     # Docker configuration
├── Dockerfile             # Backend container
├── .env                   # Configuration
└── START_DEBUG.py         # Local run script
```

---

## 🚀 Production Deployment

### Pre-Flight Checklist
- [ ] All secrets in `.env` (not in code)
- [ ] Database backed up
- [ ] CORS configured for your domain
- [ ] HTTPS enabled (in production)
- [ ] Docker images built and tested
- [ ] Environment variables set in webhook/CI

### Deploy with Docker
```powershell
docker-compose -f docker-compose.yml up -d
```

---

## 📞 Support

For issues:
1. Check logs: `docker logs <container>` or `console output`
2. Verify `.env` configuration
3. Ensure all prerequisites installed
4. Check port availability

---

**Last Updated:** April 1, 2026  
**Version:** 1.0.0
