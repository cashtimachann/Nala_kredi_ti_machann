# ===============================================
# Test Konplè: Nala Kredi Ti Machann
# Date: 10 Novanm 2025
# ===============================================

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   TEST FONKSYONALITE DEVLOPMAN" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$tests = @()
$passed = 0
$failed = 0

# Test 1: Frontend React
Write-Host "[1/8] Teste Frontend React..." -ForegroundColor Yellow
try {
    $response = curl.exe -s -o NUL -w "%{http_code}" http://localhost:3000
    if ($response -eq "200") {
        Write-Host "  ✅ Frontend ap travay (HTTP $response)" -ForegroundColor Green
        $passed++
        $tests += @{Test="Frontend React"; Status="✅ PASS"; URL="http://localhost:3000"}
    } else {
        Write-Host "  ❌ Frontend retoune HTTP $response" -ForegroundColor Red
        $failed++
        $tests += @{Test="Frontend React"; Status="❌ FAIL"; URL="http://localhost:3000"}
    }
} catch {
    Write-Host "  ❌ Frontend pa aksesib" -ForegroundColor Red
    $failed++
    $tests += @{Test="Frontend React"; Status="❌ FAIL"; URL="http://localhost:3000"}
}

# Test 2: Backend API Connection
Write-Host "`n[2/8] Teste Backend API koneksyon..." -ForegroundColor Yellow
try {
    curl.exe -k -s --max-time 5 https://localhost:5001/api/auth/login > $null
    $exitCode = $LASTEXITCODE
    if ($exitCode -eq 0) {
        Write-Host "  ✅ Backend API aksesib" -ForegroundColor Green
        $passed++
        $tests += @{Test="Backend API"; Status="✅ PASS"; URL="https://localhost:5001"}
    } else {
        Write-Host "  ❌ Backend pa reponn (exit code: $exitCode)" -ForegroundColor Red
        $failed++
        $tests += @{Test="Backend API"; Status="❌ FAIL"; URL="https://localhost:5001"}
    }
} catch {
    Write-Host "  ❌ Erreur koneksyon backend" -ForegroundColor Red
    $failed++
    $tests += @{Test="Backend API"; Status="❌ FAIL"; URL="https://localhost:5001"}
}

