#!/bin/bash
# Complete deployment - fix API and add branch frontend

echo "=========================================="
echo "FIXING & COMPLETING DEPLOYMENT"
echo "=========================================="
echo ""

SERVER_IP="142.93.78.111"
SERVER_USER="root"

ssh $SERVER_USER@$SERVER_IP << 'ENDSSH'
    set -e
    cd /root/Nala_kredi_ti_machann
    
    echo "Step 1: Stopping all services..."
    docker compose down
    echo "✓ Services stopped"
    echo ""
    
    echo "Step 2: Pulling latest code..."
    git stash  # Save any local changes
    git pull origin main
    echo "✓ Code updated"
    echo ""
    
    echo "Step 3: Building images..."
    echo "This will take 5-10 minutes for frontend-branch..."
    docker compose build --no-cache frontend-branch api
    echo "✓ Images built"
    echo ""
    
    echo "Step 4: Starting all services..."
    docker compose up -d
    echo "✓ Services started"
    echo ""
    
    echo "Step 5: Waiting for services to initialize (30 seconds)..."
    sleep 30
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
    fi
    echo ""
    
    echo "Step 8: Checking logs..."
    echo ""
    echo "=== Frontend Branch Logs ==="
    docker logs --tail 10 nala-frontend-branch 2>&1 || echo "Container not started yet"
    echo ""
    echo "=== API Logs ==="
    docker logs --tail 10 nala-api 2>&1 || echo "Container not started yet"
    echo ""
    echo "=== Nginx Logs ==="
    docker logs --tail 10 nala-nginx 2>&1
    echo ""
    
    echo "Step 9: Testing endpoints..."
    sleep 5
    echo ""
    echo "Admin domain:"
    curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost/ || echo "Failed"
    echo ""
    echo "Branch domain (via nginx):"
    curl -s -o /dev/null -w "HTTP %{http_code}\n" -H "Host: branch.nalakreditimachann.com" http://localhost/ || echo "Failed"
    echo ""
    echo "API health:"
    curl -s http://localhost/api/health || echo "API not responding"
    echo ""
    
    echo "=========================================="
    echo "✓ DEPLOYMENT COMPLETE!"
    echo "=========================================="
    echo ""
    echo "Services running:"
    docker ps --format "table {{.Names}}\t{{.Status}}" | grep nala
    echo ""
    echo "Next steps:"
    echo "  1. Test: curl http://branch.nalakreditimachann.com/"
    echo "  2. Install SSL: certbot certonly --nginx -d branch.nalakreditimachann.com"
    echo ""
ENDSSH

echo ""
echo "=========================================="
echo "✓ DEPLOYMENT SCRIPT COMPLETED"
echo "=========================================="
echo ""
echo "Test from your machine:"
echo "  curl http://branch.nalakreditimachann.com/health"
