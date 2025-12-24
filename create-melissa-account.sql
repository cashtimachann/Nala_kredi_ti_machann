-- Créer un nouveau compte caissier melissa.jean@gmail.com
-- Password: Jesus123!!

-- D'abord, vérifier si l'utilisateur existe déjà
SELECT "Id", "Email", "FirstName", "LastName", "Role", "IsActive" 
FROM "AspNetUsers" 
WHERE "Email" = 'melissa.jean@gmail.com';

-- Si pas trouvé, créer le compte
INSERT INTO "AspNetUsers" 
(
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
    "CreatedAt", 
    "BranchId",
    "PhoneNumber"
)
VALUES 
(
    gen_random_uuid()::text,
    'melissa.jean@gmail.com',
    'MELISSA.JEAN@GMAIL.COM',
    'melissa.jean@gmail.com',
    'MELISSA.JEAN@GMAIL.COM',
    true,
    'AQAAAAIAAYagAAAAEDxvT9vQxL8Z9fJ2wHYE7iFKPQxVH8gN1Y/0uqLX5mJZH8zYxFzKvE7Lp2rJ3N6xWQ==', -- Jesus123!!
    gen_random_uuid()::text,
    gen_random_uuid()::text,
    false,
    false,
    true,
    0,
    'Melissa',
    'Jean',
    0, -- Cashier role
    true,
    NOW(),
    1, -- Branch 1
    '+509 1234-5678'
)
ON CONFLICT ("Email") DO UPDATE
SET 
    "PasswordHash" = 'AQAAAAIAAYagAAAAEDxvT9vQxL8Z9fJ2wHYE7iFKPQxVH8gN1Y/0uqLX5mJZH8zYxFzKvE7Lp2rJ3N6xWQ==',
    "IsActive" = true,
    "Role" = 0;

-- Vérifier la création
SELECT "Email", "FirstName", "LastName", "Role", "IsActive", "BranchId"
FROM "AspNetUsers" 
WHERE "Email" = 'melissa.jean@gmail.com';
