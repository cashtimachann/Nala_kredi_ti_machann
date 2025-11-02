# Dashboard Caissier - Guide d'Utilisation

## Vue d'ensemble

Le Dashboard Caissier de Nala Kredi est une interface complète qui permet la gestion fluide des opérations de caisse quotidiennes dans les succursales.

## Fonctionnalités Principales

### 1. 💰 Suivi en Temps Réel du Solde de Caisse

**Affichage des Soldes:**
- Solde actuel en HTG (Gourdes) et USD (Dollars)
- Indicateur visuel de l'équilibre de la caisse
- Détails des soldes d'ouverture, entrées et sorties
- Calcul automatique du solde théorique de clôture

**Graphique d'Évolution:**
- Visualisation en temps réel de l'évolution des soldes HTG et USD
- Mise à jour automatique toutes les 30 secondes
- Graphique ScottPlot interactif

### 2. 📊 Résumé des Transactions du Jour

**Statistiques Détaillées:**
- **Dépôts:** Nombre et montants totaux (HTG et USD)
- **Retraits:** Nombre et montants totaux (HTG et USD)
- **Opérations de Change:**
  - Vente de USD (montant total en HTG)
  - Achat de USD (montant total en USD)

### 3. 🕒 Liste des Dernières Transactions

**Tableau Interactif:**
- Affichage des 10 dernières opérations
- Informations: Heure, Type, Client/Compte, Montant, Statut
- Statuts visuels avec codes couleur
- Bouton de rafraîchissement manuel

### 4. 🔴🟡 Système d'Alertes Automatiques

**Types d'Alertes:**
- **Avertissement (Jaune):** Solde approchant des seuils (>80%)
- **Critique (Rouge):** Solde dépassant les seuils de sécurité

**Seuils Configurables:**
- HTG: Avertissement à 2M, Critique à 2.5M
- USD: Avertissement à 12K, Critique à 15K
- Alertes pour soldes trop bas (HTG < 100K, USD < 500)

### 5. 👤 Statistiques Personnelles

**Métriques de Performance:**
- Clients servis aujourd'hui
- Transactions traitées
- Temps moyen par transaction
- Taux d'erreur avec indicateur coloré
- Progression vers l'objectif journalier (barre de progression)

### 6. ⚡ Actions Rapides

**Barre d'Outils Principale:**
- **➕ Dépôt:** Nouveau dépôt
- **➖ Retrait:** Nouveau retrait  
- **🔄 Change:** Opération de change
- **🔒 Clôture:** Fermeture de caisse

**Panel d'Actions Secondaires:**
- **👤 Consultation:** Recherche de compte client
- **📊 Rapport:** Génération de rapport journalier
- **📈 Export:** Export Excel des données
- **⚙️ Configuration:** Paramètres
- **📞 Support:** Contact support technique

### 7. 📱 Informations de Session

**En-tête:**
- Nom du caissier connecté
- Heure d'ouverture de session
- Horloge en temps réel
- Statut de session (CAISSE OUVERTE/FERMÉE)

**Barre de Statut:**
- Nom de la succursale
- Identifiant de session
- Statut de connexion réseau
- Heure de la dernière transaction

## Interface Utilisateur

### Design et Ergonomie
- **Design Moderne:** Interface avec cards et ombres portées
- **Codes Couleur:** HTG (Vert), USD (Bleu), Alertes (Jaune/Rouge)
- **Responsive:** Adaptation à différentes tailles d'écran
- **Accessibilité:** Boutons avec icônes et textes clairs

### Mise à Jour Automatique
- **Timer Principal:** Rafraîchissement chaque seconde
- **Données:** Mise à jour des statistiques toutes les 30 secondes
- **Alertes:** Vérification automatique des seuils
- **Graphique:** Actualisation en temps réel

## Configuration et Personnalisation

### Seuils d'Alerte
```csharp
// Valeurs par défaut configurables
HTGWarningThreshold = 2_000_000m
HTGCriticalThreshold = 2_500_000m
USDWarningThreshold = 12_000m
USDCriticalThreshold = 15_000m
```

### Objectifs Journaliers
- Paramétrage des objectifs de transactions
- Suivi du pourcentage de completion
- Indicateurs visuels de progression

## Architecture Technique

### Technologies Utilisées
- **WPF** avec .NET 8
- **MVVM Pattern** avec CommunityToolkit.Mvvm
- **ScottPlot** pour les graphiques
- **SignalR** pour les mises à jour temps réel
- **Dependency Injection** pour les services

### Services Principaux
- **ICashierService:** Gestion des sessions et soldes
- **ITransactionService:** Traitement des transactions
- **IAlertService:** Système d'alertes
- **IReportService:** Génération de rapports

### Modèles de Données
- **CashierSession:** Session caissier
- **TransactionSummary:** Résumé de transaction
- **CashierAlert:** Alertes système
- **CashierStatistics:** Statistiques de performance

## Démarrage et Utilisation

### Lancement du Dashboard
```bash
cd "frontend-desktop\NalaCreditDesktop"
dotnet run
```

### Première Utilisation
1. Le dashboard se lance avec des données simulées
2. Les statistiques se mettent à jour automatiquement
3. Les alertes sont vérifiées en continu
4. Le graphique affiche l'évolution des soldes

### Workflow Typique d'une Journée
1. **Ouverture:** Vérification des soldes d'ouverture
2. **Opérations:** Utilisation des boutons d'actions rapides
3. **Surveillance:** Monitoring des alertes et statistiques
4. **Clôture:** Processus de fermeture avec vérification

## Sécurité et Conformité

### Contrôles Intégrés
- Alertes automatiques sur les seuils
- Validation des opérations critiques
- Traçabilité complète des actions
- Sauvegarde automatique des données

### Rapports et Audit
- Génération de rapports journaliers PDF
- Export Excel pour analyse
- Historique complet des transactions
- Journalisation des alertes

## Support et Maintenance

### Diagnostics Intégrés
- Statut de connexion réseau en temps réel
- Vérification de l'état des services
- Alertes système en cas de problème

### Contacts Support
- Bouton support intégré dans l'interface
- Documentation complète disponible
- Assistance technique disponible

---

**Version:** 1.0.0  
**Dernière mise à jour:** Octobre 2025  
**Développé pour:** Nala Kredi System