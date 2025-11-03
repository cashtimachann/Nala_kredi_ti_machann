# 🚀 DEPLOIEMAN DIGITAL OCEAN - README

## 📖 REZIME RAPID

Sistèm deploieman otomatik pou **Nala Kredi Ti Machann** sou Digital Ocean avèk Docker Compose.

---

## 📂 FICHYE DEPLWASMAN

### Scripts Prensipal:
- **`deploy-to-digitalocean.sh`** - Script prensipal pou deploy (ITILIZE SA A!)
- **`verify-deployment.sh`** - Verifye deploieman apre l fini
- **`docker-deploy.sh`** - Script deplwasman lokal/avanse

### Fichye Konfigirasyon:
- **`docker-compose.yml`** - Orchestration Docker (PostgreSQL, Redis, RabbitMQ, API, Frontend, Nginx)
- **`.env.example`** - Template pou variables anviwònman
- **`backend/Dockerfile`** - Build backend .NET 8 API
- **`frontend-web/Dockerfile`** - Build frontend React
- **`nginx.conf`** - Konfigirasyon Nginx reverse proxy

### Guides:
- **`QUICK-START-DEPLOIEMAN.md`** - Deploieman nan 5 minit ⚡
- **`GUIDE-DEPLOIEMAN-DIGITAL-OCEAN-KREYOL.md`** - Guide konplè an Kreyòl
- **`DEPLOYMENT-GUIDE-DIGITAL-OCEAN.md`** - Complete guide in English
- **`DEPLOIEMAN-KOREKSYON-REZIME.md`** - Rezime tout koreksyon yo

---

## ⚡ QUICK START (5 minit)

### 1. Prepare .env
```bash
cp .env.example .env
nano .env
```

Chanje:
- `DB_PASSWORD`
- `JWT_SECRET`
- `RABBITMQ_PASSWORD`
- `SERVER_IP` (si diferan)

### 2. Deploy
```bash
./deploy-to-digitalocean.sh
```

### 3. Verifye
```bash
./verify-deployment.sh 142.93.78.111
```

### 4. Ouvri
```
http://142.93.78.111
```

**✅ DONE!**

---

## 🏗️ ACHITÈKTI

```
┌─────────────────────────────────────────────┐
│         Nginx Reverse Proxy (Port 80)      │
├──────────────┬──────────────────────────────┤
│   Frontend   │         API Backend          │
│  (React SPA) │      (.NET 8 API)            │
│   Port 80    │       Port 5000              │
└──────────────┴──────────────┬───────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
   ┌────▼────┐           ┌────▼────┐          ┌─────▼─────┐
   │PostgreSQL│          │  Redis  │          │ RabbitMQ  │
   │  :5432   │          │  :6379  │          │ :5672     │
   └──────────┘          └─────────┘          │ :15672    │
                                              └───────────┘
```

### Services:
1. **Nginx** - Reverse proxy & load balancer
2. **Frontend** - React app avèk Nginx
3. **API Backend** - .NET 8 REST API
4. **PostgreSQL** - Database prensipal
5. **Redis** - Cache pou performance
6. **RabbitMQ** - Message queue pou notifications
7. **Prometheus** (optional) - Metrics
8. **Grafana** (optional) - Monitoring dashboards

---

## 🔧 SA KI TE KORIJE

### 1. Backend Dockerfile
✅ Chemen korije pou `NalaCreditAPI/`

### 2. Production Configuration
✅ `appsettings.Production.json` kreye ak variables Docker

### 3. Environment Variables
✅ `.env.example` konplè ak byen dokimante

### 4. Deployment Script
✅ Amelyore ak:
- Health checks
- Error handling
- SSH verification
- Automatic Docker installation
- Better output messages

### 5. Documentation
✅ 4 guides konplè:
- Quick Start (5 min)
- Guide Kreyòl (detaye)
- English Guide (detailed)
- Summary of fixes

---

## 📊 FONKSYONALITE DEPLWASMAN

### ✅ Automatic:
- Docker installation sou sèvè
- Code copy via SSH
- Environment setup
- Image building
- Service orchestration
- Health checking
- Database migrations (optional)

### ✅ Security:
- Non-root container users
- Environment variables pou secrets
- CORS configured
- File upload limits
- Firewall ready (UFW)
- HTTPS ready (Certbot)

### ✅ Monitoring:
- Container health checks
- Service status verification
- Log aggregation
- Resource monitoring (optional: Prometheus/Grafana)

### ✅ Backup:
- Database backup scripts
- Automatic backup setup (cron)
- Volume persistence

---

## 🔒 SECURITE

### Anvan Production:

1. **Change mo de pas**:
```bash
# Generate strong passwords
openssl rand -base64 32
```

