# Test avec le compte cashier connu
$body = @{
    email = "cashier@nalacredit.com"
    password = "Jesus123!!"
} | ConvertTo-Json

Write-Host "Testing login for cashier@nalacredit.com..." -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "https://admin.nalakreditimachann.com/api/auth/login" `
        -Method Post `
        -Body $body `
        -ContentType "application/json"
    
    Write-Host "SUCCESS!" -ForegroundColor Green
    Write-Host "Name: $($response.user.firstName) $($response.user.lastName)"
    Write-Host "Role: $($response.user.role)"
    Write-Host "Branch: $($response.user.branchId)"
}
catch {
    Write-Host "FAILED!" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)"
}
