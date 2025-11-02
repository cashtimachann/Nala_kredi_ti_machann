# 👥 KONT KI NAN DATABASE LA

## 📊 Rezime

**Total Kont:** 7 kont
**Dat Kreyasyon:** $(Get-Date -Format "dd/MM/yyyy HH:mm")
**Database:** PostgreSQL - nalakreditimachann_db

---

## 🔑 KONT TEST YO

### **Nivo 0: Administrateur** 🔑
```
Email:    admin@nalacredit.com
Modpas:   Admin2025!
Non:      Super Admin
Role ID:  0
Branch:   N/A (Global)
Status:   ✅ Aktif
```

### **Nivo 1: Caissier** 🧑‍💼
```
Email:    cashier@nalacredit.com
Modpas:   Cashier123!
Non:      Marie Caissier
Role ID:  1
Branch:   Branch 1
Status:   ✅ Aktif
```
**Aksè:**
- Dashboard Caissier (ble)
- Tranzaksyon (Depo, Retrè, Change)
- Kont Kouran
- Rapò Jounen

### **Nivo 2: Secrétaire Administratif** 📋
```
Email:    secretary@nalacredit.com
Modpas:   Secretary123!
Non:      Jean Secretary
Role ID:  2
Branch:   Branch 1
Status:   ✅ Aktif
```
**Aksè:**
- Dashboard Secrétaire (teal)
- Jesyon Kliyan
- Dokiman
- KYC
- Randevou
- Rapò

### **Nivo 3: Agent de Crédit** 💼
```
Email:    creditagent@nalacredit.com
Modpas:   Agent123!
Non:      Pierre Agent
Role ID:  3
Branch:   Branch 1
Status:   ✅ Aktif
```
**Aksè:**
- Dashboard Agent (mov)
- Demann Kredi
- Peman
- Pòtfòy
- Vizit Teren
- Evalyasyon

### **Nivo 4: Chef de Succursale** 🏢
```
Email:    branchmanager@nalacredit.com
Modpas:   Manager123!
Non:      Paul Manager
Role ID:  4
Branch:   Branch 1
Status:   ✅ Aktif
```
**Aksè:**
- Dashboard Chef (vèt)
- Validasyon
- Sipèvizyon Operasyon
- Jesyon Kès
- Jesyon Staff
- Operasyon Change
- Tout rapò

### **Nivo 5: Superviseur** 👨‍💼
```
Email:    supervisor@nalacredit.com
Modpas:   Supervisor123!
Non:      Sophie Supervisor
Role ID:  5
Branch:   N/A (Multi-branch)
Status:   ✅ Aktif
```
**Aksè:**
- Dashboard Sipèvizè (an devlopman)
- Vizyon plizyè branch
- Rapò konsolide
- Pèfòmans ekip

---

## 📱 KOUMAN POU KONEKTE

### **Desktop Application**
1. Louvri aplikasyon desktop la
2. Antre email
3. Antre modpas
4. Klike "SE CONNECTER"
5. Dashboard ou pral louvri otomatikman

### **Web Application**
1. Ale nan http://localhost:3000
2. Antre email
3. Antre modpas
4. Klike "Login"
5. Dashboard ou pral louvri otomatikman

---

## 🎯 TEST LOGIN

### **Test 1: Login Caissier**
```powershell
Email: cashier@nalacredit.com
Modpas: Cashier123!
Rezilta Atandi: → Dashboard Caissier (ble)
```

### **Test 2: Login Secrétaire**
```powershell
Email: secretary@nalacredit.com
Modpas: Secretary123!
Rezilta Atandi: → Dashboard Secrétaire (teal)
```

### **Test 3: Login Agent Crédit**
```powershell
Email: creditagent@nalacredit.com
Modpas: Agent123!
Rezilta Atandi: → Dashboard Agent (mov)
```

### **Test 4: Login Chef Succursale**
```powershell
Email: branchmanager@nalacredit.com
Modpas: Manager123!
Rezilta Atandi: → Dashboard Chef (vèt)
```

### **Test 5: Login Superviseur**
```powershell
Email: supervisor@nalacredit.com
Modpas: Supervisor123!
Rezilta Atandi: → Dashboard Sipèvizè (pa finalze ankò)
```

### **Test 6: Login Admin**
```powershell
Email: admin@nalacredit.com
Modpas: Admin2025!
Rezilta Atandi: → Dashboard Admin (pa finalze ankò)
```

---

## 🔧 POU VERIFYE KONT YO

### **Metòd 1: Avèk API**
```powershell
# Login premye
$body = @{ 
    email = "admin@nalacredit.com"
    password = "Admin2025!" 
} | ConvertTo-Json

$response = Invoke-RestMethod `
    -Uri "http://localhost:7001/api/auth/login" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"

