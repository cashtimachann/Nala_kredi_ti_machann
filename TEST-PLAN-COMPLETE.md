# Plan de Test Complet - Après Phase 1 & 2

**Date:** 1er Novembre 2025  
**Objectif:** Vérifier que TOUTES les fonctionnalités marchent après les modifications Phase 1 & 2

---

## 🎯 Status Tests

### ✅ = Testé et Fonctionnel
### ⚠️ = Testé avec warnings (non-bloquant)
### ❌ = Échec / Problème trouvé
### ⏳ = En attente de test

---

## 1. Authentication & Session Management

### 1.1 Login Flow ⏳
**Test Steps:**
1. Ouvrir http://localhost:3000/login
2. Entrer: `superadmin@nalacredit.com` / `SuperAdmin123!`
3. Cliquer "Se connecter"

**Validation:**
- [ ] Token stocké dans `sessionStorage` avec clé `auth_token`
- [ ] User info stocké dans `sessionStorage` avec clé `user`
- [ ] Redirection vers `/dashboard`
- [ ] Dashboard SuperAdmin s'affiche
- [ ] Pas d'erreurs console (sauf warnings ESLint)

**Points de vérification code:**
```typescript
// authStore.ts - setAuth() appelé
// AuthService.ts - login() normalise PascalCase → camelCase
// sessionStorage: auth_token, user
```

### 1.2 Session Hydration ⏳
**Test Steps:**
1. Login réussi
2. Rafraîchir page (F5)

**Validation:**
- [ ] Reste connecté (pas de redirect vers /login)
- [ ] `useAuthStore.hydrate()` appelé au mount App
- [ ] Token et user restaurés depuis sessionStorage

### 1.3 Logout ⏳
**Test Steps:**
1. Login
2. Cliquer menu utilisateur → Déconnexion

**Validation:**
- [ ] Redirect vers `/login`
- [ ] `auth_token` et `user` supprimés de sessionStorage
- [ ] `authStore.clearAuth()` appelé

### 1.4 Protected Routes ⏳
**Test Steps:**
1. Sans login, essayer d'accéder `/dashboard` directement

**Validation:**
- [ ] Redirect automatique vers `/login`
- [ ] Toutes routes protégées testées: `/branches`, `/savings`, etc.

---

## 2. Client Management (Savings)

### 2.1 Création Client - Personne Physique ⏳
**Test Steps:**
1. Login
2. Naviguer `/clients/new`
3. Laisser "Personne Physique" sélectionné
4. Remplir tous champs requis:
   - Prénom, Nom, Date Naissance
   - Genre (M/F)
   - Adresse (rue, commune, département)
   - Téléphone (+509XXXXXXXX)
   - Type doc, Numéro, Date émission, Autorité
5. Upload photo, CIN, preuve résidence
6. Signer dans canvas
7. Accepter conditions → Créer

**Validation:**
- [ ] Zod validation fonctionne (tous champs requis)
- [ ] `createClientSchemaZ(false)` utilisé
- [ ] Pas de `companyName` field visible
- [ ] Création réussie → Toast success
- [ ] Documents uploadés après création
- [ ] Signature sauvegardée
- [ ] Cache `/savings-customers` invalidé

**Vérification backend:**
```sql
SELECT * FROM SavingsCustomers ORDER BY CreatedAt DESC LIMIT 1;
-- IsBusiness = 0
-- FirstName, LastName remplis
```

### 2.2 Création Client - Personne Morale ⏳
**Test Steps:**
1. `/clients/new`
2. Toggle "Personne Morale"
3. Remplir:
   - Raison sociale, Forme juridique
   - Adresse siège, Téléphone
   - NIF entreprise, Registre commerce
   - **Représentant légal:** Nom complet, Titre, Document
4. Upload docs entreprise + représentant
5. Signer → Créer

**Validation:**
- [ ] `createClientSchemaZ(true)` utilisé
- [ ] Fields PP (prénom/nom/genre/dateNaissance) optionnels
- [ ] Fields PM requis: companyName, legalForm, etc.
- [ ] Transform `legalRepresentativeName` → `representativeFirstName` + `representativeLastName`
- [ ] Transform `businessRegistrationNumber` → `tradeRegisterNumber`
- [ ] Transform `companyNif` → `taxId`
- [ ] Backend reçoit `IsBusiness = true`

