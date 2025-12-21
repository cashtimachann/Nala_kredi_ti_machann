#!/bin/bash
# Script pou verifye branch manager domain setup

echo "=========================================="
echo "BRANCH MANAGER DOMAIN STATUS CHECK"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. DNS Check
echo "1. DNS Resolution Check..."
if nslookup branch.nalakreditimachann.com &> /dev/null; then
    echo -e "${GREEN}✓${NC} DNS resolves correctly"
    nslookup branch.nalakreditimachann.com | grep "Address"
else
    echo -e "${RED}✗${NC} DNS not resolving yet (may need more time to propagate)"
fi
echo ""

# 2. Container Check
echo "2. Docker Container Check..."
if docker ps | grep -q "nala-frontend-branch"; then
    echo -e "${GREEN}✓${NC} frontend-branch container is running"
    docker ps | grep frontend-branch
else
    echo -e "${RED}✗${NC} frontend-branch container is NOT running"
fi
echo ""

# 3. Health Check
echo "3. Application Health Check..."
if curl -f -s http://branch.nalakreditimachann.com/health &> /dev/null; then
    echo -e "${GREEN}✓${NC} Health endpoint responding"
else
    echo -e "${YELLOW}⚠${NC} Health endpoint not accessible (DNS may not be ready yet)"
fi
echo ""

# 4. API Check
echo "4. API Endpoint Check..."
API_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://branch.nalakreditimachann.com/api/health 2>/dev/null)
if [ "$API_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✓${NC} API endpoint responding (HTTP $API_RESPONSE)"
else
    echo -e "${YELLOW}⚠${NC} API endpoint check failed (HTTP $API_RESPONSE - DNS may not be ready)"
fi
echo ""

# 5. Nginx Config Check
echo "5. Nginx Configuration Check..."
if docker exec nala-nginx nginx -t &> /dev/null; then
    echo -e "${GREEN}✓${NC} Nginx configuration is valid"
else
    echo -e "${RED}✗${NC} Nginx configuration has errors"
    docker exec nala-nginx nginx -t
fi
echo ""

# 6. All Containers Status
echo "6. All Related Containers..."
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "nala-(frontend|nginx|api)" || echo "No containers found"
echo ""

# 7. Recent Logs
echo "7. Recent Logs (last 10 lines)..."
if docker ps | grep -q "nala-frontend-branch"; then
    docker logs --tail 10 nala-frontend-branch 2>&1
else
    echo -e "${YELLOW}Container not running - no logs available${NC}"
fi
echo ""

# Summary
echo "=========================================="
echo "SUMMARY"
echo "=========================================="
echo ""

# Check if everything is ready
CONTAINERS_OK=$(docker ps | grep -c "nala-frontend-branch")
NGINX_OK=$(docker exec nala-nginx nginx -t 2>&1 | grep -c "successful")

if [ "$CONTAINERS_OK" -eq 1 ] && [ "$NGINX_OK" -eq 1 ]; then
    echo -e "${GREEN}✓ System is configured correctly!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Wait for DNS to propagate (5-60 minutes)"
    echo "  2. Test access: http://branch.nalakreditimachann.com"
    echo "  3. Install SSL: sudo certbot certonly --nginx -d branch.nalakreditimachann.com"
else
    echo -e "${YELLOW}⚠ System needs attention${NC}"
    echo ""
    echo "Troubleshooting steps:"
    echo "  1. Check if containers are running: docker ps"
    echo "  2. Rebuild if needed: docker-compose build frontend-branch"
    echo "  3. Restart services: docker-compose restart"
    echo "  4. Check logs: docker logs nala-frontend-branch"
fi

echo ""
echo "=========================================="
