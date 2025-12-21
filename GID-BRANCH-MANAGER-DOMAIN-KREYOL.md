# GID KONFIGIRASYON BRANCH MANAGER DOMAIN
## Guide pou Domain: branch.nalakreditimachann.com

---

## 🎯 OBJEKTIF

Nou kreye yon domain separe pou manager branch yo: `https://branch.nalakreditimachann.com/`

Manager branch yo pral gen:
- Pwòp login paj yo
- Dashboard ki adapte pou wòl yo
- Aksè ak API menm jan

---

## 📋 CHANJMAN KI FÈT

### 1. ✅ Fichye Environment Nouvo: `.env.branch`

Kreye nan: `/frontend-web/.env.branch`

```env
# Branch Manager Production Environment
REACT_APP_API_URL=/api
REACT_APP_DOMAIN=branch.nalakreditimachann.com
REACT_APP_APP_TYPE=branch
GENERATE_SOURCEMAP=false
```

### 2. ✅ Backend CORS Update

Modifye: `/backend/NalaCreditAPI/appsettings.Production.json`

Ajoute:
```json
"http://branch.nalakreditimachann.com",
"https://branch.nalakreditimachann.com"
```

### 3. ✅ Nginx Konfigurasyon

Modifye: `/nginx/nginx.conf`

Ajoute:
- `upstream frontend_branch` - pou route request yo
- Nouvo `server` block pou `branch.nalakreditimachann.com`
- Tout location blocks nesesè (API, uploads, health checks)

### 4. ✅ Docker Dockerfile Nouvo

Kreye: `/frontend-web/Dockerfile.branch`

Diferans:
- Itilize `.env.branch` olye `.env.production`
- Menm build process
- Menm nginx setup

### 5. ✅ Docker Compose Service

Modifye: `/docker-compose.yml`

Ajoute:
```yaml
frontend-branch:
  build:
    context: ./frontend-web
    dockerfile: Dockerfile.branch
  container_name: nala-frontend-branch
```

---

## 🚀 DEPLWAYASYON

### Etap 1: DNS Configuration

Nan GoDaddy oswa DNS provider ou:

```
Type: A Record
Name: branch
Value: 142.93.78.111  (IP server ou)
TTL: 600
```

**ENPÒTAN**: Atann 5-15 minit pou DNS propagate!

Verifye DNS:
```bash
nslookup branch.nalakreditimachann.com
# Oswa
dig branch.nalakreditimachann.com
```

### Etap 2: Build & Deploy Containers

```bash
# 1. Kanpe containers ki ap roule
docker-compose down

# 2. Build nouvo images
docker-compose build frontend-branch

# 3. Deplwaye tout services
docker-compose up -d

# 4. Verifye status
docker ps
```

Ou dwe wè:
- `nala-frontend` (admin.nalakreditimachann.com)
- `nala-frontend-branch` (branch.nalakreditimachann.com) ⭐ NOUVO
- `nala-api`
- `nala-nginx`
- `nala-postgres`
- etc.

### Etap 3: Test Containers

```bash
# Verifye frontend-branch ap roule
docker logs nala-frontend-branch

# Test health check
docker exec nala-frontend-branch curl -f http://localhost/

# Verifye nginx konfigurasyon
docker exec nala-nginx nginx -t

# Reload nginx
docker exec nala-nginx nginx -s reload
```

### Etap 4: SSL/HTTPS Configuration

Apre DNS propagate, ajoute SSL:

```bash
# Install SSL pou branch subdomain
sudo certbot certonly --nginx \
  -d branch.nalakreditimachann.com \
  --email ou@email.com \
  --agree-tos \
  --no-eff-email

# Reload nginx
docker exec nala-nginx nginx -s reload
```

### Etap 5: Test Access

1. **Nan browser:**
   ```
   http://branch.nalakreditimachann.com
   ```

2. **Test API access:**
   ```bash
   curl http://branch.nalakreditimachann.com/api/health
   ```

3. **Test login:**
   - Ale sou: `http://branch.nalakreditimachann.com`
   - Login avèk yon branch manager account
   - Verifye dashboard ap chaje

