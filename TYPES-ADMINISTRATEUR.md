# Types d'Administrateur - Kredi Ti Machann

## Vue d'ensemble
Ce document décrit les 8 types d'administrateurs disponibles dans le système Kredi Ti Machann.

## Liste des Types (Frontend → Backend)

### 1. Caissier
- **Valeur Backend**: 0
- **Description**: Gestion des transactions et caisse
- **Badge**: Jaune (bg-yellow-100 text-yellow-800)
- **Permissions**: Transactions, encaissements, décaissements

### 2. Secrétaire Administratif
- **Valeur Backend**: 1
- **Description**: Support administratif
- **Badge**: Rose (bg-pink-100 text-pink-800)
- **Permissions**: Documentation, support client, saisie de données

### 3. Agent de Crédit
- **Valeur Backend**: 2
- **Description**: Gestion des prêts et dossiers
- **Badge**: Vert (bg-green-100 text-green-800)
- **Permissions**: Création/gestion de crédits, suivi des dossiers

### 4. Chef de Succursale
- **Valeur Backend**: 3
- **Description**: Gestion d'une succursale
- **Badge**: Indigo (bg-indigo-100 text-indigo-800)
- **Permissions**: Gestion d'une succursale spécifique, supervision d'équipe

### 5. Directeur Régional
- **Valeur Backend**: 4
- **Description**: Gestion de plusieurs succursales
- **Badge**: Bleu (bg-blue-100 text-blue-800)
- **Permissions**: Supervision de plusieurs succursales
- **Requis**: Au moins une succursale doit être assignée

### 6. Administrateur Système
- **Valeur Backend**: 5
- **Description**: Configuration et support technique
- **Badge**: Violet (bg-purple-100 text-purple-800)
- **Permissions**: Configuration système, gestion utilisateurs, maintenance

### 7. Direction Générale
- **Valeur Backend**: 6
- **Description**: Accès complet au système
- **Badge**: Rouge (bg-red-100 text-red-800)
- **Permissions**: Accès complet, contrôle total
- **Protection**: Impossible de supprimer ce type de compte

### 8. Comptable/Finance
- **Valeur Backend**: 7
- **Description**: Gestion financière et comptabilité
- **Badge**: Orange (bg-orange-100 text-orange-800)
- **Permissions**: Rapports financiers, comptabilité, gestion budgétaire

## Mapping Backend

### Enum Values
```typescript
enum AdminType {
  CAISSIER = 'CAISSIER',                           // 0
  SECRETAIRE_ADMINISTRATIF = 'SECRETAIRE_ADMINISTRATIF', // 1
  AGENT_DE_CREDIT = 'AGENT_DE_CREDIT',             // 2
  CHEF_DE_SUCCURSALE = 'CHEF_DE_SUCCURSALE',       // 3
  DIRECTEUR_REGIONAL = 'DIRECTEUR_REGIONAL',       // 4
  ADMINISTRATEUR_SYSTEME = 'ADMINISTRATEUR_SYSTEME', // 5
  DIRECTION_GENERALE = 'DIRECTION_GENERALE',       // 6
  COMPTABLE_FINANCE = 'COMPTABLE_FINANCE'          // 7
}
```

### Conversion vers Backend
```typescript
const adminTypeMap: Record<AdminType, number> = {
  [AdminType.Caissier]: 0,
  [AdminType.SecretaireAdministratif]: 1,
  [AdminType.AgentDeCredit]: 2,
  [AdminType.ChefDeSuccursale]: 3,
  [AdminType.DirecteurRegional]: 4,
  [AdminType.AdministrateurSysteme]: 5,
  [AdminType.DirectionGenerale]: 6,
  [AdminType.ComptableFinance]: 7
};
```

## Règles de Validation

### Directeur Régional
- **Validation spéciale**: Au moins une succursale doit être assignée
- **Message d'erreur**: "Au moins une succursale doit être assignée pour un Directeur Régional"
- **Composants**: AdminAccountCreation.tsx (ligne 161)

### Direction Générale
- **Protection**: Impossible de supprimer un compte Direction Générale
- **Message d'erreur**: "Impossible de supprimer un compte Direction Générale"
- **Composants**: AdminAccountList.tsx (handleDelete)

## Fichiers Impactés

### Frontend Components
1. **AdminAccountList.tsx**
   - Affichage de la liste
   - Filtrage par type
   - Badges colorés
   - Protection suppression Direction Générale

2. **AdminAccountCreation.tsx**
   - Formulaire de création
   - Validation des types
   - Mapping vers valeurs numériques (0-7)
   - Règles spéciales pour Directeur Régional

3. **EditAdminModal.tsx**
   - Modification des comptes
   - Conversion enum → numeric
   - Validation des changements

### API Service
- **apiService.ts**: 
  - `createAdmin()`: Envoie AdminType comme numéro (0-7)
  - `updateUser()`: Envoie AdminType comme numéro (0-7)

## Migration depuis l'ancien système

### Anciens types → Nouveaux types
```
SuperAdmin → Direction Générale (6)
Admin → Administrateur Système (5)
Manager → Directeur Régional (4)
Cashier → Caissier (0)
Employee → Agent de Crédit (2)
Support → Secrétaire Administratif (1)
```

## Notes Importantes

1. ✅ Les 3 composants utilisent le MÊME enum AdminType
2. ✅ Les valeurs sont cohérentes entre frontend et backend
3. ✅ La conversion string → number est faite avant l'envoi API
4. ✅ Les badges ont des couleurs distinctes pour chaque type
5. ⚠️ Direction Générale a les permissions les plus élevées
6. ⚠️ Directeur Régional DOIT avoir au moins une succursale assignée

## Dernière mise à jour
**Date**: 18 octobre 2025  
**Version**: 2.0  
**Statut**: ✅ Aligné et testé
