# Guide Test API Mikwokredi

## 🧪 Lis Test Ki Rekòmande

### 1. Test Demand Kredi (Loan Application)

#### Test 1.1: Kreye Nouvo Demand Kredi
```http
POST https://localhost:5001/api/MicrocreditLoanApplication
Authorization: Bearer {token}
Content-Type: application/json

{
  "savingsAccountNumber": "001-123456-789",
  "loanType": "Commercial",
  "requestedAmount": 50000,
  "requestedDurationMonths": 12,
  "purpose": "Acheter marchandises pour commerce",
  "businessPlan": "Achat de marchandises sèches pour revente",
  "currency": "HTG",
  "branchId": 1,
  "monthlyIncome": 30000,
  "monthlyExpenses": 15000,
  "existingDebts": 0,
  "collateralValue": 60000,
  "guarantees": [
    {
      "type": "Collateral",
      "description": "Stock de marchandises",
      "value": 60000,
      "currency": "HTG"
    }
  ]
}
```

**Rezilta Atandi:**
- Status: 201 Created
- Response gen ID ak applicationNumber
- Status inisyal: Draft

#### Test 1.2: Soumèt Demand
```http
POST https://localhost:5001/api/MicrocreditLoanApplication/{id}/submit
Authorization: Bearer {token}
```

**Rezilta Atandi:**
- Status: 200 OK
- Status chanje: Draft → Submitted
- submittedAt rele

#### Test 1.3: Jwenn Tout Demand yo
```http
GET https://localhost:5001/api/MicrocreditLoanApplication?page=1&pageSize=10
Authorization: Bearer {token}
```

**Rezilta Atandi:**
- Status: 200 OK
- List demand yo ak pagination info

### 2. Test Peman (Payment)

#### Test 2.1: Kalkile Repartisyon Peman
```http
POST https://localhost:5001/api/MicrocreditPayment/calculate-allocation
Authorization: Bearer {token}
Content-Type: application/json

{
  "loanId": "{loan-guid}",
  "paymentAmount": 5000,
  "paymentDate": "2025-11-11"
}
```

**Rezilta Atandi:**
- Status: 200 OK
- Response gen principalAmount, interestAmount, penaltyAmount

#### Test 2.2: Anrejistre Peman
```http
POST https://localhost:5001/api/MicrocreditPayment
Authorization: Bearer {token}
Content-Type: application/json

{
  "loanId": "{loan-guid}",
  "paymentDate": "2025-11-11",
  "amount": 5000,
  "paymentMethod": "CASH",
  "notes": "Paiement mensuel novembre"
}
```

**Rezilta Atandi:**
- Status: 201 Created
- Response gen payment ID ak detay yo

#### Test 2.3: Jwenn Peman Yon Prè
```http
GET https://localhost:5001/api/MicrocreditPayment/loan/{loanId}
Authorization: Bearer {token}
```

**Rezilta Atandi:**
- Status: 200 OK
- List tout peman prè a

#### Test 2.4: Jenere Resè Peman
```http
GET https://localhost:5001/api/MicrocreditPayment/{paymentId}/receipt
Authorization: Bearer {token}
```

**Rezilta Atandi:**
- Status: 200 OK
- Response gen receiptNumber, customerName, amount, etc.

### 3. Test Branch

#### Test 3.1: Jwenn Tout Branch yo
```http
GET https://localhost:5001/api/Branch
Authorization: Bearer {token}
```

**Rezilta Atandi:**
- Status: 200 OK
- List branch yo ak detay yo (name, code, address, etc.)

#### Test 3.2: Jwenn Branch Pa ID
```http
GET https://localhost:5001/api/Branch/1
Authorization: Bearer {token}
```

**Rezilta Atandi:**
- Status: 200 OK
- Detay konplè branch la

### 4. Test Prè (Loan)

#### Test 4.1: Jwenn Prè Pa ID
```http
GET https://localhost:5001/api/MicrocreditLoan/{loanId}
Authorization: Bearer {token}
```

**Rezilta Atandi:**
- Status: 200 OK
- Detay konplè prè a

