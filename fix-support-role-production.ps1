#!/usr/bin/env pwsh

Write-Host "Ajout du role Support manquant en production..." -ForegroundColor Cyan
Write-Host ""

$sshKey = "$env:USERPROFILE\.ssh\nala_key"
$serverIp = "142.93.78.111"

# Lire le script SQL
$sqlScript = Get-Content "add-support-role.sql" -Raw

Write-Host "Execution du script SQL sur le serveur de production..." -ForegroundColor Yellow
Write-Host ""

# Se connecter au serveur et exécuter le script SQL via Docker
ssh -i $sshKey root@$serverIp @"
docker exec -i nala-postgres psql -U postgres -d NalaCredit << 'EOSQL'
$sqlScript
EOSQL
"@

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "SUCCESS: Role Support ajoute avec succes!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Note: Le role Support est maintenant disponible pour:" -ForegroundColor Cyan
    Write-Host "   - Type admin: SECRETAIRE_ADMINISTRATIF" -ForegroundColor White
    Write-Host "   - UserRole: SupportTechnique" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "ERROR: Erreur lors de l'ajout du role" -ForegroundColor Red
    exit 1
}
