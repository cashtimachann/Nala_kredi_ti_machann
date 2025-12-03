# 🧪 TEST DES ENDPOINTS - RAPPORTS PAR SUCCURSALE

Ce fichier contient des exemples de requêtes cURL pour tester tous les endpoints de rapports.

## Configuration

```bash
# Définir les variables
export API_URL="https://localhost:5001"
export TOKEN="votre_token_jwt_ici"
export BRANCH_ID="1"
```

## 1. Rapport Journalier - Ma Succursale

### Rapport d'aujourd'hui
```bash
curl -X GET "${API_URL}/api/BranchReport/my-branch/daily" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json"
```

### Rapport d'une date spécifique
```bash
curl -X GET "${API_URL}/api/BranchReport/my-branch/daily?date=2025-12-02" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json"
```

### Résultat attendu (200 OK)
```json
{
  "branchId": 1,
  "branchName": "Succursale Port-au-Prince",
  "reportDate": "2025-12-02T00:00:00Z",
  "creditsDisbursed": [...],
  "totalCreditsDisbursedHTG": 150000.00,
  "totalCreditsDisbursedUSD": 1000.00,
  "creditsDisbursedCount": 5,
  "paymentsReceived": [...],
  "totalPaymentsReceivedHTG": 85000.00,
  "totalPaymentsReceivedUSD": 500.00,
  "paymentsReceivedCount": 15,
  "deposits": [...],
  "totalDepositsHTG": 250000.00,
  "totalDepositsUSD": 2000.00,
  "depositsCount": 20,
  "withdrawals": [...],
  "totalWithdrawalsHTG": 120000.00,
  "totalWithdrawalsUSD": 800.00,
  "withdrawalsCount": 12,
  "cashBalance": {
    "openingBalanceHTG": 500000.00,
    "openingBalanceUSD": 5000.00,
    "closingBalanceHTG": 665000.00,
    "closingBalanceUSD": 6700.00,
    "netChangeHTG": 165000.00,
    "netChangeUSD": 1700.00
  },
  "totalTransactions": 52,
  "activeCashSessions": 0,
  "completedCashSessions": 5
}
```

---

## 2. Rapport Journalier - Par ID de Succursale

```bash
curl -X GET "${API_URL}/api/BranchReport/daily/${BRANCH_ID}?date=2025-12-02" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json"
```

---

## 3. Rapport Mensuel - Ma Succursale

### Mois actuel
```bash
curl -X GET "${API_URL}/api/BranchReport/my-branch/monthly" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json"
```

### Mois spécifique
```bash
curl -X GET "${API_URL}/api/BranchReport/my-branch/monthly?month=11&year=2025" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json"
```

### Résultat attendu (200 OK)
```json
{
  "branchId": 1,
  "branchName": "Succursale Port-au-Prince",
  "month": 11,
  "year": 2025,
  "totalCreditsDisbursedHTG": 4500000.00,
  "totalCreditsDisbursedUSD": 30000.00,
  "totalCreditsCount": 150,
  "totalPaymentsReceivedHTG": 2550000.00,
  "totalPaymentsReceivedUSD": 17000.00,
  "totalPaymentsCount": 450,
  "totalDepositsHTG": 7500000.00,
  "totalDepositsUSD": 60000.00,
  "totalDepositsCount": 600,
  "totalWithdrawalsHTG": 3600000.00,
  "totalWithdrawalsUSD": 24000.00,
  "totalWithdrawalsCount": 360,
  "newCustomers": 45,
  "activeLoans": 320,
  "portfolioAtRisk": 5.5,
  "collectionRate": 95.2,
  "dailyReports": [...]
}
```

---

## 4. Rapport Mensuel - Par ID de Succursale

```bash
curl -X GET "${API_URL}/api/BranchReport/monthly/${BRANCH_ID}?month=11&year=2025" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json"
```

---

## 5. Rapport Personnalisé

```bash
curl -X POST "${API_URL}/api/BranchReport/custom" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "branchId": 1,
    "startDate": "2025-11-15T00:00:00Z",
    "endDate": "2025-11-30T23:59:59Z",
    "includeDetails": true
  }'
```

### Avec jq pour formatter
```bash
curl -X POST "${API_URL}/api/BranchReport/custom" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "branchId": 1,
    "startDate": "2025-11-15",
    "endDate": "2025-11-30",
    "includeDetails": true
  }' | jq '.'
```

---

## 6. Comparaison de Performance

