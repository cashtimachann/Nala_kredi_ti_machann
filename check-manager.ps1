# Script pour vérifier et créer un compte Chef de Succursale
# Date: 2025-10-18

Write-Host "=== Vérification Compte Chef de Succursale ===" -ForegroundColor Cyan
Write-Host ""

# Compiler et exécuter le programme
Write-Host "1. Compilation du programme..." -ForegroundColor Yellow
dotnet build CheckManagerAccount.csproj -v quiet

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur de compilation" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Compilation réussie" -ForegroundColor Green
Write-Host ""

# Exécuter le programme
Write-Host "2. Vérification de la base de données..." -ForegroundColor Yellow
dotnet run --project CheckManagerAccount.csproj

Write-Host ""
Write-Host "=== Terminé ===" -ForegroundColor Cyan
