# Script pour vérifier s'il y a des superadmin dans la base de données
param(
    [string]$Server = "localhost",
    [string]$Database = "nalakreditimachann_db",
    [string]$Username = "postgres",
    [string]$Password = "JCS823ch!!"
)

Write-Host "🔍 VÉRIFICATION SUPERADMIN DANS LA BASE DE DONNÉES" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Commande SQL pour chercher les superadmin (Role = 5)
$sqlQuery = @"
SELECT 
    "Email",
    "FirstName", 
    "LastName",
    "Role",
    "IsActive",
    "EmailConfirmed",
    "CreatedAt"
FROM "AspNetUsers" 
WHERE "Role" = 5
ORDER BY "CreatedAt";
"@

# Écrire la requête dans un fichier temporaire
$tempSqlFile = "C:\temp\check_superadmin.sql"
$sqlQuery | Out-File -FilePath $tempSqlFile -Encoding UTF8

try {
    Write-Host "⚡ Exécution de la requête SQL..." -ForegroundColor Yellow
    
    # Exécuter la requête via psql
    $env:PGPASSWORD = $Password
    $result = psql -h $Server -U $Username -d $Database -f $tempSqlFile -t -A 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Connexion à la base de données réussie!" -ForegroundColor Green
        Write-Host ""
        
        if ($result -and $result.Trim() -ne "") {
            Write-Host "🎯 SUPERADMIN TROUVÉ(S):" -ForegroundColor Green
            Write-Host "========================" -ForegroundColor Green
            
            $lines = $result -split "`n" | Where-Object { $_.Trim() -ne "" }
            $count = 0
            
            foreach ($line in $lines) {
                if ($line.Trim() -ne "") {
                    $count++
                    $fields = $line -split "\|"
                    if ($fields.Count -ge 7) {
                        $email = $fields[0]
                        $firstName = $fields[1]
                        $lastName = $fields[2] 
                        $role = $fields[3]
                        $isActive = $fields[4]
                        $emailConfirmed = $fields[5]
                        $createdAt = $fields[6]
                        
                        Write-Host "   $count. 📧 Email: $email" -ForegroundColor White
                        Write-Host "      👤 Nom: $firstName $lastName" -ForegroundColor Gray
                        Write-Host "      🔑 Rôle: $role (SuperAdmin)" -ForegroundColor Yellow
                        Write-Host "      ✅ Actif: $isActive | Email confirmé: $emailConfirmed" -ForegroundColor Gray
                        Write-Host "      📅 Créé: $createdAt" -ForegroundColor Gray
                        Write-Host ""
                    }
                }
            }
            
            if ($count -eq 0) {
                Write-Host "❌ AUCUN SUPERADMIN TROUVÉ!" -ForegroundColor Red
            } else {
                Write-Host "✅ Total: $count superadmin(s) trouvé(s)" -ForegroundColor Green
            }
        } else {
            Write-Host "❌ AUCUN SUPERADMIN TROUVÉ DANS LA BASE!" -ForegroundColor Red
            Write-Host "💡 La table AspNetUsers ne contient aucun utilisateur avec le rôle SuperAdmin (5)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ Erreur de connexion à la base de données:" -ForegroundColor Red
        Write-Host $result -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Erreur lors de l'exécution: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    # Nettoyer le fichier temporaire
    if (Test-Path $tempSqlFile) {
        Remove-Item $tempSqlFile -Force -ErrorAction SilentlyContinue
    }
    
    # Nettoyer la variable d'environnement du mot de passe
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Vérification terminée." -ForegroundColor White