```bash
curl -X GET "${API_URL}/api/BranchReport/performance-comparison?startDate=2025-11-01&endDate=2025-11-30" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json"
```

### Résultat attendu (200 OK)
```json
{
  "startDate": "2025-11-01T00:00:00Z",
  "endDate": "2025-11-30T23:59:59Z",
  "branches": [
    {
      "branchId": 1,
      "branchName": "Succursale Port-au-Prince",
      "region": "Ouest",
      "totalDisbursementsHTG": 4500000.00,
      "totalDisbursementsUSD": 30000.00,
      "totalCollectionsHTG": 2550000.00,
      "totalCollectionsUSD": 17000.00,
      "collectionRate": 95.2,
      "portfolioAtRisk": 5.5,
      "numberOfActiveLoans": 320,
      "numberOfCustomers": 1250,
      "numberOfEmployees": 12,
      "rank": 1
    },
    {
      "branchId": 2,
      "branchName": "Succursale Cap-Haïtien",
      "region": "Nord",
      "totalDisbursementsHTG": 3200000.00,
      "totalDisbursementsUSD": 21000.00,
      "totalCollectionsHTG": 1800000.00,
      "totalCollectionsUSD": 12000.00,
      "collectionRate": 92.5,
      "portfolioAtRisk": 7.2,
      "numberOfActiveLoans": 245,
      "numberOfCustomers": 890,
      "numberOfEmployees": 8,
      "rank": 2
    }
  ]
}
```

---

## 7. Export CSV

```bash
curl -X GET "${API_URL}/api/BranchReport/export/daily/${BRANCH_ID}?date=2025-12-02" \
  -H "Authorization: Bearer ${TOKEN}" \
  -o "rapport_2025-12-02.csv"
```

### Vérifier le fichier téléchargé
```bash
cat rapport_2025-12-02.csv
```

---

## Tests d'Erreurs

### 1. Token invalide (401 Unauthorized)
```bash
curl -X GET "${API_URL}/api/BranchReport/my-branch/daily" \
  -H "Authorization: Bearer invalid_token" \
  -H "Content-Type: application/json"
```

**Résultat attendu:**
```json
{
  "message": "Unauthorized"
}
```

### 2. Succursale inexistante (404 Not Found)
```bash
curl -X GET "${API_URL}/api/BranchReport/daily/9999?date=2025-12-02" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json"
```

**Résultat attendu:**
```json
{
  "message": "Succursale avec ID 9999 introuvable"
}
```

### 3. Date de fin avant date de début (400 Bad Request)
```bash
curl -X POST "${API_URL}/api/BranchReport/custom" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "branchId": 1,
    "startDate": "2025-11-30",
    "endDate": "2025-11-15",
    "includeDetails": true
  }'
```

**Résultat attendu:**
```json
{
  "message": "La date de fin doit être après la date de début"
}
```

### 4. Permissions insuffisantes (403 Forbidden)
```bash
# Essayer d'accéder à la comparaison de performance avec un rôle Cashier
curl -X GET "${API_URL}/api/BranchReport/performance-comparison" \
  -H "Authorization: Bearer ${CASHIER_TOKEN}" \
  -H "Content-Type: application/json"
```

**Résultat attendu:**
```json
{
  "message": "Forbidden"
}
```

---

## Tests de Performance

### 1. Mesurer le temps de réponse
```bash
time curl -X GET "${API_URL}/api/BranchReport/my-branch/daily" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -o /dev/null -s
```

### 2. Test de charge (avec Apache Bench)
```bash
ab -n 100 -c 10 \
  -H "Authorization: Bearer ${TOKEN}" \
  "${API_URL}/api/BranchReport/my-branch/daily"
```

### 3. Test de charge (avec wrk)
```bash
wrk -t4 -c100 -d30s \
  -H "Authorization: Bearer ${TOKEN}" \
  "${API_URL}/api/BranchReport/my-branch/daily"
```

---

## Script de Test Complet

