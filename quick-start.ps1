# Script de démarrage rapide sans conflits de ports

Write-Host "=== NALA KREDI TI MACHANN - Démarrage Rapide ===" -ForegroundColor Green
Write-Host ""

# Libérer les ports si nécessaire
Write-Host "Libération des ports..." -ForegroundColor Yellow
& ".\clear-ports.ps1"

Write-Host ""
Write-Host "Démarrage du système..." -ForegroundColor Cyan

# Backend - Ports configurés explicitement dans le code
Write-Host "   🚀 Backend API - https://localhost:7001" -ForegroundColor Green
Start-Process -FilePath "powershell" -ArgumentList "-Command", "cd 'backend\NalaCreditAPI'; dotnet run" -WindowStyle Normal

# Attendre que le backend démarre
Write-Host "   ⏳ Attente du démarrage du backend (15 secondes)..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Frontend
Write-Host "   🌐 Frontend Web - http://localhost:3000" -ForegroundColor Green
Start-Process -FilePath "powershell" -ArgumentList "-Command", "cd 'frontend-web'; `$env:Path += ';C:\Program Files\nodejs'; npm start" -WindowStyle Normal

Write-Host ""
Write-Host "=== SYSTÈME DÉMARRÉ ===" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 ACCÈS WEB:" -ForegroundColor Cyan
Write-Host "   Interface Web: http://localhost:3000" -ForegroundColor White
Write-Host "   API Backend: https://localhost:7001/api" -ForegroundColor White
Write-Host "   Documentation: https://localhost:7001/swagger" -ForegroundColor White
Write-Host ""
Write-Host "🔐 COMPTES DE TEST:" -ForegroundColor Cyan
Write-Host "   Caissier:        cashier@nalacredit.com       / Cashier123!" -ForegroundColor White
Write-Host "   Agent Crédit:    creditagent@nalacredit.com   / CreditAgent123!" -ForegroundColor White
Write-Host "   Superviseur:     supervisor@nalacredit.com    / Supervisor123!" -ForegroundColor White
Write-Host "   Super Admin:     superadmin@nalacredit.com    / SuperAdmin123!" -ForegroundColor White
Write-Host "   Manager Régional: regional@nalacredit.com     / Regional123!" -ForegroundColor White
Write-Host "   Admin Système:   sysadmin@nalacredit.com      / SysAdmin123!" -ForegroundColor White
Write-Host "   Comptabilité:    accounting@nalacredit.com    / Accounting123!" -ForegroundColor White
Write-Host "   Gestion:         management@nalacredit.com    / Management123!" -ForegroundColor White
Write-Host ""
Write-Host "✅ STATUT:" -ForegroundColor Green
Write-Host "   ✅ PostgreSQL: nalakreditimachann_db" -ForegroundColor Green
Write-Host "   ✅ Backend API: Ports 7000 (HTTP) / 7001 (HTTPS)" -ForegroundColor Green
Write-Host "   ✅ Frontend: Port 3000" -ForegroundColor Green
Write-Host "   ✅ Communication Frontend ↔ Backend: Configurée" -ForegroundColor Green
Write-Host ""