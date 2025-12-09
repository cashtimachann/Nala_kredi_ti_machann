-- Add suspension columns to SavingsAccounts table
ALTER TABLE "SavingsAccounts" 
ADD COLUMN IF NOT EXISTS "SuspendedAt" timestamp with time zone NULL,
ADD COLUMN IF NOT EXISTS "SuspendedBy" text NULL,
ADD COLUMN IF NOT EXISTS "SuspensionReason" text NULL;

-- Verify the columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'SavingsAccounts'
AND column_name IN ('SuspendedAt', 'SuspendedBy', 'SuspensionReason');
