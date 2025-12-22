#!/bin/bash

SSH_KEY="$HOME/.ssh/nala_deployment_rsa"
SERVER_IP="142.93.78.111"

echo "🔧 Ap kreye kont SuperAdmin..."
echo ""

ssh -i "$SSH_KEY" root@$SERVER_IP << 'ENDSSH'

cd /var/www/nala-credit

echo "📝 Kreye kont SuperAdmin..."
echo ""

docker exec nala-postgres psql -U nalauser -d nalakreditimachann_db << 'EOSQL'

-- Premye, asire wòl yo egziste
INSERT INTO "AspNetRoles" ("Id", "Name", "NormalizedName", "ConcurrencyStamp")
VALUES 
    ('superadmin-role-id', 'SuperAdmin', 'SUPERADMIN', gen_random_uuid()::text),
    ('admin-role-id', 'Admin', 'ADMIN', gen_random_uuid()::text),
    ('branchmanager-role-id', 'BranchManager', 'BRANCHMANAGER', gen_random_uuid()::text),
    ('cashier-role-id', 'Cashier', 'CASHIER', gen_random_uuid()::text),
    ('secretary-role-id', 'Secretary', 'SECRETARY', gen_random_uuid()::text)
ON CONFLICT ("Id") DO NOTHING;

-- Kreye SuperAdmin user
-- Password: Admin@2024!
-- Hash sa a jenere avèk ASP.NET Core Identity PasswordHasher v3
INSERT INTO "AspNetUsers" (
    "Id",
    "UserName",
    "NormalizedUserName",
    "Email",
    "NormalizedEmail",
    "EmailConfirmed",
    "PasswordHash",
    "SecurityStamp",
    "ConcurrencyStamp",
    "PhoneNumberConfirmed",
    "TwoFactorEnabled",
    "LockoutEnabled",
    "AccessFailedCount",
    "FirstName",
    "LastName",
    "Role",
    "IsActive",
    "CreatedAt"
)
VALUES (
    gen_random_uuid()::text,
    'superadmin@nalacredit.com',
    'SUPERADMIN@NALACREDIT.COM',
    'superadmin@nalacredit.com',
    'SUPERADMIN@NALACREDIT.COM',
    true,
    'AQAAAAIAAYagAAAAEHwE2DgxgLFcM+WJZNz0zf0K1xMYoF7+QR0nL8HK5nQKPzP3xKVkL7mJ8pGPxqPxJw==',
    gen_random_uuid()::text,
    gen_random_uuid()::text,
    false,
    false,
    true,
    0,
    'Super',
    'Admin',
    0,
    true,
    NOW()
)
ON CONFLICT ("Email") DO UPDATE
SET 
    "PasswordHash" = EXCLUDED."PasswordHash",
    "IsActive" = true,
    "Role" = 0,
    "UpdatedAt" = NOW();

-- Lyen itilizatè a ak wòl SuperAdmin
INSERT INTO "AspNetUserRoles" ("UserId", "RoleId")
SELECT u."Id", 'superadmin-role-id'
FROM "AspNetUsers" u
WHERE u."Email" = 'superadmin@nalacredit.com'
ON CONFLICT DO NOTHING;

EOSQL

echo ""
echo "✅ SuperAdmin kreye!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 KREYANSYÈL LOGIN:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "   🌐 URL: https://admin.nalakreditimachann.com/login"
echo "   📧 Email: superadmin@nalacredit.com"
echo "   🔑 Password: Admin@2024!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "🔍 Verifikasyon:"
docker exec nala-postgres psql -U nalauser -d nalakreditimachann_db -c "
SELECT 
    \"Email\",
    \"FirstName\" || ' ' || \"LastName\" as \"Non\",
    CASE \"Role\" WHEN 0 THEN 'SuperAdmin' ELSE 'Lòt' END as \"Wòl\",
    \"IsActive\" as \"Aktif\"
FROM \"AspNetUsers\"
WHERE \"Email\" = 'superadmin@nalacredit.com';
"

ENDSSH

echo ""
echo "✅ Fini!"
