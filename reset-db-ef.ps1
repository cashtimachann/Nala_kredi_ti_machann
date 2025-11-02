# Script de reset simple via Entity Framework

Write-Host "=== RESET BASE DE DONNÉES (Entity Framework) ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "Suppression et recréation de la base via EF..." -ForegroundColor Yellow

Set-Location "backend\NalaCreditAPI"

# Supprimer la base de données existante
Write-Host "   Suppression de la base existante..." -ForegroundColor Gray
dotnet ef database drop --force

# Recréer la base de données
Write-Host "   Recréation de la base..." -ForegroundColor Gray  
dotnet ef database update

# Démarrer temporairement le backend pour l'initialisation
Write-Host "   Initialisation des données..." -ForegroundColor Gray
$process = Start-Process -FilePath "dotnet" -ArgumentList "run" -PassThru -NoNewWindow

Start-Sleep -Seconds 8

if (!$process.HasExited) {
    $process.Kill()
}

Set-Location "..\.."

Write-Host ""
Write-Host '✅ BASE DE DONNÉES RESETÉE!' -ForegroundColor Green
Write-Host ''
Write-Host '📧 COMPTES MIS À JOUR:' -ForegroundColor Cyan
Write-Host '   Caissier:        cashier@nalacredit.com       / Cashier123!' -ForegroundColor White
Write-Host '   Agent Crédit:    creditagent@nalacredit.com   / CreditAgent123!' -ForegroundColor White
Write-Host '   Superviseur:     supervisor@nalacredit.com    / Supervisor123!' -ForegroundColor White
Write-Host '   Super Admin:     superadmin@nalacredit.com    / SuperAdmin123!' -ForegroundColor White
Write-Host ""