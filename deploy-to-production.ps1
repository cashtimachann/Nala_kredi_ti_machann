# Script pou deplwaye nan server production
# Nala Credit Ti Machann - Production Deployment

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "DEPLOYMENT TO PRODUCTION SERVER" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$SERVER_IP = "142.93.78.111"
$SERVER_USER = "root"
$SSH_KEY = "$env:USERPROFILE\.ssh\nala_key"

Write-Host "Step 1: Checking git status..." -ForegroundColor Blue
git status
Write-Host ""

Write-Host "Step 2: Pushing to GitHub..." -ForegroundColor Blue
git push origin main 2>&1 | Out-Null
Write-Host "Git push completed" -ForegroundColor Green
Write-Host ""

Write-Host "Step 3: Connecting to production server $SERVER_USER@$SERVER_IP..." -ForegroundColor Blue
Write-Host ""

# Create deployment script
$script = @"
cd /root/Nala_kredi_ti_machann && \
echo '========== Pulling latest code ==========' && \
git pull origin main && \
echo '========== Stopping containers ==========' && \
docker compose down && \
echo '========== Building services ==========' && \
docker compose build && \
echo '========== Starting services ==========' && \
docker compose up -d && \
echo '========== Waiting 15 seconds ==========' && \
sleep 15 && \
echo '========== Container Status ==========' && \
docker compose ps && \
echo '========== Testing Nginx ==========' && \
docker exec nala-nginx nginx -t && \
docker exec nala-nginx nginx -s reload && \
echo '========== Backend Logs ==========' && \
docker logs --tail 20 nala-backend-api && \
echo '========== Deployment Complete ==========' && \
echo 'Production is now updated!'
"@

# Execute via SSH
ssh -i $SSH_KEY "$SERVER_USER@$SERVER_IP" $script

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "DEPLOYMENT COMPLETED" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "URLs:" -ForegroundColor Cyan
Write-Host "  Main: http://nalakreditimachann.com" -ForegroundColor White
Write-Host "  Branch: http://branch.nalakreditimachann.com" -ForegroundColor White
Write-Host "  API: http://142.93.78.111:5000/api" -ForegroundColor White
Write-Host ""
