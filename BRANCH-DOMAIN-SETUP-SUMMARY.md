# ✅ KONFIGIRASYON BRANCH DOMAIN KONPLÈ

## 🎯 SA OU MANDE

Ou te vle kreye subdomain **branch.nalakreditimachann.com** pou manager branch yo konekte epi gen aksè ak dashboard yo.

## ✅ SA KI FÈT

### 1. **Environment Configuration** ✓
- Kreye `.env.branch` ak konfigirasyon espesifik pou branch managers
- Domain: `branch.nalakreditimachann.com`
- API URL: `/api` (relative path, nginx handle routing)

### 2. **Backend CORS** ✓
- Ajoute `branch.nalakreditimachann.com` nan CORS origins
- HTTP ak HTTPS (pou apre SSL)
- Backend pral aksepte requests nan nouvo domain sa a

### 3. **Nginx Reverse Proxy** ✓
- Kreye nouvo upstream: `frontend_branch`
- Nouvo server block pou `branch.nalakreditimachann.com`
- Tout location blocks konfigire:
  - Frontend app (/)
  - API proxy (/api/)
  - Login endpoint (/api/auth/login)
  - SignalR hubs (/hubs/)
  - File uploads (/uploads/)
  - Health checks
- Security headers aktif
- Rate limiting konfigire

### 4. **Docker Setup** ✓
- Nouvo Dockerfile: `Dockerfile.branch`
- Build avèk `.env.branch`
- Nouvo service nan docker-compose: `frontend-branch`
- Container name: `nala-frontend-branch`
- Health checks konfigire

### 5. **Scripts & Documentation** ✓
- `deploy-branch-domain.sh` - Otomatik deployment
- `check-branch-domain.sh` - Status verification
- `GID-BRANCH-MANAGER-DOMAIN-KREYOL.md` - Guide konplè an Kreyòl
- `QUICK-START-BRANCH-DOMAIN.md` - Quick reference

---

## 🚀 PWOCHÈN ETAP (SA OU DWE FÈ)

### Etap 1: Configure DNS (⚠️ ENPÒTAN - FÈ SA KOUNYE A)

Nan GoDaddy (oswa DNS provider ou):

1. Ale nan DNS Management
2. Ajoute nouvo A Record:
   ```
   Type: A
   Name: branch
   Value: 142.93.78.111
   TTL: 600 (10 minutes)
   ```
3. Save

**⏱️ Atann 5-15 minit pou DNS propagate**

### Etap 2: Deploy Application

Sou server production ou (142.93.78.111):

```bash
# Upload changes to server
git add .
git commit -m "Add branch manager subdomain configuration"
git push

# SSH to server
ssh root@142.93.78.111

# Pull changes
cd /path/to/Nala_kredi_ti_machann
git pull

# Deploy
./deploy-branch-domain.sh
```

### Etap 3: Verify Deployment

```bash
# Check status
./check-branch-domain.sh

# If DNS ready, test access
curl http://branch.nalakreditimachann.com/health
```

### Etap 4: Install SSL Certificate

Apre DNS propagate:

```bash
sudo certbot certonly --nginx \
  -d branch.nalakreditimachann.com \
  --email ou@email.com \
  --agree-tos \
  --no-eff-email

# Reload nginx
docker exec nala-nginx nginx -s reload
```

### Etap 5: Test Access

1. Nan browser: `https://branch.nalakreditimachann.com`
2. Login ak yon branch manager account
3. Verifye dashboard ap chaje kòrèkteman

---

## 📁 FICHYE KI KREYE/MODIFYE

### Nouvo Fichye:
```
frontend-web/.env.branch
frontend-web/Dockerfile.branch
check-branch-domain.sh
deploy-branch-domain.sh
GID-BRANCH-MANAGER-DOMAIN-KREYOL.md
QUICK-START-BRANCH-DOMAIN.md
```

### Fichye Modifye:
```
backend/NalaCreditAPI/appsettings.Production.json
nginx/nginx.conf
docker-compose.yml
```

---

## 🏗️ ARCHITECTURE

