# Script pou kreye yon kont SuperAdmin
Write-Host "`n==================================================" -ForegroundColor Cyan
Write-Host "   KREYASYON KONT SUPERADMIN" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# Konekte nan API pou kreye SuperAdmin
$apiUrl = "http://localhost:5000/api/admin/create"

# Done pou SuperAdmin
$superAdminData = @{
    email = "admin@nalacredit.com"
    password = "Admin@2024!"
    firstName = "Super"
    lastName = "Admin"
    phoneNumber = "50912345678"
    department = "Administration"
    adminType = 0  # SUPER_ADMINISTRATEUR
} | ConvertTo-Json

Write-Host "`nDone SuperAdmin:" -ForegroundColor Yellow
Write-Host "  Email: admin@nalacredit.com" -ForegroundColor White
Write-Host "  Password: Admin@2024!" -ForegroundColor White
Write-Host "  AdminType: 0 (SUPER_ADMINISTRATEUR)" -ForegroundColor White
Write-Host "  Phone: 50912345678" -ForegroundColor White
Write-Host "  Department: Administration" -ForegroundColor White

Write-Host "`nAtansyon: Backend la dwe mache sou http://localhost:5000" -ForegroundColor Yellow
Write-Host "Si backend la pa mache, script sa p ap travay.`n" -ForegroundColor Red

# Verifye si backend la ap reponn
try {
    $healthCheck = Invoke-WebRequest -Uri "http://localhost:5000/health" -Method GET -TimeoutSec 2 -ErrorAction Stop
    Write-Host "✅ Backend la ap mache!" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend la pa mache sou http://localhost:5000" -ForegroundColor Red
    Write-Host "Tanpri kouri backend la avan ou egzekite script sa." -ForegroundColor Yellow
    Write-Host "  cd backend/NalaCreditAPI" -ForegroundColor White
    Write-Host "  dotnet run`n" -ForegroundColor White
    exit 1
}

Write-Host "`n🔐 Tentativ kreyasyon kont SuperAdmin..." -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri $apiUrl -Method POST -Body $superAdminData -ContentType "application/json" -ErrorAction Stop
    
    Write-Host "`n✅ SIKSÈ! Kont SuperAdmin kreye!" -ForegroundColor Green
    Write-Host "================================================" -ForegroundColor Green
    Write-Host "Done koneksyon:" -ForegroundColor Yellow
    Write-Host "  📧 Email: admin@nalacredit.com" -ForegroundColor White
    Write-Host "  🔑 Password: Admin@2024!" -ForegroundColor White
    Write-Host "  👤 Non: Super Admin" -ForegroundColor White
    Write-Host "  ✅ Role: SUPER_ADMINISTRATEUR (0)" -ForegroundColor White
    Write-Host "================================================`n" -ForegroundColor Green
    
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $errorMessage = $_.Exception.Message
    
    if ($statusCode -eq 401 -or $statusCode -eq 403) {
        Write-Host "`n⚠️  PAS GEN OTORIZASYON!" -ForegroundColor Yellow
        Write-Host "================================================" -ForegroundColor Yellow
        Write-Host "Pou kreye premye SuperAdmin, ou bezwen:" -ForegroundColor White
        Write-Host ""
        Write-Host "OPSYON 1: Kreye dirèkteman nan baz done" -ForegroundColor Cyan
        Write-Host "  1. Ouvri pgAdmin oswa psql" -ForegroundColor White
        Write-Host "  2. Konekte nan nalakreditimachann_db" -ForegroundColor White
        Write-Host "  3. Egzekite script sa:" -ForegroundColor White
        Write-Host ""
        Write-Host "  INSERT INTO `"AspNetUsers`" (" -ForegroundColor Gray
        Write-Host "    `"Email`", `"NormalizedEmail`", `"UserName`", `"NormalizedUserName`"," -ForegroundColor Gray
        Write-Host "    `"FirstName`", `"LastName`", `"PhoneNumber`", `"Department`"," -ForegroundColor Gray  
        Write-Host "    `"Role`", `"PasswordHash`", `"IsActive`", `"EmailConfirmed`"," -ForegroundColor Gray
        Write-Host "    `"PhoneNumberConfirmed`", `"TwoFactorEnabled`", `"LockoutEnabled`"," -ForegroundColor Gray
        Write-Host "    `"AccessFailedCount`", `"CreatedAt`"" -ForegroundColor Gray
        Write-Host "  ) VALUES (" -ForegroundColor Gray
        Write-Host "    'admin@nalacredit.com', 'ADMIN@NALACREDIT.COM'," -ForegroundColor Gray
        Write-Host "    'admin@nalacredit.com', 'ADMIN@NALACREDIT.COM'," -ForegroundColor Gray
        Write-Host "    'Super', 'Admin', '50912345678', 'Administration'," -ForegroundColor Gray
        Write-Host "    0, -- Role SuperAdmin" -ForegroundColor Gray
        Write-Host "    'AQAAAAIAAYagAAAAEHash123...', -- Pou password: Admin@2024!" -ForegroundColor Gray
        Write-Host "    true, true, true, false, false, 0, NOW()" -ForegroundColor Gray
        Write-Host "  );" -ForegroundColor Gray
        Write-Host ""
        Write-Host "OPSYON 2: Modifye itilizatè ki egziste deja" -ForegroundColor Cyan
        Write-Host "  Chanje Role='5' an Role='0' pou superadmin@nalacredit.com" -ForegroundColor White
        Write-Host ""
        Write-Host "  UPDATE `"AspNetUsers`" SET `"Role`" = 0" -ForegroundColor Gray
        Write-Host "  WHERE `"Email`" = 'superadmin@nalacredit.com';" -ForegroundColor Gray
        Write-Host "================================================`n" -ForegroundColor Yellow
        
    } else {
        Write-Host "`n❌ ERÈ KREYASYON!" -ForegroundColor Red
        Write-Host "Status Code: $statusCode" -ForegroundColor Red
        Write-Host "Message: $errorMessage" -ForegroundColor Red
        Write-Host ""
        
        # Eseye jwenn plis detay nan erè
        try {
            $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
            Write-Host "Detay:" -ForegroundColor Yellow
            Write-Host ($errorDetails | ConvertTo-Json -Depth 3) -ForegroundColor White
        } catch {
            Write-Host $_.Exception -ForegroundColor Red
        }
    }
}

Write-Host "`n=================================================="
Write-Host "Script fini.`n"
