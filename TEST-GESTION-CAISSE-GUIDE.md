# 🧪 Guide Test - Gestion Caisse Manager

## Prérequis

1. Backend dwe ap fonksyone: `dotnet run` nan `/backend/NalaCreditAPI`
2. Frontend dwe ap fonksyone: `npm start` nan `/frontend-web`
3. Ou dwe gen yon kont **BranchSupervisor** oswa **Admin**

## 🔧 Test Backend (API)

### 1. Test Endpoints Sesyon Kès

#### Jwenn Sesyon Aktif
```bash
# Remplace {branchId} ak ID branch ou
# Remplace {TOKEN} ak token JWT ou
curl -X GET "http://localhost:5000/api/cashsession/branch/1/active" \
  -H "Authorization: Bearer {TOKEN}"
```

**Rezilta atandi:**
```json
[
  {
    "id": 1,
    "userId": "kesye-123",
    "cashierName": "Marie Joseph",
    "openingBalanceHTG": 50000.00,
    "openingBalanceUSD": 500.00,
    "sessionStart": "2025-12-19T08:00:00Z",
    "durationMinutes": 120,
    "transactionCount": 15,
    "totalDepositHTG": 75000.00,
    "totalDepositUSD": 800.00,
    "totalWithdrawalHTG": 25000.00,
    "totalWithdrawalUSD": 200.00,
    "currentBalanceHTG": 100000.00,
    "currentBalanceUSD": 1100.00
  }
]
```

#### Jwenn Rezime Jounen an
```bash
curl -X GET "http://localhost:5000/api/cashsession/branch/1/today-summary" \
  -H "Authorization: Bearer {TOKEN}"
```

**Rezilta atandi:**
```json
{
  "date": "2025-12-19",
  "totalSessions": 5,
  "activeSessions": 3,
  "closedSessions": 2,
  "totalOpeningBalanceHTG": 250000.00,
  "totalOpeningBalanceUSD": 2500.00,
  "totalTransactions": 75,
  "totalDepositHTG": 375000.00,
  "totalDepositUSD": 4000.00,
  "totalWithdrawalHTG": 125000.00,
  "totalWithdrawalUSD": 1500.00
}
```

#### Jwenn Detay yon Sesyon
```bash
curl -X GET "http://localhost:5000/api/cashsession/1" \
  -H "Authorization: Bearer {TOKEN}"
```

#### Jwenn Tout Sesyon avèk Filtres
```bash
# Sesyon pou yon dat espesifik
curl -X GET "http://localhost:5000/api/cashsession/branch/1?startDate=2025-12-19&endDate=2025-12-19" \
  -H "Authorization: Bearer {TOKEN}"

# Sèlman sesyon fèmen
curl -X GET "http://localhost:5000/api/cashsession/branch/1?status=Closed" \
  -H "Authorization: Bearer {TOKEN}"

# Sesyon pou yon kesye espesifik
curl -X GET "http://localhost:5000/api/cashsession/branch/1?cashierId=kesye-123" \
  -H "Authorization: Bearer {TOKEN}"
```

### 2. Test Endpoints Tranzaksyon

#### Jwenn Istorik Tranzaksyon
```bash
curl -X GET "http://localhost:5000/api/transaction/branch/1/history?startDate=2025-12-19&endDate=2025-12-19&page=1&pageSize=50" \
  -H "Authorization: Bearer {TOKEN}"
```

**Rezilta atandi:**
```json
{
  "totalTransactions": 75,
  "page": 1,
  "pageSize": 50,
  "totalPages": 2,
  "transactions": [
    {
      "id": 1,
      "transactionNumber": "TRX-2025-001",
      "type": "Deposit",
      "currency": "HTG",
      "amount": 5000.00,
      "createdAt": "2025-12-19T10:30:00Z",
      "customer": "Jean Baptiste",
      "cashier": "Marie Joseph",
      "description": "Dépôt mensuel",
      "balanceAfter": 25000.00
    }
  ]
}
```

#### Filtre pa Tip Tranzaksyon
```bash
# Sèlman depo yo
curl -X GET "http://localhost:5000/api/transaction/branch/1/history?transactionType=Deposit" \
  -H "Authorization: Bearer {TOKEN}"

# Sèlman retrait yo
curl -X GET "http://localhost:5000/api/transaction/branch/1/history?transactionType=Withdrawal" \
  -H "Authorization: Bearer {TOKEN}"
```

## 🖥️ Test Frontend (Interface Utilisateur)

### 1. Koneksyon
1. Ouvè navigatè ou: `http://localhost:3000`
2. Konekte avèk yon kont BranchSupervisor
3. Ou dwe wè dashboard manager a

### 2. Test Tab "Vue d'ensemble"
✅ Verifye si ou wè:
- Estatistik jounen an (tranzaksyon, kliyan sèvi)
- Total Entrées (HTG + USD)
- Total Sorties (HTG + USD)
- Encours Total des Crédits
- Solde Total (HTG + USD)
- Dènye tranzaksyon yo

### 3. Test Tab "Gestion Caisse"

#### Verifye Rezime Jounen an:
✅ Tcheke si ou wè:
- Nonm Sessions Actives
- Nonm Sessions Fermées
- Total Sessions
- Nonm Transactions
- Solde HTG (ouverture, dépôts, retraits, fermeture)
- Solde USD (ouverture, dépôts, retraits, fermeture)

