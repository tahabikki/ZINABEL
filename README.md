# 🏭 ZINABEL - Warehouse Management System

A professional **warehouse management system** with automated order synchronization from external systems. Built with **React + Vite** (frontend) and **Flask** (backend), with **SQLite** database and **Selenium**-based browser automation.

---

## 📋 Quick Navigation

- [✨ Features](#-features)
- [🚀 Quick Start](#-quick-start)
- [⚙️ Configuration](#-configuration)
- [🔄 Automated Sync](#-automated-sync)
- [🐛 Troubleshooting](#-troubleshooting)
- [📝 Deployment](#-deployment)

---

## ✨ Features

✅ **Dashboard** - Real-time warehouse metrics and statistics  
✅ **Order Management** - Sync orders from external system  
✅ **Product Inventory** - Track products and stock levels  
✅ **Warehouse Locations** - Organize items by location  
✅ **Stock Management** - Low-stock alerts and reordering  
✅ **PDF Processing** - Auto-extract order data from PDFs  
✅ **Collection Circuit** - Track item collection status  
✅ **Reports** - Generate warehouse and financial reports  
✅ **Responsive Design** - Desktop, tablet, and mobile compatible  
✅ **Automated Sync** - Keeps database in sync with external system (configurable interval)  
✅ **Headless Browser** - Selenium-based automation (no visible window)  
✅ **In-Memory PDFs** - Download and process without disk storage  
✅ **Production Ready** - Gunicorn WSGI server + Docker support

---

## 🚀 Quick Start

### Prerequisites

✅ **Python 3.11+** | **Node.js 18+** | **Git**  
✅ **Brave Browser** (Windows) OR **Chrome** (Linux/Docker)  
✅ **ChromeDriver v146+** (pre-installed or auto-downloaded)

### Development Setup (5 Minutes)

#### 1. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
```

#### 2. Frontend

```bash
cd frontend
npm install
```

#### 3. Configure Environment

Create `.env` in project root:

```env
PORT=5000
BRAVE_PATH=C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe
CHROMEDRIVER_PATH=ChromDriver manager/chromedriver-win64/chromedriver.exe

ONLINE_SYSTEM_URL=https://onetechapp.ma/sageb2b/
ONLINE_SYSTEM_LOGIN_URL=https://onetechapp.ma/sageb2b/modules/preparation_livraison/commandes?p=1
ONLINE_SYSTEM_ORDERS_URL=https://onetechapp.ma/sageb2b/modules/preparation_livraison/commandes?p=
ONLINE_SYSTEM_PDF_URL=https://onetechapp.ma/sageb2b/modules/preparation_livraison/pdf/export.pdf.php?file=commande&id=

CORS_ORIGINS=http://localhost:3000,http://localhost:5000,http://127.0.0.1:3000
```

#### 4. Start Servers (Choose One)

**Option A: Two Terminal Windows**

Terminal 1:
```bash
cd backend
python run_app.py
```

Terminal 2:
```bash
cd frontend
npm run dev
```

**Option B: One Command**

```bash
python START_DEBUG.py
```

#### 5. Access Application

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:5000
- **Health Check**: http://localhost:5000/api/health

---

## ⚙️ Configuration

### Environment Variabl

### Environment Variabl

es (.env)

All configuration is centralized in the `.env` file. No hardcoded values in code.

```env
# ===== SERVER CONFIGURATION =====
PORT=5000

# ===== BROWSER PATHS (Windows Local Only) =====
# For Docker, these are ignored and use Linux paths from Dockerfile

# Path to Brave browser (Windows)
BRAVE_PATH=C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe

# ChromeDriver path (Windows)
# Priority: .env -> Local project folder -> webdriver-manager auto-download
CHROMEDRIVER_PATH=ChromDriver manager/chromedriver-win64/chromedriver.exe

# ===== EXTERNAL SYSTEM CONFIGURATION =====
ONLINE_SYSTEM_URL=https://onetechapp.ma/sageb2b/
ONLINE_SYSTEM_LOGIN_URL=https://onetechapp.ma/sageb2b/modules/preparation_livraison/commandes?p=1
ONLINE_SYSTEM_ORDERS_URL=https://onetechapp.ma/sageb2b/modules/preparation_livraison/commandes?p=
ONLINE_SYSTEM_PDF_URL=https://onetechapp.ma/sageb2b/modules/preparation_livraison/pdf/export.pdf.php?file=commande&id=

# Optional: Auto-login credentials (leave empty to use UI login)
# ONLINE_USERNAME=your_username
# ONLINE_PASSWORD=your_password

# ===== CORS CONFIGURATION =====
CORS_ORIGINS=http://localhost:3000,http://localhost:5000,http://127.0.0.1:3000
CORS_METHODS=GET,POST,PUT,DELETE,OPTIONS
CORS_ALLOW_HEADERS=Content-Type,Authorization
CORS_SUPPORTS_CREDENTIALS=true
MAX_AGE=3600
```

### ChromeDriver Detection

The system uses smart detection to find ChromeDriver:

1. **Environment Variable** (`CHROMEDRIVER_PATH`) - Most specific
2. **Local Project Folder** (`ChromDriver manager/chromedriver-{os64}/`)  - Works offline
3. **Webdriver-Manager** - Auto-downloads if needed

✅ Supports both Windows and Linux/Docker  
✅ No version conflicts (auto-detects OS)

---

## 🔄 Automated Sync

### How It Works

1. **APScheduler** runs sync automatically every **1 minute**
2. **Calls `/api/sync/trigger`** endpoint
3. External system login:
   - Uses Selenium + Brave browser
   - Headless mode (no visible window)
   - Session-cookie based authentication
4. **Scrapes orders** from pagination
5. **Downloads PDFs** in memory (no disk cache)
6. **Updates database** with new orders
7. **Removes deleted** orders from database

### Manual Trigger

```bash
curl -X POST http://localhost:5000/api/sync/trigger
```

### Change Sync Interval

Edit [backend/app.py](backend/app.py):

```python
scheduler.add_job(
    func=sync_function,
    trigger="interval",
    minutes=1,  # ← Change this
)
```

---

## 🐛 Troubleshooting

### "Unable to locate or obtain driver for chrome"

**Solution**:
1. Download ChromeDriver matching your browser version from [chromedriver.chromium.org](https://chromedriver.chromium.org)
2. Place in `ChromDriver manager/chromedriver-win64/` (Windows) or `chromedriver-linux64/` (Linux)
3. Update `CHROMEDRIVER_PATH` in `.env`

### "Login failed"

**Check**:
1. Credentials valid at https://onetechapp.ma/sageb2b/
2. Backend receiving login request: Check terminal output
3. Browser loading page properly in headless mode

**Solution**:
```bash
# Check if headless browser is working
python -c "from backend.utils.online_system import setup_driver; driver = setup_driver(); print('✓ Driver OK'); driver.quit()"
```

### "Port 5000 already in use"

```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Or change port in .env
PORT=5001
```

### "Frontend can't reach backend"

**Check**:
1. Backend running: `curl http://localhost:5000/api/health`
2. Frontend env: Check `.env.local` has `VITE_API_URL=http://localhost:5000`
3. CORS enabled: Check `.env` for CORS_ORIGINS

---

## 📊 Tech Stack

| Component | Technology | Version |
|-----------|------------|---------|
| Frontend | React + Vite | 18 + 5 |
| Styling | Tailwind CSS | 3+ |
| Backend | Flask | 3.0+ |
| Database | SQLite | 3 |
| Task Scheduler | APScheduler | 3.10+ |
| Browser Automation | Selenium | 4.15+ |
| Production Server | Gunicorn | 21+ |
| Python | Python | 3.11+ |
| Node.js | Node.js | 18+ |

---

## 📝 API Endpoints

### Authentication
- `POST /api/auth/login` - Login with external system credentials
- `POST /api/auth/logout` - Logout
- `GET /api/auth/status` - Check authentication status

### Orders
- `GET /api/orders` - List all orders
- `GET /api/orders/<order_number>` - Get specific order
- `POST /api/orders/import/online/<order_id>` - Import from online PDF

### Products
- `GET /api/products` - List all products
- `POST /api/products` - Create new product

### Warehouse
- `GET /api/warehouse/locations` - List all warehouse locations
- `POST /api/warehouse/locations` - Create location

### Stock Management
- `GET /api/stock/alerts` - Get low-stock alerts
- `PUT /api/stock` - Update stock levels

### Synchronization
- `POST /api/sync/trigger` - Manually trigger sync
- `GET /api/sync/status` - Get sync status and statistics

### Reports
- `GET /api/reports/warehouse` - Warehouse summary report
- `GET /api/reports/orders` - Orders summary report

---

## 📁 Project Structure

```
ZINABEL SYSTEM/
├── .env                                 # ← Centralized configuration
├── backend/
│   ├── app.py                          # Flask app factory
│   ├── run_app.py                      # Entry point (loads .env)
│   ├── config.py                       # Configuration from .env
│   ├── database.py                     # Database layer
│   ├── pdf_extractor.py                # PDF parsing
│   ├── utils/
│   │   └── online_system.py            # Selenium + browser automation
│   ├── api/
│   │   ├── models/
│   │   └── routes/
│   │       ├── auth.py
│   │       ├── orders.py
│   │       ├── products.py
│   │       ├── warehouse.py
│   │       ├── stock.py
│   │       └── sync.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── api/
│   │   │   └── apiClient.js            # Axios with env-based URL
│   │   ├── components/
│   │   ├── pages/
│   │   └── hooks/
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── database/                           # Auto-created
│   └── warehouse.db                    # SQLite database
├── SETUP.md                            # Detailed setup guide
├── docker-compose.yml
├── Dockerfile
└── README.md                           # This file
```

---

## 🚢 Deployment

### Docker

```bash
# Build and start
docker-compose up --build

# Run in background
docker-compose up -d --build

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Stop
docker-compose down
```

### Production Environment

1. **Update `.env` with production values**
   ```env
   CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
   ONLINE_SYSTEM_URL=https://onetechapp.ma/sageb2b/
   ```

2. **Build frontend**
   ```bash
   cd frontend && npm run build
   ```

3. **Start backend with Gunicorn**
   ```bash
   gunicorn -w 4 -b 0.0.0.0:5000 backend.run_app:app
   ```

4. **Serve frontend via CDN or static server**
   - Upload `frontend/dist/` to Vercel, Netlify, or AWS S3

---

## 🤝 Contributing

1. **Clone and setup**: Follow Quick Start above
2. **Create feature branch**: `git checkout -b feature/my-feature`
3. **Test changes**: Run backend/frontend locally
4. **Commit**: `git commit -m "feat: description"`
5. **Push**: `git push origin feature/my-feature`

---

## 📝 Database

### Tables

| Table | Purpose |
|-------|---------|
| **orders** | Order information from external system |
| **products** | Product inventory |
| **order_items** | Items within each order |
| **warehouse_locations** | Warehouse section locations |
| **stock_alerts** | Low-stock alerts |

### Features

✅ **SQLite with WAL Mode** - Concurrent read/write support  
✅ **Automatic Backups** - Database preserved across restarts  
✅ **Transaction Support** - ACID compliance

---

## 📞 Support & Debugging

### Check System Health

```bash
# Backend status
curl http://localhost:5000/api/health

# Database status
python -c "from backend.database import db; print(db.get_stats())"

# ChromeDriver status
python -c "from backend.utils.online_system import get_chromedriver_path; print(get_chromedriver_path())"
```

### View Logs

- Backend terminal: All API requests and sync operations
- Frontend console: `F12` → Console tab → Network issues, API calls
- Application logs: `backend.log` (if created)

### Common Commands

```bash
# Install new Python package
pip install package-name && pip freeze > requirements.txt

# Install new Node package
npm install package-name

# Format code
black backend/  # Python
prettier --write frontend/src  # JavaScript

# Run database


### Tables (6 Total)

| Table | Purpose |
|-------|---------|
| **orders** | Main order information |
| **products** | Product inventory |
| **order_items** | Items in each order (join table) |
| **warehouse_locations** | Physical warehouse locations |
| **pdf_uploads** | Track uploaded PDF documents |
| **stock_alerts** | Low stock warnings |

### Database Location
- **Development**: `database/zinabel.db` (SQLite file)
- **Can be upgraded to**: PostgreSQL for production

For detailed database documentation, see [DATABASE_GUIDE.md](DATABASE_GUIDE.md)

---

## 🎨 Detailed Features

### Pages
- ✅ **Dashboard** - Overview of orders, items, warehouses
- ✅ **Collection Circuit** - Main picking interface with collapsible sidebar
- ✅ **Products** - Inventory management
- ✅ **Warehouse** - Warehouse sections and locations
- ✅ **Stock Alerts** - Low stock and critical items
- ✅ **Reports** - Summary reports and exports

### UI/UX
- 🎨 **Tailwind CSS** - Professional, clean styling
- 🎯 **Responsive Design** - Mobile-friendly layouts
- ⚡ **Smooth Animations** - 0.3s transitions with ease
- 🎨 **Gradient Theme** - Purple gradient (#667eea → #764ba2)

### Technical
- ⚙️ **React Router** - Page routing
- 🌐 **Axios API Client** - HTTP requests
- 🎣 **Custom Hooks** - Reusable logic (useApi, useOrders, etc.)
- 📦 **Component-Based** - Modular architecture
- 🔒 **CORS Enabled** - Cross-origin support

## 🛠️ Tech Stack

### Frontend
- React 18
- Tailwind CSS 3
- Vite (fast build tool)
- React Router 6
- Axios
- Font Awesome Icons

### Backend
- Flask 3.0
- Flask-CORS (cross-origin support)
- Python 3.9+
- SQLite 3

## 💻 API Endpoints

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/orders` | Get all orders |
| GET | `/api/orders/<number>` | Get specific order |
| POST | `/api/orders` | Create new order |

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | Get all products |
| GET | `/api/products/search?q=<term>` | Search products |
| POST | `/api/products` | Create new product |

### Warehouse
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/warehouse` | Get all warehouse sections |
| GET | `/api/warehouse/section/<name>` | Get locations in section |

### Stock & Alerts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stock/alerts` | Get all stock alerts |
| GET | `/api/stock/low` | Get low stock items |

### PDF Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/pdfs/upload` | Upload PDF |
| GET | `/api/pdfs/list` | List uploaded PDFs |
| POST | `/api/pdfs/process/<id>` | Process PDF |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports` | Get statistics |

---

## 📊 Sample Data

The `setup_database.py` script creates sample data:

**Products (8)**
- Laptop Dell XPS (45 units)
- USB-C Cable (250 units)
- Wireless Mouse (120 units)
- Monitor 27" 4K (28 units)
- Keyboard Mechanical (75 units)
- Desk Lamp LED (15 units)
- Power Bank 20000mAh (189 units)
- HDMI Cable 3m (95 units)

**Orders (4)**
- ORD-2024-001 (Acme Corporation) - Pending
- ORD-2024-002 (Tech Solutions Ltd) - Processing
- ORD-2024-003 (Global Enterprises) - Pending
- ORD-2024-004 (Local Retail Store) - Completed

**Warehouse Sections (4)**
- Electronics (A)
- Accessories (B)
- Peripherals (C)
- Other (D)

---

## � Sample Data

The system comes pre-configured but you can add data via:

1. **API Requests** - Use POST endpoints
2. **Manual UI** - Use the web interface forms
3. **Database Sync** - Auto-sync from external system (every 1 minute)

---

## 📝 Database

### Tables

| Table | Purpose |
|-------|---------|
| **orders** | Order information from external system |
| **products** | Product inventory |
| **order_items** | Items within each order |
| **warehouse_locations** | Warehouse section locations |
| **stock_alerts** | Low-stock alerts |

### Features

✅ **SQLite with WAL Mode** - Concurrent read/write support  
✅ **Automatic Backups** - Database preserved across restarts  
✅ **Transaction Support** - ACID compliance

---

## 📞 Support & Debugging

### Check System Health

```bash
# Backend status
curl http://localhost:5000/api/health

# Database status
python -c "from backend.database import db; print(db.get_stats())"

# ChromeDriver status
python -c "from backend.utils.online_system import get_chromedriver_path; print(get_chromedriver_path())"
```

### View Logs

- Backend terminal: All API requests and sync operations
- Frontend console: `F12` → Console tab → Network issues, API calls
- Application logs: `backend.log` (if created)

### Common Commands

```bash
# Install new Python package
pip install package-name && pip freeze > requirements.txt

# Install new Node package
npm install package-name

# Format code
black backend/  # Python
prettier --write frontend/src  # JavaScript

# Run database backups
cp database/warehouse.db database/warehouse.db.backup
```

---

## ✨ Key Achievements

✅ **Production Ready** - All configurations externalized to `.env`  
✅ **No Hardcoded Values** - Centralized configuration  
✅ **Dynamic ChromeDriver** - Works with any version  
✅ **Environment-Aware** - Windows local + Docker support  
✅ **Auto-Sync Working** - Fetches from external system every 1 minute  
✅ **Responsive UI** - React + Tailwind CSS  
✅ **Comprehensive Docs** - This README + SETUP.md  

---

## 📄 Version Info

- **Version:** 2.0 (Production Ready)
- **Last Updated:** 2024
- **Python:** 3.11+
- **Node.js:** 18+

---

## 🙏 Final Notes

This system has been thoroughly tested and debugged:

- ✅ Frontend API routes fixed (double `/api/` issue resolved)
- ✅ ChromeDriver version management working (v146 supported)
- ✅ Browser automation headless mode working
- ✅ SQLite database with concurrent access
- ✅ Auto-sync scheduling configured
- ✅ All hardcoded values moved to `.env`
- ✅ Production deployment ready

**Start with**: Read this README → Configure `.env` → Run `python START_DEBUG.py`

**Questions?** Check troubleshooting section above or review system logs.

---

**ZINABEL Warehouse Management System** — Ready for Production 🚀
