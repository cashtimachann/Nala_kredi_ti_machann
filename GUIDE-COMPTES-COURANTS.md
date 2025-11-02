# 💳 Guide Complet - Comptes Courants (Kont Kouran)

## Vue d'ensemble

Le **Compte Courant** est un compte bancaire conçu pour les transactions quotidiennes avec possibilité de découvert autorisé. Idéal pour les petits commerçants et entrepreneurs qui ont besoin de flexibilité dans leur gestion de trésorerie.

---

## 🎯 Caractéristiques Principales

### ✅ Avantages
- **Retraits illimités** (dans les limites définies)
- **Découvert autorisé** pour couvrir les besoins urgents
- **Émission de chèques** pour les paiements professionnels
- **Pas de période de blocage** des fonds
- **Accès 24/7** aux fonds disponibles

### ⚠️ Points à Considérer
- **Frais de maintenance mensuels**
- **Pas d'intérêts** sur le solde créditeur
- **Frais de chéquier**
- **Intérêts sur découvert** (si utilisé)
- **Solde minimum** requis

---

## 📋 Paramètres du Compte

### 1. **Informations de Base**

#### Devise
- **HTG** (Gourde Haïtienne)
- **USD** (Dollar Américain)

#### Client
- ID Client unique
- Nom du client
- Numéro de téléphone

#### Succursale
- Port-au-Prince
- Cap-Haïtien
- Gonaïves
- Les Cayes
- Jacmel

### 2. **Paramètres Financiers**

#### Dépôt Initial
- **HTG**: Recommandé minimum 500 HTG
- **USD**: Recommandé minimum 20 USD
- Peut être zéro si découvert autorisé

#### Solde Minimum
- **HTG**: 500 HTG par défaut
- **USD**: 20 USD par défaut
- Solde en dessous duquel des frais peuvent s'appliquer

#### Limites de Retrait

**Limite Quotidienne:**
- **HTG**: 100,000 HTG par défaut
- **USD**: 2,000 USD par défaut
- Montant maximum pouvant être retiré par jour

**Limite Mensuelle:**
- **HTG**: 1,000,000 HTG par défaut
- **USD**: 20,000 USD par défaut
- Montant maximum pouvant être retiré par mois

### 3. **Découvert Autorisé** 🔓

#### Activation
- Option à cocher lors de la création
- Peut être modifiée après ouverture (avec approbation)

#### Limite de Découvert
- Montant maximum que le client peut utiliser au-delà du solde
- **HTG**: Typiquement 5,000 - 50,000 HTG
- **USD**: Typiquement 200 - 2,000 USD
- Basé sur la solvabilité du client

#### Fonctionnement
```
Exemple:
Solde actuel: 1,000 HTG
Découvert autorisé: 5,000 HTG
Montant disponible: 6,000 HTG

Si retrait de 3,000 HTG:
- Nouveau solde: -2,000 HTG
- Découvert utilisé: 2,000 HTG
- Découvert restant: 3,000 HTG
```

### 4. **Frais et Charges**

#### Frais de Maintenance Mensuels
- **HTG**: 100 HTG/mois par défaut
- **USD**: 5 USD/mois par défaut
- Prélevés automatiquement le 1er de chaque mois

#### Frais de Chéquier
- **HTG**: 500 HTG par chéquier
- **USD**: 25 USD par chéquier
- Facturés lors de l'émission d'un nouveau chéquier

#### Frais de Découvert (si applicable)
- Intérêts sur le montant utilisé
- **Taux**: 15-20% annuel (à configurer)
- Calculés quotidiennement

---

## 🚀 Processus de Création

### Étape 1: Cliquer sur "Nouveau Compte Courant"

### Étape 2: Sélectionner la Devise
- Choisir entre HTG et USD
- Les valeurs par défaut s'ajustent automatiquement

### Étape 3: Informations Client
```
✓ ID Client (requis)
✓ Nom du Client
✓ Succursale (requis)
```

### Étape 4: Dépôt Initial
```
✓ Montant en devise choisie
✓ Peut être 0 si découvert autorisé
```

### Étape 5: Paramètres du Compte
```
✓ Solde minimum
✓ Limite retrait quotidien
✓ Limite retrait mensuel
✓ Frais de maintenance
```

### Étape 6: Découvert (Optionnel)
```
☐ Autoriser le découvert
  ↓
✓ Limite de découvert
```

