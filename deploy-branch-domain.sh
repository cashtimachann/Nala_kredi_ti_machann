#!/bin/bash
# Deploy Branch Manager Domain - Quick Deployment Script

set -e  # Exit on any error

echo "=========================================="
echo "BRANCH MANAGER DOMAIN DEPLOYMENT"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Verify files exist
echo -e "${BLUE}Step 1:${NC} Verifying configuration files..."
FILES=(
    "frontend-web/.env.branch"
    "frontend-web/Dockerfile.branch"
    "nginx/nginx.conf"
    "docker-compose.yml"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $file exists"
    else
        echo -e "${RED}✗${NC} $file NOT FOUND!"
        exit 1
    fi
done
echo ""

# Step 2: Stop existing containers
echo -e "${BLUE}Step 2:${NC} Stopping existing containers..."
docker-compose down
echo -e "${GREEN}✓${NC} Containers stopped"
echo ""

# Step 3: Build new branch frontend
echo -e "${BLUE}Step 3:${NC} Building branch manager frontend..."
docker-compose build frontend-branch
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Build successful"
else
    echo -e "${RED}✗${NC} Build failed!"
    exit 1
fi
echo ""

# Step 4: Start all services
echo -e "${BLUE}Step 4:${NC} Starting all services..."
docker-compose up -d
echo -e "${GREEN}✓${NC} Services started"
echo ""

# Step 5: Wait for services to be ready
echo -e "${BLUE}Step 5:${NC} Waiting for services to be ready..."
sleep 10

# Check if containers are running
CONTAINERS=(
    "nala-frontend"
    "nala-frontend-branch"
    "nala-api"
    "nala-nginx"
    "nala-postgres"
)

echo "Checking containers..."
ALL_RUNNING=true
for container in "${CONTAINERS[@]}"; do
    if docker ps | grep -q "$container"; then
        echo -e "${GREEN}✓${NC} $container is running"
    else
        echo -e "${RED}✗${NC} $container is NOT running"
        ALL_RUNNING=false
    fi
done
echo ""

# Step 6: Test nginx configuration
echo -e "${BLUE}Step 6:${NC} Testing nginx configuration..."
if docker exec nala-nginx nginx -t 2>&1 | grep -q "successful"; then
    echo -e "${GREEN}✓${NC} Nginx configuration is valid"
    docker exec nala-nginx nginx -s reload
    echo -e "${GREEN}✓${NC} Nginx reloaded"
else
    echo -e "${RED}✗${NC} Nginx configuration has errors!"
    docker exec nala-nginx nginx -t
    exit 1
fi
echo ""

# Step 7: Show status
echo -e "${BLUE}Step 7:${NC} Current status..."
docker-compose ps
echo ""

# Final Summary
echo "=========================================="
echo "DEPLOYMENT SUMMARY"
echo "=========================================="
echo ""

if [ "$ALL_RUNNING" = true ]; then
    echo -e "${GREEN}✓ Deployment successful!${NC}"
    echo ""
    echo "Your applications are now available at:"
    echo "  • Admin Dashboard:  http://admin.nalakreditimachann.com"
    echo "  • Branch Dashboard: http://branch.nalakreditimachann.com"
    echo ""
    echo -e "${YELLOW}IMPORTANT:${NC} Next steps:"
    echo "  1. Configure DNS A record for branch.nalakreditimachann.com → 142.93.78.111"
    echo "  2. Wait 5-15 minutes for DNS propagation"
    echo "  3. Test: curl http://branch.nalakreditimachann.com/health"
    echo "  4. Install SSL: sudo certbot certonly --nginx -d branch.nalakreditimachann.com"
    echo ""
    echo "To check status, run: ./check-branch-domain.sh"
else
    echo -e "${RED}✗ Some containers failed to start${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Check logs: docker-compose logs"
    echo "  2. Check specific container: docker logs nala-frontend-branch"
    echo "  3. Restart: docker-compose restart"
fi

echo ""
echo "=========================================="
