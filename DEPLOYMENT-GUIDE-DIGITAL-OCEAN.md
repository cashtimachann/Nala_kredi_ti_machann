# 🚀 COMPLETE DEPLOYMENT GUIDE - DIGITAL OCEAN

## 📋 PREREQUISITES

### 1. Digital Ocean Droplet
- **OS**: Ubuntu 22.04 LTS (recommended)
- **RAM**: Minimum 2GB (4GB recommended)
- **CPU**: Minimum 2 vCPUs
- **Storage**: Minimum 50GB SSD
- **IP**: Public IP address (e.g., 142.93.78.111)

### 2. SSH Access
- You must be able to connect via SSH without password
- Your SSH key must be configured on Digital Ocean
```bash
ssh root@142.93.78.111
```

### 3. Local Files
- Git repository cloned
- Docker installed on your machine
- `.env` file prepared

---

## 🔧 STEP 1: PREPARE CONFIGURATION FILES

### Create your .env file
```bash
# Copy example file
cp .env.example .env

# Edit with your values
nano .env
```

### Important changes in .env:
```bash
# Change ALL these passwords!
DB_PASSWORD=YourVerySecurePassword123!@#
RABBITMQ_PASSWORD=YourRabbitMQPassword456!@#
JWT_SECRET=YourVeryLongAndComplexJWTKey789!@#$%^&*
GRAFANA_PASSWORD=YourGrafanaPassword321!@#

# Update IP address if different
SERVER_IP=142.93.78.111
```

**⚠️ IMPORTANT**: Never use simple passwords! Use special characters, numbers, and letters.

---

## 🚀 STEP 2: RUN DEPLOYMENT

### Make script executable
```bash
chmod +x deploy-to-digitalocean.sh
```

### Run full deployment
```bash
./deploy-to-digitalocean.sh
```

### What happens:
1. ✅ Check local prerequisites
2. ✅ Test SSH connection
3. ✅ Install Docker on server
4. ✅ Copy application code
5. ✅ Copy .env file
6. ✅ Build Docker images
7. ✅ Start all services
8. ✅ Health check system
9. ✅ Prompt for database migrations

---

## 📊 STEP 3: VERIFY DEPLOYMENT

### Check services are running
```bash
ssh root@142.93.78.111 "cd /var/www/nala-credit && docker compose ps"
```

You should see:
```
NAME                STATUS              PORTS
nala-postgres       Up 2 minutes        0.0.0.0:5432->5432/tcp
nala-redis          Up 2 minutes        0.0.0.0:6379->6379/tcp
nala-rabbitmq       Up 2 minutes        0.0.0.0:5672->5672/tcp, 0.0.0.0:15672->15672/tcp
nala-api            Up 2 minutes        0.0.0.0:5000->5000/tcp
nala-frontend       Up 2 minutes        80/tcp
nala-nginx          Up 2 minutes        0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
```

### Test the application
```bash
# Test frontend
curl http://142.93.78.111

# Test API backend
curl http://142.93.78.111/api/health

# Should return: {"status":"Healthy"}
```

### Open in browser
- 🌐 **Application**: http://142.93.78.111
- 🔗 **API**: http://142.93.78.111/api
- 🐰 **RabbitMQ**: http://142.93.78.111:15672 (user: nalauser)

---

## 🔍 STEP 4: CHECK LOGS

### Logs for all services
```bash
ssh root@142.93.78.111 "cd /var/www/nala-credit && docker compose logs -f"
```

### Backend logs only
```bash
ssh root@142.93.78.111 "cd /var/www/nala-credit && docker compose logs -f api"
```

### Database logs only
```bash
ssh root@142.93.78.111 "cd /var/www/nala-credit && docker compose logs -f postgres"
```

### Exit logs
Press `Ctrl+C`

---

## 🗄️ STEP 5: DATABASE MIGRATIONS

### If you said "N" to migrations during deployment
```bash
ssh root@142.93.78.111
cd /var/www/nala-credit
docker compose exec api dotnet ef database update
```

### Create SuperAdmin (if needed)
```bash
docker compose exec api dotnet run --create-superadmin
```

---

## 🔒 STEP 6: SECURITY (MANDATORY FOR PRODUCTION!)

### 1. Change default database password
```bash
ssh root@142.93.78.111
cd /var/www/nala-credit
nano .env

# Change DB_PASSWORD
# Then restart services
docker compose down
docker compose up -d
```

### 2. Enable firewall
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

