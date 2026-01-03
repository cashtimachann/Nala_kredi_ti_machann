# Script otomatik pou ajoute paj downloads
# PowerShell version - san SSH

param(
    [string]$ServerIP = "164.90.207.45",
    [string]$SSHUser = "root"
)

Write-Host "`n====================================" -ForegroundColor Cyan
Write-Host "  Setup Downloads Page Otomatik" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan

# Etap 1: Verifye si docker-compose.yml gen nginx volume config
Write-Host "`n[1/4] Verifye docker-compose.yml..." -ForegroundColor Yellow

$dockerCompose = Get-Content "docker-compose.yml" -Raw

if ($dockerCompose -notmatch "nginx:") {
    Write-Host "  Atansyon: docker-compose.yml pa gen nginx service konfige" -ForegroundColor Red
    Write-Host "  M ap kontinye ak setup yo..." -ForegroundColor Yellow
}

# Etap 2: Update docker-compose.yml pou ajoute volume downloads
Write-Host "`n[2/4] Update docker-compose.yml pou downloads..." -ForegroundColor Yellow

$updatesNeeded = @()

# Tcheke si gen nginx service
if ($dockerCompose -match "nginx:") {
    if ($dockerCompose -notmatch "/var/www/downloads") {
        $updatesNeeded += "Ajoute volume /var/www/downloads nan nginx service"
    }
}

if ($updatesNeeded.Count -gt 0) {
    Write-Host "  Chanjman nesesè:" -ForegroundColor Cyan
    foreach ($update in $updatesNeeded) {
        Write-Host "    - $update" -ForegroundColor White
    }
} else {
    Write-Host "  docker-compose.yml deja bon!" -ForegroundColor Green
}

# Etap 3: Kreye script setup pou egzekite sou server
Write-Host "`n[3/4] Kreye script setup..." -ForegroundColor Yellow

$setupScript = @'
#!/bin/bash
# Auto-setup downloads page

echo "Setting up downloads directory..."

# Create downloads directory
mkdir -p /var/www/downloads
chown -R www-data:www-data /var/www/downloads
chmod -R 755 /var/www/downloads

# Copy download page HTML
if [ -f "/tmp/download-page.html" ]; then
    cp /tmp/download-page.html /var/www/downloads/
    chown www-data:www-data /var/www/downloads/download-page.html
    chmod 644 /var/www/downloads/download-page.html
    echo "HTML page copied successfully"
else
    echo "Warning: download-page.html not found in /tmp/"
fi

# Backup and update nginx config
if [ -f "/tmp/nginx.conf" ]; then
    if [ -f "/etc/nginx/nginx.conf" ]; then
        cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup-$(date +%Y%m%d-%H%M%S)
        echo "Nginx config backed up"
    fi
    
    cp /tmp/nginx.conf /etc/nginx/nginx.conf
    echo "Nginx config updated"
    
    # Test nginx config
    nginx -t
    if [ $? -eq 0 ]; then
        systemctl reload nginx
        echo "Nginx reloaded successfully"
    else
        echo "Error: Nginx config test failed!"
        # Restore backup if available
        if [ -f "/etc/nginx/nginx.conf.backup-$(date +%Y%m%d-%H%M%S)" ]; then
            cp /etc/nginx/nginx.conf.backup-$(date +%Y%m%d-%H%M%S) /etc/nginx/nginx.conf
            echo "Restored previous config"
        fi
        exit 1
    fi
else
    echo "Warning: nginx.conf not found in /tmp/"
fi

echo "Setup complete!"
'@

$setupScript | Out-File -FilePath "auto-setup-downloads.sh" -Encoding UTF8 -NoNewline

Write-Host "  Script kree: auto-setup-downloads.sh" -ForegroundColor Green

# Etap 4: Kreye instructions pou deplwaye
Write-Host "`n[4/4] Kreye instructions deplwaman..." -ForegroundColor Yellow

$instructions = @"
===================================
  Instructions Deplwaman
===================================

METOD 1: Via SSH (si w gen aksè)
---------------------------------
1. Upload fichye yo:
   scp deployment-package/download-page.html ${SSHUser}@${ServerIP}:/tmp/
   scp deployment-package/nginx.conf ${SSHUser}@${ServerIP}:/tmp/
   scp auto-setup-downloads.sh ${SSHUser}@${ServerIP}:/tmp/

2. Egzekite setup:
   ssh ${SSHUser}@${ServerIP} 'bash /tmp/auto-setup-downloads.sh'

3. Verifye:
   https://admin.nalakreditimachann.com/downloads/


METOD 2: Via DigitalOcean Console
---------------------------------
1. Konekte sou DigitalOcean Dashboard
2. Ouvri Droplet Console
3. Upload files yo atravè drag-and-drop oswa copy/paste

4. Egzekite komand sa yo:
   cd /tmp
   bash auto-setup-downloads.sh


METOD 3: Via Git (si repo a sou server la)
---------------------------------
1. Commit chanjman yo:
   git add nginx.conf frontend-desktop/download-page.html
   git commit -m "Add downloads page configuration"
   git push

2. Sou server la:
   cd /var/www/nala-credit
   git pull
   bash auto-setup-downloads.sh


METOD 4: Via Docker Compose Rebuild
---------------------------------
Si app la roule nan Docker:
   docker-compose down
   docker-compose up -d --build
   docker exec -it nala-nginx bash -c 'mkdir -p /var/www/downloads'
   docker cp deployment-package/download-page.html nala-nginx:/var/www/downloads/

===================================
  Fichye ki prepare:
===================================
- deployment-package/nginx.conf
- deployment-package/download-page.html  
- auto-setup-downloads.sh

"@

Write-Host $instructions

# Save instructions
$instructions | Out-File -FilePath "DEPLOYMENT-INSTRUCTIONS.txt" -Encoding UTF8

Write-Host "`n====================================" -ForegroundColor Green
Write-Host "  ✅ Preparation Complete!" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
Write-Host ""
Write-Host "Fichye yo pare nan:" -ForegroundColor Cyan
Write-Host "  - deployment-package/" -ForegroundColor White
Write-Host "  - auto-setup-downloads.sh" -ForegroundColor White
Write-Host "  - DEPLOYMENT-INSTRUCTIONS.txt" -ForegroundColor White
Write-Host ""
Write-Host "Li DEPLOYMENT-INSTRUCTIONS.txt pou wè kijan pou deplwaye" -ForegroundColor Yellow
Write-Host ""
