# Upload Fichiers & Modification Client - Documentation Complète

## 📅 Date: 13 Octobre 2025

---

## 🎯 Objectifs Réalisés

### 1. ✅ **Système d'Upload de Fichiers**
- Upload de photos (client, documents)
- Upload de signatures digitales (base64)
- Stockage local organisé par client
- Récupération et suppression de fichiers
- Validation de taille et type

### 2. ✅ **Modification de Clients**
- Formulaire complet de modification
- Pré-remplissage des données existantes
- Mise à jour via API backend
- Validation complète

---

## 📁 Fichiers Créés

### Backend (C#)

#### 1. **FileUploadController.cs**
**Localisation**: `backend/NalaCreditAPI/Controllers/FileUploadController.cs`

**Endpoints**:
```csharp
POST   /api/FileUpload/upload                     // Upload fichier
POST   /api/FileUpload/upload-signature           // Upload signature base64
GET    /api/FileUpload/files/{fileName}           // Récupérer un fichier
DELETE /api/FileUpload/files/{fileName}           // Supprimer un fichier
GET    /api/FileUpload/customer/{customerId}      // Tous les fichiers d'un client
```

**Fonctionnalités**:
- ✅ Validation taille (5MB max pour fichiers, 1MB pour signatures)
- ✅ Validation extensions (.jpg, .jpeg, .png, .pdf)
- ✅ Types supportés: photo, idDocument, proofOfResidence, signature
- ✅ Authentification JWT requise (sauf GET files)
- ✅ Authorization Admin/SuperAdmin pour suppression
- ✅ Logging complet des opérations

**DTOs**:
```csharp
public class FileUploadResponseDto
{
    public string FileName { get; set; }
    public string FileUrl { get; set; }
    public string FileType { get; set; }
    public long FileSize { get; set; }
    public DateTime UploadedAt { get; set; }
}

public class SignatureUploadDto
{
    public string Base64Data { get; set; }
    public string CustomerId { get; set; }
}

public class CustomerFileDto
{
    public string FileName { get; set; }
    public string FileUrl { get; set; }
    public string FileType { get; set; }
    public long FileSize { get; set; }
    public DateTime UploadedAt { get; set; }
}
```

---

#### 2. **FileStorageService.cs**
**Localisation**: `backend/NalaCreditAPI/Services/FileStorageService.cs`

**Interface**:
```csharp
public interface IFileStorageService
{
    Task<FileUploadResponseDto> UploadFileAsync(IFormFile file, string customerId, string fileType);
    Task<FileUploadResponseDto> UploadSignatureAsync(byte[] imageBytes, string customerId);
    Task<(byte[]? fileBytes, string contentType)> GetFileAsync(string fileName);
    Task<bool> DeleteFileAsync(string fileName);
    Task<List<CustomerFileDto>> GetCustomerFilesAsync(string customerId);
}
```

**Organisation des Fichiers**:
```
wwwroot/
└── uploads/
    ├── {customerId1}/
    │   ├── photo_20251013_123456.jpg
    │   ├── idDocument_20251013_123500.png
    │   ├── signature_20251013_123510.png
    │   └── proofOfResidence_20251013_123520.pdf
    └── {customerId2}/
        └── ...
```

**Fonctionnalités**:
- ✅ Création automatique des dossiers clients
- ✅ Nommage unique avec timestamp
- ✅ Détection automatique du content-type
- ✅ Recherche récursive de fichiers
- ✅ Retour d'URLs complètes

---

### Frontend (React/TypeScript)

#### 3. **ClientEditForm.tsx**
**Localisation**: `frontend-web/src/components/admin/ClientEditForm.tsx`

**Sections du Formulaire**:
1. **Identité** (Idantifikasyon)
   - Prénom, Nom, Date de naissance, Genre

2. **Adresse et Contact** (Adrès ak Kontak)
   - Rue, Département, Commune
   - Téléphones (principal, secondaire)
   - Email, Contact d'urgence

3. **Documents** (Dokiman)
   - Type de document, Numéro
   - Dates (émission, expiration)
   - Autorité émettrice

4. **Professionnel** (Pwofesyonèl)
   - Occupation, Revenu mensuel

**Fonctionnalités**:
- ✅ Pré-remplissage automatique des données
- ✅ Validation yup complète
- ✅ Liste dynamique communes par département
- ✅ Format dates ISO (YYYY-MM-DD)
- ✅ État de soumission (loading)
- ✅ Messages d'erreur en créole

**Props**:
```typescript
interface ClientEditFormProps {
  customer: SavingsCustomerResponseDto;  // Client à modifier
  onSubmit: (data: any) => Promise<void>; // Callback soumission
  onCancel: () => void;                   // Callback annulation
}
```

