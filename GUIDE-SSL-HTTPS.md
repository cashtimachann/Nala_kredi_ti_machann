# 🔒 GUIDE SSL/HTTPS - NALA CREDIT

## 📋 2 OPSYON POU SSL

---

## ✅ OPSYON 1: Self-Signed Certificate (KOUNYE A, san domèn)

**Avantaj**:
- ✅ Pa bezwen domèn
- ✅ Rapid (2 minit)
- ✅ Trafik chifre

**Dezavantaj**:
- ⚠️ Navigatè ap avèti w (pa pwoblèm pou test)
- ⚠️ Pa bon pou production

### Kòman Enstale:
```bash
./install-self-signed-ssl.sh
```

### Apre Enstalasyon:
1. Ale sou: https://142.93.78.111
2. Klike "Advanced" oswa "Show Details"
3. Klike "Proceed to 142.93.78.111"
4. ✅ Done!

---

## ✅ OPSYON 2: Let's Encrypt (Avèk domèn)

**Avantaj**:
- ✅ Vrè SSL certificate
- ✅ Gratis
- ✅ Otomatik renewal
- ✅ Pa gen avètisman navigatè

**Requirement**:
- ❗ Ou OBLIJE gen yon domèn (pa ka itilize sèlman IP)

### Etap 1: Achte yon domèn
Achte sou:
- Namecheap.com
- GoDaddy.com
- Google Domains
- Cloudflare.com

### Etap 2: Pwen domèn nan sou sèvè w
Nan DNS settings domèn ou:
```
Type: A Record
Name: @ (oswa nalacredit)
Value: 142.93.78.111
TTL: Automatic oswa 300
```

Si ou vle www tou:
```
Type: A Record
Name: www
Value: 142.93.78.111
TTL: Automatic oswa 300
```

### Etap 3: Tann DNS propagate (5-30 minit)

Teste si li prèt:
```bash
dig +short yourdomain.com
# Dwe retounen: 142.93.78.111
```

### Etap 4: Enstale Let's Encrypt
```bash
./install-letsencrypt-ssl.sh yourdomain.com your@email.com
```

Egzanp:
```bash
./install-letsencrypt-ssl.sh nalacredit.com admin@nalacredit.com
```

### Apre Enstalasyon:
1. Ale sou: https://nalacredit.com
2. ✅ Pa gen avètisman!
3. ✅ Vrè SSL certificate!

---

## 🆚 KONPAREZON

| | Self-Signed | Let's Encrypt |
|---|---|---|
| **Bezwen Domèn** | ❌ Non | ✅ Wi |
| **Avètisman Navigatè** | ⚠️ Wi | ✅ Non |
| **Bon pou Production** | ❌ Non | ✅ Wi |
| **Gratis** | ✅ Wi | ✅ Wi |
| **Tan Enstalasyon** | 2 minit | 5 minit |
| **Trafik Chifre** | ✅ Wi | ✅ Wi |
| **Auto-Renewal** | ❌ Non | ✅ Wi |

---

## 💡 REKOMADASYON

### Pou Test/Development:
```bash
./install-self-signed-ssl.sh
```
✅ Rapid, senp, pa bezwen domèn

### Pou Production:
1. Achte yon domèn ($10-15/an)
2. Pwen l sou sèvè w
3. Enstale Let's Encrypt:
```bash
./install-letsencrypt-ssl.sh yourdomain.com your@email.com
```

---

## 🔧 APRE ENSTALASYON SSL

### Teste HTTPS:
```bash
# Test si HTTPS travay
curl -k https://142.93.78.111/api/health

# Oswa si ou gen domèn
curl https://yourdomain.com/api/health
```

### Verifye HTTP → HTTPS redirect:
```bash
curl -I http://142.93.78.111
# Dwe retounen: 301 Moved Permanently
# Location: https://142.93.78.111/
```

### Si gen pwoblèm:
```bash
# Check Nginx logs
ssh root@142.93.78.111 "cd /var/www/nala-credit && docker compose logs nginx"

# Restart Nginx
ssh root@142.93.78.111 "cd /var/www/nala-credit && docker compose restart nginx"
```

---

## 🔄 CHANJE DE SELF-SIGNED → LET'S ENCRYPT

Si ou kòmanse avèk self-signed epi apre w achte yon domèn:

1. Pwen domèn nan sou sèvè w
2. Tann DNS propagate (5-30 minit)
3. Egzekite:
```bash
./install-letsencrypt-ssl.sh yourdomain.com your@email.com
```

Script la ap:
- ✅ Retire self-signed certificate
- ✅ Enstale Let's Encrypt certificate
- ✅ Update Nginx config
- ✅ Restart services

---

## 📝 FICHYE YO

### Scripts kreye:
1. **`install-self-signed-ssl.sh`** - Self-signed SSL (pa bezwen domèn)
2. **`install-letsencrypt-ssl.sh`** - Let's Encrypt SSL (bezwen domèn)

### Nginx Config:
- **Orijinal**: `/var/www/nala-credit/nginx.conf`
- **Backup**: `/var/www/nala-credit/nginx.conf.backup`

### SSL Certificates:
- **Self-signed**: `/etc/nginx/ssl/`
- **Let's Encrypt**: `/etc/letsencrypt/live/yourdomain.com/`

---

## ✅ CHECKLIST APRE SSL

- [ ] HTTPS travay (https://142.93.78.111 oswa https://yourdomain.com)
- [ ] HTTP redirect to HTTPS (http://... → https://...)
- [ ] API accessible via HTTPS (https://.../api/health)
- [ ] Frontend louvri san pwoblèm
- [ ] Pa gen mixed content errors (check browser console)

---

## 🎯 PROCHÈN ETAP

### Si ou itilize Self-Signed:
1. Teste aplikasyon an avèk HTTPS
2. Lè ou prèt pou production, achte yon domèn
3. Switch to Let's Encrypt

### Si ou itilize Let's Encrypt:
1. ✅ Done! Ou pare pou production
2. Verifye auto-renewal ap travay:
```bash
ssh root@142.93.78.111 "certbot renew --dry-run"
```

---

## 📞 SIPÒ

### Pwoblèm SSL?
```bash
# Check Nginx config
ssh root@142.93.78.111 "nginx -t"

# Check SSL certificate
ssh root@142.93.78.111 "openssl s_client -connect localhost:443 -servername yourdomain.com"

# Restart everything
ssh root@142.93.78.111 "cd /var/www/nala-credit && docker compose restart"
```

---

**Date**: 3 Novanm 2024  
**Scripts**: ✅ Prèt pou itilizasyon  
**Estati**: ✅ Teste ak fonksyonèl
