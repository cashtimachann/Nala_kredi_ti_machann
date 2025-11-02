# Script simple de démarrage des services principaux
param(
    [switch]$SkipInfrastructure,
    [switch]$BackendOnly,
    [switch]$FrontendOnly
)

Write-Host "=== NALA KREDI TI MACHANN ===" -ForegroundColor Green
Write-Host "Script de démarrage simplifié" -ForegroundColor Yellow
Write-Host ""

if (!$SkipInfrastructure -and !$FrontendOnly) {
    Write-Host "Démarrage du Backend API..." -ForegroundColor Cyan
    $backendPath = "c:\Users\Administrator\Desktop\Kredi Ti Machann\backend\NalaCreditAPI"
    
    if (Test-Path $backendPath) {
        Push-Location $backendPath
        Write-Host "   📍 Répertoire: $backendPath" -ForegroundColor Gray
        Write-Host "   🚀 Commande: dotnet run" -ForegroundColor Gray
        Write-Host ""
        & dotnet run
        Pop-Location
    } else {
        Write-Host "   ❌ Répertoire backend non trouvé: $backendPath" -ForegroundColor Red
        exit 1
    }
}

if (!$BackendOnly -and !$SkipInfrastructure) {
    Write-Host ""
    Write-Host "Démarrage du Frontend Web..." -ForegroundColor Cyan
    $frontendPath = "c:\Users\Administrator\Desktop\Kredi Ti Machann\frontend-web"
    
    if (Test-Path $frontendPath) {
        Push-Location $frontendPath
        Write-Host "   📍 Répertoire: $frontendPath" -ForegroundColor Gray
        Write-Host "   🚀 Commande: npm start" -ForegroundColor Gray
        Write-Host ""
        & npm start
        Pop-Location
    } else {
        Write-Host "   ❌ Répertoire frontend non trouvé: $frontendPath" -ForegroundColor Red
        exit 1
    }
}