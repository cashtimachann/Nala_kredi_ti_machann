# Fix Downloads Redirect Issue
# Deplwaye nginx.conf ak download-page.html ki fikse yo

Write-Host "Deplwaye koreksyon pou downloads..." -ForegroundColor Cyan

# IP server la
$SERVER_IP = "164.90.207.45"
$SERVER_USER = "root"

# 1. Upload download-page.html ki fikse a
Write-Host "`nUploading download-page.html..." -ForegroundColor Yellow
scp frontend-desktop/download-page.html "${SERVER_USER}@${SERVER_IP}:/tmp/"

# 2. Upload nginx.conf ki fikse a
Write-Host "Uploading nginx.conf..." -ForegroundColor Yellow
scp nginx.conf "${SERVER_USER}@${SERVER_IP}:/tmp/"

# 3. Kreye script bash pou apliye chanjman yo
Write-Host "Konfigirasyon sou server..." -ForegroundColor Yellow

$deployScript = @'
#!/bin/bash
set -e

echo "1. Kreye dosye downloads si li pa egziste..."
if [ ! -d '/var/www/downloads' ]; then
    mkdir -p /var/www/downloads
    chown -R www-data:www-data /var/www/downloads
    chmod -R 755 /var/www/downloads
fi

echo "2. Move download-page.html..."
mv /tmp/download-page.html /var/www/downloads/
chown www-data:www-data /var/www/downloads/download-page.html
chmod 644 /var/www/downloads/download-page.html

echo "3. Backup nginx config..."
cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup-$(date +%Y%m%d-%H%M%S)

echo "4. Apliye nouvo nginx config..."
cp /tmp/nginx.conf /etc/nginx/nginx.conf

echo "5. Test nginx config..."
nginx -t

echo "6. Reload nginx..."
systemctl reload nginx

echo "✓ Deplwaman konplete!"
'@

$deployScript | Out-File -FilePath "fix-downloads.sh" -Encoding UTF8 -NoNewline

# Upload ak egzekite script la
Write-Host "Uploading ak egzekite script..." -ForegroundColor Yellow
scp fix-downloads.sh "${SERVER_USER}@${SERVER_IP}:/tmp/"
ssh "${SERVER_USER}@${SERVER_IP}" "bash /tmp/fix-downloads.sh"

# Netwaye temp files
Remove-Item -Path "fix-downloads.sh" -ErrorAction SilentlyContinue

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nDeplwaman konplete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Tcheke paj downloads:" -ForegroundColor Cyan
    Write-Host "  https://admin.nalakreditimachann.com/downloads/" -ForegroundColor White
    Write-Host ""
    Write-Host "Kounye a, lè w klike sou yon lyen telechajman, li ta dwe telechaje dirèkteman san redireksyon." -ForegroundColor Green
} else {
    Write-Host "`nDeplwaman echwe!" -ForegroundColor Red
}
