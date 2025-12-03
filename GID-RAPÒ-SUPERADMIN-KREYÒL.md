# 🔐 GID RAPÒ SUPERADMIN - KONTWÒL TOTAL SIKISYAL YO

## Apèsi Jeneral

SuperAdmin yo gen aksè konplè ak tout tranzaksyon nan tout sikisyal yo. Sistèm sa a pèmèt:

- ✅ Wè tout aktivite nan tout sikisyal yo
- ✅ Jwenn rapò konsolide (tout sikisyal ansanm)
- ✅ Fè odit tranzaksyon ak filtr
- ✅ Resevwa alèt pou anomali
- ✅ Konpare pèfòmans ant sikisyal yo
- ✅ Swiv estatistik an tan reyèl

---

## 📊 Endpoints pou SuperAdmin

### 1. Rapò Konsolide - Tout Sikisyal Ansanm

**GET** `/api/BranchReport/superadmin/consolidated`

Rapò konsolide ki montre tout sikisyal yo nan yon sèl rapò.

**Paramèt:**
- `startDate` (opsyonèl): Dat kòmansman (pa defo: jodi a)
- `endDate` (opsyonèl): Dat fen (pa defo: demen)

**Wòl:** SuperAdmin, Director

**Egzanp:**
```bash
GET /api/BranchReport/superadmin/consolidated?startDate=2025-12-02&endDate=2025-12-03
Authorization: Bearer {token}
```

**Repons:**
```json
{
  "reportDate": "2025-12-02T15:30:00Z",
  "startDate": "2025-12-02T00:00:00Z",
  "endDate": "2025-12-03T00:00:00Z",
  
  "totalCreditsDisbursedHTG": 12500000.00,
  "totalCreditsDisbursedUSD": 85000.00,
  "totalCreditsDisbursedCount": 450,
  
  "totalPaymentsReceivedHTG": 7650000.00,
  "totalPaymentsReceivedUSD": 51000.00,
  "totalPaymentsReceivedCount": 1350,
  
  "totalDepositsHTG": 22500000.00,
  "totalDepositsUSD": 180000.00,
  "totalDepositsCount": 1800,
  
  "totalWithdrawalsHTG": 10800000.00,
  "totalWithdrawalsUSD": 72000.00,
  "totalWithdrawalsCount": 1080,
  
  "totalCashBalanceHTG": 15000000.00,
  "totalCashBalanceUSD": 120000.00,
  
  "totalBranches": 8,
  "totalActiveCustomers": 12500,
  "totalActiveLoans": 3200,
  "totalEmployees": 96,
  
  "globalPortfolioAtRisk": 6.5,
  "globalCollectionRate": 94.8,
  
  "branchReports": [
    {
      "branchId": 1,
      "branchName": "Succursale Port-au-Prince",
      // ... rapò konplè sikisyal la
    },
    {
      "branchId": 2,
      "branchName": "Succursale Cap-Haïtien",
      // ... rapò konplè sikisyal la
    }
  ],
  
  "topPerformers": [
    {
      "branchId": 1,
      "branchName": "Succursale Port-au-Prince",
      "region": "Ouest",
      "totalCollectionsHTG": 2550000.00,
      "collectionRate": 96.2,
      "portfolioAtRisk": 4.5,
      "rank": 1
    }
  ],
  
  "alerts": [
    {
      "branchId": 5,
      "branchName": "Succursale Gonaïves",
      "alertType": "PAR_HIGH",
      "severity": "CRITICAL",
      "message": "Portfolio at Risk très élevé: 18.50%",
      "value": 18.5,
      "threshold": 15,
      "detectedAt": "2025-12-02T15:30:00Z"
    }
  ]
}
```

---

### 2. Odit Tranzaksyon - Rechèch Avanse

**GET** `/api/BranchReport/superadmin/transaction-audit`

Fè odit tout tranzaksyon yo ak filtr detaye.

