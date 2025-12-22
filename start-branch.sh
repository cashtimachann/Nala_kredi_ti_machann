#!/bin/bash
# Start branch frontend container

ssh root@142.93.78.111 << 'ENDSSH'
    cd /root/Nala_kredi_ti_machann
    
    echo "Starting frontend-branch container..."
    docker compose up -d frontend-branch
    
    echo ""
    echo "Waiting for container to be healthy..."
    sleep 10
    
    echo ""
    echo "Container status:"
    docker ps | grep frontend-branch
    
    echo ""
    echo "Reloading nginx..."
    docker exec nala-nginx nginx -s reload
    
    echo ""
    echo "Testing branch domain..."
    curl -I http://branch.nalakreditimachann.com 2>&1 | head -5
    
ENDSSH
