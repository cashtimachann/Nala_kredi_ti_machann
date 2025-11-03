# 🎉 DEPLOIEMAN REYISI - NALA KREDI TI MACHANN

## ✅ ESTATI: DEPLWAYE AK SIKSÈ!

**Date**: 3 Novanm 2024  
**Sèvè**: 142.93.78.111 (Digital Ocean)  
**Anviwònman**: Production

---

## 🌐 AKSÈ APLIKASYON

### URLs Prensipal:
| Sèvis | URL | Estati |
|-------|-----|--------|
| 🌐 **Frontend Web** | http://142.93.78.111 | ✅ Fonksyone |
| 🔗 **API Backend** | http://142.93.78.111/api | ✅ Fonksyone |
| 🐰 **RabbitMQ Management** | http://142.93.78.111:15672 | ✅ Fonksyone |
| 📊 **Prometheus** | http://142.93.78.111:9090 | ⚠️ Optional |
| 📈 **Grafana** | http://142.93.78.111:3001 | ⚠️ Optional |

### Login RabbitMQ:
- **URL**: http://142.93.78.111:15672
- **Username**: nalauser
- **Password**: (cheke nan .env sou sèvè)

---

## 📊 SÈVIS YO DEPLWAYE

Tout kontenè Docker yo ap travay:

```
✅ nala-postgres   - PostgreSQL 15 (Database)
✅ nala-redis      - Redis 7 (Cache)  
✅ nala-rabbitmq   - RabbitMQ 3 (Message Queue)
✅ nala-api        - .NET 8 API Backend
✅ nala-frontend   - React Frontend
✅ nala-nginx      - Nginx Reverse Proxy
```

---

## 🔧 KÒMAND JESYON

### Wè logs (tout sèvis):
```bash
ssh root@142.93.78.111 'cd /var/www/nala-credit && docker compose logs -f'
```

### Wè logs backend sèlman:
```bash
ssh root@142.93.78.111 'cd /var/www/nala-credit && docker compose logs -f api'
```

### Verifye estati:
```bash
ssh root@142.93.78.111 'cd /var/www/nala-credit && docker compose ps'
```

### Redémarrer tout:
```bash
ssh root@142.93.78.111 'cd /var/www/nala-credit && docker compose restart'
```

### Redémarrer yon sèvis:
```bash
ssh root@142.93.78.111 'cd /var/www/nala-credit && docker compose restart api'
```

### Arrêter tout:
```bash
ssh root@142.93.78.111 'cd /var/www/nala-credit && docker compose down'
```

### Démarrer tout:
```bash
ssh root@142.93.78.111 'cd /var/www/nala-credit && docker compose up -d'
```

---

## 🗄️ DATABASE MIGRATIONS

Si ou bezwen apliké migrations:

```bash
ssh root@142.93.78.111
cd /var/www/nala-credit
docker compose exec api dotnet ef database update
```

### Kreye SuperAdmin (si nesesè):
```bash
docker compose exec api dotnet run --create-superadmin
```

---

## ⚠️ AKSYON ENPÒTAN POU SECURITE

### 1. ✅ CHANJE MO DE PAS (OBLIGATWA!)

```bash
ssh root@142.93.78.111
cd /var/www/nala-credit
nano .env
```

Chanje:
- `DB_PASSWORD` - Mo de pas database
- `JWT_SECRET` - Secret key pou authentication
- `RABBITMQ_PASSWORD` - Mo de pas RabbitMQ
- `GRAFANA_PASSWORD` - Mo de pas Grafana

Apre chanjman, restart:
```bash
docker compose down
docker compose up -d
```

### 2. ✅ AKTIVE FIREWALL

```bash
ssh root@142.93.78.111

# Install UFW
apt-get update
apt-get install -y ufw

# Configure firewall
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp

# Enable firewall
ufw --force enable

# Check status
ufw status
```

### 3. ✅ INSTALL SSL/HTTPS (Si ou gen domèn)

```bash
ssh root@142.93.78.111

# Install Certbot
apt-get install -y certbot python3-certbot-nginx

# Get certificate (replace with your domain)
certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
certbot renew --dry-run
```

### 4. ✅ CONFIGURE BACKUP OTOMATIK

```bash
ssh root@142.93.78.111

# Create backup directory
mkdir -p /var/www/nala-credit/backups

# Edit crontab
crontab -e

# Add this line (backup every day at 2am):
0 2 * * * cd /var/www/nala-credit && docker compose exec -T postgres pg_dump -U nalauser nalakreditimachann_db > backups/backup_$(date +\%Y\%m\%d).sql

# Clean old backups (keep 30 days)
0 3 * * * find /var/www/nala-credit/backups -name "backup_*.sql" -mtime +30 -delete
```

---

## 💾 BACKUP MANYÈL

