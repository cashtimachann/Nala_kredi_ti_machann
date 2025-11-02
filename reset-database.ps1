# Script de reset de la base de données

Write-Host "=== RESET BASE DE DONNÉES NALA KREDI ===" -ForegroundColor Red
Write-Host ""

Write-Host "⚠️  ATTENTION: Ceci va supprimer toutes les données existantes!" -ForegroundColor Yellow
Write-Host ""

$confirm = Read-Host "Tapez 'RESET' pour confirmer la suppression de la base de données"

if ($confirm -eq "RESET") {
    Write-Host ""
    Write-Host "Suppression de la base de données..." -ForegroundColor Yellow
    
    # Commande PostgreSQL pour supprimer et recréer la base
    $dropDb = "DROP DATABASE IF EXISTS nalakreditimachann_db;"
    $createDb = "CREATE DATABASE nalakreditimachann_db OWNER postgres;"
    
    Write-Host "   Exécution: DROP DATABASE nalakreditimachann_db" -ForegroundColor Gray
    & psql -h localhost -p 5432 -U postgres -c $dropDb
    
    Write-Host "   Exécution: CREATE DATABASE nalakreditimachann_db" -ForegroundColor Gray  
    & psql -h localhost -p 5432 -U postgres -c $createDb
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Base de données recréée avec succès" -ForegroundColor Green
        
        Write-Host ""
        Write-Host "Démarrage du backend pour initialiser les données..." -ForegroundColor Cyan
        
        # Démarrer le backend pour exécuter DbInitializer
        Write-Host "   Lancement de dotnet run..." -ForegroundColor Gray
        Set-Location "backend\NalaCreditAPI"
        
        # Exécuter le backend en arrière-plan pendant quelques secondes pour l'initialisation
        $process = Start-Process -FilePath "dotnet" -ArgumentList "run" -PassThru -NoNewWindow
        
        Write-Host "   Attente de l'initialisation (10 secondes)..." -ForegroundColor Yellow
        Start-Sleep -Seconds 10
        
        # Arrêter le processus
        if (!$process.HasExited) {
            $process.Kill()
            Write-Host "   ✅ Initialisation terminée" -ForegroundColor Green
        }
        
        Set-Location "..\.."
        
        Write-Host ""
        Write-Host "=== BASE DE DONNÉES RESETÉE ===" -ForegroundColor Green
        Write-Host ""
        Write-Host "📧 NOUVEAUX COMPTES DISPONIBLES:" -ForegroundColor Cyan
        Write-Host "   Super Admin:     superadmin@nalacredit.com    / SuperAdmin123!" -ForegroundColor White
        Write-Host "   Superviseur:     supervisor@nalacredit.com    / Supervisor123!" -ForegroundColor White
        Write-Host "   Caissier:        cashier@nalacredit.com       / Cashier123!" -ForegroundColor White
        Write-Host "   Agent Crédit:    creditagent@nalacredit.com   / CreditAgent123!" -ForegroundColor White
        Write-Host "   Manager Régional: regional@nalacredit.com     / Regional123!" -ForegroundColor White
        Write-Host "   Admin Système:   sysadmin@nalacredit.com      / SysAdmin123!" -ForegroundColor White
        Write-Host "   Comptabilité:    accounting@nalacredit.com    / Accounting123!" -ForegroundColor White
        Write-Host "   Gestion:         management@nalacredit.com    / Management123!" -ForegroundColor White
        Write-Host ""
        Write-Host "Vous pouvez maintenant démarrer le système:" -ForegroundColor Yellow
        Write-Host "   .\quick-start.ps1" -ForegroundColor White
        
    } else {
        Write-Host "   ❌ Erreur lors de la recréation de la base" -ForegroundColor Red
        Write-Host "   Vérifiez que PostgreSQL est démarré et que les credentials sont corrects" -ForegroundColor Yellow
    }
    
} else {
    Write-Host ""
    Write-Host "Reset annulé." -ForegroundColor Gray
}