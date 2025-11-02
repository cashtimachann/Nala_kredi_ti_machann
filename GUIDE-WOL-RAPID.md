# GUIDE RAPID: KONPRANN WÒL NAN SISTÈM NAN 🎯

## ⚡ Quick Reference

### 2 Sistèm Wòl

| Sistèm | Itilizasyon | Location |
|--------|-------------|----------|
| **UserRole** (6 roles) | Database, Authorization, JWT | Backend enum |
| **AdminType** (8 types) | UI/UX, Business logic, Permissions | Backend DTO + Frontend |

---

## 1️⃣ UserRole (Database & Auth)

```
Cashier = 0        → Identity role: "Cashier"
Employee = 1       → Identity role: "Employee"  
Manager = 2        → Identity role: "Manager"
Admin = 3          → Identity role: "Admin"
SupportTechnique=4 → Identity role: "Support"
SuperAdmin = 5     → Identity role: "SuperAdmin"
```

**Ki kote li itilize?**
- ✅ Database (kolòn `Role` nan `Users` table)
- ✅ JWT token claims
- ✅ `[Authorize(Roles = "Manager")]` attributes
- ✅ Authorization policies

---

## 2️⃣ AdminType (Business & UI)

```
CAISSIER = 0                   → UserRole.Cashier
SECRETAIRE_ADMINISTRATIF = 1   → UserRole.SupportTechnique
AGENT_DE_CREDIT = 2            → UserRole.Employee
CHEF_DE_SUCCURSALE = 3         → UserRole.Manager ⭐
DIRECTEUR_REGIONAL = 4         → UserRole.Manager ⭐
ADMINISTRATEUR_SYSTEME = 5     → UserRole.Admin
DIRECTION_GENERALE = 6         → UserRole.SuperAdmin
COMPTABLE_FINANCE = 7          → UserRole.Admin
```

**Ki kote li itilize?**
- ✅ API DTOs (AdminCreateDto, AdminUpdateDto)
- ✅ Frontend UI labels
- ✅ Permissions granulaires
- ✅ Dashboard selection (IMPORTANT!)

---

## 🎨 Konbyen Dashboard Nou Genyen?

| Dashboard | AdminType | UserRole |
|-----------|-----------|----------|
| Caissier | CAISSIER (0) | Cashier (0) |
| Secrétaire | SECRETAIRE_ADMINISTRATIF (1) | SupportTechnique (4) |
| Agent de Crédit | AGENT_DE_CREDIT (2) | Employee (1) |
| **Chef de Succursale** ⭐ | **CHEF_DE_SUCCURSALE (3)** | **Manager (2)** |
| Directeur Régional | DIRECTEUR_REGIONAL (4) | Manager (2) |
| Admin Système | ADMINISTRATEUR_SYSTEME (5) | Admin (3) |
| Comptable/Finance | COMPTABLE_FINANCE (7) | Admin (3) |
| Direction Générale | DIRECTION_GENERALE (6) | SuperAdmin (5) |

---

## ⚠️ PWEN ENPÒTAN

### Pwoblèm: 2 AdminType → 1 UserRole

**CHEF_DE_SUCCURSALE** ak **DIRECTEUR_REGIONAL** tou de gen `UserRole = Manager`

❌ **PA BON**:
```typescript
if (user.role === 'Manager') {
  return <ManagerDashboard />;  // Ki dashboard? Chef oswa Directeur?
}
```

✅ **BON**:
```typescript
if (user.adminType === AdminType.CHEF_DE_SUCCURSALE) {
  return <BranchManagerDashboard />;  // ⭐ Nouvo dashboard!
} else if (user.adminType === AdminType.DIRECTEUR_REGIONAL) {
  return <RegionalManagerDashboard />;
}
```

---

## 🔧 Kijan pou itilize nan kòd?

### Backend C#

```csharp
// ✅ Pou Authorization - Itilize UserRole
[Authorize(Roles = "Manager")]
public async Task<IActionResult> GetBranchData() { }

// ✅ Pou Business Logic - Itilize AdminType
if (user.AdminType == AdminTypeDto.CHEF_DE_SUCCURSALE) {
    maxValidation = 100000;
}
```

