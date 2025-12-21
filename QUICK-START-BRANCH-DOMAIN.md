# 🚀 QUICK START: Branch Manager Domain Setup

## Rezime Rapid

Ou kreye yon nouvo subdomain: **branch.nalakreditimachann.com** pou manager branch yo.

---

## ⚡ DEPLWAYE KOUNYE A (3 Kòmand)

```bash
# 1. Deplwaye sistèm lan
./deploy-branch-domain.sh

# 2. Verifye status
./check-branch-domain.sh

# 3. Si tout bon, teste aksè
curl http://branch.nalakreditimachann.com/health
```

---

## 📋 SA KI KREYE

### Fichye Nouvo:
1. `frontend-web/.env.branch` - Environment pou branch managers
2. `frontend-web/Dockerfile.branch` - Docker build pou branch app
3. `check-branch-domain.sh` - Script pou teste status
4. `deploy-branch-domain.sh` - Script pou deplwaye
5. `GID-BRANCH-MANAGER-DOMAIN-KREYOL.md` - Guide konplè

### Fichye Modifye:
1. `backend/NalaCreditAPI/appsettings.Production.json` - CORS updated
2. `nginx/nginx.conf` - Nouvo server block pou branch subdomain
3. `docker-compose.yml` - Nouvo service: frontend-branch

---

## 🌐 DNS SETUP (TE DWE FÈT NAN GODADDY)

Ajoute A Record:
```
Type: A
Name: branch
Value: 142.93.78.111
TTL: 600
```

Verifye:
```bash
nslookup branch.nalakreditimachann.com
```

---

## 🔄 DEPLWAYASYON RAPID

### Option 1: Otomatik (Rekòmande)
```bash
./deploy-branch-domain.sh
```

### Option 2: Manyèl
```bash
docker-compose down
docker-compose build frontend-branch
docker-compose up -d
docker exec nala-nginx nginx -s reload
```

---

## ✅ VERIFYE

```bash
# Status containers
docker ps | grep frontend-branch

# Test health
curl http://branch.nalakreditimachann.com/health

# Test API
curl http://branch.nalakreditimachann.com/api/health

# Check logs
docker logs nala-frontend-branch
```

---

## 🔐 SSL (APRE DNS PROPAGATE)

```bash
sudo certbot certonly --nginx \
  -d branch.nalakreditimachann.com \
  --email ou@email.com \
  --agree-tos

docker exec nala-nginx nginx -s reload
```

---

## 🎯 DOMAINS

Apre deplwayasyon:

| Domain | Pou Ki Moun | Port |
|--------|-------------|------|
| **admin.nalakreditimachann.com** | SuperAdmin/Admin | 80/443 |
| **branch.nalakreditimachann.com** | Branch Managers | 80/443 |

---

## 🆘 PWOBLÈM?

```bash
# Restart tout
docker-compose restart

# Rebuild branch app
docker-compose build --no-cache frontend-branch
docker-compose up -d frontend-branch

# Check logs detaye
docker logs -f nala-frontend-branch
docker logs -f nala-nginx

# Test nginx config
docker exec nala-nginx nginx -t
```

---

## 📊 CONTAINERS

Apre deployment, ou dwe wè sa yo:

```
nala-postgres          ✓ Running
nala-redis            ✓ Running
nala-rabbitmq         ✓ Running
nala-api              ✓ Running
nala-frontend         ✓ Running (admin)
nala-frontend-branch  ✓ Running (branch) ⭐ NOUVO
nala-nginx            ✓ Running
```

---

## 🎉 FIN!

Kounye a sistèm lan gen 2 entry points:
- **Admin Dashboard**: SuperAdmin ak Admin
- **Branch Dashboard**: Manager Branch yo

Menm backend, menm database, diferan frontend!

---

## 📞 KÒD RAPID

```bash
# Deplwaye
./deploy-branch-domain.sh

# Status
./check-branch-domain.sh

# Restart
docker-compose restart frontend-branch nginx

# Logs
docker logs -f nala-frontend-branch

# Test
curl http://branch.nalakreditimachann.com/health
```

---

**Bon chans! 🚀**