**Paramèt:**
- `startDate` (opsyonèl): Dat kòmansman (pa defo: 7 jou pase)
- `endDate` (opsyonèl): Dat fen (pa defo: demen)
- `branchId` (opsyonèl): Filtre pa sikisyal
- `transactionType` (opsyonèl): Tip tranzaksyon (Deposit, Withdrawal, etc.)
- `userId` (opsyonèl): Filtre pa itilizatè/kesye

**Wòl:** SuperAdmin, Director

**Egzanp:**
```bash
# Tout tranzaksyon nan sikisyal 1 pou jodi a
GET /api/BranchReport/superadmin/transaction-audit?branchId=1&startDate=2025-12-02&endDate=2025-12-03
Authorization: Bearer {token}

# Sèlman depo yo fèt pa yon kesye espesifik
GET /api/BranchReport/superadmin/transaction-audit?transactionType=Deposit&userId=user-123
Authorization: Bearer {token}
```

**Repons:**
```json
{
  "startDate": "2025-12-02T00:00:00Z",
  "endDate": "2025-12-03T00:00:00Z",
  "branchId": 1,
  "transactionType": null,
  "userId": null,
  "totalTransactions": 145,
  "totalAmountHTG": 5650000.00,
  "totalAmountUSD": 38000.00,
  
  "transactions": [
    {
      "transactionId": 78901,
      "transactionNumber": "TRX-2025-78901",
      "transactionType": "Deposit",
      "branchId": 1,
      "branchName": "Succursale Port-au-Prince",
      "userId": "user-123",
      "userName": "Jean Caissier",
      "userRole": "Cashier",
      "customerName": "Marie Claire Dupont",
      "accountNumber": "ACC-001234",
      "amount": 25000.00,
      "currency": "HTG",
      "status": "Completed",
      "transactionDate": "2025-12-02T09:15:30Z",
      "description": "Dépôt compte épargne",
      "reference": "REF-12345",
      "cashSessionId": 45,
      "cashierName": "Jean Caissier"
    }
    // ... lòt tranzaksyon yo (maks 1000)
  ]
}
```

---

### 3. Estatistik Dashboard - Tan Reyèl

**GET** `/api/BranchReport/superadmin/dashboard-stats`

Estatistik an tan reyèl pou dashboard SuperAdmin.

**Wòl:** SuperAdmin, Director

**Egzanp:**
```bash
GET /api/BranchReport/superadmin/dashboard-stats
Authorization: Bearer {token}
```

**Repons:**
```json
{
  "asOfDate": "2025-12-02T15:30:00Z",
  
  "todayDisbursementsHTG": 1850000.00,
  "todayDisbursementsUSD": 12500.00,
  "todayCollectionsHTG": 1125000.00,
  "todayCollectionsUSD": 7500.00,
  "todayTransactionsCount": 456,
  
  "monthToDateDisbursementsHTG": 12500000.00,
  "monthToDateDisbursementsUSD": 85000.00,
  "monthToDateCollectionsHTG": 7650000.00,
  "monthToDateCollectionsUSD": 51000.00,
  
  "totalOutstandingPortfolioHTG": 45000000.00,
  "totalOutstandingPortfolioUSD": 300000.00,
  "totalActiveLoans": 3200,
  "globalPAR": 6.5,
  
  "activeBranches": 8,
  "activeCashSessions": 12,
  
  "topBranches": [
    {
      "branchId": 1,
      "branchName": "Port-au-Prince",
      "todayCollections": 385000.00,
      "todayTransactions": 125,
      "collectionRate": 96.2,
      "par": 4.5,
      "status": "EXCELLENT"
    },
    {
      "branchId": 2,
      "branchName": "Cap-Haïtien",
      "todayCollections": 275000.00,
      "todayTransactions": 89,
      "collectionRate": 94.1,
      "par": 6.8,
      "status": "GOOD"
    }
  ],
  
  "criticalAlerts": 2,
  "highAlerts": 5,
  "mediumAlerts": 8
}
```

---

### 4. Vi Ansanm Tout Sikisyal Yo

**GET** `/api/BranchReport/superadmin/all-branches-overview`

Jwenn yon vi rapid sou pèfòmans tout sikisyal yo.

