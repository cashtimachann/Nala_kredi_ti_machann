#!/bin/bash

SSH_KEY="$HOME/.ssh/nala_deployment_rsa"
SERVER_IP="142.93.78.111"

echo "🔓 Ap deblokelocker SuperAdmin account..."
echo ""

ssh -i "$SSH_KEY" root@$SERVER_IP << 'ENDSSH'

docker exec nala-postgres psql -U nalauser -d nalakreditimachann_db << 'EOSQL'

-- Reset lockout
UPDATE "AspNetUsers"
SET 
    "LockoutEnd" = NULL,
    "AccessFailedCount" = 0
WHERE "Email" = 'superadmin@nalacredit.com';

-- Verify
SELECT 
    "Email",
    "IsActive",
    "AccessFailedCount",
    "LockoutEnd"
FROM "AspNetUsers"
WHERE "Email" = 'superadmin@nalacredit.com';

EOSQL

ENDSSH

echo ""
echo "✅ Kont SuperAdmin déverouiller!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 KREYANSYÈL POU LOGIN:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "   🌐 URL: https://admin.nalakreditimachann.com/login"
echo "   📧 Email: superadmin@nalacredit.com"
echo "   🔑 Password: Admin@2024!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
