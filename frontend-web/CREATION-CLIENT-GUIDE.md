# Guide d'Utilisation - Création de Client (Kreyasyon Kliyan)

## Vue d'ensemble / Apèsi

Le système de création de client permet aux administrateurs de créer des profils complets de clients avec toutes les informations nécessaires pour l'ouverture de comptes d'épargne.

Sistèm kreyasyon kliyan an pèmèt administratè yo kreye pwofil konplè kliyan yo ak tout enfòmasyon yo bezwen pou ouvè kont epay.

---

## Comment Accéder / Kijan pou Aksede

1. **Connectez-vous** à l'interface web avec un compte administrateur
2. **Naviguez** vers "Gestion des Comptes Clients" (Client Account Management)
3. **Cliquez** sur le bouton vert **"Nouveau Client"** avec l'icône utilisateur

---

## Étapes du Formulaire / Etap Fòmilè a

### Étape 1: Identité (Idantifikasyon) ✓

- **Prénom** (Prenon) - Requis
- **Nom** (Non) - Requis
- **Date de naissance** (Dat nesans) - Requis
- **Lieu de naissance** (Kote ou fèt)
- **Genre** (Jandè) - Masculin/Féminin
- **Nationalité** (Nasyonalite)
- **NIF** - Numéro d'Identification Fiscale

### Étape 2: Coordonnées (Kòdone Kontak) ✓

**Adresse:**
- **Rue** (Adrès lari) - Requis
- **Département** (Depatman) - Requis
- **Commune** (Komin) - Liste dynamique selon département

**Contact:**
- **Téléphone Principal** (Telefòn prensipal) - Requis
  - Format: +509 XXXX XXXX ou XXXX XXXX
- **Téléphone Secondaire** (Telefòn segondè)
- **Email** (Imèl)

**Contact d'urgence:**
- **Nom** (Non)
- **Téléphone** (Telefòn)

### Étape 3: Documents (Dokiman) ✓