### Étape 7: Frais de Chéquier
```
✓ Frais par chéquier
```

### Étape 8: Validation
- Vérifier toutes les informations
- Cliquer sur "Créer le Compte Courant"

---

## 📊 Interface de Gestion

### Statistiques en Temps Réel

**Carte 1: Total Comptes**
- Nombre total de comptes courants
- Nombre de comptes actifs

**Carte 2: Solde Total HTG**
- Somme de tous les soldes en HTG
- Code couleur vert

**Carte 3: Solde Total USD**
- Somme de tous les soldes en USD
- Code couleur bleu

**Carte 4: Découverts Utilisés**
- Nombre de comptes en découvert
- Montant total des découverts utilisés
- Code couleur orange (alerte)

### Filtres Disponibles

**1. Recherche Textuelle**
- Par numéro de compte
- Par nom du client
- Par numéro de téléphone

**2. Filtre par Devise**
- Toutes devises
- HTG uniquement
- USD uniquement

**3. Filtre par Statut**
- Tous statuts
- Actif
- Inactif
- Suspendu
- Fermé

### Tableau des Comptes

**Colonnes:**
1. **Compte** - Numéro et devise
2. **Client** - Nom et téléphone
3. **Solde** - Solde actuel et minimum
4. **Découvert** - Montant utilisé / limite
5. **Statut** - Badge coloré
6. **Actions** - Bouton Voir détails

---

## 🔍 Détails du Compte

Cliquer sur l'icône œil pour voir:

### Section 1: Informations du Compte
- Numéro de compte
- Nom du client
- Devise
- Solde actuel
- Date d'ouverture
- Statut

### Section 2: Découvert
- Découvert autorisé (Oui/Non)
- Limite de découvert
- Découvert actuellement utilisé
- Code couleur:
  - ✅ Vert: Pas de découvert
  - ⚠️ Orange: Découvert utilisé

### Section 3: Résumé des Transactions
- Total des dépôts (vert)
- Total des retraits (rouge)
- Retraits mensuels utilisés

---

## 💼 Cas d'Usage

### Cas 1: Petit Commerçant

**Profil:**
- Ventes quotidiennes variables
- Besoin de flexibilité
- Paiements par chèque

**Configuration Recommandée:**
```
Devise: HTG
Dépôt initial: 5,000 HTG
Solde minimum: 500 HTG
Découvert autorisé: Oui (10,000 HTG)
Limite quotidienne: 50,000 HTG
Limite mensuelle: 500,000 HTG
```

**Avantages:**
- Peut couvrir les besoins urgents avec découvert
- Retraits flexibles pour approvisionnements
- Chèques pour payer les fournisseurs

### Cas 2: Professionnel Salarié

**Profil:**
- Salaire mensuel régulier
- Dépenses prévisibles
- Pas besoin de découvert

**Configuration Recommandée:**
```
Devise: USD
Dépôt initial: 100 USD
Solde minimum: 20 USD
Découvert autorisé: Non
Limite quotidienne: 500 USD
Limite mensuelle: 5,000 USD
```

**Avantages:**
- Frais de maintenance bas
- Pas de risque de surendettement
- Gestion simple

### Cas 3: Entrepreneur avec Flux Variable

**Profil:**
- Revenus irréguliers
- Investissements fréquents
- Besoin de grandes transactions

**Configuration Recommandée:**
```
Devise: USD
Dépôt initial: 500 USD
Solde minimum: 50 USD
Découvert autorisé: Oui (1,000 USD)
Limite quotidienne: 2,000 USD
Limite mensuelle: 20,000 USD
```

**Avantages:**
- Haute flexibilité
- Découvert pour opportunités
- Limites élevées

---

## ⚙️ Gestion et Maintenance

### Actions Administratives

**1. Modification des Paramètres**
- Augmenter/réduire les limites
- Activer/désactiver le découvert
- Ajuster les frais

**2. Surveillance du Découvert**
- Vérifier régulièrement les comptes en découvert
- Contacter les clients si découvert prolongé
- Calculer les intérêts sur découvert

**3. Maintenance Mensuelle**
- Prélèvement automatique des frais
- Génération de relevés
- Vérification des limites mensuelles

### Alertes Recommandées

**🔴 Alerte Critique:**
- Découvert > 90% de la limite
- Découvert utilisé > 30 jours consécutifs
- Solde < 0 et découvert non autorisé

