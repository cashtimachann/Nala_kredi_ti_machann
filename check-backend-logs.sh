#!/bin/bash

SSH_KEY="$HOME/.ssh/nala_deployment_rsa"
SERVER_IP="142.93.78.111"

echo "🔍 Verification des logs backend..."
echo ""

ssh -i "$SSH_KEY" root@$SERVER_IP << 'ENDSSH'

echo "📋 Derniers logs du backend (200 lignes):"
docker logs --tail 200 krediti-backend 2>&1

ENDSSH

echo ""
echo "✅ Verification complete"
