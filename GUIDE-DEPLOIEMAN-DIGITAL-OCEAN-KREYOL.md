# 🚀 GUIDE KONPLÈ - DEPLOIEMAN SOU DIGITAL OCEAN

## 📋 SA W BEZWEN ANVAN W KÒMANSE

### 1. Yon Droplet sou Digital Ocean
- **OS**: Ubuntu 22.04 LTS (rekomande)
- **RAM**: Omwen 2GB (4GB rekomande)
- **CPU**: Omwen 2 vCPUs
- **Espas**: Omwen 50GB SSD
- **IP**: IP piblik (egzanp: 142.93.78.111)

### 2. Aksè SSH
- Ou dwe ka konekte an SSH san password
- Kle SSH ou dwe configure sou Digital Ocean
```bash
ssh root@142.93.78.111
```

### 3. Fichye Lokay
- Git repository ou klone byen
- Docker instale sou machin w
- Fichye `.env` prepare

---

## 🔧 ETAP 1: PREPARE FICHYE KONFIGIRASYON

### Kreye fichye .env ou
```bash
# Copy example file
cp .env.example .env

# Edit with your values
nano .env
```

### Chanjman Enpòtan nan .env:
```bash
# Change ALL these passwords!
DB_PASSWORD=VotreMotDePasseTrèsSecure123!@#
RABBITMQ_PASSWORD=VotreMotDePasseRabbitMQ456!@#
JWT_SECRET=VotreCleJWTTrèsLongueEtComplexe789!@#$%^&*
GRAFANA_PASSWORD=VotreMotDePasseGrafana321!@#

# Update IP address if different
SERVER_IP=142.93.78.111
```

**⚠️ ENPÒTAN**: Pa janm met mo de pas senp! Itilize karakters espesyal, nimewo ak lèt.

---

## 🚀 ETAP 2: LANSE DEPLOIEMAN

### Rann script executable
```bash
chmod +x deploy-to-digitalocean.sh
```

### Lanse deploieman konplè
```bash
./deploy-to-digitalocean.sh
```

### Sa k ap pase:
1. ✅ Verifye prérequis lokay
2. ✅ Teste koneksyon SSH
3. ✅ Instale Docker sou sèvè
4. ✅ Kopye kòd aplik la
5. ✅ Kopye fichye .env
6. ✅ Build imaj Docker
7. ✅ Demarre tout sèvis yo
8. ✅ Verifye sante sistem la
9. ✅ Mande pou migrations

---

## 📊 ETAP 3: VERIFYE DEPLOIEMAN

### Verifye sèvis yo ap travay
```bash
ssh root@142.93.78.111 "cd /var/www/nala-credit && docker compose ps"
```

Ou dwe wè:
```
NAME                STATUS              PORTS
nala-postgres       Up 2 minutes        0.0.0.0:5432->5432/tcp
nala-redis          Up 2 minutes        0.0.0.0:6379->6379/tcp
nala-rabbitmq       Up 2 minutes        0.0.0.0:5672->5672/tcp, 0.0.0.0:15672->15672/tcp
nala-api            Up 2 minutes        0.0.0.0:5000->5000/tcp
nala-frontend       Up 2 minutes        80/tcp
nala-nginx          Up 2 minutes        0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
```

### Teste aplik la
```bash
# Test frontend
curl http://142.93.78.111

# Test API backend
curl http://142.93.78.111/api/health

# Dwe retounen: {"status":"Healthy"}
```

### Louvri nan navigatè
- 🌐 **Application**: http://142.93.78.111
- 🔗 **API**: http://142.93.78.111/api
- 🐰 **RabbitMQ**: http://142.93.78.111:15672 (user: nalauser)

---

## 🔍 ETAP 4: VERIFYE LOGS

### Logs tout sèvis yo
```bash
ssh root@142.93.78.111 "cd /var/www/nala-credit && docker compose logs -f"
```

### Logs backend sèlman
```bash
ssh root@142.93.78.111 "cd /var/www/nala-credit && docker compose logs -f api"
```

### Logs database sèlman
```bash
ssh root@142.93.78.111 "cd /var/www/nala-credit && docker compose logs -f postgres"
```

### Sòti nan logs
Peze `Ctrl+C`

---

## 🗄️ ETAP 5: MIGRATIONS DATABASE

### Si ou di "N" pou migrations pandan deploieman
```bash
ssh root@142.93.78.111
cd /var/www/nala-credit
docker compose exec api dotnet ef database update
```

### Kreye SuperAdmin (si nesesè)
```bash
docker compose exec api dotnet run --create-superadmin
```

---

## 🔒 ETAP 6: SECURITE (OBLIGATWA POU PRODUKSYON!)

### 1. Change mo de pas database default
```bash
ssh root@142.93.78.111
cd /var/www/nala-credit
nano .env

# Change DB_PASSWORD
# Then restart services
docker compose down
docker compose up -d
```

### 2. Aktive firewall
```bash
ssh root@142.93.78.111

# Install UFW
apt-get install ufw

# Allow SSH
ufw allow OpenSSH

# Allow HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Enable firewall
ufw enable
```

### 3. Install SSL/HTTPS (Rekomande!)
```bash
# Install Certbot
apt-get install certbot python3-certbot-nginx

# Get certificate (replace with your domain)
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## 🔄 KÒMAN GERE SISTEM LA

### Redémarrer tout
```bash
ssh root@142.93.78.111 "cd /var/www/nala-credit && docker compose restart"
```

### Arrêter tout
```bash
ssh root@142.93.78.111 "cd /var/www/nala-credit && docker compose down"
```

### Démarrer tout
```bash
ssh root@142.93.78.111 "cd /var/www/nala-credit && docker compose up -d"
```

### Redémarrer yon sèvis sèlman
```bash
# Backend only
ssh root@142.93.78.111 "cd /var/www/nala-credit && docker compose restart api"