**🟠 Alerte Moyenne:**
- Découvert > 50% de la limite
- Solde < solde minimum pendant 7 jours
- Retrait mensuel > 80% de la limite

**🟡 Alerte Info:**
- Nouveau compte créé
- Première utilisation du découvert
- Retrait quotidien > 50% de la limite

---

## 📈 Statistiques et Rapports

### Rapports Disponibles

**1. Rapport de Découvert**
- Comptes actuellement en découvert
- Historique d'utilisation
- Montants et durées

**2. Rapport de Revenus**
- Frais de maintenance collectés
- Frais de chéquier
- Intérêts sur découvert

**3. Rapport d'Activité**
- Transactions par compte
- Retraits vs dépôts
- Utilisation des limites

### Indicateurs Clés (KPIs)

**Performance:**
- Nombre de comptes actifs
- Taux d'utilisation du découvert
- Revenus mensuels moyens

**Risque:**
- Taux de découvert prolongé
- Comptes inactifs
- Dépassements de limite

---

## 🔒 Sécurité et Conformité

### Vérifications Obligatoires

**À l'Ouverture:**
- ✅ Vérification d'identité du client
- ✅ Évaluation de solvabilité (si découvert)
- ✅ Signature de contrat
- ✅ Documents justificatifs

**En Continu:**
- ✅ Surveillance des transactions suspectes
- ✅ Vérification des limites
- ✅ Conformité réglementaire
- ✅ Audit mensuel

### Limites Réglementaires

**Découvert:**
- Maximum: 30% du revenu mensuel déclaré
- Durée: Maximum 90 jours consécutifs
- Renouvellement: Approbation requise

**Transactions:**
- Déclaration obligatoire > 100,000 HTG ou 5,000 USD
- Traçabilité complète
- Justificatifs conservés 5 ans

---

## 🆘 Résolution de Problèmes

### Problème 1: Découvert Non Autorisé Utilisé

**Cause:** Erreur système ou transaction non vérifiée

**Solution:**
1. Vérifier l'historique des transactions
2. Bloquer le compte temporairement
3. Contacter le client
4. Régulariser la situation
5. Appliquer les frais appropriés

### Problème 2: Dépassement de Limite

**Cause:** Cumul de petites transactions ou erreur

**Solution:**
1. Alerter le client automatiquement
2. Bloquer les retraits supplémentaires
3. Exiger un dépôt pour normaliser
4. Réviser les limites si nécessaire

### Problème 3: Frais de Maintenance Non Prélevés

**Cause:** Solde insuffisant

**Solution:**
1. Ajouter les frais impayés au découvert
2. Notifier le client
3. Suspendre le compte si non régularisé sous 7 jours

---

## 📱 Intégration Future

### Fonctionnalités Prévues

**Mobile Banking:**
- Consultation de solde en temps réel
- Historique des transactions
- Alertes SMS/Push

**Services Additionnels:**
- Virements inter-comptes
- Paiements de factures
- Recharge mobile

**Automatisation:**
- Virements programmés
- Prélèvements automatiques
- Alertes personnalisées

---

## 📚 Ressources

### Documentation Technique
- API Backend: `/api/CurrentAccount`
- Types TypeScript: `CurrentAccount` interface
- Validation: `currentAccountSchema` (Yup)

### Composants
- `CurrentAccountForm.tsx` - Formulaire de création
- `CurrentAccountManagement.tsx` - Interface de gestion

### Services
- `apiService.ts` - Appels API (à implémenter)

---

## 🎓 Formation

### Pour Administrateurs

**Module 1: Création de Compte**
- Comprendre les paramètres
- Évaluer le profil client
- Configurer le découvert

**Module 2: Gestion Quotidienne**
- Surveiller les comptes
- Gérer les alertes
- Traiter les demandes

**Module 3: Maintenance**
- Prélèvement des frais
- Calcul des intérêts
- Génération de rapports

### Pour Agents

**Module 1: Ouverture**
- Collecter les documents
- Remplir le formulaire
- Valider l'identité

**Module 2: Service Client**
- Consulter les informations
- Expliquer les frais
- Résoudre les problèmes

---

**Version:** 1.0  
**Dernière mise à jour:** Octobre 2025  
**Auteur:** Équipe Kredi Ti Machann