**Paramèt:**
- `date` (opsyonèl): Dat rapò a (pa defo: jodi a)

**Wòl:** SuperAdmin, Director

**Egzanp:**
```bash
GET /api/BranchReport/superadmin/all-branches-overview?date=2025-12-02
Authorization: Bearer {token}
```

**Repons:**
```json
{
  "startDate": "2025-12-02T00:00:00Z",
  "endDate": "2025-12-03T00:00:00Z",
  "branches": [
    {
      "branchId": 1,
      "branchName": "Port-au-Prince",
      "region": "Ouest",
      "totalDisbursementsHTG": 3200000.00,
      "totalDisbursementsUSD": 21500.00,
      "totalCollectionsHTG": 1950000.00,
      "totalCollectionsUSD": 13000.00,
      "collectionRate": 96.2,
      "portfolioAtRisk": 4.5,
      "numberOfActiveLoans": 850,
      "numberOfCustomers": 3200,
      "numberOfEmployees": 18,
      "rank": 1
    }
    // ... tout lòt sikisyal yo
  ]
}
```

---

### 5. Rechèch Avanse Tranzaksyon

**POST** `/api/BranchReport/superadmin/search-transactions`

Rechèch tranzaksyon ak plizyè filtr.

**Wòl:** SuperAdmin, Director

**Body:**
```json
{
  "startDate": "2025-11-01T00:00:00Z",
  "endDate": "2025-12-01T00:00:00Z",
  "branchId": 1,
  "transactionType": "Withdrawal",
  "userId": "user-123",
  "minAmount": 5000.00,
  "maxAmount": 50000.00
}
```

**Egzanp:**
```bash
POST /api/BranchReport/superadmin/search-transactions
Authorization: Bearer {token}
Content-Type: application/json

{
  "startDate": "2025-12-01",
  "endDate": "2025-12-02",
  "branchId": 1,
  "transactionType": "Deposit"
}
```

---

## 🚨 Tip Alèt

Sistèm nan jenere alèt otomatikman pou:

### 1. PAR Twò Wo (Portfolio at Risk)
- **CRITICAL**: PAR > 15%
- **HIGH**: PAR > 10%
- **Message**: "Portfolio at Risk très élevé: X%"

### 2. To Rekipyerasyon Ba
- **CRITICAL**: To < 75%
- **HIGH**: To < 85%
- **Message**: "Taux de recouvrement bas: X%"

### 3. Pwoblèm Kès
- **MEDIUM**: Plis pase 5 sesyon kès louvri
- **Message**: "Nombre élevé de sessions de caisse ouvertes: X"

---

## 📈 Endikatè Kle (KPI)

### KPI Global
- **PAR Global**: < 5% = EXCELLENT, 5-10% = BON, 10-15% = ATANSYON, >15% = KRITIK
- **To Rekipyerasyon**: > 95% = EXCELLENT, 90-95% = BON, 85-90% = ATANSYON, <85% = KRITIK

### KPI pa Sikisyal
- **Status Sikisyal**:
  - EXCELLENT: PAR < 5%, To > 95%
  - GOOD: PAR < 10%, To > 90%
  - WARNING: PAR < 15%, To > 85%
  - CRITICAL: PAR > 15% oswa To < 85%

---

## 🔍 Egzanp Itilizasyon

### 1. Verifye Pèfòmans Jounen an

```bash
# Jwenn estatistik jounen an
curl -X GET "https://localhost:5001/api/BranchReport/superadmin/dashboard-stats" \
  -H "Authorization: Bearer ${TOKEN}" \
  -k | jq '.'
```

### 2. Fè Odit Tranzaksyon Yon Sikisyal

```bash
# Tout tranzaksyon sikisyal 2 pou semèn ki pase
curl -X GET "https://localhost:5001/api/BranchReport/superadmin/transaction-audit?branchId=2&startDate=2025-11-25&endDate=2025-12-02" \
  -H "Authorization: Bearer ${TOKEN}" \
  -k | jq '.transactions | length'
```

