-- Migration: Renommer le rôle "Support" en "Secretary" pour plus de clarté
-- Date: 2026-01-04
-- Raison: Le rôle SupportTechnique était mal nommé pour les secrétaires administratifs

-- ==========================================
-- ÉTAPE 1: Vérifier l'état actuel
-- ==========================================
SELECT 'État actuel des rôles:' as info;
SELECT "Id", "Name", "NormalizedName" FROM "AspNetRoles" ORDER BY "Name";

SELECT '';
SELECT 'Utilisateurs avec le rôle Support/SupportTechnique:' as info;
SELECT u."Id", u."FirstName", u."LastName", u."Email", u."Role"
FROM "AspNetUsers" u
WHERE u."Role" = 4;  -- SupportTechnique = 4

-- ==========================================
-- ÉTAPE 2: Mettre à jour le rôle dans AspNetRoles
-- ==========================================

-- Option A: Si le rôle "Secretary" existe déjà, supprimer "Support"
DELETE FROM "AspNetUserRoles" 
WHERE "RoleId" IN (SELECT "Id" FROM "AspNetRoles" WHERE "Name" = 'Support');

DELETE FROM "AspNetRoles" 
WHERE "Name" = 'Support';

-- Option B: Ou renommer "Support" en "Secretary"
-- UPDATE "AspNetRoles" 
-- SET "Name" = 'Secretary', "NormalizedName" = 'SECRETARY'
-- WHERE "Name" = 'Support';

-- S'assurer que le rôle "Secretary" existe
INSERT INTO "AspNetRoles" ("Id", "Name", "NormalizedName", "ConcurrencyStamp")
SELECT 'secretary-role', 'Secretary', 'SECRETARY', gen_random_uuid()::text
WHERE NOT EXISTS (
    SELECT 1 FROM "AspNetRoles" WHERE "Name" = 'Secretary'
);

-- ==========================================
-- ÉTAPE 3: Mettre à jour les utilisateurs
-- ==========================================

-- Mettre à jour tous les utilisateurs qui avaient Role = 4 (SupportTechnique)
-- pour s'assurer qu'ils sont dans le bon rôle ASP.NET Identity
UPDATE "AspNetUsers"
SET "Role" = 4  -- Reste 4, mais maintenant ça correspond à Secretary dans l'enum
WHERE "Role" = 4;

-- Ajouter tous les utilisateurs avec Role=4 au rôle "Secretary" dans AspNetUserRoles
INSERT INTO "AspNetUserRoles" ("UserId", "RoleId")
SELECT u."Id", r."Id"
FROM "AspNetUsers" u
CROSS JOIN "AspNetRoles" r
WHERE u."Role" = 4
  AND r."Name" = 'Secretary'
  AND NOT EXISTS (
    SELECT 1 FROM "AspNetUserRoles" ur 
    WHERE ur."UserId" = u."Id" AND ur."RoleId" = r."Id"
  );

-- ==========================================
-- ÉTAPE 4: Vérifier le résultat
-- ==========================================
SELECT '';
SELECT 'Rôles après migration:' as info;
SELECT "Id", "Name", "NormalizedName" FROM "AspNetRoles" ORDER BY "Name";

SELECT '';
SELECT 'Utilisateurs Secretary après migration:' as info;
SELECT u."Id", u."FirstName", u."LastName", u."Email", u."Role", r."Name" as RoleName
FROM "AspNetUsers" u
LEFT JOIN "AspNetUserRoles" ur ON u."Id" = ur."UserId"
LEFT JOIN "AspNetRoles" r ON ur."RoleId" = r."Id"
WHERE u."Role" = 4
ORDER BY u."LastName", u."FirstName";

SELECT '';
SELECT '✅ Migration terminée! Le rôle Support a été remplacé par Secretary.' as info;
