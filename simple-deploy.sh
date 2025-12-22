#!/bin/bash
# Simple step-by-step deployment

echo "=========================================="
echo "STEP-BY-STEP DEPLOYMENT"
echo "=========================================="
echo ""

SERVER="root@142.93.78.111"

echo "Step 1: Stopping services..."
ssh $SERVER 'cd /root/Nala_kredi_ti_machann && docker compose down'
echo ""

echo "Step 2: Pull latest code..."
ssh $SERVER 'cd /root/Nala_kredi_ti_machann && git pull'
echo ""

echo "Step 3: Building frontend-branch (this takes ~5 minutes)..."
ssh $SERVER 'cd /root/Nala_kredi_ti_machann && docker compose build frontend-branch'
echo ""

echo "Step 4: Starting all services..."
ssh $SERVER 'cd /root/Nala_kredi_ti_machann && docker compose up -d'
echo ""

echo "Step 5: Waiting 20 seconds for services to start..."
sleep 20
echo ""

echo "Step 6: Checking status..."
ssh $SERVER 'cd /root/Nala_kredi_ti_machann && docker compose ps'
echo ""

echo "Step 7: Testing nginx..."
ssh $SERVER 'docker exec nala-nginx nginx -t && docker exec nala-nginx nginx -s reload'
echo ""

echo "Step 8: Final tests..."
echo "Admin health:"
curl -s http://admin.nalakreditimachann.com/health
echo ""
echo "Branch health:"
curl -s http://branch.nalakreditimachann.com/health
echo ""

echo "=========================================="
echo "✓ DONE!"
echo "=========================================="
