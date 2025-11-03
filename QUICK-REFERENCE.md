# ⚡ QUICK REFERENCE - Nala Kredi Ti Machann

## 🌐 ACCESS
```
URL:      https://admin.nalakreditimachann.com 🔒
Alt URL:  http://142.93.78.111 (redirects to HTTPS)
Login:    superadmin@nalacredit.com
Password: SuperAdmin123!
```

---

## 🚀 DEPLOY UPDATES
```bash
./deploy-to-digitalocean.sh
```

---

## 📊 CHECK STATUS
```bash
ssh root@142.93.78.111 'cd /var/www/nala-credit && docker compose ps'
```

---

## 🔄 RESTART SERVICES
```bash
# All services
ssh root@142.93.78.111 'cd /var/www/nala-credit && docker compose restart'

# Specific service
ssh root@142.93.78.111 'cd /var/www/nala-credit && docker compose restart api'
```

---

## 📝 VIEW LOGS
```bash
# All logs (last 50 lines)
ssh root@142.93.78.111 'cd /var/www/nala-credit && docker compose logs --tail=50'

# Specific service
ssh root@142.93.78.111 'cd /var/www/nala-credit && docker compose logs --tail=50 api'

# Follow logs (live)
ssh root@142.93.78.111 'cd /var/www/nala-credit && docker compose logs -f api'
```

---

## 💾 BACKUP DATABASE
```bash
# Manual backup
ssh root@142.93.78.111 'docker exec nala-postgres pg_dump -U nalaadmin NalaCredit > /tmp/backup.sql'

# Download backup
scp root@142.93.78.111:/tmp/backup.sql ./
```

---

## 🔧 COMMON FIXES

### Login not working?
```bash
ssh root@142.93.78.111 'cd /var/www/nala-credit && docker compose restart api frontend nginx'
```

### Database issue?
```bash
ssh root@142.93.78.111 'cd /var/www/nala-credit && docker compose restart postgres api'
```

### Frontend not loading?
```bash
ssh root@142.93.78.111 'cd /var/www/nala-credit && docker compose restart frontend nginx'
```

---

## 🛡️ SECURITY TASKS (TODO!)

### 1. Change passwords (.env)
```bash
ssh root@142.93.78.111
nano /var/www/nala-credit/.env
# Change: DB_PASSWORD, JWT_SECRET, RABBITMQ_PASSWORD
cd /var/www/nala-credit && docker compose restart
```

### 2. Enable firewall
```bash
ssh root@142.93.78.111
ufw allow 22 && ufw allow 80 && ufw allow 443 && ufw enable
```

### 3. Setup auto-monitor
```bash
./setup-auto-monitor.sh
```

---

## 📚 FULL DOCS
- `APLIKASYON-DEPLWAYE-SIKSÈ.md` - Complete deployment success guide
- `FIX-LOGIN-NETWORK-ERROR.md` - Login fix documentation
- `GUIDE-AUTO-MONITOR-CONTAINERS.md` - Auto-monitoring guide
- `REZIME-PWOBLEM-FIKSE-JODI-A.md` - Today's fixes summary

---

## ✅ CURRENT STATUS
```
Frontend:    ✅ Running (healthy)
API:         ✅ Running (unhealthy but working)
Nginx:       ✅ Running (healthy) with SSL/HTTPS 🔒
PostgreSQL:  ✅ Running (healthy)
Redis:       ✅ Running (healthy)
RabbitMQ:    ✅ Running (healthy)

Application: 🟢 ONLINE
Domain:      admin.nalakreditimachann.com
SSL:         ✅ Valid Let's Encrypt Certificate
```

---

**Server:** 142.93.78.111  
**SSH:** `ssh root@142.93.78.111`  
**Last Updated:** Nov 3, 2025
