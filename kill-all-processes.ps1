# Script pou kill tout process backend ak frontend
Write-Host ""
Write-Host "==================================================" -ForegroundColor Red
Write-Host "   ARRETE TOUT PROCESS BACKEND & FRONTEND" -ForegroundColor Red
Write-Host "==================================================" -ForegroundColor Red
Write-Host ""

$processesKilled = 0

# 1. Kill process Node.js (Frontend: Vite/React)
Write-Host "1. Arrete process Node.js (Frontend)..." -ForegroundColor Yellow
$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    foreach ($proc in $nodeProcesses) {
        try {
            Stop-Process -Id $proc.Id -Force
            Write-Host "   [OK] Node process arrete: PID $($proc.Id)" -ForegroundColor Green
            $processesKilled++
        } catch {
            Write-Host "   [!!] Echec arret process: PID $($proc.Id)" -ForegroundColor Red
        }
    }
} else {
    Write-Host "   [i] Pa gen process Node ki ap mache" -ForegroundColor Gray
}

# 2. Kill process dotnet (Backend: ASP.NET Core)
Write-Host ""
Write-Host "2. Arrete process .NET (Backend)..." -ForegroundColor Yellow
$dotnetProcesses = Get-Process -Name dotnet -ErrorAction SilentlyContinue
if ($dotnetProcesses) {
    foreach ($proc in $dotnetProcesses) {
        try {
            Stop-Process -Id $proc.Id -Force
            Write-Host "   [OK] .NET process arrete: PID $($proc.Id)" -ForegroundColor Green
            $processesKilled++
        } catch {
            Write-Host "   [!!] Echec arret process: PID $($proc.Id)" -ForegroundColor Red
        }
    }
} else {
    Write-Host "   [i] Pa gen process .NET ki ap mache" -ForegroundColor Gray
}

# 3. Kill process npm (si jamais reste)
Write-Host ""
Write-Host "3. Arrete process npm..." -ForegroundColor Yellow
$npmProcesses = Get-Process -Name npm -ErrorAction SilentlyContinue
if ($npmProcesses) {
    foreach ($proc in $npmProcesses) {
        try {
            Stop-Process -Id $proc.Id -Force
            Write-Host "   [OK] npm process arrete: PID $($proc.Id)" -ForegroundColor Green
            $processesKilled++
        } catch {
            Write-Host "   [!!] Echec arret process: PID $($proc.Id)" -ForegroundColor Red
        }
    }
} else {
    Write-Host "   [i] Pa gen process npm ki ap mache" -ForegroundColor Gray
}

# 4. Verifye si port yo disponib
Write-Host ""
Write-Host "4. Verifye port yo..." -ForegroundColor Yellow

# Check port 5173 (Frontend)
$port5173 = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue
if ($port5173) {
    Write-Host "   [!!] Port 5173 toujou okipe!" -ForegroundColor Red
    $process5173 = Get-Process -Id $port5173.OwningProcess -ErrorAction SilentlyContinue
    if ($process5173) {
        Write-Host "       Process: $($process5173.ProcessName) (PID $($process5173.Id))" -ForegroundColor Yellow
        Write-Host "       Eseye kill l..." -ForegroundColor Yellow
        Stop-Process -Id $process5173.Id -Force -ErrorAction SilentlyContinue
        $processesKilled++
    }
} else {
    Write-Host "   [OK] Port 5173 disponib" -ForegroundColor Green
}

# Check port 7001 (Backend)
$port7001 = Get-NetTCPConnection -LocalPort 7001 -State Listen -ErrorAction SilentlyContinue
if ($port7001) {
    Write-Host "   [!!] Port 7001 toujou okipe!" -ForegroundColor Red
    $process7001 = Get-Process -Id $port7001.OwningProcess -ErrorAction SilentlyContinue
    if ($process7001) {
        Write-Host "       Process: $($process7001.ProcessName) (PID $($process7001.Id))" -ForegroundColor Yellow
        Write-Host "       Eseye kill l..." -ForegroundColor Yellow
        Stop-Process -Id $process7001.Id -Force -ErrorAction SilentlyContinue
        $processesKilled++
    }
} else {
    Write-Host "   [OK] Port 7001 disponib" -ForegroundColor Green
}

# Check port 5000 (Backend alternatif)
$port5000 = Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue
if ($port5000) {
    Write-Host "   [!!] Port 5000 toujou okipe!" -ForegroundColor Red
    $process5000 = Get-Process -Id $port5000.OwningProcess -ErrorAction SilentlyContinue
    if ($process5000) {
        Write-Host "       Process: $($process5000.ProcessName) (PID $($process5000.Id))" -ForegroundColor Yellow
        Write-Host "       Eseye kill l..." -ForegroundColor Yellow
        Stop-Process -Id $process5000.Id -Force -ErrorAction SilentlyContinue
        $processesKilled++
    }
} else {
    Write-Host "   [OK] Port 5000 disponib" -ForegroundColor Green
}

# Rezime
Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "   REZIME" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "   Total process arrete: $processesKilled" -ForegroundColor White
Write-Host ""

if ($processesKilled -gt 0) {
    Write-Host "[OK] Tout process yo arrete!" -ForegroundColor Green
} else {
    Write-Host "[i] Pa te gen process pou arrete" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Port yo disponib kounye a:" -ForegroundColor Yellow
Write-Host "   - Port 5173 (Frontend): Pret" -ForegroundColor Green
Write-Host "   - Port 7001 (Backend):  Pret" -ForegroundColor Green
Write-Host "   - Port 5000 (Backend):  Pret" -ForegroundColor Green
Write-Host ""
Write-Host "Ou ka demarre sistem la kounye a:" -ForegroundColor Cyan
Write-Host "   .\start-system.ps1" -ForegroundColor White
Write-Host ""
