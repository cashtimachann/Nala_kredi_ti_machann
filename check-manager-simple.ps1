# Script pou verifye kont Chef de Succursale

Write-Host "=== Verification Compte Manager ===" -ForegroundColor Cyan
Write-Host ""

# Connection parameters
$pgHost = "localhost"
$pgUser = "postgres"
$pgDb = "nalacredit_db"

# Tcheke si gen Manager (Role = 2)
Write-Host "Ap tcheke kont Manager..." -ForegroundColor Yellow

$query = 'SELECT "Id", "Username", "Email", "FirstName", "LastName", "Role", "IsActive" FROM "Users" WHERE "Role" = 2 LIMIT 5;'

$env:PGPASSWORD = "postgres"
$result = & psql -h $pgHost -U $pgUser -d $pgDb -c $query 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Kont Manager yo:" -ForegroundColor Green
    Write-Host $result
    Write-Host ""
    Write-Host "Si w wè kont yo, w ka konekte ak youn ladan yo" -ForegroundColor Cyan
} else {
    Write-Host "Erè: $result" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== FIN ===" -ForegroundColor Cyan
