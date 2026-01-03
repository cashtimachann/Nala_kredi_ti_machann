# Simple PowerShell script pou update password
Add-Type -AssemblyName "System.Security.Cryptography.Primitives"

$email = "cashier@nalacredit.com"
$password = "Cashier123!"

Write-Host "Updating password for: $email" -ForegroundColor Cyan

# Ann eseye konekte ak backend production olye de lokal
Write-Host "`nTesting PRODUCTION backend..." -ForegroundColor Yellow

$body = @{
    email = $email
    password = $password
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "https://admin.nalakreditimachann.com/api/auth/login" -Method POST -ContentType "application/json" -Body $body -ErrorAction Stop
    
    Write-Host "SUCCESS on PRODUCTION!" -ForegroundColor Green
    Write-Host "User: $($response.user.firstName) $($response.user.lastName)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Change desktop app config to use PRODUCTION:" -ForegroundColor Yellow
    Write-Host '   "BaseUrl": "https://admin.nalakreditimachann.com/api"' -ForegroundColor White
}
catch {
    Write-Host "PRODUCTION failed: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "`nLet me try melissa.jean@gmail.com on local..." -ForegroundColor Yellow
    
    $body2 = @{
        email = "melissa.jean@gmail.com"
        password = "Jesus123!!"
    } | ConvertTo-Json
    
    Start-Sleep -Seconds 3
    
    try {
        $r2 = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method POST -ContentType "application/json" -Body $body2 -ErrorAction Stop
        Write-Host "SUCCESS with melissa.jean@gmail.com!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Use these credentials in desktop app:" -ForegroundColor Yellow
        Write-Host "   Email: melissa.jean@gmail.com" -ForegroundColor White
        Write-Host "   Password: Jesus123!!" -ForegroundColor White
    }
    catch {
        Write-Host "Both accounts failed. Database might be empty." -ForegroundColor Red
    }
}