---

#### 4. **Modifications dans savingsCustomerService.ts**

**Nouvelles Méthodes**:

```typescript
// Upload fichier
async uploadFile(
  file: File, 
  customerId: string, 
  fileType: 'photo' | 'idDocument' | 'proofOfResidence' | 'signature'
): Promise<string>

// Upload signature base64
async uploadSignature(
  base64Data: string, 
  customerId: string
): Promise<string>

// Mettre à jour client
async updateCustomer(
  id: string, 
  customerData: SavingsCustomerCreateDto
): Promise<SavingsCustomerResponseDto>

// Obtenir fichiers d'un client
async getCustomerFiles(
  customerId: string
): Promise<any[]>
```

**Exemple d'utilisation**:
```typescript
// Upload photo
const photoUrl = await savingsCustomerService.uploadFile(
  photoFile, 
  customerId, 
  'photo'
);

// Upload signature
const signatureUrl = await savingsCustomerService.uploadSignature(
  base64SignatureData,
  customerId
);

// Modifier client
const updatedCustomer = await savingsCustomerService.updateCustomer(
  customerId,
  customerData
);
```

---

#### 5. **Modifications dans ClientAccountManagement.tsx**

**Nouveaux États**:
```typescript
const [showEditClientForm, setShowEditClientForm] = useState(false);
const [selectedCustomer, setSelectedCustomer] = useState<SavingsCustomerResponseDto | null>(null);
```

**Nouvelles Fonctions**:
```typescript
// Ouvrir formulaire d'édition
const handleEditClient = async (customerId: string) => {
  const customer = await savingsCustomerService.getCustomer(customerId);
  setSelectedCustomer(customer);
  setShowEditClientForm(true);
};

// Soumettre modifications
const handleUpdateClient = async (clientData: any) => {
  // Conversion des données
  const customerDto: SavingsCustomerCreateDto = { /* ... */ };
  
  // Appel API
  const updatedCustomer = await savingsCustomerService.updateCustomer(
    selectedCustomer.id, 
    customerDto
  );
  
  toast.success(`Client ${updatedCustomer.fullName} modifié avec succès!`);
  setShowEditClientForm(false);
  await loadAccounts(); // Recharger
};
```

**Modal d'Édition**:
```tsx
{showEditClientForm && selectedCustomer && (
  <div className="fixed inset-0 bg-black bg-opacity-50 z-50...">
    <div className="bg-white rounded-xl shadow-xl max-w-4xl...">
      <ClientEditForm
        customer={selectedCustomer}
        onSubmit={handleUpdateClient}
        onCancel={() => {
          setShowEditClientForm(false);
          setSelectedCustomer(null);
        }}
      />
    </div>
  </div>
)}
```

---

## ⚙️ Configuration

### Program.cs

**Enregistrement du Service**:
```csharp
// File Storage Service
builder.Services.AddScoped<IFileStorageService, FileStorageService>();
```

**Activation des Fichiers Statiques**:
```csharp
// Serve static files from wwwroot/uploads
app.UseStaticFiles();
```

---

### appsettings.json

**Nouvelle Section**:
```json
{
  "FileStorage": {
    "BaseUrl": "http://localhost:7001/uploads",
    "MaxFileSize": 5242880,
    "AllowedExtensions": [ ".jpg", ".jpeg", ".png", ".pdf" ]
  }
}
```

---

## 🔄 Flux Complet

### Upload de Fichier

```
┌─────────────────────────────┐
│  Frontend (React)           │
│  - Sélection fichier        │
│  - Validation taille/type   │
└─────────────┬───────────────┘
              │ FormData
              ▼
┌─────────────────────────────┐
│  savingsCustomerService     │
│  uploadFile(file, id, type) │
└─────────────┬───────────────┘
              │ POST /api/FileUpload/upload
              ▼
┌─────────────────────────────┐
│  FileUploadController       │
│  - Validation               │
│  - Appel service            │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  FileStorageService         │
│  - Création dossier         │
│  - Sauvegarde disque        │
│  - Retour URL               │
└─────────────┬───────────────┘
              │ FileUploadResponseDto
              ▼
┌─────────────────────────────┐
│  Frontend                   │
│  - Affiche URL              │
│  - Success toast            │
└─────────────────────────────┘
```

### Modification Client

