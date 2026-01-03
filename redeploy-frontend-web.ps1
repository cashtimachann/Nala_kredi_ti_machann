# Quick Deploy Frontend Web Changes
# Deploye sèlman chanjman yo nan frontend-web (App.tsx)

Write-Host "Rebuild ak Redeploy Frontend Web..." -ForegroundColor Cyan

$SERVER_IP = "164.90.207.45"
$SERVER_USER = "root"

Write-Host "`nKreye arhiv frontend-web..." -ForegroundColor Yellow
tar czf frontend-web-update.tar.gz `
    --exclude='node_modules' `
    --exclude='.git' `
    frontend-web/

Write-Host "Upload ak deplwaye..." -ForegroundColor Yellow

$deployScript = @'
#!/bin/bash
set -e

cd /var/www/nala-credit

echo "📦 Backup frontend-web..."
BACKUP_DIR="/var/backups/nala-credit/frontend-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r frontend-web "$BACKUP_DIR/" || true

echo "📦 Extract nouvo frontend-web..."
tar xzf /tmp/frontend-web-update.tar.gz -C /var/www/nala-credit/
rm /tmp/frontend-web-update.tar.gz

echo "🏗️  Rebuild frontend Docker image..."
docker compose build frontend

echo "🔄 Restart frontend container..."
docker compose up -d frontend

echo "⏳ Waiting for frontend to initialize..."
sleep 10

echo ""
echo "✅ Frontend web redeploy konplete!"
echo ""
echo "📊 Status:"
docker compose ps frontend

echo ""
echo "🏥 Health check:"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:80 || echo "Failed"
'@

$deployScript | Out-File -FilePath "redeploy-frontend.sh" -Encoding UTF8 -NoNewline

# Upload files
Write-Host "Uploading files..." -ForegroundColor Yellow
scp frontend-web-update.tar.gz "${SERVER_USER}@${SERVER_IP}:/tmp/"
scp redeploy-frontend.sh "${SERVER_USER}@${SERVER_IP}:/tmp/"

# Execute deployment
Write-Host "Execute deployment..." -ForegroundColor Yellow
ssh "${SERVER_USER}@${SERVER_IP}" "bash /tmp/redeploy-frontend.sh"

# Cleanup
Remove-Item -Path "frontend-web-update.tar.gz", "redeploy-frontend.sh" -ErrorAction SilentlyContinue

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nFrontend Web Redeploy Konplete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Tcheke aplikasyon an:" -ForegroundColor Cyan
    Write-Host "  https://admin.nalakreditimachann.com" -ForegroundColor White
} else {
    Write-Host "`nDeplwaman echwe!" -ForegroundColor Red
}