### Frontend TypeScript

```typescript
import { UserRole, AdminType, canAccessBranchManagerDashboard } from '@/types/roles';

// ✅ Check access
if (canAccessBranchManagerDashboard(user.adminType)) {
  // Show Branch Manager Dashboard
}

// ✅ Check permissions
import { canPerformAction, getPermissions } from '@/types/roles';

if (canPerformAction(user.adminType, 'canValidateCredits')) {
  const permissions = getPermissions(user.adminType);
  const max = permissions.maxCreditValidation; // 100000 pou Chef Succursale
}
```

---

## 🛠️ Fichye Kreye/Modifye

### Backend
- ✅ `Program.cs` - Fixed authorization policies
- ✅ `Controllers/AdminController.cs` - MapAdminTypeToUserRole exists
- ✅ `Models/User.cs` - UserRole enum (6 values)
- ✅ `DTOs/AdminDto.cs` - AdminTypeDto enum (8 values)

### Frontend
- ✅ `frontend-web/src/types/roles.ts` - **NOUVO!** Centralized roles
- ⚠️ `frontend-web/src/types/admin.ts` - **DEPREKATEW** - Pa itilize sa ankò!
- ⏳ `frontend-web/src/App.tsx` - Bezwen update pou itilize nouvo roles.ts
- ⏳ `frontend-web/src/components/admin/EditAdminModal.tsx` - Bezwen update

---

## 📋 TODO List

### 🔴 Ajan (Today)
- [ ] Update `App.tsx` - Replace hardcoded strings ak `UserRole` enum
- [ ] Update `EditAdminModal.tsx` - Import from `types/roles.ts` instead of `types/admin.ts`
- [ ] Update `AdminAccountCreation.tsx` - Use new AdminType enum
- [ ] Test login ak CHEF_DE_SUCCURSALE account
- [ ] Verify BranchManagerDashboard displays

### 🟡 Rapid (This Week)
- [ ] Add `adminType` to JWT token/login response
- [ ] Update all components using old `types/admin.ts`
- [ ] Create migration guide pou devs
- [ ] Write integration tests

### 🟢 Kanpe (Later)
- [ ] Consider adding `AdminType` column to database
- [ ] Add role transition audit logs
- [ ] Create admin role management UI
- [ ] Automated role validation tests

---

## 🚨 Pi Gwo Erè yo Evite

### ❌ DON'T

```typescript
// ❌ BAD: Hardcoded strings
if (role === 'BranchSupervisor') { }

// ❌ BAD: Using UserRole pou dashboard selection  
if (user.role === UserRole.Manager) { 
  return <ManagerDashboard />;  // Ki youn?
}

// ❌ BAD: Import from old admin.ts
import { AdminType } from '@/types/admin';
```

### ✅ DO

```typescript
// ✅ GOOD: Use enums
import { UserRole, AdminType } from '@/types/roles';

// ✅ GOOD: Use AdminType pou dashboard
if (user.adminType === AdminType.CHEF_DE_SUCCURSALE) {
  return <BranchManagerDashboard />;
}

// ✅ GOOD: Use helper functions
import { canAccessBranchManagerDashboard } from '@/types/roles';
if (canAccessBranchManagerDashboard(user.adminType)) { }
```

---

## 🎓 Rule of Thumb

**Authorization** → Use **UserRole**  
**UI/Dashboards** → Use **AdminType**  
**Permissions** → Use **AdminType**  
**Database** → Stores **UserRole** (AdminType calculated)

---

## 📞 Questions?

Si w gen kesyon sou:
- **Kisa role yon user dwe genyen?** → Tcheke mapaj AdminType → UserRole
- **Ki dashboard pou montre?** → Tcheke AdminType, pa UserRole
- **User ka fè aksyon sa?** → Use `canPerformAction(adminType, 'action')`
- **Kijan kreye kont Chef Succursale?** → AdminType = 3 (CHEF_DE_SUCCURSALE)

---

**Last Updated**: 18 Oktòb 2025  
**Version**: 1.0  
**Status**: ✅ Backend fixed, ⏳ Frontend updates needed
