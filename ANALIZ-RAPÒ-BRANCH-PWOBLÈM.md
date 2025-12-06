# 🔍 ANALIZ RAPÒ BRANCH - PWOBLÈM JENERE RAPÒ TRANSACTION

## 📋 REZIME PWOBLÈM

Paj `/reports/branch` (http://localhost:3000/reports/branch) pa ka jenere rapò transaction pou succursale yo.

---

## 🎯 SA M DEKOUVRI

### ✅ FRONTEND (React)

#### 1. **Konpòzan Prensipal**
- **Fichye**: `frontend-web/src/components/reports/BranchReportDashboard.tsx`
- **Route**: `/reports/branch` (nan `App.tsx` liy 356-370)
- **Props**: `userRole` ak `branchId` (opsyonèl)

#### 2. **Fonksyon Prensipal**
```typescript
// Load daily report
const loadDailyReport = async () => {
  if (!selectedBranchId && isSuperAdminOrDirector) {
    setError('Veuillez sélectionner une succursale');
    return;
  }
  
  setLoading(true);
  setError(null);
  try {
    let report: DailyBranchReportDto;
    if (selectedBranchId && isSuperAdminOrDirector) {
      // SuperAdmin/Director viewing specific branch
      report = await branchReportService.getDailyReportByBranch(selectedBranchId, selectedDate);
    } else {
      // Manager viewing their own branch
      report = await branchReportService.getMyBranchDailyReport(selectedDate);
    }
    setDailyReport(report);
  } catch (err: any) {
    setError(err.response?.data?.message || 'Erreur lors du chargement du rapport journalier');
    console.error('Error loading daily report:', err);
  } finally {
    setLoading(false);
  }
};
```

#### 3. **Sèvis API**
- **Fichye**: `frontend-web/src/services/branchReportService.ts`
- **Metòd yo**:
  - `getMyBranchDailyReport(date?)` → `GET /BranchReport/my-branch/daily`
  - `getDailyReportByBranch(branchId, date?)` → `GET /BranchReport/daily/{branchId}`
  - `getMyBranchMonthlyReport(month, year)` → `GET /BranchReport/my-branch/monthly`
  - `getMonthlyReportByBranch(branchId, month, year)` → `GET /BranchReport/monthly/{branchId}`

---

### ✅ BACKEND (.NET)

#### 1. **Controller**
- **Fichye**: `backend/NalaCreditAPI/Controllers/BranchReportController.cs`
- **Endpoints yo**:

```csharp
// Pour Manager/Supervisor - Propre succursale
[HttpGet("my-branch/daily")]
[Authorize(Roles = "Manager,BranchSupervisor,Cashier")]
public async Task<ActionResult<DailyBranchReportDto>> GetMyBranchDailyReport([FromQuery] DateTime? date)

[HttpGet("my-branch/monthly")]
[Authorize(Roles = "Manager,BranchSupervisor,Cashier")]
public async Task<ActionResult<MonthlyBranchReportDto>> GetMyBranchMonthlyReport([FromQuery] int? month, [FromQuery] int? year)

// Pour SuperAdmin/Director - N'importe quelle succursale
[HttpGet("daily/{branchId}")]
[Authorize(Roles = "Manager,BranchSupervisor,SuperAdmin,Director")]
public async Task<ActionResult<DailyBranchReportDto>> GetDailyReport(int branchId, [FromQuery] DateTime? date)

[HttpGet("monthly/{branchId}")]
[Authorize(Roles = "Manager,BranchSupervisor,SuperAdmin,Director")]
public async Task<ActionResult<MonthlyBranchReportDto>> GetMonthlyReport(int branchId, [FromQuery] int? month, [FromQuery] int? year)
```

#### 2. **Service**
- **Fichye**: `backend/NalaCreditAPI/Services/BranchReportService.cs`
- **Metòd prensipal**: `GenerateDailyReportAsync(int branchId, DateTime reportDate)`

**Sa sèvis la fè**:
1. ✅ Rekipere branch la nan database
2. ✅ Kolekte kredi debouse (Credits + MicrocreditLoans)
3. ✅ Kolekte peman resevwa (CreditPayments + MicrocreditPayments)
4. ✅ Kolekte depo ak retrè (Transactions, SavingsTransactions, TermSavingsTransactions, CurrentAccountTransactions)
5. ✅ Kalkile balans kès (CashSessions)
6. ✅ Ajoute transfè intè-branch (InterBranchTransfers)

---

## 🔴 PWOBLÈM POSIB YO

### 1. **Otantifikasyon/Otorisasyon**
- ❓ Token JWT pa gen claim `BranchId`
- ❓ Itilizatè pa gen bon wòl (Manager, BranchSupervisor, SuperAdmin, Director, Cashier)
- ❓ Token ekspire oswa envalid

### 2. **Konfigirasyon Backend**
- ❓ Backend pa rounan (Port 5001 oswa 5000)
- ❓ CORS pa konfigire pou aksepte `localhost:3000`
- ❓ SSL/HTTPS pwoblèm (si backend sou HTTPS)

### 3. **Done Database**
- ❓ Branch la pa egziste nan database
- ❓ Pa gen okenn transaction pou dat oswa branch seleksyone a
- ❓ Relasyon database pa byen konfigire

### 4. **Konfigirasyon Frontend**
- ❓ `REACT_APP_API_URL` pa byen konfigire nan `.env`
- ❓ Frontend pa ka konekte ak backend API a

### 5. **Pwoblèm Lojik**
- ❓ `userRole` oswa `branchId` pa pase kòrèkteman nan komponan an
- ❓ Kondisyon `isSuperAdminOrDirector` pa fonksyone byen

---

## 🛠️ SOLISYON YO

### A. **Verifye Backend**

#### 1. Konfime backend la rounan:
```bash
cd backend/NalaCreditAPI
dotnet run
```

Oswa tcheke si backend la deja rounan:
```bash
curl -k https://localhost:5001/api/health
# oswa
curl http://localhost:5000/api/health
```

#### 2. Tcheke log backend la pou wè erè yo:
```bash
# Nan terminal kote w te rounan dotnet run
```

---

### B. **Verifye Frontend Config**

#### 1. Tcheke `.env` file:
```bash
cd frontend-web
cat .env
```

Asire ou ke sa la egziste:
```env
REACT_APP_API_URL=https://localhost:5001/api
# oswa
REACT_APP_API_URL=http://localhost:5000/api
```

#### 2. Restart frontend:
```bash
npm start
```

---

### C. **Verifye Token JWT**

#### 1. Ouvè DevTools (F12) > Application/Storage > Local Storage
- Tcheke si `token` egziste
- Kopi token an

#### 2. Dekode token an sou https://jwt.io
- Verifye si gen claim `BranchId`
- Verifye si `role` gen youn nan: `Manager`, `BranchSupervisor`, `SuperAdmin`, `Director`, `Cashier`
- Tcheke dat ekspilasyon (`exp`)

---

### D. **Verifye Database**

#### 1. Konfime branch la egziste:
```sql
SELECT * FROM Branches WHERE Id = [YOUR_BRANCH_ID];
```

#### 2. Tcheke si gen transaction:
```sql
-- Transactions generales
SELECT COUNT(*) FROM Transactions WHERE BranchId = [YOUR_BRANCH_ID];

-- Credits
SELECT COUNT(*) FROM Credits c
INNER JOIN CurrentAccounts ca ON c.AccountId = ca.Id
WHERE ca.BranchId = [YOUR_BRANCH_ID];

-- Paiements
SELECT COUNT(*) FROM CreditPayments cp
INNER JOIN Credits c ON cp.CreditId = c.Id
INNER JOIN CurrentAccounts ca ON c.AccountId = ca.Id
WHERE ca.BranchId = [YOUR_BRANCH_ID];
```

---

### E. **Test Manual API yo**

#### 1. Test endpoint "my-branch/daily":
```bash
# Remplace [YOUR_TOKEN] ak token JWT ou
curl -X GET "https://localhost:5001/api/BranchReport/my-branch/daily" \
  -H "Authorization: Bearer [YOUR_TOKEN]" \
  -k
```

#### 2. Test endpoint pou yon branch espesifik:
```bash
curl -X GET "https://localhost:5001/api/BranchReport/daily/1?date=2025-12-06" \
  -H "Authorization: Bearer [YOUR_TOKEN]" \
  -k
```

---

### F. **Debug Frontend**

#### 1. Ajoute konsol log nan `BranchReportDashboard.tsx`:

```typescript
const loadDailyReport = async () => {
  console.log('🔍 Loading daily report...');
  console.log('Selected Branch ID:', selectedBranchId);
  console.log('Is SuperAdmin/Director:', isSuperAdminOrDirector);
  console.log('Selected Date:', selectedDate);
  
  if (!selectedBranchId && isSuperAdminOrDirector) {
    setError('Veuillez sélectionner une succursale');
    return;
  }
  
  setLoading(true);
  setError(null);
  try {
    let report: DailyBranchReportDto;
    if (selectedBranchId && isSuperAdminOrDirector) {
      console.log('📊 Calling getDailyReportByBranch...');
      report = await branchReportService.getDailyReportByBranch(selectedBranchId, selectedDate);
    } else {
      console.log('📊 Calling getMyBranchDailyReport...');
      report = await branchReportService.getMyBranchDailyReport(selectedDate);
    }
    console.log('✅ Report received:', report);
    setDailyReport(report);
  } catch (err: any) {
    console.error('❌ Error loading daily report:', err);
    console.error('Response data:', err.response?.data);
    console.error('Response status:', err.response?.status);
    setError(err.response?.data?.message || 'Erreur lors du chargement du rapport journalier');
  } finally {
    setLoading(false);
  }
};
```

#### 2. Gade konsol Browser la (F12 > Console) pandan w refresh paj la

---

### G. **Verifye CORS**

Si ou wè erè tankou "CORS policy", tcheke backend `Program.cs`:

```csharp
// Asire ou ke sa la egziste:
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
        policy => policy
            .WithOrigins("http://localhost:3000", "https://localhost:3000")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials());
});

// Epi anba:
app.UseCors("AllowFrontend");
```

---

## 📊 ETAP PA ETAP POU DEBUG

### Etap 1: Konfime Backend Rounan
```bash
cd backend/NalaCreditAPI
dotnet run
```

**Rezilta atann**: Backend dwe demarew san erè ak afiche URL yo (ex: `https://localhost:5001`)

---

### Etap 2: Konfime Frontend Konekte
```bash
cd frontend-web
npm start
```

**Rezilta atann**: Frontend dwe louvri sou `http://localhost:3000`

---

### Etap 3: Login ak Verifye Token
1. Konekte ak yon kont ki gen wòl `Manager`, `BranchSupervisor`, oswa `SuperAdmin`
2. Ouvè DevTools (F12) > Console
3. Tape: `localStorage.getItem('token')`
4. Kopi token an ak ale sou https://jwt.io
5. Konfime token an gen `BranchId` ak bon `role`

---

### Etap 4: Navige nan Reports Page
1. Ale sou `http://localhost:3000/reports/branch`
2. Ouvè DevTools > Console
3. Gade erè yo

---

### Etap 5: Tcheke Network Requests
1. Nan DevTools > Network tab
2. Refresh paj la
3. Gade request `my-branch/daily` oswa `daily/{branchId}`
4. Klike sou request la pou wè:
   - **Status**: 200 OK (siksè) oswa erè (400, 401, 404, 500)
   - **Response**: Done ki retounen oswa mesaj erè
   - **Headers**: Verifye Authorization header genyen token

---

### Etap 6: Tcheke Backend Logs
Gade nan terminal backend la si gen erè oswa log yo

---

## 🎯 KESYON POU MANDE

Pou m ka ede w pi byen, di m:

1. ✅ Backend la rounan? (Ki pò: 5000 oswa 5001?)
2. ✅ Ki mesaj erè w wè nan konsol frontend la?
3. ✅ Ki status HTTP w wè nan Network tab? (200, 401, 404, 500?)
4. ✅ Ki wòl kont ou a? (Manager, SuperAdmin, etc.)
5. ✅ Ou gen `branchId` nan token JWT ou?
6. ✅ Ki erè ou wè nan backend logs?

---

## 📁 DOSYE YO

### Frontend:
- **Konpòzan**: `frontend-web/src/components/reports/BranchReportDashboard.tsx`
- **Sèvis**: `frontend-web/src/services/branchReportService.ts`
- **Route**: `frontend-web/src/App.tsx` (liy 356-370)
- **Types**: `frontend-web/src/types/branchReports.ts`

### Backend:
- **Controller**: `backend/NalaCreditAPI/Controllers/BranchReportController.cs`
- **Service**: `backend/NalaCreditAPI/Services/BranchReportService.cs`
- **DTOs**: `backend/NalaCreditAPI/DTOs/` (BranchReportDtos.cs)

---

## 💡 SIJESYON RAPID

Si w pa wè reponse aprè tout sa, voye m:
1. Screenshot erè konsol la
2. Screenshot Network tab la (request/response)
3. Ekstè token JWT ou (pati payload la)
4. Backend logs (5-10 dènye liy)

Mwen pral ka ede w pi byen ak sa!
