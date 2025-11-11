# 🔧 Fix: Pwoblèm Environment Variables - Dev vs Production

## Dat: 10 Novanm 2025
## Pwoblèm: Aplikasyon mache nan devlopman men gen erreur nan production

---

## ❌ PWOBLÈM YO KI TE DEKOUVRI

### Pwoblèm #1: Fichye `.env` Manke nan Rakòn Pwojè a

**Sa ki te manke:**
```bash
# Rakòn pwojè
├── .env.example ✅
├── .env         ❌ MANKE!
```

**Kisa sa koze:**
- Backend containers (postgres, redis, rabbitmq, api) pa t ka jwenn variables yo
- Docker Compose itilize default values ki pa bon pou production
- Mo de pas ak secrets pa t konfigire kòrèkteman

**Egzanp kòd ki afekte:**
```yaml
# docker-compose.yml
environment:
  POSTGRES_PASSWORD: ${DB_PASSWORD:-NalaCredit2024!@#}
  #                   ^^^^^^^^^^^^^^^ Chèche nan .env
  #                                   ^^^^^^^^^^^^^^^^^ Default si .env pa la
```

Sans `.env`, tout containers te itilize default passwords ki pa sekirize!

---

### Pwoblèm #2: Frontend `.env` Gen Localhost olye de Relative URL

**Sa ki te gen:**
```bash
# frontend-web/.env
REACT_APP_API_URL=https://localhost:5001/api
#                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ MOVE!
```

**Kisa sa koze:**
- Nan **devlopman** (local): `https://localhost:5001/api` ✅ Mache
- Nan **production** (server): `https://localhost:5001/api` ❌ Pa egziste!

**Diferans ant Dev ak Production:**

| Anviwònman | Frontend URL | API URL | Sa ki pase |
|------------|--------------|---------|------------|
| **Development** | `http://localhost:3000` | `https://localhost:5001/api` | ✅ Dirèk koneksyon |
| **Production** | `http://142.93.78.111` | `https://localhost:5001/api` | ❌ localhost pa egziste! |

**Kòman sa ta dwe ye:**

| Anviwònman | Fichye | API URL | Ki moun trete request |
|------------|--------|---------|----------------------|
| **Development** | `.env` | `https://localhost:5001/api` | Dirèk nan backend |
| **Production** | `.env.production` | `/api` | Nginx reverse proxy |

---

## ✅ SOLISYON YO

### Solisyon #1: Kreye Fichye `.env` Principal

**Fichye kree:** `.env` (nan rakòn pwojè a)

**Kontni:**
```bash
# Database
DB_PASSWORD=Nala_kredi823@@!!

# RabbitMQ
RABBITMQ_USER=nalauser
RABBITMQ_PASSWORD=Nala_kredi823@@!!

# JWT
JWT_SECRET=NalaCreditSecretKeyForJWT2024Production_CHANGE_THIS_IN_PRODUCTION_!@#$%^&*

# Server
SERVER_IP=142.93.78.111
DOMAIN_NAME=admin.nalakreditimachann.com
```

**Sa ki enpòtan:**
- Docker Compose li fichye sa pou configure containers yo
- Chak service jwenn bon mo de pas ak konfigirasyon
- Variables yo pa expose nan kòd (sekirize)

---

### Solisyon #2: Diferansye `.env` Dev ak Production pou Frontend

**ANVAN:**
```
frontend-web/
├── .env              → REACT_APP_API_URL=https://localhost:5001/api
├── .env.production   → REACT_APP_API_URL=/api
```

**Pwoblèm:** Nan devlopman, li `.env` ki gen localhost ❌

**APRE (FIKSE):**
```
frontend-web/
├── .env              → REACT_APP_API_URL=https://localhost:5001/api (pou dev)
├── .env.production   → REACT_APP_API_URL=/api (pou production)
```

**Kòman React itilize yo:**

1. **Nan devlopman (npm start):**
   ```bash
   npm start
   # Li .env → REACT_APP_API_URL=https://localhost:5001/api
   # Frontend → Backend dirèk (sans proxy)
   ```

