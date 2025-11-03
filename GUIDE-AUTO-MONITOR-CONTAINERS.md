# 🔍 Guide: Auto-Monitor ak Auto-Restart pou Containers
## Sistèm pou Kenbe Containers Yo Ap Mache Otomatikman

---

## 📋 Kisa Script Sa Fè?

Script **monitor-containers.sh** se yon "gadyen" pou containers Docker ou yo. Li verifye:

✅ **Container yo ap travay** - Si yon container kanpe, li restart li  
✅ **Container yo an sante** - Si yon container malad, li restart li  
✅ **Docker service la** - Si Docker service la kanpe, li lanse li  

Li ekri rapò nan `/var/log/nala-health-monitor.log` chak fwa li chèke.

---

## 🚀 Enstale Sistèm Monitè

### Etap 1: Enstale Cron Job (Otomatik Chak 5 Minit)

```bash
./setup-auto-monitor.sh
```

Script sa a ap:
1. Kopi `monitor-containers.sh` sou serveur la
2. Mete li nan cron pou li travay chak 5 minit
3. Kreye fichye log `/var/log/nala-health-monitor.log`

### Etap 2: Verifye Enstalayon

```bash
ssh root@142.93.78.111 'crontab -l'
```

Ou dwe wè:
```
*/5 * * * * /var/www/nala-credit/monitor-containers.sh >> /var/log/nala-health-monitor.log 2>&1
```

---

## 📊 Itilize Sistèm Monitè

### Gade Log yo (Tem Reyèl)

```bash
ssh root@142.93.78.111 'tail -f /var/log/nala-health-monitor.log'
```

### Teste Manyèlman

```bash
ssh root@142.93.78.111 '/var/www/nala-credit/monitor-containers.sh'
```

### Gade Rapò Dènye Chèk

```bash
ssh root@142.93.78.111 'tail -n 50 /var/log/nala-health-monitor.log'
```

---

## 🛠️ Egzanp Log

### Lè Tout Bagay OK:
```
[2024-01-15 10:00:01] === Starting Health Monitor ===
[2024-01-15 10:00:01] Checking services: postgres redis rabbitmq api frontend nginx
[2024-01-15 10:00:02] Service: postgres | Status: running | Health: healthy
[2024-01-15 10:00:02] ✅ Service postgres is healthy
[2024-01-15 10:00:03] Service: nginx | Status: running | Health: healthy
[2024-01-15 10:00:03] ✅ Service nginx is healthy
[2024-01-15 10:00:03] ✅ All services are healthy
[2024-01-15 10:00:03] === Health Monitor Complete ===
```

### Lè Gen Pwoblèm:
```
[2024-01-15 10:05:01] === Starting Health Monitor ===
[2024-01-15 10:05:02] Service: nginx | Status: restarting | Health: 
[2024-01-15 10:05:02] ⚠️  Service nginx is restarting - Restarting...
[2024-01-15 10:05:05] Service: api | Status: running | Health: unhealthy
[2024-01-15 10:05:05] ⚠️  Service api is unhealthy - Restarting...
[2024-01-15 10:05:08] 📊 Summary: Restarted 1 stopped containers, 1 unhealthy containers
[2024-01-15 10:05:08] === Health Monitor Complete ===
```

---

## ⚙️ Modifye Frekans Chèk

### Chanje de 5 minit a 2 minit:

```bash
ssh root@142.93.78.111
crontab -e
```

Chanje:
```
*/5 * * * * /var/www/nala-credit/monitor-containers.sh
```

A:
```
*/2 * * * * /var/www/nala-credit/monitor-containers.sh
```

### Chanje a 10 minit:
```
*/10 * * * * /var/www/nala-credit/monitor-containers.sh
```

---

## 🗑️ Retire Sistèm Monitè

### Retire Cron Job:

```bash
ssh root@142.93.78.111 'crontab -l | grep -v monitor-containers.sh | crontab -'
```

### Efase Fichye:

```bash
ssh root@142.93.78.111 'rm /var/www/nala-credit/monitor-containers.sh'
ssh root@142.93.78.111 'rm /var/log/nala-health-monitor.log'
```

---

## 📧 Ajoute Notifikasyon Email (Opsyonèl)

Si ou vle resevwa email lè gen pwoblèm:

### 1. Enstale mailutils:
```bash
ssh root@142.93.78.111 'apt update && apt install -y mailutils'
```

### 2. Modifye script la:

Ajoute nan fen `monitor-containers.sh`:

```bash
# Send email if containers were restarted
if [[ $RESTARTED -gt 0 ]] || [[ $UNHEALTHY -gt 0 ]]; then
    echo "Container issues detected: $RESTARTED stopped, $UNHEALTHY unhealthy" | \
        mail -s "⚠️ Nala Credit - Container Alert" your-email@example.com
fi
```

---

## 🔍 Pwoblèm Komen

### ❌ "jq: command not found"

**Solisyon:**
```bash
ssh root@142.93.78.111 'apt update && apt install -y jq'
```

### ❌ Cron pa travay

**Verifye cron service:**
```bash
ssh root@142.93.78.111 'systemctl status cron'
```

**Lanse cron si li pa travay:**
```bash
ssh root@142.93.78.111 'systemctl start cron'
```

### ❌ Permission denied sou log file

**Fikse pèmisyon:**
```bash
ssh root@142.93.78.111 'touch /var/log/nala-health-monitor.log && chmod 644 /var/log/nala-health-monitor.log'
```

---

## 📈 Konsèy Pwofesyonèl

### 1. **Archive Log yo Regilyèman**
```bash
# Ajoute sa nan cron tou:
0 0 * * 0 mv /var/log/nala-health-monitor.log /var/log/nala-health-monitor-$(date +\%Y\%m\%d).log && touch /var/log/nala-health-monitor.log
```

### 2. **Gade Estatistik**
```bash
# Konbyen fwa containers restart nan dènye 24h:
ssh root@142.93.78.111 "grep 'Restarting...' /var/log/nala-health-monitor.log | wc -l"

# Ki container ki restart plis:
ssh root@142.93.78.111 "grep 'Restarting...' /var/log/nala-health-monitor.log | grep -oP 'Service \K\w+' | sort | uniq -c | sort -rn"
```

### 3. **Alert sou Slack/Discord**
Ou ka modifye script la pou voye mesaj sou Slack oswa Discord lè gen pwoblèm. Gade dokimantasyon Webhook yo.

---

## ✅ Rezime

| Aksyon | Kòmand |
|--------|--------|
| **Enstale** | `./setup-auto-monitor.sh` |
| **Gade Log** | `ssh root@142.93.78.111 'tail -f /var/log/nala-health-monitor.log'` |
| **Teste** | `ssh root@142.93.78.111 '/var/www/nala-credit/monitor-containers.sh'` |
| **Retire** | `ssh root@142.93.78.111 'crontab -l \| grep -v monitor \| crontab -'` |

---

## 🎯 Kisa Sa Ap Bay Ou?

✅ **Zero Downtime** - Containers redmarre otomatikman  
✅ **Vigilans 24/7** - Chèk chak 5 minit  
✅ **Istorik** - Log tout evènman  
✅ **Senplist** - Pa bezwen kòd konplike  

---

**Ou an sekirite kounye a! 🛡️**

Sistèm ou a ap monitore tèt li e restart containers yo si yo gen pwoblèm.
