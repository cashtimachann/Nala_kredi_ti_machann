# GUIDE COMPLET - RAPPORTS PAR SUCCURSALE

## Vue d'ensemble

Le système de rapports par succursale permet aux gestionnaires de suivre toutes les activités financières de leur succursale en temps réel. Les rapports incluent les crédits décaissés, paiements reçus, dépôts, retraits, soldes de caisse et transferts inter-succursales.

---

## Endpoints API

### 1. Rapport Journalier - Ma Succursale

**GET** `/api/BranchReport/my-branch/daily`

Permet au gestionnaire connecté de voir le rapport de sa propre succursale.

**Paramètres:**
- `date` (optionnel): Date du rapport (format: YYYY-MM-DD)
  - Par défaut: aujourd'hui

**Rôles autorisés:** Manager, BranchSupervisor, Cashier

**Exemple de requête:**
```bash
GET /api/BranchReport/my-branch/daily?date=2025-12-02
Authorization: Bearer {token}
```

**Exemple de réponse:**
```json
{
  "branchId": 1,
  "branchName": "Succursale Port-au-Prince",
  "reportDate": "2025-12-02T00:00:00Z",
  "creditsDisbursed": [
    {
      "creditId": 123,
      "creditNumber": "CRED-2025-123",
      "customerName": "Jean Baptiste",
      "accountNumber": "ACC-001234",
      "amount": 50000.00,
      "currency": "HTG",
      "disbursementDate": "2025-12-02T10:30:00Z",
      "termWeeks": 12,
      "interestRate": 15.00
    }
  ],
  "totalCreditsDisbursedHTG": 150000.00,
  "totalCreditsDisbursedUSD": 1000.00,
  "creditsDisbursedCount": 5,
  "paymentsReceived": [
    {
      "paymentId": 456,
      "creditNumber": "CRED-2025-100",
      "customerName": "Marie Claire",
      "amount": 5000.00,
      "principalPaid": 4000.00,
      "interestPaid": 1000.00,
      "penaltyPaid": 0.00,
      "currency": "HTG",
      "paymentDate": "2025-12-02T11:00:00Z"
    }
  ],
  "totalPaymentsReceivedHTG": 85000.00,
  "totalPaymentsReceivedUSD": 500.00,
  "paymentsReceivedCount": 15,
  "deposits": [
    {
      "transactionId": 789,
      "transactionNumber": "TRX-2025-789",
      "accountNumber": "ACC-002345",
      "customerName": "Paul Moreau",
      "amount": 10000.00,
      "currency": "HTG",
      "type": "Deposit",
      "transactionDate": "2025-12-02T09:15:00Z",
      "processedBy": "Cashier Name"
    }
  ],
  "totalDepositsHTG": 250000.00,
  "totalDepositsUSD": 2000.00,
  "depositsCount": 20,
  "withdrawals": [
    {
      "transactionId": 790,
      "transactionNumber": "TRX-2025-790",
      "accountNumber": "ACC-003456",
      "customerName": "Sophie Laurent",
      "amount": 5000.00,
      "currency": "HTG",
      "type": "Withdrawal",
      "transactionDate": "2025-12-02T14:30:00Z",
      "processedBy": "Cashier Name"
    }
  ],
  "totalWithdrawalsHTG": 120000.00,
  "totalWithdrawalsUSD": 800.00,
  "withdrawalsCount": 12,
  "cashBalance": {
    "openingBalanceHTG": 500000.00,
    "openingBalanceUSD": 5000.00,
    "closingBalanceHTG": 665000.00,
    "closingBalanceUSD": 6700.00,
    "netChangeHTG": 165000.00,
    "netChangeUSD": 1700.00,
    "cashSessions": [
      {
        "sessionId": 10,
        "cashierName": "Jean Caissier",
        "openingBalanceHTG": 100000.00,
        "openingBalanceUSD": 1000.00,
        "closingBalanceHTG": 133000.00,
        "closingBalanceUSD": 1340.00,
        "openedAt": "2025-12-02T08:00:00Z",
        "closedAt": "2025-12-02T17:00:00Z",
        "status": "Closed"
      }
    ]
  },
  "interBranchTransfers": [
    {
      "transferId": 25,
      "transferNumber": "IBT-2025-025",
      "sourceBranch": "Succursale Port-au-Prince",
      "destinationBranch": "Succursale Cap-Haïtien",
      "amount": 100000.00,
      "currency": "HTG",
      "transferDate": "2025-12-02T12:00:00Z",
      "status": "Completed",
      "initiatedBy": "Manager Name"
    }
  ],
  "totalTransfersOutHTG": 100000.00,
  "totalTransfersOutUSD": 0.00,
  "totalTransfersInHTG": 0.00,
  "totalTransfersInUSD": 0.00,
  "totalTransactions": 52,
  "activeCashSessions": 0,
  "completedCashSessions": 5
}
```