```
                         Internet
                            |
                    [DNS Resolution]
                            |
                    ┌───────┴───────┐
                    |               |
           admin.*.com      branch.*.com
                    |               |
                    └───────┬───────┘
                            |
                      [NGINX Proxy]
                      Port 80/443
                            |
                    ┌───────┴───────┐
                    |               |
            [frontend]      [frontend-branch]
            Container       Container (NOUVO)
                    |               |
                    └───────┬───────┘
                            |
                      [API Backend]
                      Port 5000
                            |
                      [PostgreSQL]
                      Port 5432
```

---

## 🎯 REZILTA FINAL

Apre deployment:

### Admin Dashboard
- **URL**: `https://admin.nalakreditimachann.com`
- **Itilizatè**: SuperAdmin, Admin
- **Features**: Tout fonksyonalite sistèm lan

### Branch Manager Dashboard
- **URL**: `https://branch.nalakreditimachann.com` ⭐ NOUVO
- **Itilizatè**: Branch Managers
- **Features**: Dashboard branch manager, rapò, transactions

### Backend API
- **Shared**: Menm backend pou de domains
- **Database**: Menm database
- **Authentication**: JWT tokens mache pou de domains

---

## 🔐 SEKIRITE

Tout konfigurasyon sekirite enplemante:

✅ CORS konfigire pou de domains  
✅ Rate limiting aktif  
✅ Security headers sou tout requests  
✅ SSL ready (apre certbot)  
✅ File upload restrictions  
✅ Health checks  
✅ No direct container access  

---

## 📊 KONTÈK

| Feature | Status |
|---------|--------|
| Environment Config | ✅ Done |
| Backend CORS | ✅ Done |
| Nginx Config | ✅ Done |
| Docker Setup | ✅ Done |
| Scripts | ✅ Done |
| Documentation | ✅ Done |
| DNS Setup | ⏳ Waiting (ou dwe fè sa) |
| Deployment | ⏳ Waiting (ou dwe fè sa) |
| SSL Certificate | ⏳ Waiting (apre DNS) |
| Testing | ⏳ Waiting (apre deployment) |

---

## 🆘 SIPÒ

Si gen pwoblèm:

### Pwoblèm DNS
```bash
nslookup branch.nalakreditimachann.com
# Si pa mache, atann plis tan
```

### Pwoblèm Container
```bash
docker logs nala-frontend-branch
docker-compose restart frontend-branch
```

### Pwoblèm Nginx
```bash
docker exec nala-nginx nginx -t
docker logs nala-nginx
```

### Pwoblèm CORS
```bash
docker exec nala-api cat /app/appsettings.Production.json | grep -A 10 Cors
docker-compose restart api
```

---

## ✅ VERIFICATION CHECKLIST

Apre deployment, verifye:

- [ ] DNS resolves to 142.93.78.111
- [ ] Container `nala-frontend-branch` running
- [ ] Nginx config valid: `docker exec nala-nginx nginx -t`
- [ ] Health endpoint: `curl http://branch.nalakreditimachann.com/health`
- [ ] API endpoint: `curl http://branch.nalakreditimachann.com/api/health`
- [ ] Frontend accessible: `http://branch.nalakreditimachann.com`
- [ ] Login page loads
- [ ] Branch manager can login
- [ ] Dashboard displays
- [ ] SSL certificate installed
- [ ] HTTPS working: `https://branch.nalakreditimachann.com`

---

## 🎉 DONE!

Ou gen tout kòd ak konfigirasyon ou bezwen. Pwochèn etap:

1. **Kounye a**: Configure DNS nan GoDaddy
2. **Apre 10-15 min**: Deploy sou server
3. **Apre deployment**: Install SSL
4. **Final**: Test aksè

Bon deplwaye! 🚀

---

## 📞 KÒMAND RAPID

```bash
# Deploy everything
./deploy-branch-domain.sh

# Check status
./check-branch-domain.sh

# View logs
docker logs -f nala-frontend-branch

# Restart if needed
docker-compose restart frontend-branch nginx

# Test manually
curl http://branch.nalakreditimachann.com/health
```
