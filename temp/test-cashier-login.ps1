# Update cashier password in local database

Add-Type -Path "C:\Users\Administrator\.nuget\packages\npgsql\8.0.0\lib\net8.0\Npgsql.dll" -ErrorAction SilentlyContinue

$email = "cashier@nalacredit.com"
$password = "Cashier123!"

Write-Host "🔐 Testing login for existing account..." -ForegroundColor Cyan

# Test if account exists and can login
$body = @{
    email = $email
    password = $password
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method POST -ContentType "application/json" -Body $body -ErrorAction Stop
    
    Write-Host "✅ Login successful!" -ForegroundColor Green
    Write-Host "User: $($response.user.firstName) $($response.user.lastName)" -ForegroundColor Green
    Write-Host "Role: $($response.user.role)" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Use these credentials:" -ForegroundColor Yellow
    Write-Host "   Email: $email"
    Write-Host "   Password: $password"
}
catch {
    Write-Host "❌ Login failed with current password" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host ""
    Write-Host "ℹ️  Try one of these accounts instead:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Option 1:" -ForegroundColor Cyan
    Write-Host "   Email: melissa.jean@gmail.com"
    Write-Host "   Password: Jesus123!!"
    Write-Host ""
    Write-Host "Testing melissa.jean@gmail.com..." -ForegroundColor Cyan
    
    $body2 = @{
        email = "melissa.jean@gmail.com"
        password = "Jesus123!!"
    } | ConvertTo-Json
    
    try {
        $response2 = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method POST -ContentType "application/json" -Body $body2 -ErrorAction Stop
        Write-Host "✅ melissa.jean@gmail.com works!" -ForegroundColor Green
        Write-Host "User: $($response2.user.firstName) $($response2.user.lastName)" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ melissa.jean@gmail.com also failed" -ForegroundColor Red
    }
}
