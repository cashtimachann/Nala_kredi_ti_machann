# Check Admin Accounts Created via Web Interface
# Script pou tcheke kont admin ki kreye nan web app

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "KONT ADMIN KI KREYE NAN WEB APP" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan

# Try direct database query
$env:PGPASSWORD = "1234"

Write-Host "Ap konekte ak database..." -ForegroundColor Gray

# Query to get all admin accounts
$query = "SELECT ""Email"", ""FirstName"", ""LastName"", ""UserName"", CASE ""Role"" WHEN 0 THEN 'Cashier' WHEN 1 THEN 'Employee' WHEN 2 THEN 'Manager' WHEN 3 THEN 'Admin' WHEN 4 THEN 'SupportTechnique' WHEN 5 THEN 'SuperAdmin' ELSE 'Unknown' END as RoleName, ""Role"", ""AdminType"", CASE ""AdminType"" WHEN 0 THEN 'CAISSIER' WHEN 1 THEN 'SECRETAIRE' WHEN 2 THEN 'AGENT_DE_CREDIT' WHEN 3 THEN 'CHEF_DE_SUCCURSALE' WHEN 4 THEN 'DIRECTEUR_REGIONAL' WHEN 5 THEN 'ADMIN_SYSTEME' WHEN 6 THEN 'SUPPORT_TECHNIQUE' WHEN 7 THEN 'DIRECTION_GENERALE' ELSE 'NULL' END as AdminTypeName, ""IsActive"", ""Department"", ""CreatedAt"" FROM ""AspNetUsers"" WHERE ""Role"" IS NOT NULL ORDER BY ""CreatedAt"" DESC;"

$result = & psql -h localhost -p 5432 -U postgres -d nalacredit_db -c $query -A -t 2>$null

if ($LASTEXITCODE -eq 0 -and $result) {
    Write-Host "KONT JWENN NAN DATABASE:`n" -ForegroundColor Green
    
    $accounts = $result -split "`n" | Where-Object { $_ -match '\|' }
    
    $count = 0
    foreach ($line in $accounts) {
        if ([string]::IsNullOrWhiteSpace($line)) { continue }
        
        $fields = $line -split '\|'
        if ($fields.Count -ge 11) {
            $count++
            $email = $fields[0]
            $firstName = $fields[1]
            $lastName = $fields[2]
            $userName = $fields[3]
            $roleName = $fields[4]
            $role = $fields[5]
            $adminType = $fields[6]
            $adminTypeName = $fields[7]
            $isActive = $fields[8]
            $department = $fields[9]
            $createdAt = $fields[10]
            
            $fullName = "$firstName $lastName".Trim()
            if ([string]::IsNullOrWhiteSpace($fullName)) { $fullName = $userName }
            
            Write-Host "[$count] $fullName" -ForegroundColor Cyan
            Write-Host "    Email:      $email" -ForegroundColor White
            Write-Host "    Role:       $roleName ($role)" -ForegroundColor Yellow
            Write-Host "    AdminType:  $adminTypeName ($adminType)" -ForegroundColor Green
            Write-Host "    Active:     $isActive" -ForegroundColor $(if ($isActive -eq 't') { 'Green' } else { 'Red' })
            Write-Host "    Department: $department" -ForegroundColor Gray
            Write-Host "    Created:    $createdAt" -ForegroundColor Gray
            Write-Host ""
        }
    }
    
    Write-Host "Total: $count kont jwenn`n" -ForegroundColor Cyan
} else {
    Write-Host "Pa ka konekte ak database dirèkteman.`n" -ForegroundColor Yellow
    Write-Host "KONT DEFAULT (Si yo kreye):`n" -ForegroundColor Green
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "ENFÒMASYON LOGIN" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "POU KONT KI KREYE NAN WEB APP:" -ForegroundColor White
Write-Host "  - Email: [Email ou te itilize lè w kreye kont lan]" -ForegroundColor Gray
Write-Host "  - Password: [Password ou te chwazi]" -ForegroundColor Gray
Write-Host ""

Write-Host "POU KONT DEFAULT (test):" -ForegroundColor White
Write-Host ""
Write-Host "  CHEF DE SUCCURSALE (Manager)" -ForegroundColor Cyan
Write-Host "    Email:    chef.pap@nalacredit.ht" -ForegroundColor White
Write-Host "    Password: Manager123!" -ForegroundColor Green
Write-Host "    Dashboard: BranchManagerDashboard" -ForegroundColor Yellow
Write-Host ""
Write-Host "  SUPERADMIN" -ForegroundColor Magenta
Write-Host "    Email:    admin@nalacredit.ht" -ForegroundColor White
Write-Host "    Password: SuperAdmin123!" -ForegroundColor Green
Write-Host "    Dashboard: (Under development)" -ForegroundColor Gray
Write-Host ""
Write-Host "  CAISSIER" -ForegroundColor Green
Write-Host "    Email:    caissier1@nalacredit.ht" -ForegroundColor White
Write-Host "    Password: Cashier123!" -ForegroundColor Green
Write-Host "    Dashboard: MainWindow (Caissier)" -ForegroundColor Yellow
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "NOTE IMPORTANT" -ForegroundColor Red
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Si w kreye yon kont sou web app (Admin Accounts):" -ForegroundColor Yellow
Write-Host "  1. Sonje password ou te itilize" -ForegroundColor White
Write-Host "  2. Itilize menm email ak password la pou login sou desktop" -ForegroundColor White
Write-Host "  3. Desktop app ap tcheke menm database" -ForegroundColor White
Write-Host ""
Write-Host "Si w pa sonje password:" -ForegroundColor Red
Write-Host "  - Pa gen fonksyon 'Forgot Password' nan desktop" -ForegroundColor White
Write-Host "  - Kreye yon nouvo kont sou web app" -ForegroundColor White
Write-Host "  - Oswa reset password dirèkteman nan database" -ForegroundColor White
Write-Host ""

Write-Host "========================================`n" -ForegroundColor Cyan

# Clear password from environment
$env:PGPASSWORD = ""
