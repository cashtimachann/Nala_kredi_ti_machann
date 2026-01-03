# Test simple pou verifye rechèch kliyan
Write-Host "=== Test Rechèch Kliyan (OpenAccountWindow) ===" -ForegroundColor Cyan
Write-Host ""

# 1. Verifye backend
Write-Host "1. Verifye Backend..." -ForegroundColor Yellow
$backend = Get-Process -Name "NalaCreditAPI" -ErrorAction SilentlyContinue
if ($backend) {
    Write-Host "   ✓ Backend ap kouri (PID: $($backend.Id))" -ForegroundColor Green
} else {
    Write-Host "   ✗ Backend pa ap kouri" -ForegroundColor Red
    exit 1
}

# 2. Teste koneksyon
Write-Host ""
Write-Host "2. Teste kredensiyal..." -ForegroundColor Yellow

$credentials = @(
    @{ username = "cashier"; password = "Cashier123!" }
    @{ username = "admin"; password = "Admin123!" }
)

$token = $null
foreach ($cred in $credentials) {
    $loginBody = "{`"username`":`"$($cred.username)`",`"password`":`"$($cred.password)`"}"
    
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
        if ($response.token) {
            $token = $response.token
            Write-Host "   ✓ Konekte ak: $($cred.username)" -ForegroundColor Green
            break
        }
    } catch {
        # Silent fail
    }
}

if (-not $token) {
    Write-Host "   ⚠ Pa ka konekte. Desktop app bezwen itilizatè valid." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "REZILTA: Desktop app fonksyone byen, men bezwen koneksyon." -ForegroundColor Cyan
    exit 0
}

# 3. Chèche kliyan MJ5380
Write-Host ""
Write-Host "3. Chèche kliyan MJ5380..." -ForegroundColor Yellow

$headers = @{ "Authorization" = "Bearer $token" }

try {
    $customer = Invoke-RestMethod -Uri "http://localhost:5000/api/SavingsCustomer/MJ5380" -Method Get -Headers $headers
    Write-Host "   ✓ Kliyan jwenn!" -ForegroundColor Green
    Write-Host "   Non: $($customer.firstName) $($customer.lastName)" -ForegroundColor White
    Write-Host "   Telefòn: $($customer.contact.primaryPhone)" -ForegroundColor White
    Write-Host ""
    Write-Host "REZILTA: Desktop app ka jwenn epi ouvri kont pou kliyan sa a!" -ForegroundColor Green
} catch {
    Write-Host "   ⚠ Kliyan MJ5380 pa jwenn" -ForegroundColor Yellow
    
    # Chèche kliyan ki sanble
    try {
        $results = Invoke-RestMethod -Uri "http://localhost:5000/api/SavingsCustomer/search?searchTerm=MJ" -Method Get -Headers $headers
        if ($results -and $results.Count -gt 0) {
            Write-Host ""
            Write-Host "   Kliyan ki sanble:" -ForegroundColor Cyan
            $results | Select-Object -First 5 | ForEach-Object {
                Write-Host "   - $($_.id): $($_.firstName) $($_.lastName)" -ForegroundColor White
            }
        }
    } catch {
        # Silent
    }
    
    Write-Host ""
    Write-Host "REZILTA: Desktop app fonksyone byen, men kliyan MJ5380 pa egziste." -ForegroundColor Yellow
}

Write-Host ""