#### Test 4.2: Jwenn Kalendriye Peman
```http
GET https://localhost:5001/api/MicrocreditLoan/{loanId}/payment-schedule
Authorization: Bearer {token}
```

**Rezilta Atandi:**
- Status: 200 OK
- List tout dat peman yo ak montan yo

#### Test 4.3: Deboùse Prè
```http
POST https://localhost:5001/api/MicrocreditLoan/{loanId}/disburse
Authorization: Bearer {token}
Content-Type: application/json

{
  "disbursementDate": "2025-11-11",
  "notes": "Prêt déboursé en espèces"
}
```

**Rezilta Atandi:**
- Status: 200 OK
- Status prè chanje: Approved → Active
- disbursedAt rele

### 5. Test Dashboard

#### Test 5.1: Estatistik Dashboard
```http
GET https://localhost:5001/api/MicrocreditLoanApplication/dashboard/stats
Authorization: Bearer {token}
```

**Rezilta Atandi:**
- Status: 200 OK
- totalClients, activeLoans, totalOutstanding, repaymentRate, etc.

#### Test 5.2: Pèfòmans Ajan
```http
GET https://localhost:5001/api/MicrocreditLoanApplication/dashboard/agent-performance
Authorization: Bearer {token}
```

**Rezilta Atandi:**
- Status: 200 OK
- List ajan yo ak estatistik pèfòmans yo

## 🔐 Authentication

### Jwenn Token
```http
POST https://localhost:5001/api/Auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "Admin123!"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "userId": "...",
  "username": "admin",
  "role": "Admin",
  "expiresAt": "2025-11-12T..."
}
```

Kopi token an epi itilize li nan header:
```
Authorization: Bearer {token}
```

## ✅ Test Checklist

### Priority 1 - Critical Tests
- [ ] Kreye nouvo demand kredi
- [ ] Soumèt demand kredi
- [ ] Anrejistre peman
- [ ] Kalkile repartisyon peman
- [ ] Jwenn branch yo
- [ ] Jwenn prè ak detay li yo

### Priority 2 - Important Tests
- [ ] Apwouve demand kredi
- [ ] Rejte demand kredi
- [ ] Deboùse prè
- [ ] Jwenn kalendriye peman
- [ ] Jenere resè peman
- [ ] Jwenn estatistik dashboard

### Priority 3 - Optional Tests
- [ ] Konfime peman
- [ ] Anile peman
- [ ] Peman anvan lè
- [ ] Revize demand kredi
- [ ] Kalkile risk assessment
- [ ] Prè an reta

## 📝 Nòt Enpòtan

1. **Backend dwe ap travay:** Asire ke `dotnet run` ap travay nan folder `backend/NalaCreditAPI`
2. **Database dwe egziste:** Asire ke database `nalakredit` kreye ak tout tables yo
3. **Token valid:** Token expire apre yon tan, bezwen login ankò si li expire
4. **HTTPS:** Si w ap teste local, itilize `https://localhost:5001` (pa `http`)
5. **CORS:** Si w ap teste depi frontend, asire ke CORS konfigire kòrèkteman nan backend

## 🛠️ Zouti Test Rekòmande

1. **Postman** - Pi popilè pou test API
2. **Thunder Client** (VS Code extension) - Fasil pou itilize
3. **curl** - Command line tool
4. **Frontend la menm** - Test entegrasyon dirèk

## 🐛 Si Gen Erè

### Erè 401 Unauthorized
- Verifye ke w gen token valid
- Token ka expire, login ankò

### Erè 404 Not Found
- Verifye URL endpoint la
- Verifye ke ID prè/demand egziste

### Erè 500 Internal Server Error
- Gade log backend la pou wè detay yo
- Verifye ke database la ap travay
- Verifye ke tout migrations fèt

### Erè 400 Bad Request
- Verifye JSON payload la
- Verifye ke tout champs obligatwa yo antre
- Verifye ke valè yo valid (montant pozitif, etc.)

---

**Dènye Mizajou:** 11 Novanm 2025
**Vèsyon API:** v1.0
