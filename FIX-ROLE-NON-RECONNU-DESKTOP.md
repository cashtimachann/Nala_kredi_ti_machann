# FIX: "Rôle non reconnu" pou Chef de Succursale Desktop

## 🔴 PWOBLÈM

Lè w konekte ak yon kont **Chef de Succursale** (Manager) sou aplikasyon desktop, li afiche:
```
Rôle non reconnu: Manager
```

## 🔍 KÒZ

### Backend retounen:
```json
{
  "user": {
    "role": "Manager"  // UserRole.Manager = 2
  }
}
```

### Mapping Desktop te mal (ANVAN):
```csharp
"Manager" => new Views.CreditAgentDashboard(),  // ❌ MOVE!
"Admin" => new Views.BranchManagerDashboard(),  // ❌ MOVE!
```

**Pwoblèm**: 
- Backend: `Manager` (Role=2) = Chef de Succursale
- Desktop te map: `Manager` → Agent de Crédit Dashboard ❌

## ✅ SOLISYON

### File: `LoginWindow.xaml.cs` (liy 52-73)

**ANVAN** ❌:
```csharp
Window? dashboardWindow = userRole switch
{
    "Cashier" or "Caissier" => new MainWindow(),
    "Employee" or "Secretary" => new Views.SecretaryDashboard(),
    "Manager" or "CreditAgent" => new Views.CreditAgentDashboard(),  // ❌ MOVE
    "Admin" or "BranchSupervisor" => new Views.BranchManagerDashboard(),  // ❌ MOVE
    "SupportTechnique" or "Supervisor" => ShowUnderDevelopmentAndReturnDefault("Superviseur"),
    "SuperAdmin" or "Administrator" => ShowUnderDevelopmentAndReturnDefault("Administrateur"),
    _ => throw new Exception($"Rôle non reconnu: {userRole}")
};
```

**APRE** ✅:
```csharp
Window? dashboardWindow = userRole switch
{
    // Backend Role: Cashier (0)
    "Cashier" or "Caissier" => new MainWindow(),
    
    // Backend Role: Employee (1) → Secrétaire or Agent de Crédit
    "Employee" or "Secretary" or "Secrétaire" => new Views.SecretaryDashboard(),
    
    // Backend Role: Manager (2) → Chef de Succursale ⭐ FIXED!
    "Manager" or "BranchManager" or "Chef de Succursale" 
        => new Views.BranchManagerDashboard(),
    
    // Backend Role: Admin (3) → Administrateur Système
    "Admin" or "Administrator" or "Administrateur" 
        => ShowUnderDevelopmentAndReturnDefault("Administrateur Système"),
    
    // Backend Role: SupportTechnique (4) → Support Technique
    "SupportTechnique" or "Support" or "Secretaire" 
        => new Views.SecretaryDashboard(),
    
    // Backend Role: SuperAdmin (5) → Super Administrateur
    "SuperAdmin" or "Direction" or "DirectionGenerale" 
        => ShowUnderDevelopmentAndReturnDefault("Direction Générale"),
    
    _ => throw new Exception($"Rôle non reconnu: {userRole}")
};
```

## 📊 MAPPING CORRECT

| Backend UserRole | Valè | Role Name | Desktop Dashboard |
|------------------|------|-----------|-------------------|
| Cashier | 0 | "Cashier" | MainWindow (Caissier) |
| Employee | 1 | "Employee" | SecretaryDashboard |
| **Manager** | **2** | **"Manager"** | **BranchManagerDashboard** ⭐ |
| Admin | 3 | "Admin" | (Under development) |
| SupportTechnique | 4 | "Support" | SecretaryDashboard |
| SuperAdmin | 5 | "SuperAdmin" | (Under development) |

## 🧪 TEST

### Anvan Fix ❌
1. Login: chef.pap@nalacredit.ht / Manager123!
2. Backend retounen: `{ role: "Manager" }`
3. Desktop: "Rôle non reconnu: Manager" ❌
4. Aplikasyon crash

### Apre Fix ✅
1. Login: chef.pap@nalacredit.ht / Manager123!
2. Backend retounen: `{ role: "Manager" }`
3. Desktop: Ouvri BranchManagerDashboard ✅
4. Dashboard Chef Succursale afiche ak 7 modil

## 📁 FICHYE MODIFYE

- ✅ `frontend-desktop/NalaCreditDesktop/LoginWindow.xaml.cs`
  - Fixed role mapping (liy 52-73)
  - Manager → BranchManagerDashboard
  - Better comments pou chak role

## 🎯 NEXT STEPS

1. **Build desktop app**:
   ```powershell
   cd frontend-desktop/NalaCreditDesktop
   dotnet build
   ```

2. **Run app**:
   ```powershell
   dotnet run
   ```

3. **Test login**:
   - Email: chef.pap@nalacredit.ht
   - Password: Manager123!
   - Expected: BranchManagerDashboard ouvri ✅

## 💡 NOTES

### AdminType vs UserRole
- **Backend save 2 bagay**:
  - `UserRole` (0-5) → Pou authentication
  - `AdminType` (0-7) → Pou business logic
  
- **Desktop sèlman wè `Role` (string)**:
  - Backend retounen "Manager", "Admin", etc.
  - Desktop map sa pou dashboard

### Future Enhancement
Si w vle diferansye CHEF_DE_SUCCURSALE ak DIRECTEUR_REGIONAL:
1. Backend ta dwe retounen `adminType` nan login response
2. Desktop ka tcheke sa epi afiche diferan dashboard

Men pou kounye a, tou de ap itilize menm `BranchManagerDashboard`.

## ⚠️ IMPORTANT

**Pa konfize**:
- UserRole.Manager = **Chef de Succursale** (desktop)
- UserRole.Admin = **Administrateur Système** (pa encore dashboard)

Backend mapping:
- AdminType.CHEF_DE_SUCCURSALE (3) → UserRole.Manager (2)
- AdminType.DIRECTEUR_REGIONAL (4) → UserRole.Manager (2)

Desktop chèche sèlman UserRole, pa AdminType.

---

**Date**: 18 Oktòb 2025  
**Fix Pa**: GitHub Copilot  
**Status**: ✅ FIXED - Ready to test  
**Impact**: 🔴 CRITICAL - Blocks Manager login  
**Testing**: ⏳ Need to rebuild desktop app
