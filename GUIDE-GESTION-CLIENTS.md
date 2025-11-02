# 📋 Guide Gestion des Clients - Kredi Ti Machann

## Vue d'ensemble

Le système de gestion des clients offre maintenant des fonctionnalités avancées pour rechercher, filtrer et exporter les profils clients en PDF.

## 🎯 Fonctionnalités Complètes

### 1. **Interface à Onglets** 🔄

L'interface administrative dispose maintenant de deux onglets principaux:
- **Comptes**: Gestion des comptes bancaires (épargne, courant, terme)
- **Clients**: Gestion complète des profils clients

### 2. **Recherche de Clients** 🔍

#### Barre de Recherche Rapide
- Recherche instantanée par:
  - Nom complet (prénom + nom)
  - Numéro de téléphone
  - Adresse email
  - Numéro de document d'identité
- Minimum 2 caractères requis pour lancer la recherche
- Résultats en temps réel

**Exemple d'utilisation:**
```
Tapez: "Jean" → Trouve tous les clients avec "Jean" dans le nom
Tapez: "3712" → Trouve tous les clients avec ce numéro de téléphone
Tapez: "CIN123" → Trouve le client avec ce numéro de document
```

### 3. **Filtres Avancés** 🎚️

#### Activation des Filtres
Cliquez sur "Filtre avanse" pour afficher le panneau de filtres avancés.

#### Filtres Disponibles

**A. Filtre par Département** 🗺️
- Tous les 10 départements d'Haïti disponibles:
  - Artibonite
  - Centre
  - Grand'Anse
  - Nippes
  - Nord
  - Nord-Est
  - Nord-Ouest
  - Ouest
  - Sud
  - Sud-Est

**B. Filtre par Statut** 📊
- Aktif: Clients actifs
- Inaktif: Clients désactivés
- An atant: Clients en attente de validation

**C. Filtre par Date de Création** 📅
- **Date de début**: Sélectionnez la date de début de la période
- **Date de fin**: Sélectionnez la date de fin de la période
- Permet de trouver tous les clients créés dans une période donnée

#### Combinaison de Filtres
Vous pouvez combiner plusieurs filtres ensemble:
```
Exemple: Département = "Ouest" + Date début = "2024-01-01"
Résultat: Tous les clients de l'Ouest créés depuis janvier 2024
```

#### Réinitialiser les Filtres
Cliquez sur "Efase filtre yo" pour effacer tous les filtres actifs.

### 4. **Actions sur les Clients** ⚡

Chaque client dans la liste dispose de trois boutons d'action:

#### A. **Bouton Edit** ✏️ (Bleu)
- **Icône**: Crayon
- **Action**: Ouvre le formulaire de modification
- **Utilisation**: Modifier les informations du client
- **Sections modifiables**:
  - Identité (nom, prénom, date de naissance, genre)
  - Adresse (rue, commune, département)
  - Contact (téléphones, email, contact d'urgence)
  - Documents (type, numéro, dates)
  - Professionnel (occupation, revenu mensuel)

#### B. **Bouton View** 👁️ (Gris)
- **Icône**: Œil
- **Action**: Affiche les détails complets du client
- **Utilisation**: Consulter rapidement toutes les informations
- Ouvre le même formulaire que "Edit" mais en mode lecture/modification

#### C. **Bouton Export PDF** 📄 (Vert)
- **Icône**: Téléchargement
- **Action**: Génère un PDF professionnel du profil client
- **Fonctionnalités**:
  - Ouvre dans une nouvelle fenêtre
  - Format professionnel avec logo et en-tête
  - Toutes les sections du profil incluses
  - Prêt pour l'impression ou l'enregistrement
  - Bouton d'impression intégré

### 5. **Export PDF - Détails** 📑

#### Contenu du PDF Exporté

Le PDF généré contient toutes les informations du client organisées en sections:

**1. En-tête Professionnel**
- Titre: PROFIL CLIENT
- Nom de l'organisation: Kredi Ti Machann
- Date d'émission du document
- Design professionnel avec bordures bleues

**2. Section Informations Personnelles**
- ✅ Nom complet
- ✅ Date de naissance (format français)
- ✅ Genre (Masculin/Féminin)
- ✅ ID Client unique

**3. Section Adresse**
- ✅ Adresse complète (rue)
- ✅ Commune
- ✅ Département
- ✅ Code postal (si disponible)

**4. Section Contact**
- ✅ Téléphone principal
- ✅ Téléphone secondaire (si disponible)
- ✅ Email (si disponible)
- ✅ Contact d'urgence avec téléphone (si disponible)

**5. Section Document d'Identité**
- ✅ Type de document (CIN, Passeport, Permis)
- ✅ Numéro de document
- ✅ Date d'émission
- ✅ Date d'expiration (si disponible)
- ✅ Autorité émettrice

**6. Section Professionnelle** (si disponible)
- ✅ Profession/Occupation
- ✅ Revenu mensuel (formaté en HTG)

**7. Pied de page**
- Date et heure de génération
- Bouton d'impression intégré (non visible à l'impression)

