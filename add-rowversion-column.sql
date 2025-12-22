-- Add RowVersion column to SavingsAccounts table
-- Migration: 20251112123310_AddRowVersionToSavingsAccount

-- Check if column exists first
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'SavingsAccounts' AND column_name = 'RowVersion'
    ) THEN
        ALTER TABLE "SavingsAccounts" 
        ADD COLUMN "RowVersion" bytea;
        
        RAISE NOTICE 'RowVersion column added to SavingsAccounts';
    ELSE
        RAISE NOTICE 'RowVersion column already exists in SavingsAccounts';
    END IF;
END $$;

-- Also check and add for SavingsTransactions if needed
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'SavingsTransactions' AND column_name = 'RowVersion'
    ) THEN
        ALTER TABLE "SavingsTransactions" 
        ADD COLUMN "RowVersion" bytea;
        
        RAISE NOTICE 'RowVersion column added to SavingsTransactions';
    ELSE
        RAISE NOTICE 'RowVersion column already exists in SavingsTransactions';
    END IF;
END $$;

-- Verify the columns were added
SELECT 
    'SavingsAccounts' as table_name,
    EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'SavingsAccounts' AND column_name = 'RowVersion'
    ) as has_rowversion
UNION ALL
SELECT 
    'SavingsTransactions' as table_name,
    EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'SavingsTransactions' AND column_name = 'RowVersion'
    ) as has_rowversion;
