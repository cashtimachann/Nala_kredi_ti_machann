# Script pou lanse sistèm konplè NalaCredit
Write-Host "="*70 -ForegroundColor Cyan
Write-Host "   🏦 SISTÈM NALA CREDIT - Jesyon Kredi Ti Machann" -ForegroundColor Cyan
Write-Host "="*70 -ForegroundColor Cyan
Write-Host ""

# Verifye si backend deja ap kouri
$backendProcess = Get-Process -Name "dotnet" -ErrorAction SilentlyContinue | 
    Where-Object { $_.Path -like "*NalaCreditAPI*" }

if (-not $backendProcess) {
    Write-Host "📡 Backend pa ap kouri. Ap lanse backend..." -ForegroundColor Yellow
    
    # Lanse backend nan yon nouvo fenèt PowerShell
    $backendPath = "C:\Users\Administrator\Desktop\Kredi Ti Machann"
    Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "$backendPath\lanse-backend.ps1"
    
    Write-Host "⏳ Tann backend pou demaré (15 segond)..." -ForegroundColor Yellow
    Start-Sleep -Seconds 15
    
    # Verifye si backend ap kouri
    $testConnection = Test-NetConnection -ComputerName localhost -Port 5000 -InformationLevel Quiet
    if ($testConnection) {
        Write-Host "✅ Backend lanse ak siksè sou http://localhost:5000" -ForegroundColor Green
    } else {
        Write-Host "❌ Backend pa ka konekte. Gade fenèt PowerShell backend la pou wè erè." -ForegroundColor Red
        Write-Host "Peze nenpòt touch pou kontinye..." -ForegroundColor Yellow
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    }
} else {
    Write-Host "✅ Backend deja ap kouri (PID: $($backendProcess.Id))" -ForegroundColor Green
}

Write-Host ""
Write-Host "🖥️  Ap lanse Desktop App..." -ForegroundColor Cyan

# Lanse desktop app
$desktopPath = "C:\Users\Administrator\Desktop\Kredi Ti Machann"
& "$desktopPath\lanse-desktop.ps1"

Write-Host ""
Write-Host "="*70 -ForegroundColor Green
Write-Host "   ✅ SISTÈM LANSE AK SIKSÈ!" -ForegroundColor Green
Write-Host "="*70 -ForegroundColor Green
Write-Host ""
Write-Host "📌 Enfòmasyon Sistèm:" -ForegroundColor Cyan
Write-Host "   • Backend API: http://localhost:5000" -ForegroundColor White
Write-Host "   • Swagger UI: http://localhost:5000/swagger" -ForegroundColor White
Write-Host "   • Desktop App: Ap kouri" -ForegroundColor White
Write-Host ""
Write-Host "👤 Pou teste login:" -ForegroundColor Cyan
Write-Host "   Email: admin@nalakredi.ht" -ForegroundColor White
Write-Host "   Modpas: Admin123!" -ForegroundColor White
Write-Host ""
Write-Host "ℹ️  Gade fenèt PowerShell backend la pou log yo" -ForegroundColor Yellow
Write-Host ""

# Tann pou itilizatè fèmen
Write-Host "Peze nenpòt touch pou fèmen script sa a..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
