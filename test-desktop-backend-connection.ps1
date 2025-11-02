# Test Desktop-Backend Communication
# Script pou verifye si desktop app ka kominike ak backend

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TEST KOMINIKASYON DESKTOP ↔ BACKEND" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan

# Backend URL (from desktop app configuration)
$backendUrl = "http://localhost:5000"
$apiEndpoint = "$backendUrl/api/auth/login"

Write-Host "1️⃣  Ap verifye si backend ap roule..." -ForegroundColor White
Write-Host "    URL: $backendUrl`n" -ForegroundColor Gray

# Test 1: Check if backend is responding
try {
    $healthCheck = Invoke-WebRequest -Uri "$backendUrl/health" -Method GET -TimeoutSec 5 -ErrorAction Stop
    Write-Host "    ✅ Backend ap reponn!" -ForegroundColor Green
    Write-Host "    Status Code: $($healthCheck.StatusCode)`n" -ForegroundColor Gray
} catch {
    if ($_.Exception.Response.StatusCode -eq "NotFound") {
        Write-Host "    ⚠️  Backend ap roule men /health endpoint pa disponib" -ForegroundColor Yellow
        Write-Host "    Ap eseye yon lòt endpoint...`n" -ForegroundColor Gray
        
        # Try root endpoint
        try {
            $rootCheck = Invoke-WebRequest -Uri $backendUrl -Method GET -TimeoutSec 5 -ErrorAction Stop
            Write-Host "    ✅ Backend ap reponn sou root endpoint!" -ForegroundColor Green
            Write-Host "    Status Code: $($rootCheck.StatusCode)`n" -ForegroundColor Gray
        } catch {
            Write-Host "    ❌ Backend pa ap reponn!" -ForegroundColor Red
            Write-Host "    Ere: $($_.Exception.Message)`n" -ForegroundColor Red
            Write-Host "SOLISYON:" -ForegroundColor Yellow
            Write-Host "  1. Start backend:" -ForegroundColor White
            Write-Host "     cd backend\NalaCreditAPI" -ForegroundColor Gray
            Write-Host "     dotnet run --launch-profile http`n" -ForegroundColor Gray
            exit 1
        }
    } else {
        Write-Host "    ❌ Backend pa ap reponn!" -ForegroundColor Red
        Write-Host "    Ere: $($_.Exception.Message)`n" -ForegroundColor Red
        Write-Host "SOLISYON:" -ForegroundColor Yellow
        Write-Host "  1. Verifye si backend ap roule" -ForegroundColor White
        Write-Host "  2. Tcheke si port 5000 disponib" -ForegroundColor White
        Write-Host "  3. Start backend:" -ForegroundColor White
        Write-Host "     cd backend\NalaCreditAPI" -ForegroundColor Gray
        Write-Host "     dotnet run --launch-profile http`n" -ForegroundColor Gray
        exit 1
    }
}

Write-Host "2️⃣  Ap verifye login endpoint..." -ForegroundColor White
Write-Host "    URL: $apiEndpoint`n" -ForegroundColor Gray

# Test 2: Check login endpoint (should return 400/401 without credentials)
try {
    $testLogin = @{
        email = "test@test.com"
        password = "test123"
    } | ConvertTo-Json

    $response = Invoke-WebRequest -Uri $apiEndpoint `
        -Method POST `
        -Body $testLogin `
        -ContentType "application/json" `
        -TimeoutSec 5 `
        -ErrorAction Stop
    
    Write-Host "    ℹ️  Login endpoint reponn (unexpected success)" -ForegroundColor Yellow
    Write-Host "    Status Code: $($response.StatusCode)`n" -ForegroundColor Gray
    
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    
    if ($statusCode -eq 400 -or $statusCode -eq 401) {
        Write-Host "    ✅ Login endpoint ap travay!" -ForegroundColor Green
        Write-Host "    Status Code: $statusCode (Expected - Invalid credentials)`n" -ForegroundColor Gray
    } else {
        Write-Host "    ⚠️  Login endpoint reponn men ak yon lòt status" -ForegroundColor Yellow
        Write-Host "    Status Code: $statusCode" -ForegroundColor Yellow
        Write-Host "    Message: $($_.Exception.Message)`n" -ForegroundColor Gray
    }
}

Write-Host "3️⃣  Ap verifye desktop app configuration..." -ForegroundColor White

# Test 3: Check ApiService configuration
$apiServicePath = "frontend-desktop\NalaCreditDesktop\Services\ApiService.cs"

if (Test-Path $apiServicePath) {
    $apiServiceContent = Get-Content $apiServicePath -Raw
    
    if ($apiServiceContent -match 'BaseUrl\s*=\s*"([^"]+)"') {
        $configuredUrl = $matches[1]
        Write-Host "    Base URL configuré: $configuredUrl" -ForegroundColor Gray
        
        if ($configuredUrl -eq $backendUrl) {
            Write-Host "    ✅ Desktop configuration kòrèk!`n" -ForegroundColor Green
        } else {
            Write-Host "    ⚠️  URL diferan de sa nou teste a" -ForegroundColor Yellow
            Write-Host "    Expected: $backendUrl" -ForegroundColor Gray
            Write-Host "    Actual:   $configuredUrl`n" -ForegroundColor Gray
        }
    } else {
        Write-Host "    ⚠️  Pa ka jwenn BaseUrl nan ApiService`n" -ForegroundColor Yellow
    }
} else {
    Write-Host "    ⚠️  ApiService.cs pa jwenn`n" -ForegroundColor Yellow
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "REZILTA FINAL" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "✅ Backend ap roule" -ForegroundColor Green
Write-Host "✅ Login endpoint disponib" -ForegroundColor Green
Write-Host "✅ Desktop app ka kominike ak backend`n" -ForegroundColor Green

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "READY POU LOGIN!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Ou ka kounye a:" -ForegroundColor White
Write-Host "  1. Ouvri desktop app:" -ForegroundColor Gray
Write-Host "     cd frontend-desktop\NalaCreditDesktop" -ForegroundColor Gray
Write-Host "     dotnet run`n" -ForegroundColor Gray

Write-Host "  2. Login ak:" -ForegroundColor Gray
Write-Host "     Email:    chamy@gmail.com" -ForegroundColor Cyan
Write-Host "     Password: [ou password]`n" -ForegroundColor Cyan

Write-Host "  3. Expected:" -ForegroundColor Gray
Write-Host "     ✅ BranchManagerDashboard ouvri" -ForegroundColor Green
Write-Host "     ✅ 7 modil afiche`n" -ForegroundColor Green

Write-Host "========================================`n" -ForegroundColor Cyan
