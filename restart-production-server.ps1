#!/usr/bin/env pwsh
# Restart Production Server Script

$SERVER_IP = "142.93.78.111"
$SSH_USER = "root"
$APP_DIR = "/var/www/nala-credit"

Write-Host "🔄 Restarting production server at $SERVER_IP..." -ForegroundColor Blue

# Try to restart backend service
Write-Host "`n📦 Restarting backend container..." -ForegroundColor Yellow
ssh "${SSH_USER}@${SERVER_IP}" "cd $APP_DIR && docker-compose restart backend"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Backend restarted successfully!" -ForegroundColor Green
    
    # Wait a bit for container to start
    Start-Sleep -Seconds 5
    
    # Check container status
    Write-Host "`n📊 Checking container status..." -ForegroundColor Yellow
    ssh "${SSH_USER}@${SERVER_IP}" "cd $APP_DIR && docker-compose ps backend"
    
    # Check recent logs
    Write-Host "`n📝 Recent backend logs:" -ForegroundColor Yellow
    ssh "${SSH_USER}@${SERVER_IP}" "docker logs krediti-backend --tail 30"
    
} else {
    Write-Host "❌ Failed to restart backend" -ForegroundColor Red
    Write-Host "Trying alternative method..." -ForegroundColor Yellow
    
    # Try direct docker command
    ssh "${SSH_USER}@${SERVER_IP}" "docker restart krediti-backend"
}

Write-Host "`n✅ Done!" -ForegroundColor Green