2. **Setup firewall**:
```bash
ssh root@142.93.78.111
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

3. **Install SSL**:
```bash
apt-get install certbot python3-certbot-nginx
certbot --nginx -d yourdomain.com
```

4. **Backup schedule**:
```bash
crontab -e
# Add:
0 2 * * * cd /var/www/nala-credit && docker compose exec -T postgres pg_dump -U nalauser nalakreditimachann_db > backups/backup_$(date +\%Y\%m\%d).sql
```

---

## 🔄 MANAGEMENT COMMANDS

### Deploy/Update:
```bash
./deploy-to-digitalocean.sh
```

### Verify:
```bash
./verify-deployment.sh 142.93.78.111
```

### View logs:
```bash
ssh root@142.93.78.111 "cd /var/www/nala-credit && docker compose logs -f"
```

### Restart:
```bash
ssh root@142.93.78.111 "cd /var/www/nala-credit && docker compose restart"
```

### Stop:
```bash
ssh root@142.93.78.111 "cd /var/www/nala-credit && docker compose down"
```

### Start:
```bash
ssh root@142.93.78.111 "cd /var/www/nala-credit && docker compose up -d"
```

### Status:
```bash
ssh root@142.93.78.111 "cd /var/www/nala-credit && docker compose ps"
```

---

## 🐛 TROUBLESHOOTING

### Container won't start:
```bash
docker compose logs [service-name]
docker compose restart [service-name]
```

### Port conflict:
```bash
docker compose down
docker compose up -d
```

### Database issues:
```bash
docker compose logs postgres
docker compose restart postgres
```

### Out of memory:
```bash
free -h
# Add swap if needed
fallocate -l 4G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
```

### Full restart:
```bash
docker compose down
docker compose up -d --force-recreate
```

---

## 📈 MONITORING

### Check resource usage:
```bash
ssh root@142.93.78.111
docker stats
```

### Check disk space:
```bash
df -h
```

### Enable monitoring (optional):
```bash
docker compose --profile monitoring up -d
```
Access:
- Prometheus: http://142.93.78.111:9090
- Grafana: http://142.93.78.111:3001

---

## 💾 BACKUPS

### Manual backup:
```bash
ssh root@142.93.78.111
cd /var/www/nala-credit
mkdir -p backups
docker compose exec -T postgres pg_dump -U nalauser nalakreditimachann_db > backups/backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore:
```bash
docker compose exec -T postgres psql -U nalauser nalakreditimachann_db < backups/backup_20240101_120000.sql
```

### Automatic (cron):
```bash
crontab -e
# Daily at 2am:
0 2 * * * cd /var/www/nala-credit && docker compose exec -T postgres pg_dump -U nalauser nalakreditimachann_db > backups/backup_$(date +\%Y\%m\%d).sql
```

---

## 🌐 URLS APRE DEPLOIEMAN

| Service | URL |
|---------|-----|
| **Frontend** | http://142.93.78.111 |
| **API** | http://142.93.78.111/api |
| **API Health** | http://142.93.78.111/api/health |
| **Swagger** | http://142.93.78.111/api/swagger |
| **RabbitMQ** | http://142.93.78.111:15672 |
| **Prometheus** | http://142.93.78.111:9090 |
| **Grafana** | http://142.93.78.111:3001 |

---

## 📞 SIPÒ

### Problem?
1. Check logs: `docker compose logs -f`
2. Check status: `docker compose ps`
3. Check guides: `GUIDE-DEPLOIEMAN-DIGITAL-OCEAN-KREYOL.md`
4. Full restart: `docker compose down && docker compose up -d`

### Important files on server:
- **App**: `/var/www/nala-credit/`
- **Logs**: `/var/www/nala-credit/logs/`
- **Uploads**: `/var/www/nala-credit/uploads/`
- **Backups**: `/var/www/nala-credit/backups/`
- **Config**: `/var/www/nala-credit/.env`

---

## ✅ POST-DEPLOYMENT CHECKLIST

- [ ] Application accessible via browser
- [ ] API health check returns {"status":"Healthy"}
- [ ] All containers running (docker compose ps)
- [ ] Database migrations applied
- [ ] SuperAdmin account created
- [ ] Passwords changed in .env
- [ ] Firewall enabled
- [ ] SSL/HTTPS configured (if domain)
- [ ] Backups configured
- [ ] Monitoring setup (optional)

---

## 🎯 NEXT STEPS

1. **Domain**: Point domain to server IP
2. **SSL**: Install Let's Encrypt certificate
3. **Monitoring**: Enable Prometheus + Grafana
4. **Backups**: Setup automatic daily backups
5. **CI/CD**: Configure GitHub Actions
6. **Scale**: Add load balancing if needed
7. **CDN**: Use CloudFlare for static assets

---

## 📚 DOCUMENTATION

- **Quick Start**: `QUICK-START-DEPLOIEMAN.md` - 5 minute deployment
- **Kreyòl Guide**: `GUIDE-DEPLOIEMAN-DIGITAL-OCEAN-KREYOL.md` - Complete guide
- **English Guide**: `DEPLOYMENT-GUIDE-DIGITAL-OCEAN.md` - Complete guide
- **Fixes Summary**: `DEPLOIEMAN-KOREKSYON-REZIME.md` - What was fixed

---

## 🎉 STATUS

**✅ READY FOR DEPLOYMENT!**

All issues fixed, scripts tested, documentation complete.

Run `./deploy-to-digitalocean.sh` to deploy!

---

**Version**: 1.0  
**Date**: November 3, 2024  
**Status**: ✅ Production Ready
