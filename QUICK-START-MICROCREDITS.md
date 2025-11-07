# 🚀 Guide de Démarrage Rapide - Microcrédits

## En 5 Minutes

### 1️⃣ Appliquer la Migration (1 min)
```bash
cd "C:\Users\Administrator\Desktop\Kredi Ti Machann\backend\NalaCreditAPI"
dotnet ef database update --context ApplicationDbContext
```

### 2️⃣ Initialiser les Configurations (1 min)
```bash
# Option A: Via psql
psql -h localhost -U postgres -d nalakrediti -f "Scripts/InitializeMicrocreditTypes.sql"

# Option B: Via pgAdmin
# 1. Ouvrir pgAdmin
# 2. Connecter à la base nalakrediti
# 3. Tools → Query Tool
# 4. Ouvrir le fichier Scripts/InitializeMicrocreditTypes.sql
# 5. Exécuter (F5)
```

### 3️⃣ Vérifier l'Installation (1 min)
```sql
-- Dans psql ou pgAdmin
SELECT "Type", "Name", "IsActive", "MinAmount", "MaxAmount", "DefaultInterestRate" 
FROM microcredit_loan_type_configurations 
ORDER BY "Type";

-- Devrait afficher 9+ lignes
```

### 4️⃣ Démarrer le Backend (1 min)
```bash
cd "C:\Users\Administrator\Desktop\Kredi Ti Machann\backend\NalaCreditAPI"
dotnet run
```

### 5️⃣ Tester l'API (1 min)
```bash
# Dans un nouveau terminal ou navigateur
curl https://localhost:5001/api/MicrocreditLoanTypes
curl https://localhost:5001/api/MicrocreditLoanTypes/configurations
```

---

## ✅ Vérifications

### Backend Opérationnel?
- [ ] Migration appliquée sans erreur
- [ ] Configurations insérées (9+ lignes)
- [ ] Backend démarre sans erreur
- [ ] API répond aux requêtes
- [ ] Swagger accessible: `https://localhost:5001/swagger`

### Frontend Prêt?
- [ ] Fichiers créés dans `frontend-web/src/`
- [ ] Types TypeScript mis à jour
- [ ] Composants disponibles
- [ ] Services API créés
- [ ] Pas d'erreurs de compilation

### Base de Données OK?
```sql
-- Vérifier la table existe
SELECT COUNT(*) FROM microcredit_loan_type_configurations;
-- Résultat: 9 ou plus

-- Vérifier les types actifs
SELECT "Name" FROM microcredit_loan_type_configurations WHERE "IsActive" = true;
```

---

## 🎯 Premiers Tests

### Test 1: Récupérer les Types de Crédit
```bash
curl -X GET "https://localhost:5001/api/MicrocreditLoanTypes" \
     -H "Authorization: Bearer YOUR_TOKEN"
```

**Résultat attendu:** Liste de 13 types avec noms, icônes, couleurs

### Test 2: Obtenir une Configuration
```bash
curl -X GET "https://localhost:5001/api/MicrocreditLoanTypes/configurations/CREDIT_AUTO" \
     -H "Authorization: Bearer YOUR_TOKEN"
```

**Résultat attendu:** Config complète du Crédit Auto

### Test 3: Créer une Demande
Via l'interface frontend:
1. Aller à "Microcrédits" → "Nouvelle Demande"
2. Sélectionner "Crédit Moto"
3. Remplir le formulaire
4. Soumettre

---

## 🔧 Dépannage Rapide

### Erreur: Migration Failed
```bash
# Vérifier les migrations existantes
dotnet ef migrations list --context ApplicationDbContext

# Supprimer la dernière migration si nécessaire
dotnet ef migrations remove --context ApplicationDbContext

# Recréer
dotnet ef migrations add AddNewMicrocreditLoanTypes --context ApplicationDbContext
dotnet ef database update --context ApplicationDbContext
```

### Erreur: SQL Script Failed
```sql
-- Vérifier si la table existe
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'microcredit_loan_type_configurations';

-- Si elle n'existe pas, appliquer la migration d'abord
```

### Erreur: API Returns 404
```bash
# Vérifier que le controller est bien compilé
cd backend/NalaCreditAPI
dotnet build

# Vérifier les routes
grep -r "MicrocreditLoanTypes" Controllers/
```

### Erreur: Frontend Compilation
```bash
cd frontend-web

# Vérifier les dépendances
npm install

# Vérifier les imports
npm run build
```

---

## 📱 Utilisation Immédiate

### Pour un Agent

1. **Login** avec vos credentials
2. **Menu** → Microcrédits
3. **Nouvelle Demande**
4. **Choisir** le type de crédit approprié
5. **Remplir** les informations client
6. **Soumettre** la demande

