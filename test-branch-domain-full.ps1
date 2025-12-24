$email = "melissa.jean@gmail.com"
$password = "Jesus123!!"

Write-Host "`n🧪 TEST LOGIN BRANCH DOMAIN (FULL RESPONSE)" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Gray

# Test login sou branch domain
$loginBody = @{
    email = $email
    password = $password
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "https://branch.nalakreditimachann.com/api/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody

    Write-Host "`n✅ LOGIN SIKSÈ!" -ForegroundColor Green
    Write-Host "`nFULL RESPONSE:" -ForegroundColor Yellow
    $response | ConvertTo-Json -Depth 10 | Write-Host
} catch {
    Write-Host "`n❌ LOGIN ECHWE" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Yellow
    Write-Host "Message: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
}