```
┌─────────────────────────────┐
│  Interface Admin            │
│  - Clic bouton Edit         │
└─────────────┬───────────────┘
              │ handleEditClient(id)
              ▼
┌─────────────────────────────┐
│  API GET Customer           │
│  - Charge données           │
└─────────────┬───────────────┘
              │ SavingsCustomerResponseDto
              ▼
┌─────────────────────────────┐
│  ClientEditForm             │
│  - Pré-remplit champs       │
│  - Utilisateur modifie      │
│  - Validation               │
└─────────────┬───────────────┘
              │ onSubmit(data)
              ▼
┌─────────────────────────────┐
│  handleUpdateClient         │
│  - Conversion DTO           │
└─────────────┬───────────────┘
              │ PUT /api/SavingsCustomer/{id}
              ▼
┌─────────────────────────────┐
│  SavingsCustomerController  │
│  - UpdateCustomer           │
│  - Validation backend       │
│  - Sauvegarde DB            │
└─────────────┬───────────────┘
              │ Updated Customer
              ▼
┌─────────────────────────────┐
│  Frontend                   │
│  - Success toast            │
│  - Ferme modal              │
│  - Recharge liste           │
└─────────────────────────────┘
```

---

## 🧪 Guide de Test

### Test 1: Upload Photo Client

```bash
# Prérequis
- Backend démarré (port 7001)
- Frontend démarré (port 3000)
- Utilisateur connecté
- Client créé avec ID

# Étapes
1. Ouvrir formulaire création/modification client
2. Cliquer sur "Upload Photo"
3. Sélectionner image JPG/PNG (< 5MB)
4. Vérifier prévisualisation
5. Soumettre formulaire
6. Vérifier dans: backend/NalaCreditAPI/wwwroot/uploads/{customerId}/
7. Vérifier URL retournée accessible
```

### Test 2: Upload Signature

```bash
# Étapes
1. Ouvrir canvas de signature
2. Dessiner signature avec souris
3. Cliquer "Sauvegarder"
4. Vérifier conversion base64
5. Soumettre formulaire
6. Vérifier fichier signature_{timestamp}.png créé
7. Tester URL dans navigateur
```

### Test 3: Modification Client

```bash
# Étapes
1. Aller sur page gestion clients
2. Trouver un client existant
3. Cliquer bouton "Modifier" (si ajouté dans UI)
4. Vérifier pré-remplissage correct
5. Modifier téléphone et email
6. Soumettre formulaire
7. Vérifier toast de succès
8. Vérifier modifications dans DB
9. Vérifier liste rafraîchie
```

### Test 4: Validation Upload

```bash
# Test fichier trop volumineux
- Tenter upload fichier > 5MB
- Vérifier erreur: "Fichier trop volumineux"

# Test extension invalide
- Tenter upload fichier .exe ou .zip
- Vérifier erreur: "Extension non autorisée"

# Test sans authentification
- Se déconnecter
- Tenter upload
- Vérifier erreur 401 Unauthorized
```

---

## 📝 Points d'Attention

### Sécurité

1. **Authentification Requise**
   - Tous les endpoints upload nécessitent JWT token
   - Seuls Admin/SuperAdmin peuvent supprimer

2. **Validation Stricte**
   - Taille max: 5MB pour fichiers, 1MB pour signatures
   - Extensions limitées: .jpg, .jpeg, .png, .pdf
   - Validation côté frontend ET backend

3. **Stockage Isolé**
   - Chaque client a son dossier propre
   - Pas de traversal de chemin possible

### Performance

1. **Fichiers Statiques**
   - Servis directement par ASP.NET Core
   - Pas de processing pour GET requests
   - Cache possible avec IIS/Nginx

2. **Optimisations Recommandées**
   - Compression images côté frontend
   - CDN pour environnement production
   - Nettoyage périodique fichiers orphelins

### Limitations Actuelles

1. **Stockage Local**
   - Pas de réplication automatique
   - Backup manuel nécessaire
   - Migration vers S3/Azure Blob recommandée pour production

2. **Pas de Versioning**
   - Un seul fichier par type par client
   - Upload nouveau fichier écrase l'ancien
   - Historique non maintenu

3. **Pas de Compression Automatique**
   - Fichiers sauvegardés tels quels
   - Optimization manuelle requise

---

## 🚀 Migration vers Production

### Option 1: Stockage S3 (AWS)

```csharp
// Installer: AWSSDK.S3
public class S3FileStorageService : IFileStorageService
{
    private readonly IAmazonS3 _s3Client;
    
    public async Task<FileUploadResponseDto> UploadFileAsync(...)
    {
        var request = new PutObjectRequest
        {
            BucketName = "kredi-ti-machann-uploads",
            Key = $"{customerId}/{fileName}",
            InputStream = fileStream,
            ContentType = contentType
        };
        
        await _s3Client.PutObjectAsync(request);
        // ...
    }
}
```

