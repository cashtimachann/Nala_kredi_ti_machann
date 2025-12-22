#!/bin/bash

# Check superadmin in production database
echo "🔍 Verification itilizatè nan database pwodiksyon..."

SSH_KEY="$HOME/.ssh/nala_deployment_rsa"
SERVER_IP="142.93.78.111"

echo ""
echo "📊 Itilizatè SuperAdmin ki nan database:"
echo ""

ssh -i "$SSH_KEY" root@$SERVER_IP << 'ENDSSH'
cd /var/www/nala-credit

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "ITILIZATÈ AKTIF NAN DATABASE:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

docker exec nala-postgres psql -U postgres -d nalakreditimachann_db -c "
SELECT 
    \"Email\" as email,
    \"FirstName\" || ' ' || \"LastName\" as non,
    CASE \"Role\"
        WHEN 0 THEN 'SuperAdmin'
        WHEN 1 THEN 'Caissier'
        WHEN 2 THEN 'Secrétaire'
        ELSE 'Lòt'
    END as wol,
    \"IsActive\" as aktif,
    CASE 
        WHEN \"PasswordHash\" IS NOT NULL THEN 'Wi'
        ELSE 'Non'
    END as gen_password
FROM \"AspNetUsers\"
WHERE \"Role\" = 0 OR \"Email\" LIKE '%admin%'
ORDER BY \"Role\", \"Email\";
"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "LIS TOUT EMAIL NAN SISTÈM LAN:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

docker exec nala-postgres psql -U postgres -d nalakreditimachann_db -c "
SELECT \"Email\" FROM \"AspNetUsers\" ORDER BY \"Email\";
"

ENDSSH

echo ""
echo "✅ Done!"
