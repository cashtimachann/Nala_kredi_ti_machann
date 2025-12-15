# Script pou lanse Desktop App NalaCredit
Write-Host "🖥️  Ap lanse Desktop App NalaCredit..." -ForegroundColor Cyan

# Verifye si desktop app deja ap kouri
$existingProcess = Get-Process -Name "NalaCreditDesktop" -ErrorAction SilentlyContinue

if ($existingProcess) {
    Write-Host "⚠️  Desktop app deja ap kouri (PID: $($existingProcess.Id))" -ForegroundColor Yellow
    $response = Read-Host "Èske ou vle fèmen li epi relanse? (O/N)"
    if ($response -eq "O" -or $response -eq "o") {
        Write-Host "⏹️  Ap fèmen desktop app..." -ForegroundColor Yellow
        Stop-Process -Id $existingProcess.Id -Force
        Start-Sleep -Seconds 2
    } else {
        Write-Host "✅ Desktop app deja ap kouri" -ForegroundColor Green
        exit 0
    }
}

# Chanje dirèktwa pou desktop
Set-Location "C:\Users\Administrator\Desktop\Kredi Ti Machann\frontend-desktop\NalaCreditDesktop"

Write-Host "🔨 Ap konpile desktop app..." -ForegroundColor Yellow
dotnet build --configuration Debug

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Konpilasyon reyisi!" -ForegroundColor Green
    Write-Host "🚀 Ap lanse aplikasyon..." -ForegroundColor Cyan
    Write-Host ""
    
    # Lanse aplikasyon
    Start-Process ".\bin\Debug\net8.0-windows\NalaCreditDesktop.exe"
    
    Write-Host "✅ Desktop app lanse!" -ForegroundColor Green
    Write-Host "ℹ️  Backend URL: http://localhost:5000/api" -ForegroundColor Cyan
} else {
    Write-Host "❌ Erè nan konpilasyon. Verifye erè yo anlè." -ForegroundColor Red
    exit 1
}
