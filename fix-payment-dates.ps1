# Script PowerShell pou korije dat echeance yo nan payment schedules
# Egzekite: .\fix-payment-dates.ps1

$ErrorActionPreference = "Stop"

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "KOREKSYON DAT ECHEANCE PAYMENT SCHEDULES" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Configuration baz done
$dbHost = "localhost"
$dbUser = "postgres"
$dbName = "nalacreditdb"
$dbPassword = "kredi123"

# Mete password kòm variable environment
$env:PGPASSWORD = $dbPassword

Write-Host "1. Konekte nan baz done: $dbName" -ForegroundColor Yellow

try {
    # Verifye si PostgreSQL disponib
    $pgInstalled = Get-Command psql -ErrorAction SilentlyContinue
    
    if (-not $pgInstalled) {
        Write-Host "ERERE: psql pa enstale. Enstale PostgreSQL oswa ajoute li nan PATH." -ForegroundColor Red
        Write-Host ""
        Write-Host "Altènativman, ou ka egzekite script SQL la manyèlman:" -ForegroundColor Yellow
        Write-Host "  1. Louvri pgAdmin oswa yon lòt PostgreSQL client" -ForegroundColor White
        Write-Host "  2. Konekte nan database: $dbName" -ForegroundColor White
        Write-Host "  3. Egzekite fichye: fix-payment-schedule-dates.sql" -ForegroundColor White
        exit 1
    }

    Write-Host "2. Egzekite script koreksyon..." -ForegroundColor Yellow
    
    # Egzekite script SQL
    $scriptPath = Join-Path $PSScriptRoot "fix-payment-schedule-dates.sql"
    
    if (-not (Test-Path $scriptPath)) {
        Write-Host "ERERE: Fichye fix-payment-schedule-dates.sql pa jwenn." -ForegroundColor Red
        exit 1
    }
    
    psql -h $dbHost -U $dbUser -d $dbName -f $scriptPath
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "=============================================" -ForegroundColor Green
        Write-Host "SIKSÈ! Dat echeance yo korije." -ForegroundColor Green
        Write-Host "=============================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Pwochen etap:" -ForegroundColor Yellow
        Write-Host "  1. Restart backend API: dotnet run nan backend/NalaCreditAPI" -ForegroundColor White
        Write-Host "  2. Restart desktop app: dotnet run nan frontend-desktop/NalaCreditDesktop" -ForegroundColor White
        Write-Host "  3. Verifye ke dat echeance yo matche nan tou de app yo" -ForegroundColor White
    }
    else {
        Write-Host ""
        Write-Host "ERERE: Pwoblèm pandan egzekisyon script la." -ForegroundColor Red
        Write-Host "Verifye mesaj erè yo pi wo a." -ForegroundColor Red
    }
}
catch {
    Write-Host ""
    Write-Host "ERERE: $_" -ForegroundColor Red
}
finally {
    # Retire password la pou sekirite
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "Peze yon touch pou fèmen..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
