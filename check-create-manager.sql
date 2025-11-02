-- Script pou tcheke ak kreye kont Chef de Succursale (Manager)

-- 1. Tcheke si gen Manager deja
SELECT 
    u."Id",
    u."Username",
    u."Email",
    u."FirstName",
    u."LastName",
    u."Role",
    u."IsActive",
    b."Name" as "BranchName"
FROM "Users" u
LEFT JOIN "Branches" b ON u."BranchId" = b."Id"
WHERE u."Role" = 2  -- Manager = 2
ORDER BY u."CreatedAt" DESC;

-- 2. Si pa gen, kreye youn
-- Premye, tcheke si branch Port-au-Prince egziste
SELECT "Id", "Name" FROM "Branches" WHERE "Name" LIKE '%Port-au-Prince%';

-- Kreye kont Manager si pa gen
INSERT INTO "Users" (
    "Id",
    "Username",
    "Email",
    "PasswordHash",
    "FirstName",
    "LastName",
    "Role",
    "IsActive",
    "BranchId",
    "CreatedAt",
    "UpdatedAt"
)
SELECT 
    gen_random_uuid(),
    'chef.pap',
    'chef.pap@nalacredit.ht',
    '$2a$11$XYZ123...', -- Temporaire, bizwen chanje
    'Jean',
    'Michel',
    2, -- Manager
    true,
    (SELECT "Id" FROM "Branches" WHERE "Name" LIKE '%Port-au-Prince%' LIMIT 1),
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM "Users" WHERE "Username" = 'chef.pap'
);

-- 3. Verifye apre kreye
SELECT 
    u."Id",
    u."Username",
    u."Email",
    u."FirstName" || ' ' || u."LastName" as "FullName",
    u."Role",
    u."IsActive",
    b."Name" as "BranchName"
FROM "Users" u
LEFT JOIN "Branches" b ON u."BranchId" = b."Id"
WHERE u."Role" = 2
ORDER BY u."CreatedAt" DESC;

-- 4. Montre tout roles disponib
SELECT DISTINCT 
    "Role",
    CASE "Role"
        WHEN 0 THEN 'Cashier'
        WHEN 1 THEN 'Employee'
        WHEN 2 THEN 'Manager (Chef de Succursale)'
        WHEN 3 THEN 'Admin'
        WHEN 4 THEN 'SupportTechnique'
        WHEN 5 THEN 'SuperAdmin'
        ELSE 'Unknown'
    END as "RoleName",
    COUNT(*) as "Count"
FROM "Users"
GROUP BY "Role"
ORDER BY "Role";
