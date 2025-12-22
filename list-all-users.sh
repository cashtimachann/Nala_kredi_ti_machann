#!/bin/bash

SSH_KEY="$HOME/.ssh/nala_deployment_rsa"
SERVER_IP="142.93.78.111"

echo "👥 Ap jwenn tout itilizatè nan database..."
echo ""

ssh -i "$SSH_KEY" root@$SERVER_IP << 'ENDSSH'

cd /var/www/nala-credit

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TOUT ITILIZATÈ NAN SISTÈM LAN:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

docker exec nala-postgres psql -U nalauser -d nalakreditimachann_db -c "
SELECT 
    \"Email\" as \"📧 Email\",
    \"FirstName\" || ' ' || \"LastName\" as \"👤 Non\",
    CASE \"Role\"
        WHEN 0 THEN '⭐ SuperAdmin'
        WHEN 1 THEN '💰 Caissier'
        WHEN 2 THEN '📝 Secrétaire'
        WHEN 3 THEN '🏦 Agent'
        WHEN 4 THEN '👔 Manager'
        ELSE '❓ Lòt'
    END as \"Wòl\",
    CASE WHEN \"IsActive\" THEN '✅' ELSE '❌' END as \"Aktif\",
    CASE 
        WHEN \"PasswordHash\" IS NOT NULL AND LENGTH(\"PasswordHash\") > 10 THEN '🔒 Wi'
        ELSE '⚠️ Non'
    END as \"Password\"
FROM \"AspNetUsers\"
ORDER BY \"Role\", \"Email\";
"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STATISTIK:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

docker exec nala-postgres psql -U nalauser -d nalakreditimachann_db -c "
SELECT 
    CASE \"Role\"
        WHEN 0 THEN 'SuperAdmin'
        WHEN 1 THEN 'Caissier'
        WHEN 2 THEN 'Secrétaire'
        WHEN 3 THEN 'Agent'
        WHEN 4 THEN 'Manager'
        ELSE 'Lòt'
    END as wol,
    COUNT(*) as total
FROM \"AspNetUsers\"
GROUP BY \"Role\"
ORDER BY \"Role\";
"

ENDSSH

echo ""
echo "✅ Done!"
