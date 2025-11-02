# Endpoints Backend pou Dashboard Secrétaire Administratif

## ✅ DISPONIB (Endpoints ki egziste deja)

### 1️⃣ **JESYON KLIYAN** (Gestion des Clients)

#### Kreye Nouvo Kont (Nouveau Compte)
- **Endpoint:** `POST /api/SavingsCustomer`
- **Sèvis:** SavingsCustomerController.CreateCustomer
- **Fonksyonalite:** Kreye nouvo kliyan ak validasyon KYC
- **Done ki bezwen:** Nom, Prenon, Telefòn, Dokiman, Adrès, etc.

#### Mete Kliyan a Jou (Mise à Jour Client)
- **Endpoint:** `PUT /api/SavingsCustomer/{id}`
- **Sèvis:** SavingsCustomerController.UpdateCustomer
- **Fonksyonalite:** Modifye enfòmasyon kliyan
- **Done ki bezwen:** ID kliyan + done pou modifye

#### Konsiltasyon Kont (Consultation de Compte)
- **Endpoint:** `GET /api/SavingsAccount/by-number/{accountNumber}`
- **Sèvis:** SavingsAccountController.GetAccountByNumber
- **Fonksyonalite:** Wè detay kont kliyan
- **Retounen:** Enfòmasyon konplè sou kont lan

#### Chèche Kliyan (Recherche Client)
- **Endpoint:** `GET /api/SavingsCustomer/search?searchTerm={term}`
- **Sèvis:** SavingsCustomerController.SearchCustomers
- **Fonksyonalite:** Chèche kliyan pa non, telefòn, oswa dokiman
- **Minim:** 2 karaktè pou chèche

#### Jwenn Kliyan pa Telefòn
- **Endpoint:** `GET /api/SavingsCustomer/by-phone/{phone}`
- **Sèvis:** SavingsCustomerController.GetCustomerByPhone
- **Fonksyonalite:** Chèche kliyan ak nimewo telefòn

#### Jwenn Kliyan pa Dokiman
- **Endpoint:** `GET /api/SavingsCustomer/by-document?documentType={type}&documentNumber={number}`
- **Sèvis:** SavingsCustomerController.GetCustomerByDocument
- **Fonksyonalite:** Chèche kliyan ak dokiman idantite

---

### 2️⃣ **JESYON DOKIMAN** (Gestion des Documents)

#### Upload Dokiman (Upload)
- **Endpoint:** `POST /api/FileUpload/upload`
- **Sèvis:** FileUploadController.UploadFile
- **Fonksyonalite:** Upload foto, dokiman idantite, prèv adrès
- **Aksepte:** JPG, JPEG, PNG, PDF (Max 5MB)
- **Tip Fichier:** 
  - `photo` - Foto kliyan
  - `idDocument` - Dokiman idantite
  - `proofOfResidence` - Prèv adrès
  - `signature` - Siyati kliyan

#### Upload Siyati (Signature)
- **Endpoint:** `POST /api/FileUpload/upload-signature`
- **Sèvis:** FileUploadController.UploadSignature
- **Fonksyonalite:** Upload siyati an base64
- **Limit:** 1MB max

#### Jwenn Fichier
- **Endpoint:** `GET /api/FileUpload/files/{fileName}`
- **Sèvis:** FileUploadController.GetFile
- **Fonksyonalite:** Telechaje/Vizwalize fichier

#### Jwenn Tout Dokiman Kliyan
- **Endpoint:** `GET /api/FileUpload/customer/{customerId}`
- **Sèvis:** FileUploadController.GetCustomerFiles
- **Fonksyonalite:** Wè tout dokiman yon kliyan

#### Efase Fichier (Admin sèlman)
- **Endpoint:** `DELETE /api/FileUpload/files/{fileName}`
- **Sèvis:** FileUploadController.DeleteFile
- **Otorizasyon:** Admin, SuperAdmin sèlman

---

### 3️⃣ **VALIDASYON KYC** (Validation KYC)

