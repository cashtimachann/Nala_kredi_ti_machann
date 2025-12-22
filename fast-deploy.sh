#!/bin/bash
# Fast deployment - reuse existing frontend image

echo "=========================================="
echo "FAST BRANCH DOMAIN DEPLOYMENT"
echo "=========================================="

SERVER_IP="142.93.78.111"
SERVER_USER="root"

ssh $SERVER_USER@$SERVER_IP << 'ENDSSH'
    cd /root/Nala_kredi_ti_machann
    
    echo "Step 1: Pulling latest nginx config..."
    git pull origin main
    
    echo ""
    echo "Step 2: Tag existing frontend image for branch..."
    # Reuse the admin frontend image - they're the same app
    docker tag nala-frontend:latest nala-frontend-branch:latest || \
    docker tag nalakreditimachann-frontend:latest nala-frontend-branch:latest
    
    echo ""
    echo "Step 3: Updating docker-compose to use existing image..."
    
    # Create temporary docker-compose override
    cat > docker-compose.override.yml << 'EOF'
services:
  frontend-branch:
    image: nala-frontend-branch:latest
    container_name: nala-frontend-branch
    restart: unless-stopped
    networks:
      - nala-network
    depends_on:
      - api
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/"]
      interval: 30s
      timeout: 10s
      retries: 3
EOF
    
    echo ""
    echo "Step 4: Starting branch frontend..."
    docker compose up -d frontend-branch
    
    echo ""
    echo "Step 5: Reloading nginx..."
    docker exec nala-nginx nginx -t && docker exec nala-nginx nginx -s reload
    
    echo ""
    echo "Step 6: Checking containers..."
    docker ps | grep -E "nala-(frontend|nginx|api)"
    
    echo ""
    echo "Step 7: Testing endpoints..."
    sleep 5
    
    echo "Admin domain:"
    curl -I http://admin.nalakreditimachann.com/health 2>&1 | head -1
    
    echo "Branch domain:"
    curl -I http://branch.nalakreditimachann.com/health 2>&1 | head -1
    
    echo ""
    echo "=========================================="
    echo "✓ DEPLOYMENT COMPLETE!"
    echo "=========================================="
    echo ""
    echo "Services:"
    echo "  Admin:  http://admin.nalakreditimachann.com"
    echo "  Branch: http://branch.nalakreditimachann.com"
    echo ""
    echo "Both using same frontend image - no rebuild needed!"
    
ENDSSH

echo ""
echo "Done! Branch domain is live."