```bash
#!/bin/bash

# Configuration
API_URL="https://localhost:5001"
TOKEN="votre_token_jwt_ici"
BRANCH_ID="1"

echo "🧪 Test des endpoints de rapports"
echo "================================="

# Test 1: Rapport journalier
echo ""
echo "Test 1: Rapport journalier..."
curl -s -X GET "${API_URL}/api/BranchReport/my-branch/daily" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" | jq '.branchName, .totalTransactions'

# Test 2: Rapport mensuel
echo ""
echo "Test 2: Rapport mensuel..."
curl -s -X GET "${API_URL}/api/BranchReport/my-branch/monthly" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" | jq '.month, .year, .totalCreditsCount'

# Test 3: Rapport personnalisé
echo ""
echo "Test 3: Rapport personnalisé..."
curl -s -X POST "${API_URL}/api/BranchReport/custom" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "branchId": 1,
    "startDate": "2025-11-01",
    "endDate": "2025-11-30",
    "includeDetails": true
  }' | jq '.totalTransactions'

# Test 4: Comparaison de performance
echo ""
echo "Test 4: Comparaison de performance..."
curl -s -X GET "${API_URL}/api/BranchReport/performance-comparison?startDate=2025-11-01&endDate=2025-11-30" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" | jq '.branches | length'

# Test 5: Export CSV
echo ""
echo "Test 5: Export CSV..."
curl -s -X GET "${API_URL}/api/BranchReport/export/daily/${BRANCH_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -o "test_rapport.csv"
echo "Fichier exporté: test_rapport.csv"

echo ""
echo "✅ Tests terminés!"
```

### Exécuter le script
```bash
chmod +x test_reports.sh
./test_reports.sh
```

---

## Tests avec Postman

### Collection Postman

1. **Créer une nouvelle collection:** "Branch Reports"

2. **Configurer les variables:**
   - `base_url`: https://localhost:5001
   - `token`: votre_token_jwt
   - `branch_id`: 1

3. **Ajouter les requêtes:**

#### Request 1: Daily Report (My Branch)
- **Method:** GET
- **URL:** `{{base_url}}/api/BranchReport/my-branch/daily`
- **Headers:** 
  - Authorization: Bearer {{token}}
  - Content-Type: application/json

#### Request 2: Monthly Report (My Branch)
- **Method:** GET
- **URL:** `{{base_url}}/api/BranchReport/my-branch/monthly?month=11&year=2025`
- **Headers:** 
  - Authorization: Bearer {{token}}
  - Content-Type: application/json

#### Request 3: Custom Report
- **Method:** POST
- **URL:** `{{base_url}}/api/BranchReport/custom`
- **Headers:** 
  - Authorization: Bearer {{token}}
  - Content-Type: application/json
- **Body (raw JSON):**
```json
{
  "branchId": {{branch_id}},
  "startDate": "2025-11-01",
  "endDate": "2025-11-30",
  "includeDetails": true
}
```

#### Request 4: Performance Comparison
- **Method:** GET
- **URL:** `{{base_url}}/api/BranchReport/performance-comparison?startDate=2025-11-01&endDate=2025-11-30`
- **Headers:** 
  - Authorization: Bearer {{token}}
  - Content-Type: application/json

#### Request 5: Export CSV
- **Method:** GET
- **URL:** `{{base_url}}/api/BranchReport/export/daily/{{branch_id}}`
- **Headers:** 
  - Authorization: Bearer {{token}}

---

## Vérification des Résultats

### Vérifier la structure de réponse
```bash
curl -s -X GET "${API_URL}/api/BranchReport/my-branch/daily" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" | jq 'keys'
```

### Vérifier les totaux
```bash
curl -s -X GET "${API_URL}/api/BranchReport/my-branch/daily" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" | jq '{
    credits: .totalCreditsDisbursedHTG,
    payments: .totalPaymentsReceivedHTG,
    deposits: .totalDepositsHTG,
    withdrawals: .totalWithdrawalsHTG
  }'
```

### Vérifier le solde de caisse
```bash
curl -s -X GET "${API_URL}/api/BranchReport/my-branch/daily" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" | jq '.cashBalance'
```

---

## Notes

- Remplacer `${TOKEN}` par votre token JWT réel
- Remplacer `${BRANCH_ID}` par l'ID de votre succursale
- Pour HTTPS local, vous pourriez avoir besoin d'ajouter `-k` pour ignorer les certificats SSL
- Utiliser `jq` pour formater les réponses JSON (installer avec `brew install jq` sur macOS)

---

## Troubleshooting

### Problème: SSL Certificate Error
```bash
# Ajouter l'option -k pour ignorer les certificats SSL
curl -k -X GET "${API_URL}/api/BranchReport/my-branch/daily" ...
```

### Problème: Token Expired
```bash
# Se reconnecter pour obtenir un nouveau token
curl -X POST "${API_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "votre_username", "password": "votre_password"}'
```

### Problème: Connection Refused
```bash
# Vérifier que le serveur est en cours d'exécution
dotnet run --project backend/NalaCreditAPI
```
