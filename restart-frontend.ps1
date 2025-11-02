# Script pou restart frontend ak cache netwaye
Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "   RESTART FRONTEND AK CACHE NETWAYE" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

$frontendPath = "c:\Users\Administrator\Desktop\Kredi Ti Machann\frontend-web"

Write-Host ""
Write-Host "1. Femen tout process Node/Vite ki ap mache..." -ForegroundColor Yellow

# Tiye tout process node
Get-Process -Name node -ErrorAction SilentlyContinue | ForEach-Object {
    try {
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
        Write-Host "   [OK] Process Node arrete: PID $($_.Id)" -ForegroundColor Green
    } catch {
        Write-Host "   [!!] Impossible arrete process: PID $($_.Id)" -ForegroundColor Yellow
    }
}

Start-Sleep -Seconds 2

Write-Host ""
Write-Host "2. Efase cache Vite..." -ForegroundColor Yellow
$viteCachePath = Join-Path $frontendPath "node_modules\.vite"
if (Test-Path $viteCachePath) {
    Remove-Item -Path $viteCachePath -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "   [OK] Cache Vite efase" -ForegroundColor Green
} else {
    Write-Host "   [i] Pa gen cache Vite pou efase" -ForegroundColor Gray
}

Write-Host ""
Write-Host "3. Efase cache navigateur (instruksyon)..." -ForegroundColor Yellow
Write-Host "   Nan navigateur w, fe:" -ForegroundColor White
Write-Host "      - Chrome/Edge: Ctrl+Shift+Delete pou efase cache" -ForegroundColor Gray
Write-Host "      - Oswa: Ctrl+Shift+R (Hard refresh)" -ForegroundColor Gray
Write-Host "      - Oswa: F12, Network tab, koche Disable cache" -ForegroundColor Gray

Write-Host ""
Write-Host "4. Redemarrer serveur frontend..." -ForegroundColor Yellow
Write-Host "   Chanje nan folder frontend..." -ForegroundColor Gray
Set-Location $frontendPath

Write-Host "   Kouri npm run dev..." -ForegroundColor Gray
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Frontend ap demarre sou: http://localhost:5173" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "ENPOTAN:" -ForegroundColor Yellow
Write-Host "   1. Atann pou mesaj ready in Xms parete" -ForegroundColor White
Write-Host "   2. Ouvri navigateur w sou: http://localhost:5173" -ForegroundColor White
Write-Host "   3. Fe Ctrl+Shift+R pou force refresh" -ForegroundColor White
Write-Host "   4. Si w toujou pa we chanjman, femen tab la epi re-ouvri l" -ForegroundColor White
Write-Host ""

# Demarre frontend
npm run dev