---

## 🔍 TROUBLESHOOTING

### Pwoblèm 1: DNS pa resolve
```bash
# Verifye DNS settings
dig branch.nalakreditimachann.com

# Si pa mache, atann plis tan (max 24h)
# Oswa flush DNS local:
sudo dscacheutil -flushcache  # macOS
ipconfig /flushdns            # Windows
```

### Pwoblèm 2: Container pa start
```bash
# Check logs
docker logs nala-frontend-branch

# Rebuild si nesesè
docker-compose build --no-cache frontend-branch
docker-compose up -d frontend-branch
```

### Pwoblèm 3: 502 Bad Gateway
```bash
# Verifye upstream server
docker ps | grep frontend-branch

# Check nginx logs
docker logs nala-nginx

# Restart services
docker-compose restart frontend-branch nginx
```

### Pwoblèm 4: CORS Errors
```bash
# Verifye backend CORS settings
docker exec nala-api cat /app/appsettings.Production.json | grep -A 10 Cors

# Restart backend
docker-compose restart api
```

### Pwoblèm 5: 404 Not Found
```bash
# Verifye nginx konfigurasyon
docker exec nala-nginx cat /etc/nginx/nginx.conf | grep -A 20 "branch.nalakreditimachann"

# Test nginx config
docker exec nala-nginx nginx -t

# Reload
docker exec nala-nginx nginx -s reload
```

---

## 📊 VERIFYE TOUT BAGAY AP FONKSYONE

### Checklist Final

- [ ] DNS resolves to correct IP
- [ ] Container `nala-frontend-branch` running
- [ ] Branch site accessible: `http://branch.nalakreditimachann.com`
- [ ] API requests work: `/api/health`
- [ ] Login page loads
- [ ] Branch manager can login
- [ ] Dashboard displays correctly
- [ ] SSL certificate installed (https)
- [ ] No CORS errors in browser console

### Quick Status Check

```bash
# All-in-one status check
cat << 'EOF' > check-branch-status.sh
#!/bin/bash
echo "=== DNS Check ==="
nslookup branch.nalakreditimachann.com

echo "\n=== Container Status ==="
docker ps | grep branch

echo "\n=== Health Check ==="
curl -I http://branch.nalakreditimachann.com/health

echo "\n=== API Check ==="
curl http://branch.nalakreditimachann.com/api/health

echo "\n=== Nginx Config Test ==="
docker exec nala-nginx nginx -t

echo "\n=== Recent Logs ==="
docker logs --tail 20 nala-frontend-branch
EOF

chmod +x check-branch-status.sh
./check-branch-status.sh
```

---

## 🔐 SEKIRITE

Konfigurasyon sa yo enplemante:

1. **Rate Limiting**: API requests limite
2. **CORS**: Sèlman domains otorize
3. **Headers**: Security headers aktif
4. **File Uploads**: Restrictions sou file types
5. **Health Checks**: Automated monitoring

---

## 📈 PWOCHÈN ETAP (Optional)

### Monitoring
```bash
# Check container health
docker stats nala-frontend-branch

# Monitor logs realtime
docker logs -f nala-frontend-branch
```

### Backups
Ensure branch config files included in backups:
- `/frontend-web/.env.branch`
- `/frontend-web/Dockerfile.branch`
- `/nginx/nginx.conf`
- `/docker-compose.yml`

### Auto-Restart
Already configured with `restart: unless-stopped`

---

## ✅ DONE!

Kounye a ou gen:
- **admin.nalakreditimachann.com** - Pou SuperAdmin/Admin
- **branch.nalakreditimachann.com** - Pou Branch Managers ⭐

Chak domain gen:
- Pwòp frontend container
- Aksè ak menm API backend
- Menm database
- Separate access points

---

## 📞 SUPPORT

Si gen pwoblèm:
1. Check logs: `docker logs nala-frontend-branch`
2. Test manually: `curl http://branch.nalakreditimachann.com`
3. Verify DNS: `nslookup branch.nalakreditimachann.com`
4. Restart if needed: `docker-compose restart frontend-branch nginx`

---

**Bòn deplwaye! 🚀**
