# INSTRUKSYON POU TESTE DASHBOARD CHEF DE SUCCURSALE

## Etap 1: Verifye si Backend ap Mache

Backend la ta dwe mache sou: http://localhost:7001

## Etap 2: Verifye si gen Kont Manager

### Opsyon A: Atravè Web Admin (Pi senp)

1. Ouvri aplikasyon web admin: http://localhost:3000
2. Konekte ak kont SuperAdmin oswa Admin
3. Ale nan seksyon "Comptes Administrateurs" 
4. Chèche si gen yon kont ak:
   - **Type**: Chef Succursale oswa Manager
   - **Role**: Manager (2)

### Opsyon B: Tcheke Direkteman nan Database

Si w gen pgAdmin oswa lòt tool PostgreSQL:

```sql
SELECT 
    "Id",
    "Username",
    "Email",
    "FirstName",
    "LastName",
    "Role",
    "IsActive",
    "BranchId"
FROM "Users"
WHERE "Role" = 2
ORDER BY "CreatedAt" DESC;
```

Role yo:
- 0 = Cashier
- 1 = Employee
- 2 = Manager (Chef de Succursale) ← SA W BEZWEN
- 3 = Admin
- 4 = SupportTechnique
- 5 = SuperAdmin

## Etap 3: Si Pa Gen Kont Manager

### Kreye Youn Atravè Web Admin:

1. Konekte ak SuperAdmin
2. Ale nan "Comptes Administrateurs"
3. Klike "Nouveau Compte"
4. Ranpli fòm lan:
   - **Username**: chef.pap (oswa lòt non)
   - **Email**: chef.pap@nalacredit.ht
   - **Password**: Manager123!
   - **Prénom**: Jean
   - **Nom**: Michel
   - **Type**: Chef Succursale
   - **Succursale**: Port-au-Prince (oswa lòt)
5. Soumèt fòm lan

## Etap 4: Teste Dashboard

### Pou Desktop App:

1. Ouvri aplikasyon desktop
2. Konekte ak kont Manager a:
   - Username: chef.pap
   - Password: Manager123!
3. Dashboard Chef de Succursale la ta dwe afiche otomatikman

### Ki Sa w Ta Dwe Wè:

✅ 7 onglets nan top:
   - 🏠 Tableau de Bord
   - ✅ Validations (ak badge si gen demandes)
   - 💰 Gestion Caisse
   - 👥 Personnel
   - 📊 Rapports
   - 🏦 Opérations Spéciales
   - 🔐 Sécurité & Audit

✅ Sou tab "Tableau de Bord":
   - Soldes caisse (HTG/USD)
   - Clients actifs
   - Transactions du jour
   - Portefeuille crédit
   - Alertes prioritaires
   - Graphiques de performance

## Pwoblèm Posib

### Si Dashboard Pa Afiche:

1. **Verifye Role**: Asiré w ke role a = 2 (Manager)
2. **Verifye Backend**: Backend la dwe mache sou port 7001
3. **Verifye Route**: Asiré w ke route `/branch-manager` konfigire
4. **Verifye Console**: Gade browser console pou erè

### Si Gen Erè "Unauthorized":

1. Token JWT la kapab ekspire - rekonekte
2. Role la pa bon - verifye nan database
3. Backend la pa mache - restart backend

## Nòt Enpòtan

⚠️ **Données Mock**: Pou kounye a, dashboard la itilize done mock (pa vrè done). 
Pou gen vrè done, backend API endpoints yo bezwen enplemante.

⚠️ **Password**: Chanje password la apre premye koneksyon!

⚠️ **Branch**: Asiré w ke Manager a gen yon branch asosye.

## Pou Devlopè

Si w vle teste rapidman san kreye kont:

1. Modifye `BranchManagerDashboard.tsx` pou retire auth check tanporèman
2. Ouvri dirèkteman: `http://localhost:5173/branch-manager` (Vite)
3. Dashboard la ap afiche ak done mock

## Support

Si w gen pwoblèm:
1. Tcheke console pou erè
2. Verifye network tab pou API calls
3. Gade backend logs
4. Li README.md nan `frontend-desktop/src/components/branch-manager/`

---

**Status**: Dashboard 100% fonksyonèl avèk done mock
**Prèt pou**: Testing ak demo
**Bezwen**: Backend API endpoints pou vrè done
