#!/bin/bash
# Deploy corrected nginx config (from root directory) and reload

echo "=========================================="
echo "DEPLOYING CORRECTED NGINX CONFIG"
echo "=========================================="
echo ""

SERVER_IP="142.93.78.111"
SERVER_USER="root"

echo "1. Uploading nginx.conf from root directory..."
scp nginx.conf $SERVER_USER@$SERVER_IP:/root/Nala_kredi_ti_machann/nginx.conf

if [ $? -ne 0 ]; then
    echo "❌ Failed to upload nginx config"
    exit 1
fi

echo "✓ Config uploaded"
echo ""

echo "2. Restarting nginx container..."
ssh $SERVER_USER@$SERVER_IP << 'ENDSSH'
    cd /root/Nala_kredi_ti_machann
    
    echo "Restarting nginx to load new config..."
    docker compose restart nginx
    
    echo "Waiting for nginx to start..."
    sleep 3
    
    echo "Testing nginx configuration..."
    docker exec nala-nginx nginx -t
    
    if [ $? -eq 0 ]; then
        echo "✓ Nginx configuration is valid"
    else
        echo "❌ Invalid nginx configuration"
        exit 1
    fi
    
    echo ""
    echo "Testing API endpoints from inside nginx container..."
    echo "1. Direct backend test:"
    docker exec nala-nginx curl -s http://nala-api:5000/api/health | head -c 100
    echo ""
    echo ""
    echo "2. Through nginx proxy (admin domain):"
    docker exec nala-nginx curl -s -H "Host: admin.nalakreditimachann.com" http://localhost/api/health | head -c 100
    echo ""
ENDSSH

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "✓ NGINX CONFIG DEPLOYED"
    echo "=========================================="
    echo ""
    echo "Testing from external..."
    curl -s https://admin.nalakreditimachann.com/api/health
    echo ""
else
    echo ""
    echo "❌ Deployment failed"
    exit 1
fi
