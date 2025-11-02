# Test création compte admin via API
$apiUrl = "http://localhost:7001/api/admin/create"

# Données pour un Caissier (Role 0)
$adminData = @{
    email = "caissier.test@nalacredit.com"
    password = "Test@123456"
    firstName = "Marie"
    lastName = "Caisse"
    phone = "50912345678"
    department = "Opérations"
    adminType = 0  # CAISSIER
    hireDate = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
    assignedBranches = @()
} | ConvertTo-Json

Write-Host "`n🔐 Test création compte Caissier..." -ForegroundColor Cyan
Write-Host "Email: caissier.test@nalacredit.com" -ForegroundColor White
Write-Host "AdminType: 0 (CAISSIER)" -ForegroundColor White
Write-Host "Department: Opérations" -ForegroundColor White
Write-Host "HireDate: $(Get-Date -Format 'yyyy-MM-dd')" -ForegroundColor White
Write-Host ""

# D'abord, on doit se connecter en tant que SuperAdmin
$loginUrl = "http://localhost:7001/api/auth/login"
$loginData = @{
    email = "admin@nalacredit.com"
    password = "Admin@123"
} | ConvertTo-Json

Write-Host "🔐 Connexion SuperAdmin..." -ForegroundColor Yellow

try {
    $loginResponse = Invoke-RestMethod -Uri $loginUrl -Method POST -Body $loginData -ContentType "application/json" -ErrorAction Stop
    $token = $loginResponse.token
    
    Write-Host "✅ Connexion réussie!" -ForegroundColor Green
    Write-Host "Token: $($token.Substring(0, 20))..." -ForegroundColor Gray
    Write-Host ""
    
    # Maintenant créer l'admin
    Write-Host "📝 Création du compte admin..." -ForegroundColor Yellow
    
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    $createResponse = Invoke-RestMethod -Uri $apiUrl -Method POST -Body $adminData -Headers $headers -ErrorAction Stop
    
    Write-Host "`n✅ SUCCÈS! Compte admin créé!" -ForegroundColor Green
    Write-Host "================================================" -ForegroundColor Green
    Write-Host ($createResponse | ConvertTo-Json -Depth 3) -ForegroundColor White
    Write-Host "================================================" -ForegroundColor Green
    
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "`n❌ ERREUR!" -ForegroundColor Red
    Write-Host "Status: $statusCode" -ForegroundColor Red
    Write-Host "Message: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.ErrorDetails.Message) {
        Write-Host "`nDétails:" -ForegroundColor Yellow
        try {
            $errorJson = $_.ErrorDetails.Message | ConvertFrom-Json
            Write-Host ($errorJson | ConvertTo-Json -Depth 3) -ForegroundColor White
        } catch {
            Write-Host $_.ErrorDetails.Message -ForegroundColor White
        }
    }
}

Write-Host "`nTest terminé.`n"
