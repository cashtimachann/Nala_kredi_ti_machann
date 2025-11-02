-- Script pour vérifier et créer un compte Chef de Succursale
-- Date: 2025-10-18

-- 1. Vérifier si un compte Manager existe déjà
SELECT 
    "Id",
    "FirstName",
    "LastName",
    "Email",
    "Role",
    "IsActive",
    "BranchId"
FROM "Users"
WHERE "Role" = 2; -- Manager = Chef de Succursale

-- 2. Si aucun Manager n'existe, créer un compte test
-- Note: Le mot de passe sera haché, mais pour test on utilisera 'Manager123!'

-- Vérifier les branches disponibles
SELECT "Id", "Name", "Code" FROM "Branches";

-- 3. Créer un Manager si besoin (à exécuter seulement si aucun Manager existe)
-- INSERT INTO "Users" (
--     "Id",
--     "FirstName",
--     "LastName",
--     "Email",
--     "PasswordHash",
--     "Role",
--     "IsActive",
--     "BranchId",
--     "HireDate",
--     "CreatedAt"
-- ) VALUES (
--     gen_random_uuid(),
--     'Jean',
--     'Manager',
--     'manager@nalacredit.ht',
--     '$2a$11$hashed_password_here', -- Sera remplacé par le hash réel
--     2, -- Manager
--     true,
--     (SELECT "Id" FROM "Branches" LIMIT 1), -- Première branche
--     CURRENT_TIMESTAMP,
--     CURRENT_TIMESTAMP
-- );

-- 4. Vérifier le compte créé
SELECT 
    "Id",
    "FirstName",
    "LastName",
    "Email",
    "Role",
    "IsActive",
    "BranchId",
    "HireDate"
FROM "Users"
WHERE "Role" = 2
ORDER BY "CreatedAt" DESC;
