-- Créer un compte SuperAdmin
INSERT INTO "AspNetUsers" (
    "Id",
    "Email",
    "NormalizedEmail",
    "UserName",
    "NormalizedUserName",
    "FirstName",
    "LastName",
    "PhoneNumber",
    "Department",
    "Role",
    "PasswordHash",
    "IsActive",
    "EmailConfirmed",
    "PhoneNumberConfirmed",
    "TwoFactorEnabled",
    "LockoutEnabled",
    "AccessFailedCount",
    "CreatedAt",
    "ConcurrencyStamp",
    "SecurityStamp"
) VALUES (
    gen_random_uuid()::text,
    'superadmin@nalacredit.com',
    'SUPERADMIN@NALACREDIT.COM',
    'superadmin@nalacredit.com',
    'SUPERADMIN@NALACREDIT.COM',
    'Super',
    'Administrator',
    '50912345678',
    'Administration',
    5,
    'AQAAAAIAAYagAAAAEMxKp7RlZ0zJ5qGZVxQN0w3h6L7fXxJK3vN2yT4pP6kR8mH1sD9wQ5eA3cU7iV2gL==',
    true,
    true,
    true,
    false,
    false,
    0,
    NOW(),
    gen_random_uuid()::text,
    gen_random_uuid()::text
);

-- Vérifier l'insertion
SELECT "Email", "FirstName", "LastName", "Role", "IsActive" 
FROM "AspNetUsers" 
WHERE "Email" = 'superadmin@nalacredit.com';
