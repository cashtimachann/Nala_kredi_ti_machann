$email = "melissa.jean@gmail.com"
$password = "Jesus123!!"

Write-Host "`n🧪 TEST LOGIN SOU BRANCH DOMAIN" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Gray

# Test login sou branch domain
Write-Host "`n✅ Testing: $email" -ForegroundColor Yellow
$loginBody = @{
    email = $email
    password = $password
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "https://branch.nalakreditimachann.com/api/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body $loginBody `
    -ErrorAction SilentlyContinue

if ($response.StatusCode -eq 200) {
    $data = $response.Content | ConvertFrom-Json
    Write-Host "   ✅ LOGIN SIKSÈ!" -ForegroundColor Green
    Write-Host "   Role: $($data.role)" -ForegroundColor Cyan
    Write-Host "   Email: $($data.email)" -ForegroundColor Cyan
    Write-Host "   Token: $($data.token.Substring(0, 30))..." -ForegroundColor Gray
} else {
    Write-Host "   ❌ Status: $($response.StatusCode)" -ForegroundColor Red
    Write-Host "   Message: $($response.Content)" -ForegroundColor Yellow
}

Write-Host "`n" -NoNewline