#### Valide Kliyan
- **Endpoint:** `POST /api/SavingsCustomer/{id}/validate`
- **Sèvis:** SavingsCustomerController.ValidateCustomer
- **Fonksyonalite:** Valide dokiman KYC kliyan

#### Verifye Telefòn Inik
- **Endpoint:** `GET /api/SavingsCustomer/check-phone-unique?phone={phone}`
- **Sèvis:** SavingsCustomerController.CheckPhoneUnique
- **Fonksyonalite:** Verifye si nimewo telefòn pa genyen deja

#### Verifye Dokiman Inik
- **Endpoint:** `GET /api/SavingsCustomer/check-document-unique?documentType={type}&documentNumber={number}`
- **Sèvis:** SavingsCustomerController.CheckDocumentUnique
- **Fonksyonalite:** Verifye si dokiman pa genyen deja

---

### 4️⃣ **ENPRIME DOKIMAN** (Impression Documents)

#### Jenere Relve Kont
- **Endpoint:** `POST /api/SavingsAccount/{accountId}/statement`
- **Sèvis:** SavingsAccountController.GenerateStatement
- **Fonksyonalite:** Jenere relve kont pou yon peryòd
- **Parametè:** DateDebut, DateFin, AccountId

#### Jwenn Tranzaksyon Kont
- **Endpoint:** `GET /api/SavingsAccount/{accountId}/transactions`
- **Sèvis:** SavingsAccountController.GetAccountTransactions
- **Fonksyonalite:** Wè tout tranzaksyon yon kont
- **Itilite:** Pou enprime relve detaye

---

### 5️⃣ **RAPÒ** (Rapports)

#### Dashboard Jesyon
- **Endpoint:** `GET /api/Dashboard/system-admin`
- **Sèvis:** DashboardController.GetSystemAdminDashboard
- **Fonksyonalite:** Rapò jeneral sistèm
- **Aksè:** SystemAdmin sèlman

#### Rapò Konptab
- **Endpoint:** `GET /api/Dashboard/accounting`
- **Sèvis:** DashboardController.GetAccountingDashboard
- **Fonksyonalite:** Rapò finansye (depo, retrè, kredi, etc.)
- **Aksè:** Accounting, Management

#### Estatistik Kont
- **Endpoint:** `GET /api/SavingsAccount/statistics`
- **Sèvis:** SavingsAccountController.GetStatistics
- **Fonksyonalite:** Estatistik sou tout kont yo
- **Aksè:** Admin sèlman

---

### 6️⃣ **JESYON SEKSYON KES** (Gestion Caisses)

#### Louvri Seksyon Kesye
- **Endpoint:** `POST /api/Transaction/open-cash-session`
- **Sèvis:** TransactionController.OpenCashSession
- **Fonksyonalite:** Louvri seksyon travay kesye

#### Fèmen Seksyon Kesye
- **Endpoint:** `POST /api/Transaction/close-cash-session`
- **Sèvis:** TransactionController.CloseCashSession
- **Fonksyonalite:** Fèmen seksyon ak rapò kesye

---

## ❌ PA DISPONIB (Endpoints ki manke)

### 1️⃣ **JESYON RDV** (Gestion Rendez-vous)
- ❌ Kreye randevou
- ❌ Modifye randevou
- ❌ Anile randevou
- ❌ Wè randevou jodi a
- ❌ Wè randevou semèn nan

**REKÒMANDASYON:** Bezwen kreye `AppointmentController` ak:
- POST /api/Appointment - Kreye RDV
- GET /api/Appointment/today - RDV jodi a
- GET /api/Appointment/week - RDV semèn nan
- PUT /api/Appointment/{id} - Modifye RDV
- DELETE /api/Appointment/{id} - Anile RDV

---

### 2️⃣ **JESYON DEMANN KLIYAN** (Demandes Clients)
- ❌ Kreye nouvo demann
- ❌ Swiv demann
- ❌ Mete demann a jou
- ❌ Fèmen demann
- ❌ Rapò demann