# Test 3: Login Endpoint
Write-Host "`n[3/8] Teste Login endpoint..." -ForegroundColor Yellow
try {
    $loginJson = @{
        email = "superadmin@nalacredit.com"
        password = "SuperAdmin123!"
    } | ConvertTo-Json
    
    $loginJson | Out-File -FilePath "test-login-temp.json" -Encoding utf8 -NoNewline
    $loginResponse = curl.exe -k -s -X POST https://localhost:5001/api/auth/login `
        -H "Content-Type: application/json" `
        --data-binary "@test-login-temp.json"
    
    Remove-Item "test-login-temp.json" -ErrorAction SilentlyContinue
    
    if ($loginResponse -match '"token"') {
        Write-Host "  ✅ Login fonksyone - JWT token generated" -ForegroundColor Green
        $passed++
        $tests += @{Test="Login/Auth"; Status="✅ PASS"; URL="POST /api/auth/login"}
    } else {
        Write-Host "  ❌ Login failed - pa gen token" -ForegroundColor Red
        $failed++
        $tests += @{Test="Login/Auth"; Status="❌ FAIL"; URL="POST /api/auth/login"}
    }
} catch {
    Write-Host "  ❌ Erreur pandan login test" -ForegroundColor Red
    $failed++
    $tests += @{Test="Login/Auth"; Status="❌ FAIL"; URL="POST /api/auth/login"}
}

# Test 4: Database PostgreSQL
Write-Host "`n[4/8] Teste PostgreSQL database..." -ForegroundColor Yellow
$pgProcess = Get-Process -Name "postgres" -ErrorAction SilentlyContinue
if ($pgProcess) {
    Write-Host "  ✅ PostgreSQL ap travay ($($pgProcess.Count) processes)" -ForegroundColor Green
    $passed++
    $tests += @{Test="PostgreSQL"; Status="✅ PASS"; URL="localhost:5432"}
} else {
    Write-Host "  ❌ PostgreSQL pa ap travay" -ForegroundColor Red
    $failed++
    $tests += @{Test="PostgreSQL"; Status="❌ FAIL"; URL="localhost:5432"}
}

# Test 5: Dotnet Backend Process
Write-Host "`n[5/8] Teste Backend .NET process..." -ForegroundColor Yellow
$dotnetProcess = Get-Process -Name "dotnet" -ErrorAction SilentlyContinue
if ($dotnetProcess) {
    Write-Host "  ✅ Backend .NET ap travay ($($dotnetProcess.Count) processes)" -ForegroundColor Green
    $passed++
    $tests += @{Test=".NET Backend"; Status="✅ PASS"; URL="N/A"}
} else {
    Write-Host "  ❌ Backend .NET pa ap travay" -ForegroundColor Red
    $failed++
    $tests += @{Test=".NET Backend"; Status="❌ FAIL"; URL="N/A"}
}

# Test 6: Node Frontend Process
Write-Host "`n[6/8] Teste Frontend Node process..." -ForegroundColor Yellow
$nodeProcess = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($nodeProcess) {
    Write-Host "  ✅ Frontend Node ap travay ($($nodeProcess.Count) processes)" -ForegroundColor Green
    $passed++
    $tests += @{Test="Node Frontend"; Status="✅ PASS"; URL="N/A"}
} else {
    Write-Host "  ❌ Frontend Node pa ap travay" -ForegroundColor Red
    $failed++
    $tests += @{Test="Node Frontend"; Status="❌ FAIL"; URL="N/A"}
}

# Test 7: Environment Variables
Write-Host "`n[7/8] Tcheke environment variables..." -ForegroundColor Yellow
$envExists = Test-Path ".env"
$frontendEnvExists = Test-Path "frontend-web\.env"
$frontendEnvProdExists = Test-Path "frontend-web\.env.production"

if ($envExists -and $frontendEnvProdExists) {
    Write-Host "  ✅ Fichye environment yo byen konfigire" -ForegroundColor Green
    $passed++
    $tests += @{Test="Environment Files"; Status="✅ PASS"; URL="N/A"}
} else {
    Write-Host "  ⚠️  Kèk fichye environment manke:" -ForegroundColor Yellow
    if (-not $envExists) { Write-Host "     - .env manke" -ForegroundColor Yellow }
    if (-not $frontendEnvProdExists) { Write-Host "     - frontend-web\.env.production manke" -ForegroundColor Yellow }
    $failed++
    $tests += @{Test="Environment Files"; Status="⚠️  WARN"; URL="N/A"}
}

# Test 8: API Endpoints Sample
Write-Host "`n[8/8] Teste API endpoints disponib..." -ForegroundColor Yellow
try {
    $branchesResponse = curl.exe -k -s -o NUL -w "%{http_code}" https://localhost:5001/api/branches
    $usersResponse = curl.exe -k -s -o NUL -w "%{http_code}" https://localhost:5001/api/users
    
    if ($branchesResponse -ne "000" -and $usersResponse -ne "000") {
        Write-Host "  ✅ API endpoints reponn (branches: $branchesResponse, users: $usersResponse)" -ForegroundColor Green
        $passed++
        $tests += @{Test="API Endpoints"; Status="✅ PASS"; URL="/api/branches, /api/users"}
    } else {
        Write-Host "  ❌ API endpoints pa reponn" -ForegroundColor Red
        $failed++
        $tests += @{Test="API Endpoints"; Status="❌ FAIL"; URL="/api/branches, /api/users"}
    }
} catch {
    Write-Host "  ❌ Erreur pandan test endpoints" -ForegroundColor Red
    $failed++
    $tests += @{Test="API Endpoints"; Status="❌ FAIL"; URL="/api/branches, /api/users"}
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "           REZIME TEST YO" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

foreach ($test in $tests) {
    $status = $test.Status
    $name = $test.Test.PadRight(25)
    $url = $test.URL
    Write-Host "$status $name | $url"
}

Write-Host "`n----------------------------------------" -ForegroundColor Cyan
$total = $passed + $failed
$percentage = [math]::Round(($passed / $total) * 100, 1)

Write-Host "Total: $total tests" -ForegroundColor White
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Red" })
Write-Host "Success Rate: $percentage%" -ForegroundColor $(if ($percentage -ge 80) { "Green" } elseif ($percentage -ge 60) { "Yellow" } else { "Red" })

# Final Status
Write-Host "`n========================================" -ForegroundColor Cyan
if ($failed -eq 0) {
    Write-Host "  🎉 TOUT TEST YO PASE! APLIKASYON OK!" -ForegroundColor Green
    Write-Host "========================================`n" -ForegroundColor Cyan
    Write-Host "📱 Ouvri aplikasyon an nan:" -ForegroundColor White
    Write-Host "   Frontend: http://localhost:3000" -ForegroundColor Cyan
    Write-Host "   API: https://localhost:5001/api" -ForegroundColor Cyan
    Write-Host "`n🔐 Kredansyèl default:" -ForegroundColor White
    Write-Host "   Email: superadmin@nalacredit.com" -ForegroundColor Cyan
    Write-Host "   Password: SuperAdmin123!" -ForegroundColor Cyan
    exit 0
} elseif ($percentage -ge 75) {
    Write-Host "  ⚠️  PLIPA TEST YO PASE MEN GEN KEK PWOBLEM" -ForegroundColor Yellow
    Write-Host "========================================`n" -ForegroundColor Cyan
    exit 1
} else {
    Write-Host "  ❌ GEN TWÒP PWOBLEM! VERIFYE KONFIGIRASYON" -ForegroundColor Red
    Write-Host "========================================`n" -ForegroundColor Cyan
    exit 2
}