---

### 2. Rapport Journalier - Par ID de Succursale

**GET** `/api/BranchReport/daily/{branchId}`

Pour les administrateurs qui veulent consulter le rapport d'une succursale spécifique.

**Paramètres:**
- `branchId` (requis): ID de la succursale
- `date` (optionnel): Date du rapport

**Rôles autorisés:** Manager, BranchSupervisor, SuperAdmin, Director

**Exemple:**
```bash
GET /api/BranchReport/daily/1?date=2025-12-02
Authorization: Bearer {token}
```

---

### 3. Rapport Mensuel - Ma Succursale

**GET** `/api/BranchReport/my-branch/monthly`

Génère un rapport mensuel complet avec tous les rapports journaliers et statistiques agrégées.

**Paramètres:**
- `month` (optionnel): Mois (1-12, par défaut: mois actuel)
- `year` (optionnel): Année (par défaut: année actuelle)

**Rôles autorisés:** Manager, BranchSupervisor

**Exemple:**
```bash
GET /api/BranchReport/my-branch/monthly?month=11&year=2025
Authorization: Bearer {token}
```

**Exemple de réponse:**
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
  "dailyReports": [
    // ... 30 rapports journaliers
  ]
}
```

---

### 4. Rapport Mensuel - Par ID de Succursale

**GET** `/api/BranchReport/monthly/{branchId}`

**Paramètres:**
- `branchId` (requis): ID de la succursale
- `month` (optionnel): Mois (1-12)
- `year` (optionnel): Année

**Rôles autorisés:** Manager, BranchSupervisor, SuperAdmin, Director

**Exemple:**
```bash
GET /api/BranchReport/monthly/1?month=11&year=2025
Authorization: Bearer {token}
```

---

### 5. Rapport Personnalisé

**POST** `/api/BranchReport/custom`

Génère un rapport pour une période personnalisée.

**Rôles autorisés:** Manager, BranchSupervisor, SuperAdmin, Director

**Body de la requête:**
```json
{
  "branchId": 1,
  "startDate": "2025-11-15T00:00:00Z",
  "endDate": "2025-11-30T23:59:59Z",
  "includeDetails": true
}
```

**Exemple:**
```bash
POST /api/BranchReport/custom
Authorization: Bearer {token}
Content-Type: application/json