### Pour un Gestionnaire

1. **Login** avec compte manager
2. **Dashboard** → Demandes en attente
3. **Réviser** les demandes
4. **Approuver** ou **Rejeter**
5. **Voir** les statistiques

### Pour un Admin

1. **Login** avec compte admin
2. **Configuration** → Types de Crédit
3. **Modifier** les paramètres
4. **Voir** les rapports globaux

---

## 📊 Exemples Pratiques

### Exemple 1: Crédit Scolaire
```
Client: Jean Dupont
Montant: 30,000 HTG
Durée: 10 mois
Usage: Frais universitaires

Calcul automatique:
- Mensualité: ~3,225 HTG
- Total intérêts: ~2,250 HTG
- Total à rembourser: ~32,250 HTG
```

### Exemple 2: Crédit Moto
```
Client: Marie Pierre
Montant: 120,000 HTG
Durée: 24 mois
Usage: Achat motocyclette pour travail

Calcul automatique:
- Mensualité: ~5,760 HTG
- Total intérêts: ~18,240 HTG
- Total à rembourser: ~138,240 HTG
- Garantie: La moto elle-même
```

### Exemple 3: Crédit Agricole
```
Client: Pierre Jean
Montant: 75,000 HTG
Durée: 12 mois
Usage: Semences et outils

Calcul automatique:
- Période de grâce: 60 jours
- Mensualité: ~6,664 HTG
- Total intérêts: ~4,968 HTG
- Total à rembourser: ~79,968 HTG
```

---

## 🎓 Formation Express

### Les 3 Choses à Savoir

1. **Chaque type de crédit a ses règles**
   - Montants min/max différents
   - Durées différentes
   - Taux d'intérêt variables
   - Garanties selon le type

2. **Le système valide tout automatiquement**
   - Montant dans les limites
   - Durée acceptable
   - Capacité de remboursement
   - Documents requis

3. **Workflow d'approbation structuré**
   - Agent → Vérification initiale
   - Manager → Approbation locale
   - Régional → Gros montants
   - Comité → Cas spéciaux

---

## 🔗 Liens Utiles

### Documentation
- Guide Complet: `GUIDE-COMPLET-MICROCREDITS.md`
- Guide Créole: `GID-KONPLE-MIKWOKREDI-KREYOL.md`
- Guide Migration: `backend/NalaCreditAPI/MIGRATION_GUIDE_MICROCREDIT_TYPES.md`
- README Développement: `README-MICROCREDITS-DEVELOPMENT.md`

### Code
- Backend Models: `backend/NalaCreditAPI/Models/MicrocreditModels.cs`
- Backend Controller: `backend/NalaCreditAPI/Controllers/MicrocreditLoanTypesController.cs`
- Frontend Types: `frontend-web/src/types/microcredit.ts`
- Frontend Selector: `frontend-web/src/components/loans/LoanTypeSelector.tsx`

### API
- Swagger: `https://localhost:5001/swagger`
- Endpoint Types: `https://localhost:5001/api/MicrocreditLoanTypes`
- Endpoint Configs: `https://localhost:5001/api/MicrocreditLoanTypes/configurations`

---

## ⏱️ Timeline

| Étape | Temps | Statut |
|-------|-------|--------|
| Migration | 1 min | ⚡ |
| Init Config | 1 min | ⚡ |
| Vérification | 1 min | ⚡ |
| Démarrage | 1 min | ⚡ |
| Tests | 1 min | ⚡ |
| **TOTAL** | **5 min** | **✅** |

---

## 💡 Astuces

### Pour Gagner du Temps
- Utilisez le composant `LoanTypeSelector` - il gère tout
- Les validations sont automatiques - pas besoin de vérifier manuellement
- Les calculs sont instantanés - le client voit immédiatement

### Pour Éviter les Erreurs
- Toujours appliquer la migration avant d'initialiser les configs
- Vérifier que le backend est bien démarré avant le frontend
- Utiliser les bons tokens d'authentification

### Pour Impressionner
- Interface bilingue (FR/Créole) - switch automatique
- Filtrage par catégorie - trouve rapidement le bon crédit
- Infobulles au survol - toutes les infos en un clin d'œil

---

## 🎉 Félicitations!

Si vous êtes arrivé ici en 5 minutes, le système est **opérationnel**!

### Prochaines Étapes
1. ✅ Formation des agents
2. ✅ Tests avec de vraies demandes
3. ✅ Ajustements si nécessaire
4. ✅ Mise en production
5. ✅ Monitoring et support

---

**Questions? Consultez les guides complets ou contactez le support!**

🚀 **Bon crédit!**
