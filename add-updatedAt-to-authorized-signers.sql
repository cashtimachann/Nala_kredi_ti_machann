-- Migration pour ajouter le champ UpdatedAt aux signataires autorisés
-- Date: 2025-11-28
-- Base de données: PostgreSQL

-- Ajouter UpdatedAt à CurrentAccountAuthorizedSigners si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'CurrentAccountAuthorizedSigners' 
        AND column_name = 'UpdatedAt'
    ) THEN
        ALTER TABLE "CurrentAccountAuthorizedSigners" 
        ADD COLUMN "UpdatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
        
        RAISE NOTICE 'Colonne UpdatedAt ajoutée à CurrentAccountAuthorizedSigners';
    ELSE
        RAISE NOTICE 'Colonne UpdatedAt existe déjà dans CurrentAccountAuthorizedSigners';
    END IF;
END $$;

-- Vérifier que SavingsAccountAuthorizedSigners existe et a UpdatedAt
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'SavingsAccountAuthorizedSigners'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'SavingsAccountAuthorizedSigners' 
            AND column_name = 'UpdatedAt'
        ) THEN
            -- Cette table devrait déjà avoir UpdatedAt si créée avec add-savings-authorized-signers-postgres.sql
            -- Mais on l'ajoute par sécurité
            ALTER TABLE "SavingsAccountAuthorizedSigners" 
            ADD COLUMN "UpdatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
            
            RAISE NOTICE 'Colonne UpdatedAt ajoutée à SavingsAccountAuthorizedSigners';
        ELSE
            RAISE NOTICE 'Colonne UpdatedAt existe déjà dans SavingsAccountAuthorizedSigners';
        END IF;
    ELSE
        RAISE NOTICE 'Table SavingsAccountAuthorizedSigners n existe pas encore. Exécutez d abord add-savings-authorized-signers-postgres.sql';
    END IF;
END $$;

-- Résumé des colonnes dans les deux tables
SELECT 
    'CurrentAccountAuthorizedSigners' as "Table",
    column_name as "Colonne",
    data_type as "Type",
    character_maximum_length as "Longueur"
FROM information_schema.columns 
WHERE table_name = 'CurrentAccountAuthorizedSigners'
ORDER BY ordinal_position;

SELECT 
    'SavingsAccountAuthorizedSigners' as "Table",
    column_name as "Colonne",
    data_type as "Type",
    character_maximum_length as "Longueur"
FROM information_schema.columns 
WHERE table_name = 'SavingsAccountAuthorizedSigners'
ORDER BY ordinal_position;
