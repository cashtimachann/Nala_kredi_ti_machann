#!/bin/bash
# Script pou deplwaye branch domain sou server production

echo "=========================================="
echo "DEPLOYMENT TO PRODUCTION SERVER"
echo "=========================================="
echo ""

SERVER_IP="142.93.78.111"
SERVER_USER="root"
PROJECT_PATH="/root/Nala_kredi_ti_machann"  # Update with actual path

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Step 1:${NC} Committing local changes..."
git add .
git commit -m "Add branch manager subdomain configuration" || echo "No changes to commit"
echo ""

echo -e "${BLUE}Step 2:${NC} Pushing to GitHub..."
git push origin main
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Pushed to GitHub"
else
    echo -e "${RED}✗${NC} Failed to push"
    exit 1
fi
echo ""

echo -e "${BLUE}Step 3:${NC} Connecting to production server..."
echo "Server: $SERVER_USER@$SERVER_IP"
echo ""

# Deploy on server
ssh $SERVER_USER@$SERVER_IP << 'ENDSSH'
    echo "=========================================="
    echo "ON PRODUCTION SERVER"
    echo "=========================================="
    echo ""
    
    # Navigate to project
    cd /root/Nala_kredi_ti_machann || exit 1
    
    echo "Step 1: Pulling latest code..."
    git pull origin main
    if [ $? -eq 0 ]; then
        echo "✓ Code pulled successfully"
    else
        echo "✗ Failed to pull code"
        exit 1
    fi
    echo ""
    
    echo "Step 2: Stopping containers..."
    docker compose down
    echo "✓ Containers stopped"
    echo ""
    
    echo "Step 3: Building branch frontend..."
    docker compose build frontend-branch
    if [ $? -eq 0 ]; then
        echo "✓ Build successful"
    else
        echo "✗ Build failed"
        exit 1
    fi
    echo ""
    
    echo "Step 4: Starting all services..."
    docker compose up -d
    echo "✓ Services started"
    echo ""
    
    echo "Step 5: Waiting for services..."
    sleep 10
    echo ""
    
    echo "Step 6: Checking container status..."
    docker compose ps
    echo ""
    
    echo "Step 7: Testing nginx configuration..."
    docker exec nala-nginx nginx -t
    if [ $? -eq 0 ]; then
        echo "✓ Nginx config valid"
        docker exec nala-nginx nginx -s reload
        echo "✓ Nginx reloaded"
    else
        echo "✗ Nginx config has errors"
    fi
    echo ""
    
    echo "Step 8: Checking logs..."
    docker logs --tail 20 nala-frontend-branch
    echo ""
    
    echo "=========================================="
    echo "DEPLOYMENT COMPLETE!"
    echo "=========================================="
    echo ""
    echo "Next steps:"
    echo "  1. Configure DNS: branch → 142.93.78.111"
    echo "  2. Wait 5-15 minutes for DNS propagation"
    echo "  3. Test: curl http://branch.nalakreditimachann.com/health"
    echo "  4. Install SSL: certbot certonly --nginx -d branch.nalakreditimachann.com"
    echo ""
ENDSSH

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}=========================================="
    echo "✓ DEPLOYMENT SUCCESSFUL!"
    echo "==========================================${NC}"
    echo ""
    echo "Your branch manager domain is ready!"
    echo ""
    echo "Test locally:"
    echo "  curl http://branch.nalakreditimachann.com/health"
    echo ""
else
    echo ""
    echo -e "${RED}=========================================="
    echo "✗ DEPLOYMENT FAILED"
    echo "==========================================${NC}"
    echo ""
    echo "Check the error messages above"
fi