Write-Host "Token: $($response.token)"
Write-Host "User: $($response.user.email)"
Write-Host "Role: $($response.user.role)"
```

### **Metòd 2: Avèk PostgreSQL**
```sql
-- Konekte nan psql
psql -h localhost -U postgres -d nalakreditimachann_db

-- List tout kont yo
SELECT "Id", "Email", "FirstName", "LastName", "Role", "IsActive"
FROM "AspNetUsers"
ORDER BY "Role";

-- Konte kont yo
SELECT "Role", COUNT(*) as "Total"
FROM "AspNetUsers"
GROUP BY "Role"
ORDER BY "Role";
```

---

## 🛠️ POU KREYE PLI KONT

### **Kreye Yon Nouvo Kont Manyèlman**

1. **Konekte nan database:**
```powershell
psql -h localhost -U postgres -d nalakreditimachann_db
```

2. **Egzekite script SQL:**
```sql
INSERT INTO "AspNetUsers" 
("Id", "FirstName", "LastName", "Role", "BranchId", "IsActive", 
 "CreatedAt", "UserName", "NormalizedUserName", "Email", 
 "NormalizedEmail", "EmailConfirmed", "PasswordHash", 
 "SecurityStamp", "ConcurrencyStamp", "LockoutEnabled", 
 "AccessFailedCount")
VALUES 
('new-guid-here', 'Prenon', 'Non', 1, 1, true,
 NOW(), 'email@example.com', 'EMAIL@EXAMPLE.COM', 'email@example.com',
 'EMAIL@EXAMPLE.COM', true, 'password-hash-here',
 'security-stamp', 'concurrency-stamp', true, 0);
```

3. **Oswa itilize script C#:**
```powershell
cd "C:\Users\Administrator\Desktop\Kredi Ti Machann\Tools"
dotnet run --project CreateTestUsers.csproj
```

---

## 🎓 NON WÒL YO

### **Backend (PostgreSQL)**
| Role ID | Nom Backend | Nom Frontend |
|---------|-------------|--------------|
| 0 | Administrator | Administrateur |
| 1 | Cashier | Caissier |
| 2 | Secretary | Secrétaire |
| 3 | CreditAgent | Agent de Crédit |
| 4 | BranchSupervisor | Chef de Succursale |
| 5 | Supervisor | Superviseur |

### **Variasyon Non yo**
Sistèm lan aksepte plizyè variasyon:
- **Anglè**: Cashier, Secretary, CreditAgent, etc.
- **Franse**: Caissier, Secrétaire, Agent de Crédit, etc.
- **Sans Espace**: SecretaireAdministratif, AgentDeCredit, etc.

---

## ⚠️ SEKIRITE

### **Regleman Modpas**
- Minimoum 8 karaktè
- O mwen 1 lèt majiskil
- O mwen 1 chif
- O mwen 1 senbòl espesyal
- Pa itilize modpas senp tankou "123456"

### **Konsèy Sekirite**
1. ✅ Chanje modpas regilyèman
2. ✅ Pa pataje modpas ou avèk moun
3. ✅ Dekonekte apre chak sesyon
4. ✅ Pa ekri modpas sou papye
5. ✅ Itilize modpas diferan pou chak kont

---

## 📊 ESTATISTIK DATABASE

### **Kont Pa Wòl**
```
Administrateur:         1 kont
Caissier:              1 kont
Secrétaire:            1 kont
Agent de Crédit:       1 kont
Chef de Succursale:    1 kont
Superviseur:           2 kont
-------------------------
TOTAL:                 7 kont
```

### **Status Kont yo**
```
✅ Aktif:    7 kont (100%)
❌ Inaktif:  0 kont (0%)
```

---

## 🔄 AKSYON RAPID

### **Reset Tout Kont yo**
```powershell
cd "C:\Users\Administrator\Desktop\Kredi Ti Machann"
.\reset-database.ps1
```

### **Kreye Nouvo Kont Test**
```powershell
cd "C:\Users\Administrator\Desktop\Kredi Ti Machann\Tools"
dotnet run --project CreateTestUsers.csproj
```

### **Tcheke Kont yo**
```powershell
cd "C:\Users\Administrator\Desktop\Kredi Ti Machann"
.\check-accounts.ps1
```

---

## 📞 SIPÒ

Si ou genyen pwoblem:

1. **Modpas Bliye:**
   - Kontakte administratè
   - Oswa reset database ak script la

2. **Kont Pa Travay:**
   - Verifye backend ap kouri (Port 7001)
   - Tcheke database koneksyon
   - Verifye spelling email la

3. **Erè Login:**
   - Verifye email ak modpas kòrèk
   - Tcheke si backend ap kouri
   - Gade konsol pou mesaj erè

---

**Dat Dènye Modifikasyon:** $(Get-Date -Format "dd/MM/yyyy HH:mm")
**Vèsyon:** 2.2.0
**Status:** ✅ Tout Kont Operasyonèl

**N ap swiv ou toujou!** 💪
