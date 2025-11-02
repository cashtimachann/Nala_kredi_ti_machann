-- Script pou update existing accounts ak AdminType based on Role and Department
-- This is needed because we just added the AdminType column

-- Update CHEF_DE_SUCCURSALE (Manager + Department "Opérations" or specific branch)
UPDATE "AspNetUsers"
SET "AdminType" = 3
WHERE "Role" = 2 
  AND ("Department" = 'Opérations' OR "BranchId" IS NOT NULL)
  AND "AdminType" IS NULL;

-- Update DIRECTEUR_REGIONAL (Manager + Department "Opérations Régionales" or multiple branches)  
UPDATE "AspNetUsers"
SET "AdminType" = 4
WHERE "Role" = 2 
  AND "Department" = 'Opérations Régionales'
  AND "AdminType" IS NULL;

-- Update remaining Managers as DIRECTEUR_REGIONAL (default for Manager role)
UPDATE "AspNetUsers"
SET "AdminType" = 4
WHERE "Role" = 2 
  AND "AdminType" IS NULL;

-- Update DIRECTION_GENERALE (SuperAdmin)
UPDATE "AspNetUsers"
SET "AdminType" = 6
WHERE "Role" = 5 
  AND "AdminType" IS NULL;

-- Update ADMINISTRATEUR_SYSTEME (Admin + Department "Technologie")
UPDATE "AspNetUsers"
SET "AdminType" = 5
WHERE "Role" = 3 
  AND ("Department" = 'Technologie' OR "Department" = 'Support Technique')
  AND "AdminType" IS NULL;

-- Update COMPTABLE_FINANCE (Admin + Department "Finance")
UPDATE "AspNetUsers"
SET "AdminType" = 7
WHERE "Role" = 3 
  AND ("Department" = 'Finance & Comptabilité' OR "Department" = 'Comptabilité')
  AND "AdminType" IS NULL;

-- Update remaining Admins as ADMINISTRATEUR_SYSTEME (default for Admin role)
UPDATE "AspNetUsers"
SET "AdminType" = 5
WHERE "Role" = 3 
  AND "AdminType" IS NULL;

-- Update CAISSIER (Cashier)
UPDATE "AspNetUsers"
SET "AdminType" = 0
WHERE "Role" = 0 
  AND "AdminType" IS NULL;

-- Update AGENT_DE_CREDIT (Employee + Credit related)
UPDATE "AspNetUsers"
SET "AdminType" = 2
WHERE "Role" = 1 
  AND ("Department" = 'Crédit & Recouvrement' OR "Department" LIKE '%Crédit%')
  AND "AdminType" IS NULL;

-- Update remaining Employees as AGENT_DE_CREDIT (default for Employee role)
UPDATE "AspNetUsers"
SET "AdminType" = 2
WHERE "Role" = 1 
  AND "AdminType" IS NULL;

-- Update SECRETAIRE_ADMINISTRATIF (SupportTechnique)
UPDATE "AspNetUsers"
SET "AdminType" = 1
WHERE "Role" = 4 
  AND "AdminType" IS NULL;

-- Verify updates
SELECT 
    "Role",
    "AdminType",
    "Department",
    COUNT(*) as Count
FROM "AspNetUsers"
GROUP BY "Role", "AdminType", "Department"
ORDER BY "Role", "AdminType";

-- Show all users with their types
SELECT 
    "Id",
    "UserName",
    "FirstName",
    "LastName",
    "Role",
    "AdminType",
    "Department",
    "BranchId"
FROM "AspNetUsers"
ORDER BY "Role", "AdminType";
