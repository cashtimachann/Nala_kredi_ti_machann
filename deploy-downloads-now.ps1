# Deploy Downloads Page via Git
# Script otomatik konplè

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Deplwaye Downloads Page via Git" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Etap 1: Add files to git
Write-Host "[1/5] Add files to git..." -ForegroundColor Yellow
git add nginx.conf
git add frontend-desktop/download-page.html
git add auto-setup-downloads.sh

if ($LASTEXITCODE -eq 0) {
    Write-Host "  Files added!" -ForegroundColor Green
} else {
    Write-Host "  Error adding files" -ForegroundColor Red
}

# Etap 2: Commit changes
Write-Host "`n[2/5] Commit changes..." -ForegroundColor Yellow
git commit -m "Add downloads page configuration and setup script"

if ($LASTEXITCODE -eq 0) {
    Write-Host "  Committed!" -ForegroundColor Green
} else {
    Write-Host "  Nothing to commit or error" -ForegroundColor Yellow
}

# Etap 3: Push to remote
Write-Host "`n[3/5] Push to remote..." -ForegroundColor Yellow
git push

if ($LASTEXITCODE -eq 0) {
    Write-Host "  Pushed to remote!" -ForegroundColor Green
} else {
    Write-Host "  Error pushing. Check git remote" -ForegroundColor Red
    Write-Host "  You may need to run: git push -u origin main" -ForegroundColor Yellow
}

# Etap 4: Show SSH commands for server
Write-Host "`n[4/5] Commands pou server la..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Kounye a, konekte sou server la epi egzekite:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  cd /var/www/nala-credit" -ForegroundColor White
Write-Host "  git pull" -ForegroundColor White
Write-Host "  chmod +x auto-setup-downloads.sh" -ForegroundColor White
Write-Host "  bash auto-setup-downloads.sh" -ForegroundColor White
Write-Host ""

# Etap 5: Create one-liner for easy copy
Write-Host "[5/5] One-liner pou copy/paste..." -ForegroundColor Yellow
Write-Host ""
$oneLiner = "cd /var/www/nala-credit && git pull && chmod +x auto-setup-downloads.sh && bash auto-setup-downloads.sh"
Write-Host $oneLiner -ForegroundColor Green
Write-Host ""

# Save to clipboard if possible
try {
    $oneLiner | Set-Clipboard
    Write-Host "Copied to clipboard!" -ForegroundColor Green
} catch {
    Write-Host "Could not copy to clipboard, please copy manually" -ForegroundColor Yellow
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Next Steps:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "1. Konekte sou DigitalOcean Console" -ForegroundColor White
Write-Host "2. Paste komand ki nan clipboard la" -ForegroundColor White
Write-Host "3. Verifye: https://admin.nalakreditimachann.com/downloads/" -ForegroundColor White
Write-Host ""
