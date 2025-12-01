# Ajout du Champ "Signataire Autorisé" pour les Personnes Physiques

## Vue d'ensemble
Cette fonctionnalité permet d'ajouter des signataires autorisés lors de la création de comptes pour les personnes physiques. Les signataires autorisés peuvent être ajoutés pour tous les types de comptes : Épargne, Courant et Épargne à Terme.

## Modifications Backend

### 1. Modèles (Models/SavingsModels.cs)
- ✅ Ajout de la classe `SavingsAccountAuthorizedSigner` avec les propriétés suivantes :
  - `Id` : Identifiant unique
  - `AccountId` : Référence au compte d'épargne
  - `FullName` : Nom complet du signataire
  - `Role` : Rôle (Signataire, Co-titulaire, etc.)
  - `DocumentType` : Type de document d'identité
  - `DocumentNumber` : Numéro du document
  - `Phone` : Numéro de téléphone
  - `RelationshipToCustomer` : Relation avec le client
  - `Address` : Adresse du signataire
  - `AuthorizationLimit` : Limite d'autorisation pour les transactions
  - `IsActive` : Statut actif/inactif
  - `CreatedAt`, `UpdatedAt` : Audit

- ✅ Ajout de la relation dans `SavingsAccount` :
  ```csharp
  public virtual ICollection<SavingsAccountAuthorizedSigner> AuthorizedSigners { get; set; }
  ```

### 2. DTOs (DTOs/SavingsDtos.cs)
- ✅ Ajout de `SavingsAccountAuthorizedSignerDto` pour la création
- ✅ Ajout de `SavingsAccountAuthorizedSignerResponseDto` pour la lecture
- ✅ Ajout du champ `AuthorizedSigners` dans :
  - `SavingsAccountOpeningDto`
  - `SavingsAccountResponseDto`

### 3. DTOs (DTOs/ClientAccountDtos.cs)
- ✅ Ajout du champ `AuthorizedSigners` dans :
  - `ClientAccountCreationDto` (pour tous les types de comptes)
  - `TermSavingsAccountOpeningDto`
  - `TermSavingsAccountResponseDto`

### 4. Services
- ✅ **SavingsAccountService** : 
  - Modifié `OpenAccountAsync` pour créer les signataires autorisés
  - Modifié `GetAccountAsync` et `GetAccountByNumberAsync` pour inclure les signataires
  - Modifié `MapToResponseDto` pour mapper les signataires

- ✅ **ClientAccountService** :
  - Modifié `CreateAccountAsync` pour passer les signataires autorisés aux services spécifiques
  - Ajout du support pour tous les types de comptes

### 5. DbContext (Data/ApplicationDbContext.cs)
- ✅ Ajout du DbSet :
  ```csharp
  public DbSet<SavingsAccountAuthorizedSigner> SavingsAccountAuthorizedSigners { get; set; }
  ```

## Modifications Frontend

### 1. Composant (components/admin/ClientAccountManagement.tsx)
- ✅ Utilisation du composant `AuthorizedSignersEditor` pour :
  - Comptes d'Épargne
  - Comptes Courants (déjà existant)
  - Comptes d'Épargne à Terme

- ✅ Le composant `AuthorizedSignersEditor` permet d'ajouter/modifier/supprimer des signataires avec les champs :
  - Nom complet
  - Type de pièce d'identité
  - Numéro de document
  - Relation avec le client
  - Téléphone
  - Limite d'autorisation (optionnel)

## Migration de Base de Données

### Script SQL : `add-savings-authorized-signers.sql`
Ce script crée la table `SavingsAccountAuthorizedSigners` avec :
- Structure complète avec tous les champs nécessaires
- Clé étrangère vers `SavingsAccounts` avec suppression en cascade
- Index sur `AccountId` et `IsActive` pour optimiser les performances

### Exécution de la Migration
```bash
# Pour MySQL/MariaDB
mysql -u username -p database_name < add-savings-authorized-signers.sql

# Ou via l'interface de gestion de base de données
```

## Utilisation

### Création d'un Compte avec Signataires Autorisés

1. **Accéder au formulaire** : 
   - Ouvrir le module "Comptes Clients"
   - Cliquer sur "Nouveau Compte"

2. **Remplir les informations du compte** :
   - Sélectionner le type de compte (Épargne, Courant ou Épargne à Terme)
   - Renseigner la devise
   - Entrer l'ID du client
   - Remplir le montant initial

3. **Ajouter des signataires autorisés** (optionnel) :
   - Cliquer sur "Ajouter un signataire"
   - Remplir les informations :
     - Nom complet
     - Type de document (CIN, Passeport, Permis)
     - Numéro de document
     - Relation avec le client
     - Téléphone
     - Limite d'autorisation (montant maximum que le signataire peut autoriser)

4. **Valider** : Cliquer sur "Créer le Compte"

### Visualisation des Signataires
Les signataires autorisés apparaissent dans les détails du compte et peuvent être consultés à tout moment depuis l'interface de gestion des comptes.

## Points Importants

1. **Optionnel** : Les signataires autorisés sont optionnels. Un compte peut être créé sans signataire.

2. **Tous les types de comptes** : La fonctionnalité est disponible pour :
   - Comptes d'Épargne
   - Comptes Courants
   - Comptes d'Épargne à Terme

3. **Sécurité** : 
   - Les limites d'autorisation permettent de contrôler les montants que chaque signataire peut approuver
   - Le champ `IsActive` permet de désactiver un signataire sans le supprimer

4. **Audit** : 
   - Date de création et de modification sont enregistrées automatiquement
   - L'historique des signataires est préservé

## Tests Recommandés

1. ✅ Créer un compte d'épargne sans signataire
2. ✅ Créer un compte d'épargne avec un signataire
3. ✅ Créer un compte d'épargne avec plusieurs signataires
4. ✅ Créer un compte courant avec signataires
5. ✅ Créer un compte d'épargne à terme avec signataires
6. ✅ Vérifier que les signataires apparaissent dans les détails du compte

## Notes Techniques

- La table `SavingsAccountAuthorizedSigners` utilise une suppression en cascade : si un compte est supprimé, tous ses signataires sont automatiquement supprimés
- Les index permettent des recherches rapides par compte et par statut
- Le format de stockage de la signature (Base64) permet une intégration future avec des systèmes de signature numérique