#### Utilisation du PDF

**Pour Imprimer:**
1. Cliquez sur le bouton Export PDF (icône verte de téléchargement)
2. Une nouvelle fenêtre s'ouvre avec le PDF formaté
3. Cliquez sur le bouton "🖨️ Imprimer / Enregistrer en PDF"
4. OU utilisez Ctrl+P (Windows) / Cmd+P (Mac)

**Pour Enregistrer:**
1. Suivez les étapes ci-dessus
2. Dans la boîte de dialogue d'impression:
   - Sélectionnez "Enregistrer en PDF" comme destination
   - Choisissez l'emplacement
   - Cliquez sur "Enregistrer"

**Cas d'usage:**
- 📄 Documentation pour dossiers de prêt
- 🏦 Archives administratives
- 📧 Envoi par email aux clients
- 🖨️ Impression pour signatures
- 💼 Présentations aux partenaires

### 6. **Statistiques en Temps Réel** 📊

Le panneau de filtres affiche en temps réel:
- Nombre total de clients trouvés après application des filtres
- Message: "X kliyan jwenn" (X clients trouvés)

### 7. **États de Chargement** ⏳

#### Pendant le Chargement
- Spinner animé avec message "Chajman kliyan yo..."
- Design centré et professionnel

#### Aucun Résultat
- Icône utilisateur gris
- Messages contextuels:
  - Si < 2 caractères: "Tape omwen 2 karakter..."
  - Si recherche vide: "Pa gen kliyan ki koresponn..."

## 🎨 Interface Utilisateur

### Codes Couleur des Boutons

| Bouton | Couleur | Action |
|--------|---------|--------|
| **Nouveau Client** | Vert | Créer un nouveau client |
| **Nouveau Compte** | Bleu | Créer un nouveau compte |
| **Edit** | Bleu | Modifier client |
| **View** | Gris | Voir détails |
| **Export PDF** | Vert | Générer PDF |

### Badges de Statut

| Statut | Couleur | Badge |
|--------|---------|-------|
| **Aktif** | Vert | `Aktif` |
| **Inaktif** | Rouge | `Inaktif` |
| **An atant** | Jaune | `An atant` |

## 🔧 Architecture Technique

### Composants Modifiés

**ClientAccountManagement.tsx**
- Ajout de `clientFilters` state pour filtres avancés
- Ajout de `showAdvancedFilters` pour toggle du panneau
- Fonction `handleExportClientPDF()` pour génération PDF
- Logique de filtrage avancée dans `filteredCustomers`

### Nouveaux États

```typescript
const [clientFilters, setClientFilters] = useState({
  department: '',
  status: '',
  dateFrom: '',
  dateTo: ''
});
const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
```

### Filtrage Intelligent

Le système applique les filtres dans l'ordre suivant:
1. Recherche textuelle (si >= 2 caractères)
2. Filtre par département
3. Filtre par statut
4. Filtre par plage de dates

**Logique de dates:**
- Date de début: Inclut la date sélectionnée à 00:00:00
- Date de fin: Inclut la date sélectionnée jusqu'à 23:59:59

## 📱 Responsive Design