# Frontend only
ssh root@142.93.78.111 "cd /var/www/nala-credit && docker compose restart frontend"
```

### Rebuild apre w chanje kòd
```bash
# From your local machine
./deploy-to-digitalocean.sh

# Or manually on server
ssh root@142.93.78.111
cd /var/www/nala-credit
docker compose down
docker compose build --no-cache
docker compose up -d
```

---

## 💾 BACKUP BASE DE DONNÉES

### Kreye backup
```bash
ssh root@142.93.78.111
cd /var/www/nala-credit

# Create backup directory
mkdir -p backups

# Backup database
docker compose exec -T postgres pg_dump -U nalauser nalakreditimachann_db > backups/backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore backup
```bash
ssh root@142.93.78.111
cd /var/www/nala-credit

# Restore from backup
docker compose exec -T postgres psql -U nalauser nalakreditimachann_db < backups/backup_20240101_120000.sql
```

### Backup otomatik (cron job)
```bash
# Edit crontab
crontab -e

# Add daily backup at 2am
0 2 * * * cd /var/www/nala-credit && docker compose exec -T postgres pg_dump -U nalauser nalakreditimachann_db > backups/backup_$(date +\%Y\%m\%d).sql
```

---

## 📈 MONITORING

### Verifye itilizasyon resous
```bash
ssh root@142.93.78.111
docker stats
```

### Verifye espas disk
```bash
df -h
```

### Netwaye imaj ak kontenè ansyen yo
```bash
ssh root@142.93.78.111
docker system prune -af
```

### Aktive Prometheus & Grafana (optional)
```bash
ssh root@142.93.78.111
cd /var/www/nala-credit
docker compose --profile monitoring up -d
```

Aksè:
- **Prometheus**: http://142.93.78.111:9090
- **Grafana**: http://142.93.78.111:3001 (admin / VotreMotDePasse)

---

## ❌ TROUBLESHOOTING

### Pwoblèm 1: Kontenè pa demarre
```bash
# Check logs
ssh root@142.93.78.111 "cd /var/www/nala-credit && docker compose logs api"

# Check container status
docker compose ps

# Restart the service
docker compose restart api
```

### Pwoblèm 2: Database connection errors
```bash
# Check postgres is running
docker compose ps postgres

# Check database logs
docker compose logs postgres

# Restart postgres
docker compose restart postgres
```

### Pwoblèm 3: "Port already in use"
```bash
# Find what's using the port
sudo lsof -i :80
sudo lsof -i :5000

# Kill the process
sudo kill -9 <PID>

# Or stop all containers first
docker compose down
docker compose up -d
```

### Pwoblèm 4: Out of memory
```bash
# Check memory usage
free -h

# Add swap space (if needed)
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### Pwoblèm 5: Cannot connect via SSH
```bash
# From your local machine
ssh-keygen -R 142.93.78.111  # Remove old key
ssh-copy-id root@142.93.78.111  # Copy new key

# Or add your public key manually on Digital Ocean dashboard
```

---

## 🔄 UPDATE APLIK LA

### Pou update ak nouvo kòd:
```bash
# 1. On your local machine, commit changes
git add .
git commit -m "New features"
git push

# 2. Redeploy
./deploy-to-digitalocean.sh
```

### Pou update rapid (zero downtime):
```bash
ssh root@142.93.78.111
cd /var/www/nala-credit

# Pull latest code
git pull origin main

# Rebuild only what changed
docker compose build api
docker compose up -d --no-deps api

# Or for frontend
docker compose build frontend
docker compose up -d --no-deps frontend
```

---

## 📞 SUPPORT

### Fichye yo enpòtan:
- **Logs**: `/var/www/nala-credit/logs/`
- **Uploads**: `/var/www/nala-credit/uploads/`
- **Backups**: `/var/www/nala-credit/backups/`
- **Konfigirasyon**: `/var/www/nala-credit/.env`

### Kòmand rapid pou debug:
```bash
# Check everything
ssh root@142.93.78.111 "cd /var/www/nala-credit && docker compose ps && docker compose logs --tail=50"

# Restart everything
ssh root@142.93.78.111 "cd /var/www/nala-credit && docker compose restart"

# Full restart
ssh root@142.93.78.111 "cd /var/www/nala-credit && docker compose down && docker compose up -d"
```

---

## ✅ CHECKLIST APRE DEPLOIEMAN

- [ ] Application louvri nan navigatè: http://142.93.78.111
- [ ] API backend travay: http://142.93.78.111/api/health
- [ ] Tout kontenè ap travay (docker compose ps)
- [ ] Database migrations ale byen
- [ ] SuperAdmin kont kreye
- [ ] Mo de pas chanje nan .env
- [ ] Firewall konfigure
- [ ] SSL/HTTPS instale (si ou gen domèn)
- [ ] Backup otomatik konfigure
- [ ] Logs ap anrejistre kòrèkteman

---

## 🎉 FELISITASYON!

Aplik ou deplwaye sou Digital Ocean! 

**URLs Enpòtan:**
- 🌐 **Aplik Web**: http://142.93.78.111
- 🔗 **API**: http://142.93.78.111/api
- 📚 **Swagger/Docs**: http://142.93.78.111/api/swagger

**Prochèn etap:**
1. Configure yon non domèn (pa egzanp: nalacredit.com)
2. Instale SSL/HTTPS avèk Let's Encrypt
3. Configure backup otomatik
4. Teste tout fonksyonalite yo
5. Kreye kont administratè yo
6. Fòme itilizatè yo

---

**Date**: Novanm 2024  
**Vèsyon**: 1.0  
**Estati**: ✅ KONPLÈ
