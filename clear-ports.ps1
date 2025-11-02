# Script pour libérer les ports utilisés par Nala Kredi

Write-Host "=== Nettoyage des Ports Nala Kredi ===" -ForegroundColor Cyan
Write-Host ""

# Fonction pour tuer un processus sur un port spécifique
function Kill-ProcessOnPort {
    param([int]$Port)
    
    $processes = netstat -ano | Select-String ":$Port " | ForEach-Object {
        $line = $_.Line.Trim()
        $parts = $line -split '\s+'
        if ($parts.Length -ge 5) {
            $parts[4]
        }
    }
    
    foreach ($pid in $processes) {
        if ($pid -and $pid -ne "0") {
            try {
                $process = Get-Process -Id $pid -ErrorAction Stop
                Write-Host "Arrêt du processus $($process.Name) (PID: $pid) sur le port $Port" -ForegroundColor Yellow
                Stop-Process -Id $pid -Force -ErrorAction Stop
                Write-Host "   ✅ Processus arrêté" -ForegroundColor Green
            }
            catch {
                Write-Host "   ⚠️  Impossible d'arrêter le processus PID $pid : $($_.Exception.Message)" -ForegroundColor Yellow
            }
        }
    }
}

# Vérification et nettoyage des ports
$ports = @(3000, 5000, 7000, 7001)

foreach ($port in $ports) {
    Write-Host "Vérification du port $port..." -ForegroundColor Cyan
    $inUse = netstat -ano | Select-String ":$port "
    
    if ($inUse) {
        Write-Host "   Port $port en cours d'utilisation" -ForegroundColor Red
        Kill-ProcessOnPort -Port $port
    } else {
        Write-Host "   ✅ Port $port libre" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "=== Nettoyage terminé ===" -ForegroundColor Green
Write-Host ""
Write-Host "Vous pouvez maintenant démarrer le système avec :" -ForegroundColor Yellow
Write-Host "   .\start-system.ps1" -ForegroundColor White