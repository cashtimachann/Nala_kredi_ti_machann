#!/bin/bash

SSH_KEY="$HOME/.ssh/nala_deployment_rsa"
SERVER_IP="142.93.78.111"

echo "🚀 Ap kreye SuperAdmin nan sèvè pwodiksyon..."
echo ""

# Kopi script SQL sou sèvè a
scp -i "$SSH_KEY" /tmp/create_superadmin.sql root@$SERVER_IP:/tmp/

echo "📝 Ap egzekite script SQL..."
echo ""

ssh -i "$SSH_KEY" root@$SERVER_IP << 'ENDSSH'

docker exec -i nala-postgres psql -U nalauser -d nalakreditimachann_db < /tmp/create_superadmin.sql

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ SUPERADMIN KREYE AK SIKSÈ!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 KREYANSYÈL POU LOGIN:"
echo ""
echo "   🌐 URL: https://admin.nalakreditimachann.com/login"
echo "   📧 Email: superadmin@nalacredit.com"
echo "   🔑 Password: Admin@2024!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ENDSSH

echo ""
echo "✅ Done! Ale teste login la kounye a!"
