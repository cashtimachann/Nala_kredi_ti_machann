# Script de test de connectivité Frontend <-> Backend (PowerShell)

Write-Host "=== Test de Connectivité Nala Kredi Ti Machann ===" -ForegroundColor Cyan
Write-Host ""

# Bypass SSL certificate validation for PowerShell 5.1
[System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }

# Test 1: Vérifier si l'API backend répond
Write-Host "1. Test de l'API Backend..." -ForegroundColor Yellow

$backendWorking = $false

# Try HTTP first (since backend is configured for HTTP)
try {
    $response = Invoke-WebRequest -Uri "http://localhost:7001/swagger" -Method GET -TimeoutSec 5 -ErrorAction Stop
    Write-Host "   ✅ Backend accessible via HTTP (Status: $($response.StatusCode))" -ForegroundColor Green
    $backendWorking = $true
}
catch {
    Write-Host "   ⚠️  HTTP not accessible - $($_.Exception.Message)" -ForegroundColor Yellow
    
    # Try HTTPS as backup
    try {
        $response = Invoke-WebRequest -Uri "https://localhost:7001/swagger" -Method GET -TimeoutSec 5 -ErrorAction Stop
        Write-Host "   ✅ Backend accessible via HTTPS (Status: $($response.StatusCode))" -ForegroundColor Green
        $backendWorking = $true
    }
    catch {
        Write-Host "   ❌ Backend non accessible - $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test 2: Vérifier si le frontend React répond
Write-Host ""
Write-Host "2. Test du Frontend React (http://localhost:3000)..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -Method GET -TimeoutSec 5 -ErrorAction Stop
    Write-Host "   ✅ Frontend accessible (Status: $($response.StatusCode))" -ForegroundColor Green
}
catch {
    Write-Host "   ❌ Frontend non accessible - $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Test de login via API
Write-Host ""
Write-Host "3. Test de l'endpoint de login..." -ForegroundColor Yellow

$body = @{
    email = "superadmin@nalacredit.com"
    password = "SuperAdmin123!"
} | ConvertTo-Json

$loginWorking = $false

# Try HTTP first (since backend is on HTTP)
try {
    $response = Invoke-RestMethod -Uri "http://localhost:7001/api/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body `
        -TimeoutSec 10 `
        -ErrorAction Stop

    if ($response.token) {
        Write-Host "   ✅ Login HTTP fonctionnel - Token reçu" -ForegroundColor Green
        Write-Host "   ✅ Utilisateur: $($response.user.firstName) $($response.user.lastName) ($($response.user.role))" -ForegroundColor Green
        $loginWorking = $true
    } else {
        Write-Host "   ⚠️  Login HTTP répond mais pas de token" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "   ❌ Login HTTP échoué - $($_.Exception.Message)" -ForegroundColor Red
    
    # Try HTTPS as backup
    try {
        $response = Invoke-RestMethod -Uri "https://localhost:7001/api/auth/login" `
            -Method POST `
            -ContentType "application/json" `
            -Body $body `
            -TimeoutSec 10 `
            -ErrorAction Stop

        if ($response.token) {
            Write-Host "   ✅ Login HTTPS fonctionnel - Token reçu" -ForegroundColor Green
            $loginWorking = $true
        }
    }
    catch {
        Write-Host "   ❌ Login HTTPS aussi échoué - $($_.Exception.Message)" -ForegroundColor Red
    }
}

if (-not $loginWorking) {
    Write-Host "   ❌ Aucune méthode de connexion ne fonctionne" -ForegroundColor Red
}

# Test 4: Vérifier les services requis
Write-Host ""
Write-Host "4. Vérification des services requis..." -ForegroundColor Yellow

# PostgreSQL
$pgService = Get-Service -Name "*postgres*" -ErrorAction SilentlyContinue
if ($pgService -and $pgService.Status -eq "Running") {
    Write-Host "   ✅ PostgreSQL en cours d'exécution" -ForegroundColor Green
} else {
    Write-Host "   ❌ PostgreSQL non démarré ou non installé" -ForegroundColor Red
}

# Redis (optionnel)
$redisProcess = Get-Process -Name "*redis*" -ErrorAction SilentlyContinue
if ($redisProcess) {
    Write-Host "   ✅ Redis en cours d'exécution" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Redis non démarré (optionnel)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Fin des tests ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Pour démarrer le système complet, utilisez:" -ForegroundColor Cyan
Write-Host "   .\start-system.ps1" -ForegroundColor White