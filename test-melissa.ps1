# Test login simple
$body = @{
    email = "melissa.jean@gmail.com"
    password = "Jesus123!!"
} | ConvertTo-Json

Write-Host "Testing login for melissa.jean@gmail.com..." -ForegroundColor Cyan

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
    Write-Host "Error: $($_.Exception.Message)"
}
