#!/bin/bash

SSH_KEY="$HOME/.ssh/nala_deployment_rsa"
SERVER_IP="142.93.78.111"

echo "🔍 Ap verifye password hash nan database..."
echo ""

ssh -i "$SSH_KEY" root@$SERVER_IP << 'ENDSSH'

docker exec nala-postgres psql -U nalauser -d nalakreditimachann_db -c "
SELECT 
    \"Email\",
    LENGTH(\"PasswordHash\") as hash_length,
    SUBSTRING(\"PasswordHash\", 1, 50) as hash_preview,
    \"IsActive\",
    \"EmailConfirmed\"
FROM \"AspNetUsers\"
WHERE \"Email\" = 'superadmin@nalacredit.com';
"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Ap verifye si itilizatè a nan wòl SuperAdmin:"
echo ""

docker exec nala-postgres psql -U nalauser -d nalakreditimachann_db -c "
SELECT 
    u.\"Email\",
    r.\"Name\" as wòl
FROM \"AspNetUsers\" u
LEFT JOIN \"AspNetUserRoles\" ur ON u.\"Id\" = ur.\"UserId\"
LEFT JOIN \"AspNetRoles\" r ON ur.\"RoleId\" = r.\"Id\"
WHERE u.\"Email\" = 'superadmin@nalacredit.com';
"

ENDSSH