**Vérification backend:**
```sql
SELECT * FROM SavingsCustomers WHERE IsBusiness = 1 ORDER BY CreatedAt DESC LIMIT 1;
-- CompanyName rempli
-- RepresentativeFirstName, RepresentativeLastName séparés
```

### 2.3 Search & Filter Clients ⏳
**Test Steps:**
1. Naviguer `/client-accounts`
2. Taper nom dans search bar
3. Filtrer par commune, département
4. Toggle "Actifs seulement"

**Validation:**
- [ ] Search fonctionne avec debounce
- [ ] Cache TTL 15s sur `searchCustomers()`
- [ ] Skeleton rows pendant loading
- [ ] Résultats filtrés correctement

### 2.4 Toggle Customer Status ⏳
**Test Steps:**
1. Liste clients
2. Cliquer toggle Actif/Inactif

**Validation:**
- [ ] Status change immédiat (optimistic update)
- [ ] Backend PATCH `/savings-customers/{id}/toggle-status`
- [ ] Cache invalidé après mutation
- [ ] Toast confirmation

### 2.5 Edit Customer ⏳
**Test Steps:**
1. Cliquer "Modifier" sur un client
2. Changer téléphone, adresse
3. Sauvegarder

**Validation:**
- [ ] `updateCustomer()` appelé
- [ ] Cache invalidé
- [ ] ClientEditForm detecte type (PP vs PM)

### 2.6 Upload Documents ⏳
**Test Steps:**
1. Ouvrir DocumentUploadModal
2. Upload CIN, preuve résidence, photo
3. Mark documents comme "verified"

**Validation:**
- [ ] Upload via `uploadDocument()`
- [ ] Preview documents
- [ ] Download fonctionne

---

## 3. Account Operations

### 3.1 Create Savings Account ⏳
**Test Steps:**
1. Sélectionner client
2. Créer compte épargne
3. Spécifier devise (HTG/USD), montant initial

**Validation:**
- [ ] `createSavingsAccount()` appelé
- [ ] Balance initiale correcte
- [ ] Account number généré

### 3.2 Deposit Transaction ⏳
**Test Steps:**
1. Ouvrir compte
2. Faire dépôt 5000 HTG

**Validation:**
- [ ] Balance mise à jour
- [ ] Transaction enregistrée
- [ ] Receipt généré

### 3.3 Withdrawal Transaction ⏳
**Test Steps:**
1. Retirer 2000 HTG

**Validation:**
- [ ] Vérification balance suffisante
- [ ] Balance diminuée
- [ ] Transaction logged

### 3.4 Current Account Management ⏳
**Test Steps:**
1. Créer compte courant
2. Tester overdraft limit
3. Transactions multiples

**Validation:**
- [ ] Overdraft calculé correctement
- [ ] Frais appliqués si applicable

### 3.5 Term Savings ⏳
**Test Steps:**
1. Créer DAT (Dépôt à Terme)
2. Calculer intérêts
3. Vérifier maturity date

**Validation:**
- [ ] Interest calculation correcte
- [ ] Early withdrawal penalty si applicable

---

## 4. Branch & Admin Management

### 4.1 Branch CRUD ⏳
**Test Steps:**
1. `/branches`
2. Create nouvelle succursale
3. Edit nom, code
4. Activate/Deactivate

**Validation:**
- [ ] `getAllBranches()` avec cache 30s
- [ ] `getBranchById()` avec cache 60s
- [ ] Mutations invalident cache via `BaseApiService.invalidateCacheByPrefix('/branch')`

### 4.2 Admin Account Management ⏳
**Test Steps:**
1. `/admin/accounts`
2. Create nouvel admin
3. Assign role (Cashier, Manager, etc.)
4. Toggle status

**Validation:**
- [ ] Role mapping correct
- [ ] Permissions vérifiées backend

