# Migration pour les Nouveaux Types de Microcrédit

## Contexte
Cette migration ajoute le support pour 9 nouveaux types de microcrédits au système existant.

## Nouveaux Types de Crédit

Les types suivants ont été ajoutés à l'enum `MicrocreditLoanType`:

1. **CreditLoyer** (8) - Crédit Loyer
2. **CreditAuto** (9) - Crédit Auto  
3. **CreditMoto** (10) - Crédit Moto
4. **CreditPersonnel** (11) - Crédit Personnel
5. **CreditScolaire** (12) - Crédit Scolaire
6. **CreditAgricole** (13) - Crédit Agricole
7. **CreditProfessionnel** (14) - Crédit Professionnel
8. **CreditAppui** (15) - Crédit d'Appui
9. **CreditHypothecaire** (16) - Crédit Hypothécaire

## Commandes pour Créer la Migration

### Depuis le répertoire du projet

```powershell
# Naviguer vers le répertoire du projet
cd "c:\Users\Administrator\Desktop\Kredi Ti Machann\backend\NalaCreditAPI"

# Créer la migration
dotnet ef migrations add AddNewMicrocreditLoanTypes

# Appliquer la migration (après vérification)
dotnet ef database update
```

### Si vous utilisez le Package Manager Console dans Visual Studio

```powershell
Add-Migration AddNewMicrocreditLoanTypes
Update-Database
```

## Modifications Incluses

### 1. Modèle de Données
- Mise à jour de l'enum `MicrocreditLoanType` dans `Models/MicrocreditModels.cs`
- Aucune modification de la structure des tables nécessaire (l'enum est stocké comme int)

### 2. Données de Configuration
Après la migration, exécutez le script SQL pour initialiser les configurations:
```sql
-- Voir: backend/NalaCreditAPI/Scripts/InitializeMicrocreditTypes.sql
```

### 3. Backend
- Ajout du helper `MicrocreditLoanTypeHelper.cs` pour obtenir les noms et descriptions
- Ajout du controller `MicrocreditLoanTypesController.cs` pour l'API
- Les services existants fonctionneront automatiquement avec les nouveaux types

### 4. Frontend
- Mise à jour de l'enum `LoanType` dans `types/microcredit.ts`
- Ajout du helper `loanTypeHelpers.ts` pour les informations UI
- Ajout du composant `LoanTypeSelector.tsx` pour la sélection visuelle
- Ajout du service `microcreditLoanTypeService.ts` pour l'API

## Post-Migration

### 1. Initialiser les Configurations
Exécutez le script SQL pour créer les configurations par défaut:
```bash
psql -h <host> -U <user> -d <database> -f "backend/NalaCreditAPI/Scripts/InitializeMicrocreditTypes.sql"
```

### 2. Vérification
- Vérifier que les nouveaux types apparaissent dans l'API: `GET /api/MicrocreditLoanTypes`
- Vérifier que les configurations sont créées: `GET /api/MicrocreditLoanTypes/configurations`
- Tester la création d'une demande avec un nouveau type de crédit

### 3. Tests
- Créer une demande de crédit pour chaque nouveau type
- Vérifier les validations (montant min/max, durée min/max)
- Tester le calcul des intérêts et frais

## Notes Importantes

- Les types existants (COMMERCIAL, AGRICULTURAL, PERSONAL, EMERGENCY) restent inchangés
- Les nouvelles applications peuvent utiliser n'importe quel type
- Les applications existantes ne sont pas affectées
- Les configurations peuvent être ajustées via l'API (rôle Admin requis)

## Rollback

Si vous devez annuler cette migration:

```powershell
# Revenir à la migration précédente
dotnet ef database update <PreviousMigrationName>

# Supprimer la migration
dotnet ef migrations remove
```

## Support

Pour toute question ou problème:
1. Vérifier les logs de l'application
2. Vérifier que la base de données est à jour: `dotnet ef migrations list`
3. Consulter la documentation du système de microcrédit
