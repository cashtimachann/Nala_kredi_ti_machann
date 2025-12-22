#!/bin/bash
# Quick deployment script - use existing images if possible

echo "=========================================="
echo "QUICK DEPLOYMENT TO PRODUCTION"
echo "=========================================="
echo ""

SERVER_IP="142.93.78.111"
SERVER_USER="root"

ssh $SERVER_USER@$SERVER_IP << 'ENDSSH'
    cd /root/Nala_kredi_ti_machann
    
    echo "Restarting containers with existing images..."
    docker compose up -d --force-recreate nginx
    
    echo ""
    echo "Checking nginx config..."
    docker exec nala-nginx nginx -t
    docker exec nala-nginx nginx -s reload
    
    echo ""
    echo "Container status:"
    docker compose ps
    
    echo ""
    echo "Testing endpoints..."
    echo "1. Health:"
    curl -s http://localhost/health
    echo ""
    echo "2. API:"
    curl -s http://localhost/api/health
    
    echo ""
    echo "=========================================="
    echo "✓ DEPLOYMENT COMPLETE"
    echo "=========================================="
    echo ""
    echo "Branch manager domain configured!"
    echo ""
    echo "NEXT STEPS:"
    echo "1. Configure DNS: branch.nalakreditimachann.com → 142.93.78.111"
    echo "2. Wait for DNS propagation"
    echo "3. Install SSL: certbot certonly --nginx -d branch.nalakreditimachann.com"
ENDSSH

echo ""
echo "Done! Configuration deployed to production server."