**Document d'identité:**
- **Type de document**:
  - CIN (Carte d'Identité Nationale)
  - Passeport
  - Permis de conduire
- **Numéro du document** - Requis
- **Date d'émission** (Dat emisyon) - Requis
- **Date d'expiration** (Dat ekspirasyon)
- **Autorité émettrice** (Otorite ki bay dokiman an) - Requis

**Uploads:**
- **Photo du client** (Foto kliyan an)
- **Photo du document** (Foto dokiman an)
- **Signature digitale** (Siyati dijital)
  - Canvas pour signer avec la souris ou le doigt

### Étape 4: Informations Professionnelles (Enfòmasyon Pwofesyonèl) ✓

- **Profession** (Okipasyon)
- **Employeur** (Anplwayè)
- **Source de revenu** (Sous revni)
- **Revenu mensuel** (Revni chak mwa)
- **Statut matrimonial** (Estati sivil):
  - Célibataire (Selibatè)
  - Marié(e) (Marye)
  - Divorcé(e) (Divòse)
  - Veuf/Veuve (Vèv)
- **Niveau d'éducation** (Nivo edikasyon)

### Étape 5: Confirmation ✓

- **Vérification** de toutes les informations saisies
- **Résumé complet** du profil client
- **Bouton de soumission** pour créer le client

---

## Intégration Backend / Entegrasyon Backend

### Configuration API

Le fichier `.env` contient l'URL de l'API:
```
REACT_APP_API_URL=http://localhost:7001/api
```

### Service API

Le service `savingsCustomerService.ts` gère toutes les communications avec le backend:

```typescript
// Créer un client
const customer = await savingsCustomerService.createCustomer(customerData);

// Rechercher par téléphone
const customer = await savingsCustomerService.getCustomerByPhone(phone);

// Rechercher par document
const customer = await savingsCustomerService.getCustomerByDocument(type, number);

// Vérifier l'unicité du téléphone
const check = await savingsCustomerService.checkPhoneUnique(phone);

// Vérifier l'unicité du document
const check = await savingsCustomerService.checkDocumentUnique(type, number);
```

### Format de Données (DTO)

Les données sont envoyées au backend au format **SavingsCustomerCreateDto**:

```typescript
{
  firstName: string;
  lastName: string;
  dateOfBirth: string; // Format: YYYY-MM-DD
  gender: SavingsGender; // 0 = Male, 1 = Female
  
  // Adresse
  street: string;
  commune: string;
  department: string;
  postalCode?: string;
  
  // Contact
  primaryPhone: string; // Format: +509XXXXXXXX
  secondaryPhone?: string;
  email?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  
  // Document
  documentType: SavingsIdentityDocumentType; // 0=CIN, 1=Passport, etc.
  documentNumber: string;
  issuedDate: string; // Format: YYYY-MM-DD
  expiryDate?: string;
  issuingAuthority: string;
  
  // Professionnel
  occupation?: string;
  monthlyIncome?: number;
}
```

### Endpoint Backend

```
POST /api/SavingsCustomer
Authorization: Bearer {token}
Content-Type: application/json
```

---

## Validation des Données / Validasyon Done yo

### Validations Frontend (Yup Schema)

- **Nom/Prénom**: 2-50 caractères
- **Téléphone**: Format haïtien valide (+509 XXXX XXXX)
- **Email**: Format email valide
- **Date de naissance**: Âge minimum 16 ans
- **Document**: Numéro minimum 5 caractères

### Validations Backend (C# Attributes)

- **[Required]**: Champs obligatoires
- **[StringLength]**: Longueur min/max
- **[RegularExpression]**: Format numéro haïtien
- **[EmailAddress]**: Format email
- **[Range]**: Revenu entre 0 et 1,000,000

---

## Gestion des Erreurs / Jesyon Erè yo

### Messages d'Erreur

```typescript
// Succès
toast.success('Client créé avec succès!');

// Erreur de connexion
toast.error('Aucune réponse du serveur. Vérifiez votre connexion.');

// Erreur de validation
toast.error('Vérifiez les informations saisies.');

// Erreur serveur
toast.error(error.message);
```

### Gestion des Doublons

Le système vérifie automatiquement:
- **Téléphone unique**: Pas de duplication de numéro
- **Document unique**: Pas de duplication de document d'identité

---

## Upload de Fichiers / Upload Fichye yo

### Types de Fichiers Supportés

- **Photo client**: JPG, PNG (max 5MB)
- **Document ID**: JPG, PNG, PDF (max 5MB)
- **Signature**: Canvas → PNG base64

### Processus d'Upload

1. **Sélection** du fichier via input ou drag-and-drop
2. **Validation** de la taille et du type
3. **Prévisualisation** de l'image
4. **Conversion** en base64 pour signature
5. **Upload** vers serveur (à configurer)

### Configuration Upload API

```typescript
// Dans savingsCustomerService.ts
async uploadFile(file: File, customerId: string, fileType: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('customerId', customerId);
  formData.append('fileType', fileType);
  
  const response = await axios.post(
    `${API_BASE_URL}/files/upload`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  
  return response.data.url;
}
```

**Note**: L'endpoint `/files/upload` doit être configuré dans le backend selon votre solution de stockage (S3, Azure Blob, système de fichiers local, etc.)

---

## Prochaines Étapes / Pwochen Etap yo

### Après Création du Client

1. ✅ **Client créé** avec ID unique
2. **Créer un compte** pour ce client:
   - Cliquer sur "Nouveau Compte" (bouton bleu)
   - Sélectionner le client créé
   - Choisir type de compte (Épargne, Courant, Terme)
   - Définir les paramètres du compte

### Fonctionnalités à Venir

- [ ] Upload automatique des fichiers lors de la création
- [ ] Validation biométrique (empreintes digitales)
- [ ] Vérification d'identité en temps réel
- [ ] Export PDF du profil client
- [ ] Historique des modifications
- [ ] Recherche avancée de clients

---

## Dépannage / Depanaj

### Problème: "Aucune réponse du serveur"

**Solution:**
1. Vérifier que le backend est démarré: `http://localhost:7001/api`
2. Vérifier le fichier `.env` pour l'URL correcte
3. Vérifier les logs du serveur backend

### Problème: "Erreur 401 Unauthorized"

**Solution:**
1. Vérifier que vous êtes connecté
2. Vérifier que le token JWT est valide
3. Se reconnecter si nécessaire

### Problème: "Validation failed"

**Solution:**
1. Vérifier que tous les champs requis sont remplis
2. Vérifier le format du téléphone (+509...)
3. Vérifier que l'âge minimum est respecté (16 ans)

### Problème: "Client already exists"

**Solution:**
1. Le téléphone ou le document existe déjà
2. Rechercher le client existant
3. Utiliser un autre numéro/document

---

## Support Technique

Pour toute question ou problème:
- **Email**: support@kredittimachann.com
- **Documentation**: Voir QUICK-START.md et README.md
- **Logs**: Vérifier la console du navigateur (F12)

---

## Licence

© 2025 Kredi Ti Machann - Tous droits réservés
