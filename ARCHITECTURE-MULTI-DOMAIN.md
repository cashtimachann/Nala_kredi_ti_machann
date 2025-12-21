# 🌐 ARCHITECTURE: Multi-Domain Setup

## Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────┐
│                         INTERNET                              │
└────────────┬────────────────────────────┬───────────────────┘
             │                            │
             │                            │
    ┌────────▼────────┐          ┌───────▼────────┐
    │  admin.nala...  │          │  branch.nala...│
    │  (SuperAdmin)   │          │ (Br. Managers) │
    └────────┬────────┘          └───────┬────────┘
             │                            │
             │        DNS Resolution      │
             │      (GoDaddy A Records)   │
             │                            │
             └────────┬───────────────────┘
                      │
              ┌───────▼────────┐
              │  142.93.78.111 │
              │  (Server IP)   │
              └───────┬────────┘
                      │
         ┌────────────▼────────────┐
         │   NGINX Reverse Proxy   │
         │      (Port 80/443)      │
         │                         │
         │  - Route based on host  │
         │  - SSL termination      │
         │  - Rate limiting        │
         │  - Security headers     │
         └────┬──────────────┬─────┘
              │              │
    ┌─────────▼──────┐  ┌───▼──────────────┐
    │   frontend     │  │ frontend-branch  │
    │  (Container)   │  │  (Container)     │
    │                │  │                  │
    │  - Admin UI    │  │ - Branch UI      │
    │  - React App   │  │ - React App      │
    │  - Port 80     │  │ - Port 80        │
    └────────┬───────┘  └────┬─────────────┘
             │               │
             └───────┬───────┘
                     │
              ┌──────▼──────┐
              │     API     │
              │ (Container) │
              │             │
              │ - .NET 8    │
              │ - Port 5000 │
              │ - JWT Auth  │
              └──────┬──────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
   ┌────▼───┐  ┌────▼───┐  ┌────▼────┐
   │Postgres│  │ Redis  │  │RabbitMQ │
   │  5432  │  │  6379  │  │  5672   │
   └────────┘  └────────┘  └─────────┘
```

---

## 🔀 Request Flow

### Admin Domain (admin.nalakreditimachann.com)

```
User Browser
    │
    │ https://admin.nalakreditimachann.com
    │
    ▼
┌───────────────┐
│  GoDaddy DNS  │ → Resolve to 142.93.78.111
└───────┬───────┘
        │
        ▼
┌───────────────┐
│     NGINX     │ → Read Host header: admin.nalakreditimachann.com
│  Server Block │ → Match server_name
└───────┬───────┘
        │
        │ location /
        ▼
┌───────────────┐
│   frontend    │ → Serve React App
│  Container    │ → Static files
└───────┬───────┘
        │
        │ User clicks "Get Data"
        │ AJAX: /api/something
        ▼
┌───────────────┐
│     NGINX     │ → location /api/
│  Proxy Pass   │ → proxy_pass http://backend_api/
└───────┬───────┘
        │
        ▼
┌───────────────┐
│      API      │ → Process request
│  Container    │ → Check JWT token
│               │ → Return JSON
└───────────────┘
```

### Branch Domain (branch.nalakreditimachann.com)

```
Branch Manager Browser
    │
    │ https://branch.nalakreditimachann.com
    │
    ▼
┌───────────────┐
│  GoDaddy DNS  │ → Resolve to 142.93.78.111
└───────┬───────┘
        │
        ▼
┌───────────────┐
│     NGINX     │ → Read Host header: branch.nalakreditimachann.com
│  Server Block │ → Match different server_name
└───────┬───────┘
        │
        │ location /
        ▼
┌───────────────┐
│frontend-branch│ → Serve Branch React App
│  Container    │ → Different build
└───────┬───────┘
        │
        │ Branch Manager clicks action
        │ AJAX: /api/something
        ▼
┌───────────────┐
│     NGINX     │ → location /api/
│  Proxy Pass   │ → proxy_pass http://backend_api/
└───────┬───────┘
        │
        ▼
┌───────────────┐
│      API      │ → SAME API as admin!
│  Container    │ → Check JWT token
│               │ → Check user role (BranchManager)
│               │ → Return appropriate data
└───────────────┘
```

---

## 🐳 Docker Services

```
docker-compose.yml defines:

┌─────────────────────────────────────────────────────┐
│  Service Name      │  Container Name        │ Ports │
├────────────────────┼────────────────────────┼───────┤
│  postgres          │  nala-postgres         │ 5432  │
│  redis             │  nala-redis            │ 6379  │
│  rabbitmq          │  nala-rabbitmq         │ 5672  │
│  api               │  nala-api              │ 5000  │
│  frontend          │  nala-frontend         │ 80*   │
│  frontend-branch   │  nala-frontend-branch  │ 80*   │ ⭐ NEW
│  nginx             │  nala-nginx            │ 80/443│
└────────────────────┴────────────────────────┴───────┘