### 4.3 Branch Manager Assignment ⏳
**Test Steps:**
1. Edit branch
2. Assign manager via dropdown

**Validation:**
- [ ] `getAvailableManagers()` avec cache 60s
- [ ] Assignment persiste

---

## 5. Cache & Performance

### 5.1 GET Cache TTL ⏳
**Test Steps:**
1. Load `/branches`
2. Note le timestamp request dans Network tab
3. Re-load avant 30s
4. Re-load après 30s

**Validation:**
- [ ] Première requête hit API
- [ ] Deuxième requête (avant 30s) = cache hit (pas de network request)
- [ ] Troisième requête (après 30s) = cache miss → nouveau API call

**Endpoints à tester:**
- [ ] `/branch` - 30s TTL
- [ ] `/branch/{id}` - 60s TTL
- [ ] `/savings-customers` - 30s TTL
- [ ] `/savings-customers/phone/{phone}` - 60s TTL
- [ ] `/employees` - 20s TTL
- [ ] `/users/available-managers` - 60s TTL

### 5.2 Cache Invalidation ⏳
**Test Steps:**
1. Load branches (cache hit)
2. Create nouvelle branch
3. Re-load branches immédiatement

**Validation:**
- [ ] Cache invalidé après `createBranch()`
- [ ] New branch visible immédiatement
- [ ] `BaseApiService.invalidateCacheByPrefix('/branch')` appelé

**Mutations à tester:**
- [ ] `createBranch()` → invalide `/branch`
- [ ] `updateBranch()` → invalide `/branch`
- [ ] `deleteBranch()` → invalide `/branch`
- [ ] `createEmployee()` → invalide `/employees`
- [ ] `updateEmployee()` → invalide `/employees`

### 5.3 Skeleton Loading ⏳
**Test Steps:**
1. Ouvrir `/client-accounts` avec réseau throttle (Chrome DevTools → Network → Slow 3G)

**Validation:**
- [ ] Skeleton rows s'affichent immédiatement
- [ ] Transition fluide vers données réelles

### 5.4 Global Loading Overlay ⏳
**Test Steps:**
1. Submit ClientCreationForm (operation lente)

**Validation:**
- [ ] Overlay bloque UI pendant operation
- [ ] `withGlobalLoading()` HOF utilisé
- [ ] Disparaît après completion

---

## 6. Forms & Validation

### 6.1 Login Validation (Zod) ⏳
**Test Steps:**
1. Login form
2. Enter invalid email: "bad"
3. Enter short password: "123"

**Validation:**
- [ ] `loginSchema` validation déclenche
- [ ] Error messages affichés
- [ ] Submit bloqué

### 6.2 Client Creation Validation ⏳
**Test Steps:**
1. ClientCreationForm PP
2. Skip required fields: prénom, téléphone
3. Enter invalid phone: "123"

**Validation:**
- [ ] `createClientSchemaZ(false)` validation
- [ ] Regex phone haïtien: `/^(\+509\s?)?[234579]\d{7}$/`
- [ ] Required fields marked with errors

### 6.3 Branch Form Validation ⏳
**Test Steps:**
1. BranchForm
2. Invalid code (< 2 chars)
3. Invalid dates

**Validation:**
- [ ] `branchSchema` avec zodResolver
- [ ] Coerced numbers fonctionne: `maxEmployees`, `dailyWithdrawalLimit`

---

## 7. Backend API Connectivity

### 7.1 API Base URL ⏳
**Validation:**
- [ ] `.env` contient `REACT_APP_API_URL=http://localhost:5000/api`
- [ ] `BaseApiService` utilise ce URL
- [ ] Axios interceptors ajoutent token

### 7.2 Auth Token Injection ⏳
**Test Steps:**
1. Login
2. Check Network tab → Headers de requête suivante

**Validation:**
- [ ] Header `Authorization: Bearer <token>` présent
- [ ] Token lu depuis `sessionStorage.getItem('auth_token')`

### 7.3 401 Handling ⏳
**Test Steps:**
1. Login
2. Manuellement supprimer `auth_token` de sessionStorage
3. Faire une requête API