#### Verifye Kès Ouvè:
✅ Pou chak kès ouvè, tcheke:
- Non kesye a
- Lè sesyon an te ouvè
- Dire sesyon an (an èdtan ak minit)
- Nonm tranzaksyon
- Detay finansye HTG
- Detay finansye USD
- Bouton "Voir Détails"

#### Test Modal Detay:
1. Klike sou "Voir Détails" pou yon sesyon
2. ✅ Verifye si modal la montre:
   - Non kesye a ak branch la
   - Dat ak lè kòmansman
   - Dire sesyon an
   - Rezime finansye (depo, retrait, net) pou HTG ak USD
   - Lis konplè tranzaksyon yo
3. Klike sou X pou fèmen modal la

### 4. Test Tab "Historique Transactions"

#### Test Filtres:
1. **Filtre pa Dat**:
   - Chwazi yon dat kòmansman
   - Chwazi yon dat finisman
   - Klike "Actualiser"
   - ✅ Verifye si tranzaksyon yo filtre kòrèkteman

2. **Filtre pa Tip**:
   - Chwazi "Dépôt" nan dropdown la
   - Klike "Actualiser"
   - ✅ Verifye si sèlman depo yo parèt
   - Eseye avèk "Retrait", "Transfert", elatriye

3. **Rechèch**:
   - Tape yon nimewo tranzaksyon
   - ✅ Verifye si tranzaksyon an parèt
   - Eseye ak non kliyan
   - Eseye ak non kesye

#### Verifye Rezime Finansye:
✅ Tcheke si ou wè 3 kat:
- Dépôts (vèt) - HTG + USD
- Retraits (wouj) - HTG + USD
- Total Volume (ble) - HTG + USD

#### Test Tablo Tranzaksyon:
✅ Verifye kolòn yo:
- Date/Heure
- Numéro
- Type (avèk koulè)
- Client
- Caissier
- Montant (avèk devise)

#### Test Paginasyon:
1. Si gen plis pase 50 tranzaksyon:
   - ✅ Verifye si bouton "Suivant" ap fonksyone
   - ✅ Verifye si bouton "Précédent" ap fonksyone
   - ✅ Tcheke si total paj yo kòrèk

#### Test Ekspòtasyon CSV:
1. Klike sou "Exporter CSV"
2. ✅ Verifye si yon fichye CSV telechaje
3. Ouvè fichye a nan Excel
4. ✅ Verifye si done yo kòrèk

## 🐛 Test Kaz Erè

### Backend
1. **Aksè san otorizasyon**:
```bash
# San token
curl -X GET "http://localhost:5000/api/cashsession/branch/1/active"
# Atandi: 401 Unauthorized
```

2. **Branch ki pa egziste**:
```bash
curl -X GET "http://localhost:5000/api/cashsession/branch/9999/active" \
  -H "Authorization: Bearer {TOKEN}"
# Atandi: [] (lis vid)
```

### Frontend
1. **Pa gen kès ouvè**:
   - ✅ Verifye si mesaj "Aucune caisse ouverte actuellement" parèt

2. **Pa gen tranzaksyon**:
   - Filtre pou yon dat ki pa gen tranzaksyon
   - ✅ Verifye si mesaj "Aucune transaction trouvée" parèt

3. **Erè rezo**:
   - Fèmen backend la
   - Eseye aktyalize done yo
   - ✅ Verifye si yon mesaj erè parèt (toast)

## ✅ Checklist Test Konplè

### Backend API
- [ ] GET /api/cashsession/branch/{branchId}/active
- [ ] GET /api/cashsession/branch/{branchId}/today-summary
- [ ] GET /api/cashsession/{sessionId}
- [ ] GET /api/cashsession/branch/{branchId} (avèk filtres)
- [ ] GET /api/transaction/branch/{branchId}/history
- [ ] Filtres tranzaksyon (dat, tip, kesye)
- [ ] Paginasyon tranzaksyon

### Frontend UI
- [ ] Tab "Vue d'ensemble" afiche kòrèkteman
- [ ] Tab "Gestion Caisse" chaje done yo
- [ ] Rezime jounen an kòrèk
- [ ] Kès ouvè parèt ak detay yo
- [ ] Modal detay sesyon fonksyone
- [ ] Tab "Historique Transactions" chaje
- [ ] Filtres dat fonksyone
- [ ] Filtre tip tranzaksyon fonksyone
- [ ] Rechèch fonksyone
- [ ] Rezime finansye kòrèk
- [ ] Tablo tranzaksyon afiche byen
- [ ] Paginasyon fonksyone
- [ ] Ekspòtasyon CSV fonksyone
- [ ] Bouton "Actualiser" fonksyone
- [ ] Mesaj erè parèt lè gen pwoblèm

### Sekirite
- [ ] Sèlman manager ka aksede
- [ ] Token JWT obligatwa
- [ ] Pa ka wè branch ki pa pou ou

## 📊 Ekzanp Done Test

Si ou bezwen kreye done test, ou ka itilize endpoint ouvri/fèmen kès:

```bash
# Ouvè yon kès
curl -X POST "http://localhost:5000/api/transaction/cash-session/open" \
  -H "Authorization: Bearer {CASHIER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "openingBalanceHTG": 50000.00,
    "openingBalanceUSD": 500.00
  }'

# Fèmen yon kès
curl -X POST "http://localhost:5000/api/transaction/cash-session/close" \
  -H "Authorization: Bearer {CASHIER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "closingBalanceHTG": 75000.00,
    "closingBalanceUSD": 800.00,
    "notes": "Journée normale"
  }'
```

---

**Bon Test!** 🚀
