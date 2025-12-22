#!/bin/bash
# Fix conflicts and redeploy

echo "=========================================="
echo "FIXING CONFLICTS & REDEPLOYING"
echo "=========================================="
echo ""

SERVER_IP="142.93.78.111"
SERVER_USER="root"

ssh $SERVER_USER@$SERVER_IP << 'ENDSSH'
    cd /root/Nala_kredi_ti_machann || exit 1
    
    echo "Step 1: Backing up conflicting files..."
    mkdir -p backup_$(date +%Y%m%d_%H%M%S)
    
    # Move conflicting files to backup
    [ -f backend/Dockerfile ] && mv backend/Dockerfile backup_*/
    [ -f docker-compose.yml ] && mv docker-compose.yml backup_*/
    [ -f frontend-build/dashboard.html ] && mv frontend-build/dashboard.html backup_*/
    [ -f frontend-build/index.html ] && mv frontend-build/index.html backup_*/
    [ -f frontend-build/login.html ] && mv frontend-build/login.html backup_*/
    [ -f frontend-web/Dockerfile ] && mv frontend-web/Dockerfile backup_*/
    [ -f frontend-web/nginx.conf ] && mv frontend-web/nginx.conf backup_*/
    [ -f nginx.conf ] && mv nginx.conf backup_*/
    
    echo "✓ Files backed up"
    echo ""
    
    echo "Step 2: Resetting to clean state..."
    git reset --hard HEAD
    echo "✓ Reset complete"
    echo ""
    
    echo "Step 3: Pulling latest code..."
    git pull origin main
    if [ $? -eq 0 ]; then
        echo "✓ Code pulled successfully"
    else
        echo "✗ Failed to pull code"
        exit 1
    fi
    echo ""
    
    echo "Step 4: Stopping containers..."
    docker compose down
    echo "✓ Containers stopped"
    echo ""
    
    echo "Step 5: Building branch frontend..."
    docker compose build frontend-branch
    if [ $? -eq 0 ]; then
        echo "✓ Build successful"
    else
        echo "✗ Build failed"
        exit 1
    fi
    echo ""
    
    echo "Step 6: Starting all services..."
    docker compose up -d
    echo "✓ Services started"
    echo ""
    
    echo "Step 7: Waiting for services..."
    sleep 15
    echo ""
    
    echo "Step 8: Checking container status..."
    docker compose ps | grep -E "nala-(frontend|api|nginx)"
    echo ""
    
    echo "Step 9: Testing nginx configuration..."
    docker exec nala-nginx nginx -t 2>&1
    if [ $? -eq 0 ]; then
        echo "✓ Nginx config valid"
        docker exec nala-nginx nginx -s reload
        echo "✓ Nginx reloaded"
    fi
    echo ""
    
    echo "Step 10: Checking frontend-branch logs..."
    echo "Last 15 lines:"
    docker logs --tail 15 nala-frontend-branch
    echo ""
    
    echo "=========================================="
    echo "✓ DEPLOYMENT COMPLETE!"
    echo "=========================================="
    echo ""
    echo "Testing endpoints..."
    echo ""
    
    echo "Health check:"
    curl -s http://localhost/health || echo "Health endpoint not responding"
    echo ""
    
    echo "API check:"
    curl -s http://localhost/api/health || echo "API endpoint not responding"
    echo ""
    
    echo "=========================================="
    echo "NEXT STEPS:"
    echo "=========================================="
    echo "1. Configure DNS: branch.nalakreditimachann.com → 142.93.78.111"
    echo "2. Wait 5-15 minutes for DNS propagation"
    echo "3. Test: curl http://branch.nalakreditimachann.com/health"
    echo "4. Install SSL:"
    echo "   sudo certbot certonly --nginx -d branch.nalakreditimachann.com"
    echo ""
ENDSSH

echo ""
echo "=========================================="
echo "✓ DEPLOYMENT SCRIPT COMPLETE"
echo "=========================================="