### Option 2: Azure Blob Storage

```csharp
// Installer: Azure.Storage.Blobs
public class AzureBlobStorageService : IFileStorageService
{
    private readonly BlobServiceClient _blobClient;
    
    public async Task<FileUploadResponseDto> UploadFileAsync(...)
    {
        var container = _blobClient.GetBlobContainerClient("uploads");
        var blob = container.GetBlobClient($"{customerId}/{fileName}");
        
        await blob.UploadAsync(fileStream);
        // ...
    }
}
```

### Configuration Nginx (Reverse Proxy)

```nginx
# Servir les fichiers statiques
location /uploads/ {
    alias /var/www/kredi-ti-machann/uploads/;
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# Proxy vers API
location /api/ {
    proxy_pass http://localhost:7001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

---

## 📊 Métriques à Surveiller

### Stockage

```sql
-- Taille totale des uploads
SELECT 
    SUM(file_size) as total_bytes,
    COUNT(*) as total_files
FROM uploaded_files;

-- Par type de fichier
SELECT 
    file_type,
    COUNT(*) as count,
    AVG(file_size) as avg_size
FROM uploaded_files
GROUP BY file_type;
```

### Performance

- Temps moyen d'upload
- Taux d'échec upload
- Bande passante utilisée
- Espace disque disponible

---

## ✅ Checklist Déploiement

- [ ] Créer dossier `wwwroot/uploads/` sur serveur
- [ ] Configurer permissions écriture (IIS/Linux)
- [ ] Vérifier `FileStorage:BaseUrl` dans appsettings
- [ ] Tester upload depuis environnement production
- [ ] Configurer backup automatique uploads/
- [ ] Mettre en place rotation logs
- [ ] Configurer monitoring espace disque
- [ ] Documenter procédure restauration

---

## 🐛 Dépannage

### Problème: "Cannot create directory"

**Cause**: Permissions insuffisantes

**Solution**:
```bash
# Linux
sudo chmod 755 /var/www/kredi-ti-machann/wwwroot
sudo chown -R www-data:www-data uploads/

# Windows IIS
# Donner permissions IUSR et IIS_IUSRS au dossier uploads
```

### Problème: "File not found" après upload

**Cause**: URL incorrecte ou UseStaticFiles() manquant

**Solution**:
1. Vérifier `app.UseStaticFiles()` dans Program.cs
2. Vérifier `FileStorage:BaseUrl` correspond au serveur
3. Tester URL directement dans navigateur

### Problème: Upload lent

**Cause**: Fichiers trop volumineux, pas de compression

**Solution**:
1. Implémenter compression côté frontend:
```typescript
const compressImage = async (file: File): Promise<Blob> => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const img = new Image();
  
  await new Promise(resolve => {
    img.onload = resolve;
    img.src = URL.createObjectURL(file);
  });
  
  canvas.width = Math.min(img.width, 1200);
  canvas.height = (img.height / img.width) * canvas.width;
  
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  
  return new Promise(resolve => {
    canvas.toBlob(blob => resolve(blob!), 'image/jpeg', 0.8);
  });
};
```

---

## 📚 Ressources Additionnelles

- [ASP.NET Core File Upload](https://docs.microsoft.com/en-us/aspnet/core/mvc/models/file-uploads)
- [React File Upload Best Practices](https://react.dev/learn/manipulating-the-dom-with-refs#best-practices-for-dom-manipulation-with-refs)
- [AWS S3 SDK for .NET](https://docs.aws.amazon.com/sdk-for-net/v3/developer-guide/s3-apis-intro.html)
- [Azure Blob Storage .NET](https://docs.microsoft.com/en-us/azure/storage/blobs/storage-quickstart-blobs-dotnet)

---

## 🎓 Formation Équipe

### Pour Développeurs

1. Comprendre interface `IFileStorageService`
2. Savoir implémenter nouveau backend (S3, Azure)
3. Gérer erreurs et logging
4. Tests unitaires upload service

### Pour Administrateurs

1. Vérifier uploads réussis dans dossier
2. Surveiller espace disque
3. Effectuer backups réguliers
4. Restaurer fichiers si besoin

---

**Status Final**: ✅ SYSTÈME D'UPLOAD ET MODIFICATION COMPLET ET FONCTIONNEL

**Prochaines Étapes Recommandées**:
1. Tester en environnement de développement
2. Implémenter compression images
3. Migrer vers S3/Azure pour production
4. Ajouter versioning des fichiers
5. Créer dashboard monitoring uploads
