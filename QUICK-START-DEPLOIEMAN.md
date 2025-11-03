# ⚡ QUICK START - DEPLOIEMAN 5 MINIT

## 🎯 PWOJIKSYON: Deploy sou Digital Ocean nan mwens ke 5 minit!

---

## ✅ CHECKLIST ANVAN W KÒMANSE

- [ ] Ou gen yon Droplet Digital Ocean (Ubuntu 22.04, 2GB RAM minimum)
- [ ] Ou ka konekte an SSH: `ssh root@142.93.78.111`
- [ ] Docker instale sou machin lokay ou (pa oblije)
- [ ] Git repository la klone sou machin w

---

## 🚀 3 KÒMAND POU DEPLOY

### 1️⃣ Prepare .env
```bash
cp .env.example .env
nano .env
```

**Chanje sa yo OBLIGATWA**:
```bash
DB_PASSWORD=YourSecurePassword123!@#
JWT_SECRET=YourVeryLongSecretKey456!@#
RABBITMQ_PASSWORD=YourRabbitPassword789!@#
```

Sovgade ak sòti: `Ctrl+O`, `Enter`, `Ctrl+X`

---

### 2️⃣ Rann script executable
```bash
chmod +x deploy-to-digitalocean.sh
```

---

### 3️⃣ DEPLOY!
```bash
./deploy-to-digitalocean.sh
```

**Sa k ap pase**:
1. Verifye fichye yo ✅
2. Teste SSH ✅
3. Install Docker sou sèvè ✅
4. Kopye kòd la ✅
5. Build imaj Docker ✅
6. Demarre sèvis yo ✅
7. Verifye sante ✅

**Li ap mande w**:
```
Voulez-vous exécuter les migrations EF Core? (y/N)
```
Tape `y` epi `Enter`.

---

## 🎉 FINI! Teste aplik ou

### Ouvri nan navigatè:
```
http://142.93.78.111
```

### Teste API:
```bash
curl http://142.93.78.111/api/health
# Dwe retounen: {"status":"Healthy"}
```

---

## 🔍 VERIFYE TOUT BAGAY AP TRAVAY

```bash
chmod +x verify-deployment.sh
./verify-deployment.sh 142.93.78.111
```

Ou dwe wè tout ✅:
```
✅ Frontend: OK
✅ API Health: OK
✅ PostgreSQL: Healthy
✅ Redis: Healthy
✅ API Backend: Healthy
```

---

## 📊 KÒMAND RAPID

### Wè logs:
```bash
ssh root@142.93.78.111 "cd /var/www/nala-credit && docker compose logs -f"
```

### Restart:
```bash
ssh root@142.93.78.111 "cd /var/www/nala-credit && docker compose restart"
```

### Estati:
```bash
ssh root@142.93.78.111 "cd /var/www/nala-credit && docker compose ps"
```

---

## ⚠️ SI GEN PWOBLÈM

### Kontenè pa demarre?
```bash
ssh root@142.93.78.111
cd /var/www/nala-credit
docker compose logs api
docker compose restart api
```

### Port deja itilize?
```bash
docker compose down
docker compose up -d
```

### Bezwen restart tout?
```bash
ssh root@142.93.78.111 "cd /var/www/nala-credit && docker compose down && docker compose up -d"
```

---

## 📚 POU PI PLIS DETAY

Li guides konplè yo:
- **Kreyòl**: `GUIDE-DEPLOIEMAN-DIGITAL-OCEAN-KREYOL.md`
- **English**: `DEPLOYMENT-GUIDE-DIGITAL-OCEAN.md`
- **Rezime**: `DEPLOIEMAN-KOREKSYON-REZIME.md`

---

## 🔒 APRE DEPLOIEMAN (Enpòtan!)

1. **Change mo de pas yo** nan production
2. **Install SSL/HTTPS** si ou gen yon domèn
3. **Aktive firewall** (ufw)
4. **Configure backup otomatik** (cron)

---

## ✅ DONE!

Ou fini! Aplik ou deplwaye sou:
- 🌐 **Frontend**: http://142.93.78.111
- 🔗 **API**: http://142.93.78.111/api
- 🐰 **RabbitMQ**: http://142.93.78.111:15672

**Total tan**: ~5 minit ⚡

---

**Pwoblèm?** Check `GUIDE-DEPLOIEMAN-DIGITAL-OCEAN-KREYOL.md` pou troubleshooting detaye.
