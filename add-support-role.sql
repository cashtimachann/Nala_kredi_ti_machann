-- Script pour ajouter le rôle "Support" manquant
-- Ce rôle est nécessaire pour les utilisateurs de type SECRETAIRE_ADMINISTRATIF

-- Vérifier si le rôle existe déjà
SELECT * FROM "AspNetRoles" WHERE "Name" = 'Support';

-- Créer le rôle s'il n'existe pas
INSERT INTO "AspNetRoles" ("Id", "Name", "NormalizedName", "ConcurrencyStamp")
SELECT 
    gen_random_uuid()::text,
    'Support',
    'SUPPORT',
    gen_random_uuid()::text
WHERE NOT EXISTS (
    SELECT 1 FROM "AspNetRoles" WHERE "Name" = 'Support'
);

-- Vérifier le résultat
SELECT * FROM "AspNetRoles" ORDER BY "Name";
