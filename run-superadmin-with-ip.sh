#!/bin/bash

SSH_KEY="$HOME/.ssh/nala_deployment_rsa"
SERVER_IP="142.93.78.111"

echo "🔧 Ap egzekite tool SuperAdmin nan sèvè..."
echo ""

ssh -i "$SSH_KEY" root@$SERVER_IP << 'ENDSSH'

cd /root

# Jwenn IP postgres container la
POSTGRES_IP=$(docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' nala-postgres)
echo "📊 Postgres container IP: $POSTGRES_IP"

# Update connection string pou itilize IP la
sed -i "s/Host=nala-postgres/Host=$POSTGRES_IP/g" CreateSuperAdminProgram.cs

# Egzekite tool la
echo ""
echo "🚀 Ap egzekite tool la..."
$HOME/.dotnet/dotnet run --project CreateSuperAdmin.csproj 2>&1 | grep -v "warning"

ENDSSH

echo ""
echo "✅ Done! Ann teste login!"
