#!/bin/bash
# Fix and start branch container

ssh root@142.93.78.111 << 'ENDSSH'
    cd /root/Nala_kredi_ti_machann
    
    echo "Step 1: Check existing networks..."
    docker network ls | grep nala
    
    echo ""
    echo "Step 2: Remove network if exists..."
    docker network rm nala_kredi_ti_machann_nala-network 2>/dev/null || true
    docker network rm nala-network 2>/dev/null || true
    
    echo ""
    echo "Step 3: Create network..."
    docker network create nala-network 2>/dev/null || echo "Network already exists or will be created by compose"
    
    echo ""
    echo "Step 4: Start all services..."
    docker compose up -d
    
    echo ""
    echo "Step 5: Wait for containers..."
    sleep 15
    
    echo ""
    echo "Step 6: Check containers..."
    docker ps | grep -E "nala-(frontend|api|nginx)"
    
    echo ""
    echo "Step 7: Test endpoints..."
    echo "Admin:"
    curl -s http://admin.nalakreditimachann.com/health || echo "Not responding"
    echo ""
    echo "Branch:"
    curl -s http://branch.nalakreditimachann.com/health || echo "Not responding"
    
ENDSSH
