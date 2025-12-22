#!/bin/bash

SSH_KEY="$HOME/.ssh/nala_deployment_rsa"
SERVER_IP="142.93.78.111"

echo "🔍 Ap verifye status containers Docker..."
echo ""

ssh -i "$SSH_KEY" root@$SERVER_IP << 'ENDSSH'

echo "📊 Docker containers ki ap kouri:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "📦 Tout containers (enkli sa yo ki pa ap kouri):"
docker ps -a --format "table {{.Names}}\t{{.Status}}"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "🔍 Docker compose services:"
cd /var/www/nala-credit
if [ -f "docker-compose.yml" ]; then
    docker-compose ps
else
    echo "❌ docker-compose.yml pa jwenn"
fi

ENDSSH