* Internal only - accessed via nginx proxy
```

---

## 📁 Configuration Files Map

```
Project Root
│
├── .env                              # Main environment vars
│
├── backend/
│   └── NalaCreditAPI/
│       └── appsettings.Production.json  # ✏️ Modified (CORS)
│
├── frontend-web/
│   ├── .env.production               # Admin environment
│   ├── .env.branch                   # ⭐ Branch environment (NEW)
│   ├── Dockerfile                    # Admin build
│   └── Dockerfile.branch             # ⭐ Branch build (NEW)
│
├── nginx/
│   └── nginx.conf                    # ✏️ Modified (2 server blocks)
│
├── docker-compose.yml                # ✏️ Modified (frontend-branch added)
│
└── Scripts/
    ├── deploy-branch-domain.sh       # ⭐ Deploy script (NEW)
    └── check-branch-domain.sh        # ⭐ Check script (NEW)
```

---

## 🔐 Security & Routing

### CORS Configuration
```
Backend accepts requests from:
  ✓ admin.nalakreditimachann.com (HTTP/HTTPS)
  ✓ branch.nalakreditimachann.com (HTTP/HTTPS) ⭐ NEW
  ✓ localhost:3000 (development)
  ✗ other-site.com (blocked)
```

### Nginx Routing Logic
```
if (Host == "admin.nalakreditimachann.com")
    → proxy_pass http://frontend_app
      → nala-frontend container

if (Host == "branch.nalakreditimachann.com")
    → proxy_pass http://frontend_branch
      → nala-frontend-branch container ⭐ NEW

if (request path starts with /api/)
    → proxy_pass http://backend_api
      → nala-api container (SAME for both domains)
```

### Authentication Flow
```
1. User visits: admin.nalakreditimachann.com or branch.nalakreditimachann.com
2. Frontend loads (different apps)
3. User enters credentials
4. POST /api/auth/login
5. API validates & returns JWT token
6. Frontend stores token (localStorage/sessionStorage)
7. All subsequent requests include: Authorization: Bearer <token>
8. API validates token & checks user role
9. Returns data based on permissions
```

---

## 🌍 DNS Configuration

```
GoDaddy DNS Records:

┌──────────────────────────────────────────────────┐
│ Type │ Name   │ Value          │ TTL  │ Status  │
├──────┼────────┼────────────────┼──────┼─────────┤
│  A   │ admin  │ 142.93.78.111  │ 600  │ Active  │
│  A   │ branch │ 142.93.78.111  │ 600  │ Pending │ ⭐
└──────┴────────┴────────────────┴──────┴─────────┘

After propagation (5-60 minutes):
  admin.nalakreditimachann.com  → 142.93.78.111 ✓
  branch.nalakreditimachann.com → 142.93.78.111 ✓ (NEW)
```

---

## 📊 Database & Data Sharing

```
SHARED RESOURCES (Same for both domains):

┌─────────────────┐
│   PostgreSQL    │
│                 │
│  Tables:        │
│  - Users        │  ← Both admin & branch managers
│  - Branches     │  ← Branch data
│  - Transactions │  ← All transactions
│  - Customers    │  ← Customer data
│  - etc.         │
└─────────────────┘
        ▲
        │ (Single database)
        │
┌───────┴──────┐
│              │
│   nala-api   │  ← One API serves both domains
│              │
└──────────────┘
        ▲
        │ (Role-based access)
        │
    ┌───┴───┐
    │       │
Admin    Branch
Domain   Domain
```

---

## 🎯 User Access Matrix

```
┌─────────────────┬──────────────┬──────────────┐
│ User Role       │ Admin Domain │ Branch Domain│
├─────────────────┼──────────────┼──────────────┤
│ SuperAdmin      │      ✓       │      ✓       │
│ Admin           │      ✓       │      ✓       │
│ Branch Manager  │      ✓       │      ✓       │ (primary)
│ Cashier         │      ✓       │      ✓       │
│ Secretary       │      ✓       │      ✓       │
└─────────────────┴──────────────┴──────────────┘

Same API, same authentication, different interfaces
```

---

## 🚀 Deployment Flow

```
Development (Local)
    │
    │ git commit & push
    │
    ▼
GitHub Repository
    │
    │ git pull on server
    │
    ▼
Production Server (142.93.78.111)
    │
    │ ./deploy-branch-domain.sh
    │
    ▼
┌───────────────────────────┐
│  1. Stop containers       │
│  2. Build frontend-branch │
│  3. Start all services    │
│  4. Reload nginx          │
│  5. Verify health         │
└───────────────────────────┘
    │
    ▼
Live on Internet! 🎉
```

---

## 💡 Key Insights

1. **Two Domains, One Backend**
   - Both domains share the same API
   - Same database, same authentication
   - Different frontend builds

2. **Nginx is the Traffic Controller**
   - Routes based on Host header
   - Handles SSL termination
   - Applies security rules

3. **Docker Orchestration**
   - Each frontend has own container
   - API container serves both
   - Database shared by all

4. **Environment-Specific Builds**
   - Admin: .env.production
   - Branch: .env.branch
   - Different build artifacts

5. **Security**
   - CORS protects API
   - JWT authenticates users
   - Nginx adds security headers
   - Rate limiting prevents abuse

---

**Gen kesyon? Gade:**
- `GID-BRANCH-MANAGER-DOMAIN-KREYOL.md` - Guide detaye
- `QUICK-START-BRANCH-DOMAIN.md` - Quick reference
- `BRANCH-DOMAIN-SETUP-SUMMARY.md` - Rezime konplè
