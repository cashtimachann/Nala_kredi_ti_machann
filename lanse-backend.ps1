# Script pou lanse backend NalaCredit API
Write-Host "🚀 Ap lanse Backend NalaCredit API..." -ForegroundColor Cyan

# Verifye si backend deja ap kouri
$existingProcess = Get-Process -Name "dotnet" -ErrorAction SilentlyContinue | 
    Where-Object { $_.Path -like "*NalaCreditAPI*" }

if ($existingProcess) {
    Write-Host "⚠️  Backend deja ap kouri (PID: $($existingProcess.Id))" -ForegroundColor Yellow
    $response = Read-Host "Èske ou vle reyinisyalize li? (O/N)"
    if ($response -eq "O" -or $response -eq "o") {
        Write-Host "⏹️  Ap fèmen backend ansyen..." -ForegroundColor Yellow
        Stop-Process -Id $existingProcess.Id -Force
        Start-Sleep -Seconds 2
    } else {
        Write-Host "✅ Kontinye ak backend ki ap kouri a" -ForegroundColor Green
        exit 0
    }
}

# Chanje dirèktwa pou backend
Set-Location "C:\Users\Administrator\Desktop\Kredi Ti Machann\backend\NalaCreditAPI"

# Konfigire pò pou backend (HTTP sèlman pou devlopman lokal)
$env:ASPNETCORE_URLS = "http://localhost:5000"

Write-Host "📡 Backend ap kouri sou: http://localhost:5000" -ForegroundColor Green
Write-Host "📖 Swagger UI: http://localhost:5000/swagger" -ForegroundColor Green
Write-Host "" 
Write-Host "ℹ️  Peze Ctrl+C pou fèmen backend la" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Gray
Write-Host ""

# Lanse backend
try {
    dotnet run
} catch {
    Write-Host "❌ Erè pandan lanse backend: $_" -ForegroundColor Red
    exit 1
}
