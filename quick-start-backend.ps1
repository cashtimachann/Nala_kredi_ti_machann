# RESTART RAPIDE - Backend sou Port 5000

Write-Host "`n🚀 RELANSE BACKEND SOU PORT 5000" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan

# Stop tout pwosesis dotnet
Write-Host "`nEtap 1: Stop pwosesis dotnet..." -ForegroundColor Yellow
Stop-Process -Name dotnet -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Host "  Done" -ForegroundColor Green

# Navigate to backend
$backendPath = "C:\Users\Administrator\Desktop\Kredi Ti Machann\backend\NalaCreditAPI"
Set-Location $backendPath

Write-Host "`nEtap 2: Lanse backend..." -ForegroundColor Yellow
Write-Host "  Folder: $backendPath" -ForegroundColor White
Write-Host "  Port: 5000" -ForegroundColor White
Write-Host "`nBackend ap demarre..." -ForegroundColor Green
Write-Host "(Gade konsol la pou mesaj debug)`n" -ForegroundColor Cyan

# Run backend
dotnet run --launch-profile http
