#!/bin/bash
# Fix nginx API routing - upload corrected config and reload

echo "=========================================="
echo "FIXING NGINX API ROUTES"
echo "=========================================="
echo ""

SERVER_IP="142.93.78.111"
SERVER_USER="root"

echo "1. Uploading corrected nginx.conf..."
scp nginx/nginx.conf $SERVER_USER@$SERVER_IP:/root/Nala_kredi_ti_machann/nginx/nginx.conf

if [ $? -ne 0 ]; then
    echo "❌ Failed to upload nginx config"
    exit 1
fi

echo "✓ Config uploaded"
echo ""

echo "2. Testing and reloading nginx on server..."
ssh $SERVER_USER@$SERVER_IP << 'ENDSSH'
    cd /root/Nala_kredi_ti_machann
    
    echo "Testing nginx configuration..."
    docker exec nala-nginx nginx -t
    
    if [ $? -eq 0 ]; then
        echo "✓ Config valid, reloading nginx..."
        docker exec nala-nginx nginx -s reload
        echo "✓ Nginx reloaded successfully"
    else
        echo "❌ Invalid nginx configuration"
        exit 1
    fi
    
    echo ""
    echo "Testing API endpoints..."
    echo "Admin dashboard endpoint:"
    curl -s -o /dev/null -w "Status: %{http_code}\n" https://admin.nalakreditimachann.com/api/health
    
    echo "Branch dashboard endpoint:"
    curl -s -o /dev/null -w "Status: %{http_code}\n" https://branch.nalakreditimachann.com/api/health
ENDSSH

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "✓ NGINX FIX DEPLOYED SUCCESSFULLY"
    echo "=========================================="
    echo ""
    echo "The /api/ routes now correctly forward to the backend with the /api prefix preserved."
    echo "Dashboard endpoints should now work correctly."
else
    echo ""
    echo "❌ Deployment failed"
    exit 1
fi
