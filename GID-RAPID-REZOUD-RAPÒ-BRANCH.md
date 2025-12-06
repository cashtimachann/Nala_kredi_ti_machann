# 🚀 GID RAPID - REZOUD PWOBLÈM RAPÒ BRANCH

## ⚡ AKSYON RAPID (5 minit)

### Etap 1: Roulan Script Debug (30 segonn)
```bash
cd /Users/herlytache/Nala_kredi_ti_machann
./debug-branch-reports.sh
```

✅ Sa ap verifye si backend ak frontend yo rounan.

---

### Etap 2: Test nan Browser (2 minit)

1. **Louvè** `http://localhost:3000/reports/branch` nan browser ou
2. **Ouvè DevTools**: Peze `F12` (oswa `Cmd+Option+I` sou Mac)
3. **Ale nan Console tab**
4. **Paste** kòd sa epi peze Enter:

```javascript
// Kopi tout sa ki nan fichye: test-branch-reports-browser.js
```

Oswa manuèlman, teste si ou gen token:
```javascript
console.log(localStorage.getItem('token'));
```

---

### Etap 3: Tcheke Network (1 minit)

1. Nan DevTools, ale nan **Network tab**
2. Refresh paj la (`Cmd+R` oswa `F5`)
3. Gade si gen request pou `my-branch/daily` oswa `daily/1`
4. Klike sou request la pou wè:
   - **Status**: Dwe 200 (OK)
   - **Response**: Ki done ki retounen
   - **Headers**: Verifye `Authorization: Bearer ...`

---

### Etap 4: Tcheke Backend Logs (1 minit)

Gade nan terminal kote backend rounan pou wè si gen erè oswa mesaj log.

---

## 🔴 SI W WÈ ERÈ YO

### Erè 1: "Utilisateur non associé à une succursale"

**Pwoblèm**: User ou pa gen `BranchId`

**Solisyon**:
```sql
-- Update user pou gen branch
UPDATE "AspNetUsers" 
SET "BranchId" = 1 
WHERE "Email" = 'votre-email@example.com';
```

---

### Erè 2: "401 Unauthorized"

**Pwoblèm**: Token invalide oswa ekspiré

**Solisyon**:
1. Dekonekte epi konekte ankò
2. Verifye si token an genyen bon role

---

### Erè 3: "404 Not Found - Succursale introuvable"

**Pwoblèm**: Branch la pa egziste

**Solisyon**:
```sql
-- Kreye branch
INSERT INTO "Branches" (Name, Code, Address, IsActive, CreatedAt)
VALUES ('Port-au-Prince', 'PAP', 'Delmas 33', true, NOW());
```

---

### Erè 4: "Network Error"

**Pwoblèm**: Frontend pa ka konekte ak backend

**Solisyon**:
1. Verifye backend rounan: `curl http://localhost:5000/api/health`
2. Tcheke `.env` file: `cat frontend-web/.env`
3. Restart frontend: `cd frontend-web && npm start`

---

### Erè 5: "403 Forbidden"

**Pwoblèm**: User pa gen bon role

**Solisyon**:
- Asire user gen youn nan roles sa yo:
  - `Manager`
  - `BranchSupervisor`
  - `SuperAdmin`
  - `Director`
  - `Cashier`

---

## 🎯 TEST MANUAL RAPID

### Test 1: Verifye Backend Running
```bash
curl http://localhost:5000/api/health
```

**Rezilta atann**: `{"status":"Healthy"}`

---

### Test 2: Test API ak Token

1. Jwenn token ou nan Console:
```javascript
localStorage.getItem('token')
```

2. Test endpoint:
```bash
curl -X GET "http://localhost:5000/api/BranchReport/my-branch/daily" \
  -H "Authorization: Bearer VOTRE_TOKEN_ICI"
```

**Rezilta atann**: JSON ak done rapò a

---

### Test 3: Verifye Database

```sql
-- Tcheke branches
SELECT * FROM "Branches";

-- Tcheke users ak branchId
SELECT "Id", "UserName", "Email", "BranchId" 
FROM "AspNetUsers" 
WHERE "BranchId" IS NOT NULL;
```

---

## 📊 KONPRANN REPONS API A

### Repons Siksè (200 OK):
```json
{
  "branchId": 1,
  "branchName": "Port-au-Prince",
  "reportDate": "2025-12-06T00:00:00",
  "creditsDisbursed": [...],
  "paymentsReceived": [...],
  "deposits": [...],
  "withdrawals": [...],
  "totalCreditsDisbursedHTG": 0,
  "totalCreditsDisbursedUSD": 0,
  "totalPaymentsReceivedHTG": 0,
  "totalPaymentsReceivedUSD": 0,
  "totalDepositsHTG": 0,
  "totalDepositsUSD": 0,
  "totalWithdrawalsHTG": 0,
  "totalWithdrawalsUSD": 0
}
```

### Repons Erè (400/401/404/500):
```json
{
  "message": "Description de l'erreur"
}
```

---

## 🛠️ FIX KOMEN YO

### Fix 1: Reset Token
```javascript
// Nan Console Browser
localStorage.removeItem('token');
// Epi konekte ankò
```

---

### Fix 2: Kreye Test Branch
```sql
INSERT INTO "Branches" (Name, Code, Address, Phone, IsActive, CreatedAt)
VALUES (
  'Test Branch', 
  'TEST', 
  '123 Test St', 
  '+509 1234 5678', 
  true, 
  NOW()
);
```

---

### Fix 3: Asiyen Branch ba User
```sql
UPDATE "AspNetUsers" 
SET "BranchId" = (SELECT "Id" FROM "Branches" LIMIT 1)
WHERE "Email" = 'votre-email@example.com';
```

---

## 📞 BEZWEN PIS EKD?

Si aprè tout sa, w toujou gen pwoblèm, voye:

1. **Screenshot** konsol erè a (F12 > Console)
2. **Screenshot** Network tab la (F12 > Network)
3. **Kopi** backend logs (5-10 dènye liy)
4. **Kopi** token payload ou (pati JSON la)

---

## 📚 DOSYE ITIL YO

- 📖 Analiz konplè: `ANALIZ-RAPÒ-BRANCH-PWOBLÈM.md`
- 🧪 Test browser: `test-branch-reports-browser.js`
- 🔍 Script debug: `debug-branch-reports.sh`
- 💾 Check database: `check-database-branch-reports.py`

---

## ✅ CHECKLIST FINAL

- [ ] Backend rounan sou `http://localhost:5000`
- [ ] Frontend rounan sou `http://localhost:3000`
- [ ] `.env` konfigire kòrèkteman
- [ ] User konekte ak token valid
- [ ] User gen `BranchId` nan token
- [ ] User gen bon role
- [ ] Branch egziste nan database
- [ ] Pa gen erè nan konsol
- [ ] Network request ap retounen 200 OK

---

## 🎉 SI TOUT BAGAY FONKSYONE

Ou dwe kapab:
1. ✅ Wè rapò jounen pou branch ou
2. ✅ Wè rapò mansyèl pou branch ou
3. ✅ Eksporte rapò an CSV
4. ✅ (SuperAdmin) Chwazi nenpòt branch pou wè rapò li

---

**Bon chans!** 🚀