### 3. Install SSL/HTTPS (Recommended!)
```bash
# Install Certbot
apt-get install certbot python3-certbot-nginx

# Get certificate (replace with your domain)
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## 🔄 SYSTEM MANAGEMENT

### Restart everything
```bash
ssh root@142.93.78.111 "cd /var/www/nala-credit && docker compose restart"
```

### Stop everything
```bash
ssh root@142.93.78.111 "cd /var/www/nala-credit && docker compose down"
```

### Start everything
```bash
ssh root@142.93.78.111 "cd /var/www/nala-credit && docker compose up -d"
```

### Restart one service only
```bash
# Backend only
ssh root@142.93.78.111 "cd /var/www/nala-credit && docker compose restart api"

# Frontend only
ssh root@142.93.78.111 "cd /var/www/nala-credit && docker compose restart frontend"
```

### Rebuild after code changes
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

## 💾 DATABASE BACKUP

### Create backup
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

### Automatic backup (cron job)
```bash
# Edit crontab
crontab -e

# Add daily backup at 2am
0 2 * * * cd /var/www/nala-credit && docker compose exec -T postgres pg_dump -U nalauser nalakreditimachann_db > backups/backup_$(date +\%Y\%m\%d).sql
```

---

## 📈 MONITORING

### Check resource usage
```bash
ssh root@142.93.78.111
docker stats
```

### Check disk space
```bash
df -h
```

### Clean old images and containers
```bash
ssh root@142.93.78.111
docker system prune -af
```

### Enable Prometheus & Grafana (optional)
```bash
ssh root@142.93.78.111
cd /var/www/nala-credit
docker compose --profile monitoring up -d
```

Access:
- **Prometheus**: http://142.93.78.111:9090
- **Grafana**: http://142.93.78.111:3001 (admin / YourPassword)

---

## ❌ TROUBLESHOOTING

### Problem 1: Container won't start
```bash
# Check logs
ssh root@142.93.78.111 "cd /var/www/nala-credit && docker compose logs api"

# Check container status
docker compose ps

# Restart the service
docker compose restart api
```

### Problem 2: Database connection errors
```bash
# Check postgres is running
docker compose ps postgres

# Check database logs
docker compose logs postgres

# Restart postgres
docker compose restart postgres
```

### Problem 3: "Port already in use"
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

### Problem 4: Out of memory
```bash
# Check memory usage
free -h

# Add swap space (if needed)
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### Problem 5: Cannot connect via SSH
```bash
# From your local machine
ssh-keygen -R 142.93.78.111  # Remove old key
ssh-copy-id root@142.93.78.111  # Copy new key

# Or add your public key manually on Digital Ocean dashboard
```

---

## 🔄 UPDATE APPLICATION

### To update with new code:
```bash
# 1. On your local machine, commit changes
git add .
git commit -m "New features"
git push

# 2. Redeploy
./deploy-to-digitalocean.sh
```

### For quick updates (zero downtime):
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

### Important files:
- **Logs**: `/var/www/nala-credit/logs/`
- **Uploads**: `/var/www/nala-credit/uploads/`
- **Backups**: `/var/www/nala-credit/backups/`
- **Configuration**: `/var/www/nala-credit/.env`

### Quick debug commands:
```bash
# Check everything
ssh root@142.93.78.111 "cd /var/www/nala-credit && docker compose ps && docker compose logs --tail=50"

# Restart everything
ssh root@142.93.78.111 "cd /var/www/nala-credit && docker compose restart"

# Full restart
ssh root@142.93.78.111 "cd /var/www/nala-credit && docker compose down && docker compose up -d"
```

---

## ✅ POST-DEPLOYMENT CHECKLIST

- [ ] Application opens in browser: http://142.93.78.111
- [ ] API backend working: http://142.93.78.111/api/health
- [ ] All containers running (docker compose ps)
- [ ] Database migrations completed
- [ ] SuperAdmin account created
- [ ] Passwords changed in .env
- [ ] Firewall configured
- [ ] SSL/HTTPS installed (if you have a domain)
- [ ] Automatic backups configured
- [ ] Logs recording correctly

---

## 🎉 CONGRATULATIONS!

Your application is deployed on Digital Ocean!

**Important URLs:**
- 🌐 **Web App**: http://142.93.78.111
- 🔗 **API**: http://142.93.78.111/api
- 📚 **Swagger/Docs**: http://142.93.78.111/api/swagger

**Next steps:**
1. Configure a domain name (e.g., nalacredit.com)
2. Install SSL/HTTPS with Let's Encrypt
3. Configure automatic backups
4. Test all functionalities
5. Create administrator accounts
6. Train users

---

**Date**: November 2024  
**Version**: 1.0  
**Status**: ✅ COMPLETE