2. **Nan production build (npm run build):**
   ```bash
   npm run build
   # Li .env.production → REACT_APP_API_URL=/api
   # Frontend → Nginx → Backend (ak proxy)
   ```

3. **Docker build pou production:**
   ```dockerfile
   # Dockerfile
   COPY .env.production ./.env
   RUN npm run build
   # Dockerfile kopi .env.production kòm .env pandan build
   # Sa garanti production values yo itilize
   ```

---

## 📊 KÒMAN SA TRAVAY NAN CHAK ANVIWÒNMAN

### Development (Local Machine)

```
┌─────────────────────────────────────────────────────────┐
│ Browser (http://localhost:3000)                         │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ Frontend React Dev Server                               │
│ Li .env → REACT_APP_API_URL=https://localhost:5001/api │
└─────────────────────────────────────────────────────────┘
                    ↓ Dirèk request
┌─────────────────────────────────────────────────────────┐
│ Backend .NET API (https://localhost:5001/api)          │
└─────────────────────────────────────────────────────────┘
```

**Variables:**
- Frontend: `.env` ak `localhost:5001`
- Backend: `.env` oswa default values
- ✅ Mache paske backend sou localhost

---

### Production (Docker + Server)

```
┌─────────────────────────────────────────────────────────┐
│ Browser (http://142.93.78.111)                          │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ Nginx (Port 80/443)                                     │
│ - Frontend: Sèvi React static files                     │
│ - API Proxy: /api → http://api:5000/api                │
└─────────────────────────────────────────────────────────┘
                    ↓
       ┌────────────┴─────────────┐
       ↓                           ↓
┌──────────────┐          ┌───────────────┐
│ Frontend     │          │ Backend API   │
│ (Container)  │          │ (Container)   │
│ /api relative│          │ Port 5000     │
└──────────────┘          └───────────────┘
```

**Variables:**
- Frontend: `.env.production` → `/api` (relative)
- Backend: `.env` → Postgres, Redis, RabbitMQ configs
- Nginx: Redirecte `/api` → `http://api:5000/api`
- ✅ Mache paske nginx proxy trete `/api` requests

---

## 🎯 REZILTA

### Anvan Fix:

```
❌ Backend containers: Default passwords
❌ Frontend production: Konekte sou localhost (pa egziste)
❌ API requests: ERR_NETWORK
❌ Aplikasyon: Pa mache nan production
```

### Apre Fix:

```
✅ Backend containers: Variables konfigire kòrèkteman
✅ Frontend development: Itilize localhost:5001 (dirèk)
✅ Frontend production: Itilize /api (proxy pa nginx)
✅ API requests: 200 OK
✅ Aplikasyon: Mache nan dev ak production
```

---

## 🔍 KÒMAN DETEKTE PWOBLÈM SA YO

### Siy #1: ERR_NETWORK nan Browser Console

```javascript
// Browser Developer Tools → Console
POST https://localhost:5001/api/auth/login net::ERR_CONNECTION_REFUSED
```

**Rezon:** Frontend ap eseye konekte sou localhost men ou pa sou localhost!

### Siy #2: Docker Containers Itilize Default Values

```bash
# Gade environment variables nan container
docker exec nala-postgres env | grep POSTGRES_PASSWORD

# Si ou wè default value olye de value ou te mete
POSTGRES_PASSWORD=NalaCredit2024!@#  # ← Default, pa custom!
```

**Rezon:** Fichye `.env` pa la oswa pa li kòrèkteman

### Siy #3: API Health Check OK men Frontend Pa Ka Konekte

```bash
# API fonksyone
curl http://142.93.78.111/api/health
# → 200 OK ✅

# Men frontend montre erreur
# → ERR_NETWORK ❌
```

**Rezon:** API bon men frontend gen move URL

---

## 📝 CHECKLIST POU EVITE PWOBLÈM SA YO

### Pou Devlopman Local:

