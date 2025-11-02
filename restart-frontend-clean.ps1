# Script pou restart frontend ak cache netwaye
Write-Host "`n==================================================" -ForegroundColor Cyan
Write-Host "   RESTART FRONTEND AK CACHE NETWAYE" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

$frontendPath = "c:\Users\Administrator\Desktop\Kredi Ti Machann\frontend-web"

Write-Host "`n1️⃣  Fèmen tout process Node/Vite ki ap mache..." -ForegroundColor Yellow

# Tiye tout process node ki gen relation ak frontend-web
Get-Process -Name node -ErrorAction SilentlyContinue | ForEach-Object {
    try {
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
        Write-Host "   ✅ Process Node arrêté: PID $($_.Id)" -ForegroundColor Green
    } catch {
        Write-Host "   ⚠️  Impossible d'arrêter process: PID $($_.Id)" -ForegroundColor Yellow
    }
}

Start-Sleep -Seconds 2

Write-Host "`n2️⃣  Efase cache Vite..." -ForegroundColor Yellow
$viteCachePath = Join-Path $frontendPath "node_modules\.vite"
if (Test-Path $viteCachePath) {
    Remove-Item -Path $viteCachePath -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "   ✅ Cache Vite efase" -ForegroundColor Green
} else {
    Write-Host "   ℹ️  Pa gen cache Vite pou efase" -ForegroundColor Gray
}

Write-Host "`n3️⃣  Efase cache navigateur (instruksyon)..." -ForegroundColor Yellow
Write-Host "   📌 Nan navigateur w, fè:" -ForegroundColor White
Write-Host "      - Chrome/Edge: Ctrl+Shift+Delete → Efase cache" -ForegroundColor Gray
Write-Host "      - Oswa: Ctrl+Shift+R (Hard refresh)" -ForegroundColor Gray
Write-Host "      - Oswa: F12 → Network → Disable cache (kochè a)" -ForegroundColor Gray

Write-Host "`n4️⃣  Redémarrer serveur frontend..." -ForegroundColor Yellow
Write-Host "   Chanje nan folder frontend..." -ForegroundColor Gray
cd $frontendPath

Write-Host "   Kouri 'npm run dev'..." -ForegroundColor Gray
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Frontend ap demarre sou: http://localhost:5173" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 ENPÒTAN:" -ForegroundColor Yellow
Write-Host "   1. Atann pou mesaj 'ready in Xms' parèt" -ForegroundColor White
Write-Host "   2. Ouvri navigateur w sou: http://localhost:5173" -ForegroundColor White
Write-Host "   3. Fè Ctrl+Shift+R pou force refresh" -ForegroundColor White
Write-Host "   4. Si w toujou pa wè chanjman, fèmen tab la epi re-ouvri l" -ForegroundColor White
Write-Host ""

# Demarre frontend
npm run dev
