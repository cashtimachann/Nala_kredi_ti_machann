# Plan: Retire Mock Data Dashboard Chef Succursale

## 🎯 OBJEKTIF
Retire mock data ki nan BranchManagerDashboard pou prepare entegrasyon ak backend API reyèl.

## 📋 MOCK DATA POU RETIRE

### 1. **LoadDashboardData() Method**
**Location**: Lines 31-108
- ✅ Statistics (TotalTransactions, ActiveCashiers, etc.)
- ✅ PendingValidations ObservableCollection
- ✅ ActiveCashSessions ObservableCollection  
- ✅ TeamPerformance ObservableCollection

### 2. **Menu Click Handlers** (Lines 110-536)
- ValidateAccounts_Click → MessageBox mock
- ApproveLoan_Click → MessageBox mock
- PendingDocuments_Click → MessageBox mock
- DailyOperations_Click → MessageBox mock
- CashReport_Click → MessageBox mock
- CloseCash_Click → MessageBox mock
- Attendance_Click → MessageBox mock
- Schedules_Click → MessageBox mock
- TeamPerformance_Click → MessageBox mock
- ExchangeManagement_Click → MessageBox mock
- ExchangeRates_Click → MessageBox mock
- DailyReport_Click → MessageBox mock
- WeeklyReport_Click → MessageBox mock
- MonthlyReport_Click → MessageBox mock

### 3. **Data Models** (Lines 538-559)
- PendingValidation class
- CashSession class
- TeamMember class

## 🔄 NOUVEAUX MODULES A KREYE

### Module 1: ValidationModule (Deja kreye nan web)
**Fichye**: `Views/Modules/ValidationModule.xaml[.cs]`
- Validation nouveaux comptes
- Approbation prêts
- Documents en attente

### Module 2: CashManagementModule
**Fichye**: `Views/Modules/CashManagementModule.xaml[.cs]`
- Sessions caisse
- Rapports journaliers
- Clôture caisse
- Bureau de change

### Module 3: PersonnelModule
**Fichye**: `Views/Modules/PersonnelModule.xaml[.cs]`
- Présences
- Horaires
- Performance équipe

### Module 4: ReportsModule
**Fichye**: `Views/Modules/ReportsModule.xaml[.cs]`
- Rapport journalier
- Rapport hebdomadaire
- Rapport mensuel

### Module 5: OperationsModule
**Fichye**: `Views/Modules/OperationsModule.xaml[.cs]`
- Supervision temps réel
- Gestion incidents
- Opérations spéciales

## 🏗️ NOUVO ARCHITECTURE

```
BranchManagerDashboard.xaml
├── Dashboard Home (Statistics - API)
├── Navigation Menu
└── Content Area
    ├── DashboardHome (default)
    ├── ValidationModule (Module 1)
    ├── CashManagementModule (Module 2)
    ├── PersonnelModule (Module 3)
    ├── ReportsModule (Module 4)
    └── OperationsModule (Module 5)
```

## 📊 API SERVICES POU KREYE

### 1. **DashboardService**
```csharp
Task<DashboardStats> GetDashboardStatsAsync()
Task<List<Alert>> GetAlertsAsync()
```

### 2. **ValidationService**
```csharp
Task<List<PendingAccount>> GetPendingAccountsAsync()
Task<List<PendingLoan>> GetPendingLoansAsync()
Task<bool> ApproveAccountAsync(string accountId, string comment)
Task<bool> RejectAccountAsync(string accountId, string reason)
```

### 3. **CashService**
```csharp
Task<List<CashSession>> GetActiveCashSessionsAsync()
Task<DailyCashReport> GetDailyCashReportAsync(DateTime date)
Task<bool> CloseCashAsync(CloseCashRequest request)
```

### 4. **PersonnelService**
```csharp
Task<List<Attendance>> GetTodayAttendanceAsync()
Task<List<Schedule>> GetWeeklyScheduleAsync()
Task<List<Performance>> GetTeamPerformanceAsync()
```

### 5. **ReportService**
```csharp
Task<DailyReport> GetDailyReportAsync(DateTime date)
Task<WeeklyReport> GetWeeklyReportAsync(DateTime weekStart)
Task<MonthlyReport> GetMonthlyReportAsync(int year, int month)
```

## 📝 ETAP PA ETAP

### ✅ Etap 1: Backup Mock Data
- Kreye yon kopi mock data pou referans

### 🔄 Etap 2: Retire Mock Data
- Kòmante oswa retire mock data nan LoadDashboardData()
- Rete sèlman strukti UI

### 🔄 Etap 3: Kreye Service Layer
- Create `Services/Branch/` folder
- Implement service classes
- Add DTO models

### 🔄 Etap 4: Refactor Menu Handlers
- Replace MessageBox ak real module navigation
- Load proper UserControls

### 🔄 Etap 5: Test Integration
- Test chak module ak backend
- Verify data loading
- Error handling

## 🎨 UI STRUCTURE TO KEEP

```xaml
<!-- Keep this structure -->
<Grid x:Name="DashboardContent">
    <!-- Statistics Cards -->
    <!-- Navigation Menu -->
    <!-- Content Area -->
</Grid>
```

## ⚠️ IMPORTANT NOTES

1. **Pa retire UI structure** - Sèlman mock data
2. **Rete Timer** pou current time/date
3. **Keep Logout functionality**
4. **Prepare pou async loading** ak loading indicators
5. **Keep UserNameText** pou user info

## 🚀 NEXT STEPS APRE RETIRE MOCK

1. **Backend API Development**
   - Implement dashboard endpoints
   - Create DTO models
   - Add authorization

2. **Desktop Service Layer**
   - ApiService methods
   - Response models
   - Error handling

3. **Module Development**
   - Separate UserControl pou chak module
   - MVVM pattern
   - Data binding

4. **Testing**
   - Unit tests
   - Integration tests
   - UI tests

---

**Ready to proceed?** Ou vle mwen:
1. ✅ Retire mock data kounye a
2. 📁 Kreye service structure
3. 🔨 Implement premye module (Validation)

Ki etap ou vle nou kòmanse?