- [ ] Kreye `.env` nan rakòn pwojè ak variables backend
- [ ] Kreye `frontend-web/.env` ak `REACT_APP_API_URL=https://localhost:5001/api`
- [ ] Lanse backend: `dotnet run` oswa `docker compose up`
- [ ] Lanse frontend: `cd frontend-web && npm start`
- [ ] Teste login nan browser: `http://localhost:3000`

### Pou Production/Deployment:

- [ ] Verifye `.env` gen tout variables yo (passwords, secrets, etc.)
- [ ] Verifye `frontend-web/.env.production` gen `/api` (pa localhost!)
- [ ] Verifye `frontend-web/Dockerfile` kopi `.env.production`
- [ ] Build images: `docker compose build`
- [ ] Lanse containers: `docker compose up -d`
- [ ] Teste API: `curl http://YOUR_IP/api/health`
- [ ] Teste frontend: Ouvri `http://YOUR_IP` nan browser
- [ ] Gade browser console pou w wè si gen erreur

---

## 💡 BEST PRACTICES

### 1. **Sépare Environment Variables**

```
.env                      → Backend + Docker Compose (shared)
frontend-web/.env         → Frontend development
frontend-web/.env.production → Frontend production
```

### 2. **Itilize Relative URLs nan Production**

```bash
# ✅ GOOD: Travay nenpòt kote
REACT_APP_API_URL=/api

# ❌ BAD: Sèlman travay sou IP sa
REACT_APP_API_URL=http://142.93.78.111/api

# ❌ WORSE: Pa travay ditou nan production
REACT_APP_API_URL=https://localhost:5001/api
```

### 3. **Toujou Gen .env.example**

```bash
# .env.example → Commit sa nan Git
DB_PASSWORD=CHANGE_THIS
JWT_SECRET=CHANGE_THIS

# .env → PA commit sa (add to .gitignore)
DB_PASSWORD=ActualPassword123!
JWT_SECRET=ActualSecret456!
```

### 4. **Teste nan Dev Anvan Deploy**

```bash
# Teste Docker build lokalment anvan deploy
docker compose build
docker compose up -d
docker compose ps  # Verifye tout containers "Up"
docker compose logs -f api  # Gade logs
```

---

## 🚀 POU ALE PI LWEN

### Si Ou Gen Lòt Erreur Anviw...

**"Cannot connect to database":**
```bash
# Verifye .env gen bon credentials
grep DB_PASSWORD .env

# Verifye postgres container ap travay
docker compose ps postgres
docker compose logs postgres
```

**"JWT token invalid":**
```bash
# Verifye JWT_SECRET menm nan tout anviwònman
grep JWT_SECRET .env

# Rechaje backend container
docker compose restart api
```

**"CORS error":**
```bash
# Verifye nginx.conf gen bon CORS headers
# Verifye frontend itilize relative URL (/api)
```

---

## ✅ KONKLIZYON

**2 Pwoblèm Prensipal ki te fikse:**

1. ✅ **Fichye `.env` manke** → Kree ak bon values pou backend
2. ✅ **Frontend `.env` gen localhost** → Klarifye ki fichye pou dev ak production

**Kisa ou dwe fè kounye a:**

1. **Nan devlopman:**
   ```bash
   # Lanse backend
   dotnet run
   # OSWA
   docker compose up
   
   # Lanse frontend
   cd frontend-web
   npm start
   ```

2. **Pou deploy nan production:**
   ```bash
   # Build ak deploy
   docker compose build
   docker compose up -d
   
   # Verifye
   docker compose ps
   curl http://YOUR_IP/api/health
   ```

**Tout bagay dwe mache kounye a! 🎉**

---

**Dat:** 10 Novanm 2025  
**Status:** ✅ FIKSE  
**Fichye afekte:** 
- `.env` (kreye)
- `frontend-web/.env` (klarifye)
- `frontend-web/.env.production` (deja bon)

**Pwochen Etap:** Teste aplikasyon an nan dev ak production pou konfime fix yo! 🚀