- ✅ Grille adaptative pour filtres (1 colonne sur mobile, 4 sur desktop)
- ✅ Tableau scrollable horizontalement sur petits écrans
- ✅ Boutons d'action empilés sur mobile
- ✅ PDF optimisé pour impression A4

## 🔒 Sécurité

- Tous les appels API utilisent l'authentification JWT
- Validation côté client avant envoi
- Messages d'erreur informatifs sans exposer de données sensibles

## 📈 Performance

**Optimisations implémentées:**
- Filtrage côté client pour réponse instantanée
- Chargement lazy des clients (minimum 2 caractères)
- Génération PDF asynchrone (n'affecte pas l'UI principale)
- Mise en cache des résultats de recherche

## 🐛 Gestion des Erreurs

### Messages Utilisateur
- ✅ "Erreur lors du chargement des clients"
- ✅ "Veuillez autoriser les pop-ups pour exporter en PDF"
- ✅ "Fenêtre d'export ouverte - Utilisez Ctrl+P"

### Cas Limites
- Liste vide: Message approprié affiché
- Recherche < 2 caractères: Instructions affichées
- Échec de chargement: Fallback vers tableau vide

## 🚀 Utilisation Complète - Scénarios

### Scénario 1: Recherche Simple
```
1. Aller à l'onglet "Clients"
2. Taper "Jean" dans la barre de recherche
3. Voir tous les clients avec "Jean" dans le nom
```

### Scénario 2: Recherche avec Filtres
```
1. Aller à l'onglet "Clients"
2. Cliquer sur "Filtre avanse"
3. Sélectionner Département: "Ouest"
4. Sélectionner Statut: "Aktif"
5. Voir tous les clients actifs de l'Ouest
```

### Scénario 3: Export PDF
```
1. Trouver le client souhaité (via recherche/filtres)
2. Cliquer sur le bouton vert "Export PDF"
3. Une nouvelle fenêtre s'ouvre
4. Cliquer sur le bouton "Imprimer / Enregistrer en PDF"
5. Choisir "Enregistrer en PDF" dans les options
6. Sélectionner l'emplacement et enregistrer
```

### Scénario 4: Modification Client
```
1. Trouver le client
2. Cliquer sur le bouton bleu "Edit"
3. Modifier les informations nécessaires
4. Cliquer sur "Enregistrer"
5. Confirmation avec toast de succès
```

## 📝 Notes de Développement

### Dépendances
- React 18+
- TypeScript
- lucide-react (icônes)
- react-hot-toast (notifications)
- Axios (HTTP client)

### API Endpoints Utilisés
- `GET /api/SavingsCustomer` - Liste des clients
- `GET /api/SavingsCustomer/{id}` - Détails client
- `PUT /api/SavingsCustomer/{id}` - Mise à jour client
- `POST /api/SavingsCustomer/search` - Recherche clients

## 🎓 Formation Utilisateur

### Points Clés à Former
1. ✅ Différence entre recherche simple et filtres avancés
2. ✅ Utilisation du minimum 2 caractères pour recherche
3. ✅ Comment combiner plusieurs filtres
4. ✅ Processus complet d'export PDF
5. ✅ Navigation entre onglets Comptes/Clients

## ✨ Améliorations Futures Suggérées

1. **Export Excel** - Exporter liste de clients en Excel
2. **Export Multiple** - Sélectionner plusieurs clients pour export batch
3. **Modèles PDF** - Différents templates de PDF
4. **Historique** - Voir l'historique des modifications
5. **Recherche Avancée** - Opérateurs booléens (ET, OU, NON)
6. **Sauvegarde Filtres** - Sauvegarder des combinaisons de filtres
7. **Notifications** - Alertes pour documents expirés

## 📞 Support

Pour toute question ou problème:
- Vérifiez les logs de la console navigateur (F12)
- Vérifiez que l'API backend est en cours d'exécution
- Vérifiez la connexion réseau
- Consultez les messages toast pour diagnostics

---

**Version**: 2.0
**Dernière mise à jour**: Octobre 2025
**Auteur**: Équipe Kredi Ti Machann
