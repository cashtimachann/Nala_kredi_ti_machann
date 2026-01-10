-- Script pou verifye si tout Agent de Credit gen BranchId

-- 1. Tcheke Agent de Credit ki pa gen BranchId
SELECT 
    Id,
    Email,
    FirstName,
    LastName,
    Role,
    BranchId,
    CASE 
        WHEN BranchId IS NULL THEN '❌ PA GEN BRANCHID!'
        ELSE '✅ Gen BranchId: ' || CAST(BranchId AS TEXT)
    END AS Status
FROM "AspNetUsers"
WHERE Role = 5  -- Role.CreditAgent = 5
ORDER BY BranchId NULLS FIRST, Email;

-- 2. Konbyen Agent de Credit gen/pa gen BranchId
SELECT 
    CASE 
        WHEN BranchId IS NULL THEN '❌ Sans BranchId'
        ELSE '✅ Avec BranchId'
    END AS Categorie,
    COUNT(*) AS Nombre
FROM "AspNetUsers"
WHERE Role = 5
GROUP BY CASE WHEN BranchId IS NULL THEN '❌ Sans BranchId' ELSE '✅ Avec BranchId' END;

-- 3. List Agent ak Branch Name
SELECT 
    u.Id,
    u.Email,
    u.FirstName || ' ' || u.LastName AS NomComplet,
    u.BranchId,
    b.Name AS BranchName,
    b.Code AS BranchCode
FROM "AspNetUsers" u
LEFT JOIN "Branches" b ON u.BranchId = b.Id
WHERE u.Role = 5
ORDER BY b.Name NULLS FIRST, u.Email;

-- 4. SOLUTION: Asiyen Branch ba Agent ki pa gen
-- (Dekomente liy sa yo epi remplace <agent_id> ak <branch_id>)

-- UPDATE "AspNetUsers" 
-- SET BranchId = <branch_id>
-- WHERE Id = '<agent_id>';

-- Eksanp:
-- UPDATE "AspNetUsers" 
-- SET BranchId = 1
-- WHERE Email = 'agent@example.com';
