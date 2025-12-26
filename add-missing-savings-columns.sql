-- Add missing columns to SavingsAccounts
-- Migrations: AddSavingsAccountSuspensionMetadata and others

DO $$ 
BEGIN
    -- Add SuspendedAt
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'SavingsAccounts' AND column_name = 'SuspendedAt'
    ) THEN
     ndedAt column';
    END IF;

    -- Add SuspendedBy
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'SavingsAccounts' AND column_name = 'SuspendedBy'
    ) THEN
        ALTER TABLE "SavingsAccounts" ADD COLUMN "SuspendedBy" text;
        RAISE NOTICE 'Added SuspendedBy column';
    END IF;

    -- Add SuspensionReason
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'SavingsAccounts' AND column_name = 'SuspensionReason'
    ) THEN
        ALTER TABLE "SavingsAccounts" ADD COLUMN "SuspensionReason" text;
        RAISE NOTICE 'Added SuspensionReason column';
    END IF;
END $$;

-- Create SavingsAccountAuthorizedSigners table if it doesn't exist
CREATE TABLE IF NOT EXISTS "SavingsAccountAuthorizedSigners" (
    "Id" VARCHAR(36) PRIMARY KEY,
    "AccountId" VARCHAR(36) NOT NULL,
    "FullName" VARCHAR(100) NOT NULL,
    "Role" VARCHAR(50),
    "DocumentType" INTEGER,
    "DocumentNumber" VARCHAR(50),
    "Phone" VARCHAR(20),
    "RelationshipToCustomer" VARCHAR(100),
    "Address" VARCHAR(300),
    "Signature" TEXT,
    "PhotoUrl" VARCHAR(500),
    "AuthorizationLimit" NUMERIC(18,2),
    "IsActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "CreatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FK_SavingsAccountAuthorizedSigners_SavingsAccounts"
        FOREIGN KEY ("AccountId") REFERENCES "SavingsAccounts"("Id") ON DELETE CASCADE
);

-- Verify
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name IN ('SavingsAccounts', 'SavingsAccountAuthorizedSigners')
    AND column_name IN ('SuspendedAt', 'SuspendedBy', 'SuspensionReason', 'RowVersion')
ORDER BY table_name, column_name;
