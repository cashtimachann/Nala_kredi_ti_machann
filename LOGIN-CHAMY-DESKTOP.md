# Login Chef de Succursale - chamy@gmail.com

## 📋 ENFÒMASYON KONT

**Email**: `chamy@gmail.com`  
**Role**: Manager (Chef de Succursale)  
**Dashboard**: BranchManagerDashboard ✅ (Just Fixed!)

---

## 🚀 POU KONEKTE SOU DESKTOP APP

### Etap 1: Asire backend ap roule

```powershell
cd backend\NalaCreditAPI
dotnet run --launch-profile http
```

**Expected**: Backend ap koute sou `http://localhost:5000`

---

### Etap 2: Ouvri Desktop App

Nan yon lòt terminal:

```powershell
cd frontend-desktop\NalaCreditDesktop
dotnet build
dotnet run
```

---

### Etap 3: Login

Lè login window ouvri:

1. **Email**: `chamy@gmail.com`
2. **Password**: `[Password ou te chwazi lè w kreye kont lan]`
3. Klike **"Se Konekte"**

---

## ✅ EXPECTED RESULT

Apre login siksè:

✅ **BranchManagerDashboard** ap ouvri  
✅ **7 modil** ap afiche:

1. 📊 **Validation Crédit** - Apwouve/rejte demand kredi
2. 💰 **Gestion Caisse** - Kontrol kès, operasyon lajan
3. 👥 **Gestion Personnel** - Jesyon anplwaye, prezans
4. 📈 **Rapports** - Rapò jounen, semèn, mwa
5. 🔄 **Opérations Spéciales** - Transfè, kofò sekirite
6. 🔒 **Sécurité & Audit** - Aktivite, aksè, alèt
7. ⚙️ **Paramètres** - Konfigirasyon branch

---

## ⚠️ SI W PA SONJE PASSWORD

### Opsyon 1: Reset sou Web App (Si fonksyon la disponib)
1. Ale sou `http://localhost:3000`
2. Login ak SuperAdmin
3. Modifye password pou `chamy@gmail.com`

### Opsyon 2: Reset dirèkteman nan database

```powershell
# Script pou reset password (mwen ka ede w kreye li)
```

### Opsyon 3: Kreye yon nouvo kont test

Si ou pa sonje password, ou ka kreye yon nouvo kont test:
- Email: `chef.test@nalacredit.ht`
- Password: `Test123!`
- Type: CHEF_DE_SUCCURSALE

---

## 🐛 TROUBLESHOOTING

### Pwoblèm: "Rôle non reconnu"
**Solisyon**: ✅ **DEJA FIKSE!** 
- LoginWindow.xaml.cs te update pou map Manager → BranchManagerDashboard

### Pwoblèm: "Invalid credentials"
**Kòz**: Password pa bon
**Solisyon**: 
- Verifye password ou te itilize lè w kreye kont lan
- Oswa reset password

### Pwoblèm: Backend pa ap reponn
**Solisyon**:
```powershell
# Verifye backend ap roule
cd backend\NalaCreditAPI
dotnet run --launch-profile http
```

### Pwoblèm: Database connection error
**Solisyon**:
```powershell
# Verifye PostgreSQL ap roule
# Check connection string nan appsettings.json
```

---

## 📊 MAPPING ROLE → DASHBOARD

| UserRole | Value | Desktop Dashboard |
|----------|-------|-------------------|
| Cashier | 0 | MainWindow |
| Employee | 1 | SecretaryDashboard |
| **Manager** | **2** | **BranchManagerDashboard** ⭐ |
| Admin | 3 | (Under development) |
| SupportTechnique | 4 | SecretaryDashboard |
| SuperAdmin | 5 | (Under development) |

---

## 🎯 NEXT STEPS

Apre w konekte siksèman:

1. ✅ Verifye ke 7 modil yo afiche
2. ✅ Teste navigasyon ant modil yo
3. ✅ Verifye mock data ap afiche
4. 🔜 Backend API ta dwe devlopé pou chak modil

---

**Date**: 18 Oktòb 2025  
**Status**: ✅ Desktop role mapping fixed  
**Ready to test**: OUI!
