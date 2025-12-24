# Liste tous les comptes caissiers disponibles
Write-Host "=== COMPTES CAISSIERS DISPONIBLES ===" -ForegroundColor Cyan
Write-Host ""

$emails = @(
    "cashier@nalacredit.com",
    "darline@nalakreditimachann.com",
    "testcashier@nalacredit.com"
)

foreach ($email in $emails) {
    Write-Host "Testing: $email" -ForegroundColor Yellow
    
    $body = @{
        email = $email
        password = "Jesus123!!"
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri "https://admin.nalakreditimachann.com/api/auth/login" `
            -Method Post `
            -Body $body `
            -ContentType "application/json" `
            -ErrorAction Stop
        
        Write-Host "  ✅ SUCCESS!" -ForegroundColor Green
        Write-Host "     Name: $($response.user.firstName) $($response.user.lastName)" -ForegroundColor Green
        Write-Host "     Role: $($response.user.role)" -ForegroundColor Green
        Write-Host "     Branch: $($response.user.branchId)" -ForegroundColor Green
        Write-Host ""
    }
    catch {
        Write-Host "  ❌ Failed (Status: $($_.Exception.Response.StatusCode.value__))" -ForegroundColor Red
        Write-Host ""
    }
}
