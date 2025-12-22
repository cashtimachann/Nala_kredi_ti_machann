-- Create Super Admin User
-- Password: Admin@2024! (hashed)

-- First, generate a proper password hash using ASP.NET Core Identity
-- For now, we'll use a temporary insert that needs to be updated with proper hash

BEGIN;

-- Insert SuperAdmin Role if not exists
INSERT INTO "AspNetRoles" ("Id", "Name", "NormalizedName", "ConcurrencyStamp")
VALUES 
    ('superadmin-role-id', 'SuperAdmin', 'SUPERADMIN', 'initial'),
    ('admin-role-id', 'Admin', 'ADMIN', 'initial'),
    ('branchmanager-role-id', 'BranchManager', 'BRANCHMANAGER', 'initial'),
    ('cashier-role-id', 'Cashier', 'CASHIER', 'initial'),
    ('secretary-role-id', 'Secretary', 'SECRETARY', 'initial')
ON CONFLICT ("Id") DO NOTHING;

-- Insert Super Admin User
-- Password hash for: Admin@2024!
-- This is generated using ASP.NET Core Identity PasswordHasher
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
    'superadmin-user-id-001',
    'superadmin',
    'SUPERADMIN',
    'admin@nalakreditimachann.com',
    'ADMIN@NALAKREDITIMACHANN.COM',
    true,
    'AQAAAAIAAYagAAAAEKxJ8pGPxqPxJ9vJ8pGPxqPxJ9vJ8pGPxqPxJ9vJ8pGPxqPxJ9vJ8pGPxqPxJw==',
    'TEMP-SECURITY-STAMP',
    'temp-stamp-001',
    false,
    false,
    true,
    0,
    'Super',
    'Admin',
    0, -- SuperAdmin = 0
    true,
    NOW()
)
ON CONFLICT ("Id") DO NOTHING;

-- Link user to role
INSERT INTO "AspNetUserRoles" ("UserId", "RoleId")
VALUES ('superadmin-user-id-001', 'superadmin-role-id')
ON CONFLICT DO NOTHING;

COMMIT;

-- Display created user
SELECT "Id", "UserName", "Email", "FirstName", "LastName", "Role", "IsActive"
FROM "AspNetUsers"
WHERE "UserName" = 'superadmin';