**Validation:**
- [ ] Response 401 → redirect `/login`
- [ ] Interceptor response catch 401
- [ ] Session cleared

### 7.4 CORS ⏳
**Validation:**
- [ ] Backend `Program.cs` autorise `http://localhost:3000`
- [ ] Pas d'erreurs CORS dans console

---

## 8. Error Handling & Monitoring

### 8.1 ErrorBoundary ⏳
**Test Steps:**
1. Inject une erreur React runtime (ex: undefined.foo)

**Validation:**
- [ ] `AppErrorBoundary` catch error
- [ ] Fallback UI avec message + bouton reload
- [ ] Sentry.ErrorBoundary wrapper actif

### 8.2 Sentry (si activé) ⏳
**Setup:**
1. Set `REACT_APP_SENTRY_DSN` dans `.env`
2. Restart dev server

**Validation:**
- [ ] Sentry initialized (`src/sentry.ts`)
- [ ] BrowserTracing active
- [ ] Errors envoyés à Sentry dashboard

### 8.3 Toast Notifications ⏳
**Test Steps:**
1. Succès: Créer client
2. Erreur: API down, try request

**Validation:**
- [ ] Toast success (vert) pour succès
- [ ] Toast error (rouge) pour erreurs
- [ ] react-hot-toast fonctionne

---

## 9. Role-Based Access Control

### 9.1 Role Routing ⏳
**Test Steps:**
1. Login avec différents roles:
   - SuperAdmin
   - BranchSupervisor
   - Cashier
   - Secretary

**Validation:**
- [ ] Chaque role voit le bon dashboard
- [ ] `getDashboardComponent()` switch correct
- [ ] Pas de "Rôle non reconnu"

### 9.2 Menu Visibility ⏳
**Test Steps:**
1. Login Cashier vs SuperAdmin

**Validation:**
- [ ] Cashier ne voit pas routes admin (/admin/accounts)
- [ ] SuperAdmin voit tout
- [ ] `Layout.tsx` conditional rendering

---

## 10. Build & Production

### 10.1 Test Suite ⏳
```bash
cd frontend-web
npm test -- --watchAll=false
```

**Validation:**
- [ ] 16 tests passed, 0 failed
- [ ] Tests: authStore, uiStore, schemas, AuthService

### 10.2 Production Build ⏳
```bash
npm run build
```

**Validation:**
- [ ] Build successful
- [ ] Bundle size < 600 kB gzipped
- [ ] Warnings ESLint seulement (non-bloquant)

### 10.3 Serve Build ⏳
```bash
npm install -g serve
serve -s build
```

**Validation:**
- [ ] App démarre sur port 3000
- [ ] Login fonctionne
- [ ] Pas d'erreurs runtime

---

## 📊 Résumé Test Coverage

### Critical Paths
- [ ] **Auth Flow:** Login → Session → Protected Routes → Logout
- [ ] **Client CRUD:** Create PP → Create PM → Search → Edit → Toggle Status
- [ ] **Account Ops:** Create Account → Deposit → Withdrawal
- [ ] **Cache:** TTL respect → Invalidation après mutations
- [ ] **Validation:** Zod schemas sur forms → Error messages
- [ ] **API:** Connectivity → Token injection → 401 handling

### Nice-to-Have
- [ ] Sentry monitoring actif
- [ ] Skeleton loading fluide
- [ ] Toast notifications cohérentes
- [ ] Role-based menu visibility

---

## 🚨 Issues Trouvés (à documenter)

### Bloqueurs (❌)
_Aucun trouvé pour le moment_

### Warnings (⚠️)
- ESLint warnings (unused vars, missing deps) - non-bloquant
- Build warnings - non-critique

### Suggestions (💡)
_À compléter après tests_

---

## 🎯 Actions Post-Test

1. **Si tests ✅:** Deploy en staging pour UAT (User Acceptance Testing)
2. **Si warnings ⚠️:** Documenter, créer tickets de nettoyage
3. **Si échecs ❌:** Rollback modifications Phase 2, débugger, re-tester

---

**Testeur:** _________  
**Date début:** _________  
**Date fin:** _________  
**Status final:** ⏳ En attente
