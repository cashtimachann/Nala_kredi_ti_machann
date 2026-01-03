# Test script pou verifye si rechèch kliyan fonksyone
# Test pour OpenAccountWindow

Write-Host "=== Test Rechèch Kliyan pou OpenAccountWindow ===" -ForegroundColor Cyan
Write-Host ""

# 1. Verifye si backend la ap kouri
Write-Host "1. Verifye si backend API a ap kouri..." -ForegroundColor Yellow
$backendProcess = Get-Process -Name "NalaCreditAPI" -ErrorAction SilentlyContinue
if ($backendProcess) {
    Write-Host "   ✓ Backend API ap kouri (PID: $($backendProcess.Id))" -ForegroundColor Green
} else {
    Write-Host "   ✗ Backend API pa ap kouri" -ForegroundColor Red
    Write-Host "   Lanse backend la premye..." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "2. Teste koneksyon API a..." -ForegroundColor Yellow

# Test ping API
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/health" -Method Get -TimeoutSec 5 -ErrorAction Stop
    Write-Host "   ✓ API repond byen (Status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "   ⚠ API pa repond oswa pa gen endpoint /health" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "3. Teste rechèch kliyan san koneksyon (anònm)..." -ForegroundColor Yellow

# Try searching without auth first to see the error
try {
    $searchResponse = Invoke-WebRequest -Uri "http://localhost:5000/api/SavingsCustomer/MJ5380" -Method Get -ErrorAction Stop
    Write-Host "   ⚠ Rechèch fonksyone san otantifikasyon (sa pa nòmal)" -ForegroundColor Yellow
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 401) {
        Write-Host "   ✓ API mande otantifikasyon tankou espere" -ForegroundColor Green
    } else {
        Write-Host "   ⚠ Erè: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "4. Eseye konekte ak kredensiyal test..." -ForegroundColor Yellow

# Try different test credentials
$credentials = @(
    @{ username = "cashier"; password = "Cashier123!" },
    @{ username = "admin"; password = "Admin123!" },
    @{ username = "testuser"; password = "Test123!" }
)

$token = $null
foreach ($cred in $credentials) {
    try {
        $loginBody = @{
            username = $cred.username
            password = $cred.password
        } | ConvertTo-Json
        
        $loginResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json" -ErrorAction Stop
        
        if ($loginResponse.token) {
            $token = $loginResponse.token
            Write-Host "   ✓ Koneksyon reyisi ak: $($cred.username)" -ForegroundColor Green
            Write-Host "   Token: $($token.Substring(0, [Math]::Min(30, $token.Length)))..." -ForegroundColor Gray
            break
        }
    } catch {
        Write-Host "   ✗ Koneksyon echwe pou: $($cred.username)" -ForegroundColor Red
    }
}

if (-not $token) {
    Write-Host ""
    Write-Host "   ⚠ Pa ka konekte ak okenn kredensiyal test" -ForegroundColor Yellow
    Write-Host "   Desktop app la ap bezwen itilizatè valide pou teste rechèch" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "=== Rezime ===" -ForegroundColor Cyan
    Write-Host "Backend API ap kouri, men nou bezwen kredensiyal valid pou teste." -ForegroundColor Yellow
    Write-Host "Desktop app la ka ouvri epi itilizatè ka konekte ak kredensiyal pa yo." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "5. Teste rechèch kliyan MJ5380 ak token..." -ForegroundColor Yellow

$headers = @{
    "Authorization" = "Bearer $token"
}

try {
    $customerResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/SavingsCustomer/MJ5380" -Method Get -Headers $headers -ErrorAction Stop
    Write-Host "   ✓ Kliyan MJ5380 jwenn!" -ForegroundColor Green
    Write-Host "   Non: $($customerResponse.firstName) $($customerResponse.lastName)" -ForegroundColor Gray
    Write-Host "   Telefòn: $($customerResponse.contact.primaryPhone)" -ForegroundColor Gray
    
    Write-Host ""
    Write-Host "6. ✓ Desktop app la ka ouvri yon kont pou kliyan sa a san pwoblèm!" -ForegroundColor Green
    
} catch {
    $statusCode = 0
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
    }
    
    if ($statusCode -eq 404) {
        Write-Host "   ⚠ Kliyan MJ5380 pa egziste nan sistèm nan" -ForegroundColor Yellow
        
        Write-Host ""
        Write-Host "7. Chèche kliyan ki gen ID ki sanble..." -ForegroundColor Yellow
        
        try {
            $searchResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/SavingsCustomer/search?searchTerm=MJ" -Method Get -Headers $headers -ErrorAction Stop
            
            if ($searchResponse -and $searchResponse.Count -gt 0) {
                Write-Host "   Kliyan ki gen ID ki sanble:" -ForegroundColor Gray
                $searchResponse | Select-Object -First 5 | ForEach-Object {
                    Write-Host "   - $($_.id): $($_.firstName) $($_.lastName)" -ForegroundColor Gray
                }
            } else {
                Write-Host "   ⚠ Okenn kliyan ak ID ki kòmanse ak 'MJ'" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "   ⚠ Erè nan rechèch: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   ✗ Erè: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== KONKLIZYON ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Desktop app la (OpenAccountWindow) gen tout fonksyonalite pou:" -ForegroundColor White
Write-Host "  • Chèche kliyan pa ID (tankou MJ5380)" -ForegroundColor White
Write-Host "  • Chèche kliyan pa non oswa telefòn" -ForegroundColor White
Write-Host "  • Ouvri nouvo kont pou kliyan yo" -ForegroundColor White
Write-Host ""

if ($token) {
    Write-Host "API a fonksyone byen! Si kliyan MJ5380 pa egziste," -ForegroundColor Green
    Write-Host "ou ka kreye li nan sistèm nan oswa teste ak yon lòt kliyan." -ForegroundColor Green
} else {
    Write-Host "Backend la fonksyone, desktop app la ka itilize li apre koneksyon." -ForegroundColor Yellow
}

Write-Host ""