### 3. Jwenn Rapò Konsolide

```bash
# Rapò tout sikisyal yo pou jodi a
curl -X GET "https://localhost:5001/api/BranchReport/superadmin/consolidated?startDate=2025-12-02&endDate=2025-12-03" \
  -H "Authorization: Bearer ${TOKEN}" \
  -k | jq '.totalBranches, .globalPAR, .globalCollectionRate'
```

### 4. Idantifye Sikisyal ak Pwoblèm

```bash
# Jwenn alèt yo
curl -X GET "https://localhost:5001/api/BranchReport/superadmin/consolidated" \
  -H "Authorization: Bearer ${TOKEN}" \
  -k | jq '.alerts[] | select(.severity == "CRITICAL")'
```

### 5. Rechèch Tranzaksyon Espesifik

```bash
# Tout retrè plis pase 10000 HTG
curl -X POST "https://localhost:5001/api/BranchReport/superadmin/search-transactions" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2025-12-01",
    "endDate": "2025-12-02",
    "transactionType": "Withdrawal",
    "minAmount": 10000
  }' \
  -k | jq '.transactions[] | {number: .transactionNumber, amount: .amount, customer: .customerName}'
```

---

## 💡 Ka Itilizasyon

### Ka 1: Detekte Fwòd

```bash
# Rechèch tranzaksyon anòmal nan yon peryòd
POST /api/BranchReport/superadmin/search-transactions
{
  "startDate": "2025-12-01",
  "endDate": "2025-12-02",
  "minAmount": 50000,  // Montan wo
  "userId": "user-suspect"
}
```

### Ka 2: Evalyasyon Pèfòmans Kesye

```bash
# Tout tranzaksyon yon kesye fè
GET /api/BranchReport/superadmin/transaction-audit?userId=cashier-123&startDate=2025-12-01&endDate=2025-12-02
```

### Ka 3: Kontwòl Konbyen Lajan ki nan Sikisyal

```bash
# Rapò konsolide pou wè balans tout sikisyal yo
GET /api/BranchReport/superadmin/consolidated?startDate=2025-12-02
# Gade totalCashBalanceHTG, totalCashBalanceUSD
```

### Ka 4: Idantifye Sikisyal ki Bezwen Èd

```bash
# Gade alèt yo
GET /api/BranchReport/superadmin/dashboard-stats
# Tcheke criticalAlerts, highAlerts
```

### Ka 5: Konpare Rejyon

```bash
# Jwenn pèfòmans tout sikisyal yo
GET /api/BranchReport/superadmin/all-branches-overview
# Gwupe pa rejyon epi konpare
```

---

## 🔐 Sekirite

### Aksè Limite

Sèl wòl sa yo ka itilize endpoints SuperAdmin:
- ✅ **SuperAdmin**: Aksè konplè
- ✅ **Director**: Aksè konplè
- ❌ Tout lòt wòl: Pa gen aksè

### Odit

Tout aksyon SuperAdmin yo anrejistre:
- Ki moun ki fè demann nan
- Kilè yo te fè li
- Ki done yo te aksede
- Filtr yo te itilize

---

## 📊 Limit

- **Tranzaksyon**: Maksimòm 1000 tranzaksyon pa demann
- **Peryòd**: Rekòmande pa plis pase 30 jou pou pèfòmans
- **Rapò Konsolide**: Ka pran kèk segond si gen anpil sikisyal

---

## 🎯 Rekòmandasyon

### Chak Jounen
1. Tcheke dashboard stats (`/dashboard-stats`)
2. Verifye alèt kritik yo
3. Gade top 5 sikisyal yo

### Chak Semèn
1. Fè rapò konsolide pou tout semèn nan
2. Konpare pèfòmans ant sikisyal yo
3. Idantifye tendans

### Chak Mwa
1. Analiz PAR global
2. Evalye to rekipyerasyon
3. Fè rapò pou direksyon an

---

## 📞 Sipò

Pou kesyon oswa pwoblèm, kontakte ekip teknik la.

**Bon jesyon! 🚀**