**REKÒMANDASYON:** Bezwen kreye `ClientRequestController` ak:
- POST /api/ClientRequest - Kreye demann
- GET /api/ClientRequest/{id} - Jwenn demann
- GET /api/ClientRequest/pending - Demann an atant
- PUT /api/ClientRequest/{id} - Mete a jou
- POST /api/ClientRequest/{id}/close - Fèmen demann

---

### 3️⃣ **NOTIFIKASYON** (Notifications)
- ❌ Jwenn notifikasyon
- ❌ Make notifikasyon kòm li
- ❌ Efase notifikasyon

**REKÒMANDASYON:** Bezwen kreye `NotificationController` ak:
- GET /api/Notification - Jwenn tout notifikasyon
- GET /api/Notification/unread - Notifikasyon pa li
- POST /api/Notification/{id}/mark-read - Make kòm li
- DELETE /api/Notification/{id} - Efase

---

## 📊 REZIME FONKSYONALITE DASHBOARD SEKRETÈ

| **Modil** | **Backend Status** | **Pourcentage** |
|-----------|-------------------|-----------------|
| 🟢 Nouvo Kont | ✅ Disponib | 100% |
| 🟢 Mise à Jour | ✅ Disponib | 100% |
| 🟢 Konsiltasyon | ✅ Disponib | 100% |
| 🟢 Dokiman KYC | ✅ Disponib | 100% |
| 🟢 Numerisation | ✅ Disponib | 100% |
| 🟢 Livret Epargne | ✅ Disponib | 90% |
| 🟢 Impression | ✅ Disponib | 90% |
| 🔴 Rendez-vous | ❌ Manke | 0% |
| 🔴 Demandes | ❌ Manke | 0% |
| 🟡 Rapports | ⚠️ Pasyèl | 60% |

**TOTAL DISPONIBILITE:** ~75% (7.5/10 modil gen backend konplè)

---

## 🔧 AKSYON PWOCHEN

### Priyorite 1: Konekte Fonksyonalite ki Egziste
1. Enplemante HttpClient pou konekte ak backend
2. Replace MessageBox placeholder yo ak vrè API call
3. Ajoute loading states ak error handling
4. Teste tout fonksyonalite ki gen backend

### Priyorite 2: Devlope Backend Mankan
1. Kreye `AppointmentController` ak CRUD konplè
2. Kreye `ClientRequestController` pou swiv demann
3. Kreye `NotificationController` pou notifikasyon
4. Ajoute rapò espesyalize pou sekretè

### Priyorite 3: Amelyorasyon
1. Ajoute webhook pou notifikasyon real-time
2. Enplemante système ticket pou swiv demann
3. Ajoute rapò Excel/PDF export
4. Kreye dashboard analytics pou sekretè

---

## 📝 NÒTE ENPÒTAN

### Otorizasyon
- Pifò endpoints gen `[Authorize]` attribute
- Kèk endpoints gen `[Authorize(Roles = "Admin")]`
- Secrétaire Administratif dwe gen access rights appropriés

### Validasyon
- Backend validate tout done anvan save
- Phone/Document uniqueness check disponib
- KYC validation inclus

### Files
- Max 5MB pou dokiman
- Max 1MB pou siyati
- Format: JPG, JPEG, PNG, PDF

### Pagination
- Pifò list endpoints sipòte pagination
- Use `pageNumber` ak `pageSize` parametè

---

## 🎯 KONKLIZYON

**Bon Nouvèl:** 75% de fonksyonalite Dashboard Sekretè gen backend support deja! 🎉

**Travay Rete:** 
- Kreye 2-3 controllers (Appointment, ClientRequest, Notification)
- Konekte frontend ak backend ki egziste
- Teste ak debug

**Estimasyon Tan:**
- Konekte frontend: 2-3 jou
- Devlope backend mankan: 3-4 jou
- Testing: 1-2 jou
- **TOTAL: 1-2 semèn**
