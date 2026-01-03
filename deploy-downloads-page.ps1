# Script pou deplwaye paj telechajman Desktop App
# PowerShell version

Write-Host "Deplwaye paj downloads..." -ForegroundColor Cyan

# IP server la
$SERVER_IP = "164.90.207.45"
$SERVER_USER = "root"

Write-Host "Uploading download-page.html..." -ForegroundColor Yellow

# Upload paj HTML la
scp frontend-desktop/download-page.html "${SERVER_USER}@${SERVER_IP}:/tmp/"

Write-Host "Konfigirasyon sou server la..." -ForegroundColor Yellow

# Kreye script bash pou egzekite sou server la
$setupScript = @'
#!/bin/bash
# Kreye dosye si li pa egziste
if [ ! -d '/var/www/downloads' ]; then
    mkdir -p /var/www/downloads
    chown -R www-data:www-data /var/www/downloads
    chmod -R 755 /var/www/downloads
fi

# Move paj HTML la
mv /tmp/download-page.html /var/www/downloads/
chown www-data:www-data /var/www/downloads/download-page.html
chmod 644 /var/www/downloads/download-page.html

echo "HTML page moved successfully"
'@

# Save script la nan temp file
$setupScript | Out-File -FilePath "setup-downloads.sh" -Encoding UTF8 -NoNewline

# Upload script la
scp setup-downloads.sh "${SERVER_USER}@${SERVER_IP}:/tmp/"

# Egzekite script la
ssh "${SERVER_USER}@${SERVER_IP}" "bash /tmp/setup-downloads.sh"

# Upload nginx config la
Write-Host "Uploading nginx config..." -ForegroundColor Yellow
scp nginx.conf "${SERVER_USER}@${SERVER_IP}:/tmp/nginx.conf"

# Apliye config nginx
Write-Host "Apliye nginx config..." -ForegroundColor Yellow

$nginxScript = @'
#!/bin/bash
# Backup config la ki egziste
if [ -f '/etc/nginx/nginx.conf' ]; then
    cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup-$(date +%Y%m%d-%H%M%S)
fi

# Kopye nouvo config la
cp /tmp/nginx.conf /etc/nginx/nginx.conf

# Test config la
nginx -t

# Reload nginx
if [ $? -eq 0 ]; then
    systemctl reload nginx
    echo "Nginx rechaje ak sikse!"
else
    echo "Ere nan config nginx!"
    exit 1
fi
'@

$nginxScript | Out-File -FilePath "apply-nginx.sh" -Encoding UTF8 -NoNewline
scp apply-nginx.sh "${SERVER_USER}@${SERVER_IP}:/tmp/"
ssh "${SERVER_USER}@${SERVER_IP}" "bash /tmp/apply-nginx.sh"

# Netwaye temp files
Remove-Item -Path "setup-downloads.sh", "apply-nginx.sh" -ErrorAction SilentlyContinue

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nDeplwaman konplete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Paj downloads disponib sou:" -ForegroundColor Cyan
    Write-Host "  https://admin.nalakreditimachann.com/downloads/" -ForegroundColor White
} else {
    Write-Host "`nDeplwaman echwe!" -ForegroundColor Red
}
