# List All Login Accounts
# Script pou wè tout kont ki ka konekte

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "KONT POU LOGIN DESKTOP APP" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan

# Connection string
$connStr = "Host=localhost;Port=5432;Database=nalacredit_db;Username=postgres;Password=1234"

# SQL Query
$query = @"
SELECT 
    "Email",
    "FirstName",
    "LastName",
    "UserName",
    CASE "Role"
        WHEN 0 THEN 'Cashier'
        WHEN 1 THEN 'Employee'
        WHEN 2 THEN 'Manager'
        WHEN 3 THEN 'Admin'
        WHEN 4 THEN 'SupportTechnique'
        WHEN 5 THEN 'SuperAdmin'
        ELSE 'Unknown'
    END as RoleName,
    "Role",
    "AdminType",
    "IsActive",
    "Department"
FROM "AspNetUsers"
WHERE "Role" IS NOT NULL
ORDER BY "Role", "Email";
"@

# Try using PostgreSQL command line if available
$result = psql -h localhost -p 5432 -U postgres -d nalacredit_db -c $query 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Output $result
} else {
    Write-Host "psql pa disponib. Ann itilize lòt metòd..." -ForegroundColor Yellow
    
    # Alternative: Show expected accounts based on setup scripts
    Write-Host "KONT KI TA DWE EGZISTE (Based on setup):" -ForegroundColor Green
    Write-Host "" -ForegroundColor Green
    
    Write-Host "SUPERADMIN" -ForegroundColor Magenta
    Write-Host "  Email:    admin@nalacredit.ht" -ForegroundColor White
    Write-Host "  Password: SuperAdmin123!" -ForegroundColor White
    Write-Host "  Role:     SuperAdmin (5)" -ForegroundColor White
    Write-Host "  Dashboard: Under Development" -ForegroundColor Gray
    Write-Host "" -ForegroundColor Gray
    
    Write-Host "CHEF DE SUCCURSALE (MANAGER)" -ForegroundColor Cyan
    Write-Host "  Email:    chef.pap@nalacredit.ht" -ForegroundColor White
    Write-Host "  Password: Manager123!" -ForegroundColor White
    Write-Host "  Role:     Manager (2)" -ForegroundColor White
    Write-Host "  AdminType: CHEF_DE_SUCCURSALE (3)" -ForegroundColor White
    Write-Host "  Dashboard: BranchManagerDashboard" -ForegroundColor Green
    Write-Host "" -ForegroundColor Green
    
    Write-Host "DIRECTEUR RÉGIONAL" -ForegroundColor Cyan
    Write-Host "  Email:    directeur.ouest@nalacredit.ht" -ForegroundColor White
    Write-Host "  Password: Manager123!" -ForegroundColor White
    Write-Host "  Role:     Manager (2)" -ForegroundColor White
    Write-Host "  AdminType: DIRECTEUR_REGIONAL (4)" -ForegroundColor White
    Write-Host "  Dashboard: BranchManagerDashboard (Same as Chef)" -ForegroundColor Yellow
    Write-Host "" -ForegroundColor Yellow
    
    Write-Host "CAISSIER" -ForegroundColor Green
    Write-Host "  Email:    caissier1@nalacredit.ht" -ForegroundColor White
    Write-Host "  Password: Cashier123!" -ForegroundColor White
    Write-Host "  Role:     Cashier (0)" -ForegroundColor White
    Write-Host "  Dashboard: MainWindow (Caissier Dashboard)" -ForegroundColor Green
    Write-Host "" -ForegroundColor Green
    
    Write-Host "EMPLOYEE (Secrétaire)" -ForegroundColor Green
    Write-Host "  Email:    secretaire@nalacredit.ht" -ForegroundColor White
    Write-Host "  Password: Employee123!" -ForegroundColor White
    Write-Host "  Role:     Employee (1)" -ForegroundColor White
    Write-Host "  Dashboard: SecretaryDashboard" -ForegroundColor Green
    Write-Host "" -ForegroundColor Green
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "MAPPING DESKTOP (After Fix)" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Cashier (0)          → MainWindow" -ForegroundColor White
Write-Host "Employee (1)         → SecretaryDashboard" -ForegroundColor White
Write-Host "Manager (2)          → BranchManagerDashboard ⭐ FIXED!" -ForegroundColor Green
Write-Host "Admin (3)            → (Under development)" -ForegroundColor Gray
Write-Host "SupportTechnique (4) → SecretaryDashboard" -ForegroundColor White
Write-Host "SuperAdmin (5)       → (Under development)" -ForegroundColor Gray

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TESTING INSTRUCTIONS" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "1. Build desktop app:" -ForegroundColor White
Write-Host "   cd frontend-desktop\NalaCreditDesktop" -ForegroundColor Gray
Write-Host "   dotnet build" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Run desktop app:" -ForegroundColor White
Write-Host "   dotnet run" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Login ak Chef de Succursale:" -ForegroundColor White
Write-Host "   Email:    chef.pap@nalacredit.ht" -ForegroundColor Cyan
Write-Host "   Password: Manager123!" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Expected result:" -ForegroundColor White
Write-Host "   ✅ BranchManagerDashboard ouvri" -ForegroundColor Green
Write-Host "   ✅ 7 modil afiche:" -ForegroundColor Green
Write-Host "      - Validation Crédit" -ForegroundColor Gray
Write-Host "      - Gestion Caisse" -ForegroundColor Gray
Write-Host "      - Gestion Personnel" -ForegroundColor Gray
Write-Host "      - Rapports" -ForegroundColor Gray
Write-Host "      - Opérations Spéciales" -ForegroundColor Gray
Write-Host "      - Sécurité et Audit" -ForegroundColor Gray
Write-Host "      - Paramètres" -ForegroundColor Gray

Write-Host "" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