{
  "branchId": 1,
  "startDate": "2025-11-15",
  "endDate": "2025-11-30",
  "includeDetails": true
}
```

---

### 6. Comparaison de Performance entre Succursales

**GET** `/api/BranchReport/performance-comparison`

Compare la performance de toutes les succursales avec classement.

**Paramètres:**
- `startDate` (optionnel): Date de début (par défaut: il y a 1 mois)
- `endDate` (optionnel): Date de fin (par défaut: aujourd'hui)

**Rôles autorisés:** SuperAdmin, Director

**Exemple:**
```bash
GET /api/BranchReport/performance-comparison?startDate=2025-11-01&endDate=2025-11-30
Authorization: Bearer {token}
```

**Exemple de réponse:**
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

### 7. Export CSV

**GET** `/api/BranchReport/export/daily/{branchId}`

Exporte un rapport journalier au format CSV.

**Paramètres:**
- `branchId` (requis): ID de la succursale
- `date` (optionnel): Date du rapport

**Rôles autorisés:** Manager, BranchSupervisor, SuperAdmin, Director

**Exemple:**
```bash
GET /api/BranchReport/export/daily/1?date=2025-12-02
Authorization: Bearer {token}
```

**Résultat:** Téléchargement d'un fichier CSV nommé `rapport_journalier_Succursale_Port-au-Prince_2025-12-02.csv`

---

## Métriques Calculées

### 1. Solde de Caisse

Le solde de caisse est calculé en agrégeant toutes les sessions de caisse de la journée:

```
Solde d'ouverture = Somme des soldes d'ouverture de toutes les sessions
Solde de fermeture = Somme des soldes de fermeture de toutes les sessions
Variation nette = Solde de fermeture - Solde d'ouverture
```

### 2. Portfolio at Risk (PAR)

Pourcentage du portefeuille en situation de risque:

```
PAR = (Solde des prêts en retard > 30 jours / Solde total du portefeuille) × 100
```

Un PAR inférieur à 5% est considéré comme excellent.
Entre 5% et 10% est acceptable.
Au-dessus de 10% nécessite une action immédiate.

### 3. Taux de Recouvrement

Pourcentage des paiements attendus qui ont été effectivement collectés:

```
Taux de recouvrement = (Paiements reçus / Paiements attendus) × 100
```

Un taux supérieur à 95% est considéré comme excellent.

---

## Utilisation Pratique

### Rapport du Matin (Chef de Succursale)

Chaque matin, le chef de succursale devrait:

1. **Consulter le rapport de la veille:**
```bash
GET /api/BranchReport/my-branch/daily?date=2025-12-01
```

2. **Vérifier les indicateurs clés:**
   - Nombre de crédits décaissés
   - Montant total des collections
   - Solde de caisse
   - Nombre de transactions

3. **Identifier les anomalies:**
   - Écarts importants dans les soldes de caisse
   - Taux de recouvrement anormalement bas
   - Nombre inhabituel de transactions

### Rapport de Fin de Mois (Direction)

À la fin du mois, la direction devrait:

1. **Générer les rapports mensuels pour toutes les succursales**
2. **Comparer les performances:**
```bash
GET /api/BranchReport/performance-comparison?startDate=2025-11-01&endDate=2025-11-30
```

3. **Analyser:**
   - Succursales les plus performantes
   - Succursales nécessitant un soutien
   - Tendances globales

### Audit et Conformité

Pour les audits:

1. **Générer un rapport personnalisé pour la période d'audit:**
```bash
POST /api/BranchReport/custom
{
  "branchId": 1,
  "startDate": "2025-10-01",
  "endDate": "2025-10-31",
  "includeDetails": true
}
```

2. **Exporter en CSV pour analyse:**
```bash
GET /api/BranchReport/export/daily/1?date=2025-10-15
```

---

## Indicateurs de Performance (KPI)

Les rapports incluent automatiquement les KPI suivants:

### KPI Opérationnels
- **Nombre de transactions par jour**
- **Montant moyen des transactions**
- **Nombre de sessions de caisse actives**
- **Taux d'utilisation de la caisse**

### KPI de Crédit
- **Nombre de crédits décaissés**
- **Montant moyen des crédits**
- **Taux de recouvrement**
- **Portfolio at Risk (PAR)**
- **Nombre de prêts actifs**

### KPI de Clientèle
- **Nouveaux clients**
- **Nombre total de clients actifs**
- **Taux de rétention**

### KPI Financiers
- **Total des dépôts**
- **Total des retraits**
- **Variation nette de caisse**
- **Transferts inter-succursales (entrants/sortants)**

---

## Automatisation et Alertes

### Alertes Recommandées

1. **Alerte PAR élevé:** Si PAR > 10%
2. **Alerte taux de recouvrement bas:** Si taux < 90%
3. **Alerte écart de caisse:** Si variation nette anormale
4. **Alerte volume de transactions:** Si nombre de transactions anormalement bas

### Rapports Automatiques

**Recommandation:** Configurer des rapports automatiques:
- Rapport journalier envoyé chaque matin à 8h
- Rapport hebdomadaire envoyé chaque lundi
- Rapport mensuel envoyé le 1er de chaque mois

---

## Sécurité et Autorisations

### Niveaux d'Accès

| Rôle | Rapport Journalier (Ma Succursale) | Rapport Mensuel (Ma Succursale) | Rapports Autres Succursales | Comparaison Performance |
|------|-----------------------------------|--------------------------------|----------------------------|------------------------|
| **Cashier** | ✅ Lecture | ❌ | ❌ | ❌ |
| **Manager** | ✅ Lecture | ✅ Lecture | ✅ Lecture | ❌ |
| **BranchSupervisor** | ✅ Lecture | ✅ Lecture | ✅ Lecture | ❌ |
| **SuperAdmin** | ✅ Lecture | ✅ Lecture | ✅ Lecture | ✅ Lecture |
| **Director** | ✅ Lecture | ✅ Lecture | ✅ Lecture | ✅ Lecture |

### Audit Trail

Toutes les consultations de rapports sont enregistrées automatiquement pour l'audit.

---

## Exemples d'Intégration

### Frontend React/Vue

```javascript
// Récupérer le rapport journalier
async function getDailyReport(date = null) {
  const dateParam = date ? `?date=${date}` : '';
  const response = await fetch(
    `/api/BranchReport/my-branch/daily${dateParam}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return await response.json();
}

// Afficher le rapport
const report = await getDailyReport('2025-12-02');
console.log(`Crédits décaissés: ${report.creditsDisbursedCount}`);
console.log(`Total HTG: ${report.totalCreditsDisbursedHTG}`);
console.log(`Total USD: ${report.totalCreditsDisbursedUSD}`);
```

### Desktop C# (WPF/WinForms)

```csharp
public class BranchReportService
{
    private readonly HttpClient _httpClient;
    
    public async Task<DailyBranchReportDto> GetDailyReportAsync(DateTime? date = null)
    {
        var dateParam = date.HasValue ? $"?date={date:yyyy-MM-dd}" : "";
        var response = await _httpClient.GetAsync(
            $"/api/BranchReport/my-branch/daily{dateParam}"
        );
        
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadAsAsync<DailyBranchReportDto>();
    }
}
```

---

## Troubleshooting

### Problème: Rapport vide

**Cause possible:** Aucune transaction pour la période sélectionnée

**Solution:** Vérifier qu'il y a eu des activités pour la date demandée

### Problème: Erreur 404

**Cause possible:** Succursale inexistante

**Solution:** Vérifier l'ID de la succursale

### Problème: Erreur 401/403

**Cause possible:** Token expiré ou permissions insuffisantes

**Solution:** 
1. Vérifier que le token JWT est valide
2. Vérifier que l'utilisateur a les rôles nécessaires

### Problème: Performances lentes

**Cause possible:** Période trop longue ou beaucoup de données

**Solution:**
1. Utiliser des rapports journaliers au lieu de périodes longues
2. Activer la pagination si disponible
3. Exporter en CSV pour analyse hors ligne

---

## Notes Importantes

1. **Tous les montants sont en décimales avec 2 chiffres après la virgule**
2. **Les dates sont au format UTC (ISO 8601)**
3. **Les rapports incluent uniquement les transactions COMPLÉTÉES (status=Completed)**
4. **Les microcrédits et crédits réguliers sont combinés dans les rapports**
5. **Les transferts inter-succursales sont comptabilisés dans les deux succursales (source et destination)**

---

## Prochaines Améliorations

- [ ] Export PDF avec graphiques
- [ ] Rapports comparatifs par période (mois vs mois)
- [ ] Rapports par agent/caissier
- [ ] Analyse prédictive basée sur l'historique
- [ ] Tableaux de bord interactifs en temps réel
- [ ] Notifications automatiques pour anomalies

---

Pour toute question ou problème, contactez l'équipe technique.