### Kreye backup database:
```bash
ssh root@142.93.78.111
cd /var/www/nala-credit
docker compose exec -T postgres pg_dump -U nalauser nalakreditimachann_db > backups/backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore backup:
```bash
ssh root@142.93.78.111
cd /var/www/nala-credit
docker compose exec -T postgres psql -U nalauser nalakreditimachann_db < backups/backup_20241103_120000.sql
```

---

## 🔄 UPDATE APLIKASYON

### Pou update avèk nouvo kòd:

**1. Sou machin lokay ou:**
```bash
cd /Users/herlytache/Nala_kredi_ti_machann
git add .
git commit -m "New features"
git push
```

**2. Redeploy:**
```bash
./deploy-to-digitalocean.sh
```

### Pou update rapid (zero downtime):
```bash
ssh root@142.93.78.111
cd /var/www/nala-credit

# Pull latest code
git pull origin main

# Rebuild only backend
docker compose build api
docker compose up -d --no-deps api

# Or rebuild only frontend
docker compose build frontend
docker compose up -d --no-deps frontend
```

---

## 📈 MONITORING

### Check resource usage:
```bash
ssh root@142.93.78.111

# Memory and CPU
docker stats

# Disk space
df -h

# Container logs size
du -sh /var/lib/docker/containers/*
```

### Clean old Docker resources:
```bash
# Remove unused images
docker image prune -af

# Remove unused volumes
docker volume prune -f

# Remove unused networks
docker network prune -f
```

---

## 🐛 TROUBLESHOOTING RAPID

### Pwoblèm 1: Frontend pa ouvri
```bash
ssh root@142.93.78.111 "cd /var/www/nala-credit && docker compose logs frontend"
ssh root@142.93.78.111 "cd /var/www/nala-credit && docker compose restart frontend nginx"
```

### Pwoblèm 2: API pa repònn
```bash
ssh root@142.93.78.111 "cd /var/www/nala-credit && docker compose logs api"
ssh root@142.93.78.111 "cd /var/www/nala-credit && docker compose restart api"
```

### Pwoblèm 3: Database connection error
```bash
ssh root@142.93.78.111 "cd /var/www/nala-credit && docker compose logs postgres"
ssh root@142.93.78.111 "cd /var/www/nala-credit && docker compose restart postgres"
```

### Pwoblèm 4: Out of memory
```bash
ssh root@142.93.78.111
free -h

# Add swap if needed
fallocate -l 4G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### Pwoblèm 5: Full restart
```bash
ssh root@142.93.78.111
cd /var/www/nala-credit
docker compose down
docker compose up -d --force-recreate
```

---

## 📚 DOKIMAN

Pou plis detay, li guides sa yo:

- **Quick Start**: `QUICK-START-DEPLOIEMAN.md`
- **Guide Kreyòl**: `GUIDE-DEPLOIEMAN-DIGITAL-OCEAN-KREYOL.md`
- **English Guide**: `DEPLOYMENT-GUIDE-DIGITAL-OCEAN.md`
- **Rezime Koreksyon**: `DEPLOIEMAN-KOREKSYON-REZIME.md`
- **Fix Docker**: `FIX-DOCKER-BUILD-CONTEXT.md`

---

## ✅ CHECKLIST APRE DEPLOIEMAN

- [x] Application deployed successfully
- [x] All containers running
- [x] Frontend accessible
- [x] API backend running
- [x] Database connected
- [ ] **Passwords changed in .env** ⚠️ ENPÒTAN!
- [ ] **Firewall enabled** ⚠️ ENPÒTAN!
- [ ] SSL/HTTPS configured (if domain available)
- [ ] Backup scheduled
- [ ] SuperAdmin account created
- [ ] Test all functionalities

---

## 🎯 PROCHÈN ETAP

1. **Teste aplikasyon an**: http://142.93.78.111
2. **Chanje mo de pas yo** nan .env
3. **Aktive firewall** (UFW)
4. **Configure backup otomatik**
5. **Achte yon domèn** (optional)
6. **Install SSL/HTTPS** (si ou gen domèn)
7. **Kreye kont administratè yo**
8. **Teste tout fonksyonalite yo**
9. **Fòme itilizatè yo**

---

## 📞 SIPÒ

Si ou gen pwoblèm:

1. Check logs: `ssh root@142.93.78.111 "cd /var/www/nala-credit && docker compose logs -f"`
2. Check status: `ssh root@142.93.78.111 "cd /var/www/nala-credit && docker compose ps"`
3. Restart: `ssh root@142.93.78.111 "cd /var/www/nala-credit && docker compose restart"`

---

## 🎉 KONKLIZYON

**BRAVO!** Ou fini deploy **Nala Kredi Ti Machann** sou Digital Ocean!

Aplikasyon an fonksyone epi li prèt pou itilizasyon. Pa bliye:
1. ⚠️ **Chanje mo de pas yo**
2. ⚠️ **Aktive firewall**
3. ⚠️ **Configure backup**
4. ⚠️ **Install SSL si ou gen domèn**

---

**Version**: 1.0  
**Date Deploieman**: 3 Novanm 2024  
**Estati**: ✅ SIKSÈ  
**Anviwònman**: Production ready (apre securite)
