# Script pou teste API GetLoans
$apiUrl = "http://localhost:5000/api/MicrocreditLoan"

Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host "="*70 -ForegroundColor Cyan
Write-Host "TEST API CREDITS ACTIFS" -ForegroundColor Yellow
Write-Host "="*71 -ForegroundColor Cyan

# Test 1: Sans filtres
Write-Host "`nTest 1: Tous les crédits (sans filtres)" -ForegroundColor Green
try {
    $response1 = Invoke-RestMethod -Uri "$apiUrl?page=1&pageSize=100" -Method Get
    Write-Host "  Total: $($response1.totalCount)" -ForegroundColor White
    Write-Host "  Loans returned: $($response1.loans.Count)" -ForegroundColor White
    if ($response1.loans.Count -gt 0) {
        Write-Host "`n  Premiers crédits:" -ForegroundColor Cyan
        $response1.loans | Select-Object -First 3 | ForEach-Object {
            Write-Host "    - $($_.loanNumber): $($_.borrowerName) - Status: $($_.status)" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "  ERREUR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  Détails: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
}

# Test 2: Status = Active
Write-Host "`nTest 2: Crédits avec status=Active" -ForegroundColor Green
try {
    $response2 = Invoke-RestMethod -Uri "$apiUrl?page=1&pageSize=100&status=Active" -Method Get
    Write-Host "  Total: $($response2.totalCount)" -ForegroundColor White
    Write-Host "  Loans returned: $($response2.loans.Count)" -ForegroundColor White
    if ($response2.loans.Count -gt 0) {
        Write-Host "`n  Crédits actifs:" -ForegroundColor Cyan
        $response2.loans | ForEach-Object {
            Write-Host "    - $($_.loanNumber): $($_.borrowerName) - Branch: $($_.branchId)" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "  ERREUR: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Status = Overdue
Write-Host "`nTest 3: Crédits avec status=Overdue" -ForegroundColor Green
try {
    $response3 = Invoke-RestMethod -Uri "$apiUrl?page=1&pageSize=100&status=Overdue" -Method Get
    Write-Host "  Total: $($response3.totalCount)" -ForegroundColor White
    Write-Host "  Loans returned: $($response3.loans.Count)" -ForegroundColor White
} catch {
    Write-Host "  ERREUR: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Avec branchId = 1 (Jacmel)
Write-Host "`nTest 4: Crédits pour branchId=1" -ForegroundColor Green
try {
    $response4 = Invoke-RestMethod -Uri "$apiUrl?page=1&pageSize=100&branchId=1" -Method Get
    Write-Host "  Total: $($response4.totalCount)" -ForegroundColor White
    Write-Host "  Loans returned: $($response4.loans.Count)" -ForegroundColor White
} catch {
    Write-Host "  ERREUR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n" -NoNewline
Write-Host "="*71 -ForegroundColor Cyan
Write-Host "FIN DES TESTS" -ForegroundColor Yellow
Write-Host "="*71 -ForegroundColor Cyan
