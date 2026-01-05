-- Create Melissa cashier account in PRODUCTION if it doesn't exist
-- Email: melissa.jean@gmail.com
-- Password: Jesus123!!

-- First check if account already exists
SELECT "Id", "Email", "FirstName", "LastName", "Role", "IsActive" 
FROM "AspNetUsers" 
WHERE "Email" = 'melissa.jean@gmail.com';

-- If not found, create the account
-- Note: You'll need to get the BranchId from your branches table
-- SELECT "Id", "BranchName" FROM "Branches";

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
SELECT 
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
    'Jules',
    0, -- Cashier role
    true,
    CURRENT_TIMESTAMP,
    (SELECT "Id" FROM "Branches" LIMIT 1), -- Use first branch, or specify specific branch
    '+509-0000-0000'
WHERE NOT EXISTS (
    SELECT 1 FROM "AspNetUsers" WHERE "Email" = 'melissa.jean@gmail.com'
);

-- Verify the account was created
SELECT "Id", "Email", "FirstName", "LastName", "Role", "IsActive", "BranchId" 
FROM "AspNetUsers" 
WHERE "Email" = 'melissa.jean@gmail.com';
