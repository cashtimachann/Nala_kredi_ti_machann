param(
    [string]$Email = "cashier@nalacredit.com",
    [string]$Password = "Cashier123!"
)

Write-Host "=== TEST DE CONNEXION API ===" -ForegroundColor Cyan
Write-Host "Email: $Email" -ForegroundColor White
Write-Host "URL: http://localhost:7001/api/auth/login" -ForegroundColor White

$headers = @{
    "Content-Type" = "application/json"
    "Accept" = "application/json"
}

$loginData = @{
    email = $Email
    password = $Password
} | ConvertTo-Json

try {
    Write-Host "`n⏳ Tentative de connexion..." -ForegroundColor Yellow
    
    $response = Invoke-RestMethod -Uri "http://localhost:7001/api/auth/login" -Method POST -Headers $headers -Body $loginData
    
    Write-Host "✅ SUCCÈS! Connexion réussie!" -ForegroundColor Green
    Write-Host "Token reçu: $($response.token.Substring(0, [Math]::Min(50, $response.token.Length)))..." -ForegroundColor Cyan
    Write-Host "Utilisateur: $($response.user.firstName) $($response.user.lastName)" -ForegroundColor Cyan
    Write-Host "Rôle: $($response.user.role)" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ ÉCHEC! Erreur de connexion" -ForegroundColor Red
    Write-Host "Message d'erreur: $($_.Exception.Message)" -ForegroundColor Yellow
    
    if ($_.Exception.Response) {
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "Détails de l'API: $responseBody" -ForegroundColor Yellow
        } catch {
            Write-Host "Impossible de lire la réponse d'erreur" -ForegroundColor Red
        }
    }
}

Write-Host "`n=== FIN DU TEST ===" -ForegroundColor Cyan