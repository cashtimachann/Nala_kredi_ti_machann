-- Script pour vérifier les superadmin dans la base de données
-- Chercher tous les utilisateurs avec Role = 0 (SuperAdmin)

\echo '🔍 RECHERCHE DES SUPERADMIN DANS LA BASE DE DONNÉES'
\echo '=================================================='

SELECT 
    'SUPERADMIN TROUVÉ:' as info,
    "Email" as "📧 Email",
    "FirstName" as "👤 Prénom", 
    "LastName" as "👤 Nom",
    CASE "Role"
        WHEN 0 THEN 'SuperAdmin'
        WHEN 1 THEN 'BranchSupervisor'
        WHEN 2 THEN 'Cashier'
        WHEN 3 THEN 'CreditAgent'
        WHEN 4 THEN 'RegionalManager'
        WHEN 5 THEN 'SystemAdmin'
        WHEN 6 THEN 'Accounting'
        WHEN 7 THEN 'Management'
        ELSE 'Inconnu'
    END as "🔑 Rôle",
    CASE "IsActive"
        WHEN true THEN 'OUI'
        WHEN false THEN 'NON'
    END as "✅ Actif",
    CASE "EmailConfirmed"
        WHEN true THEN 'OUI'
        WHEN false THEN 'NON'
    END as "📧 Email confirmé",
    "CreatedAt" as "📅 Date de création"
FROM "AspNetUsers" 
WHERE "Role" = 0
ORDER BY "CreatedAt";

-- Compter le total des superadmin
\echo ''
\echo '📊 STATISTIQUES:'

SELECT 
    COUNT(*) as "Nombre total de SuperAdmin"
FROM "AspNetUsers" 
WHERE "Role" = 0;

-- Afficher tous les utilisateurs par rôle pour contexte
\echo ''
\echo '📋 TOUS LES UTILISATEURS PAR RÔLE:'

SELECT 
    CASE "Role"
        WHEN 0 THEN 'SuperAdmin'
        WHEN 1 THEN 'BranchSupervisor'
        WHEN 2 THEN 'Cashier'
        WHEN 3 THEN 'CreditAgent'
        WHEN 4 THEN 'RegionalManager'
        WHEN 5 THEN 'SystemAdmin'
        WHEN 6 THEN 'Accounting'
        WHEN 7 THEN 'Management'
        ELSE 'Inconnu'
    END as "Rôle",
    COUNT(*) as "Nombre"
FROM "AspNetUsers"
GROUP BY "Role"
ORDER BY "Role";