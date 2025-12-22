-- Add missing columns to microcredit_loan_applications table
-- Based on migrations: AddMissingLoanApplicationFields, AddLoanApplicationSnapshotFields, AddApprovedAmountToApplication

-- Check if columns exist first, then add them
DO $$ 
BEGIN
    -- Add Dependents column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'microcredit_loan_applications' 
                   AND column_name = 'Dependents') THEN
        ALTER TABLE microcredit_loan_applications 
        ADD COLUMN "Dependents" integer NOT NULL DEFAULT 0;
    END IF;

    -- Add InterestRate column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'microcredit_loan_applications' 
                   AND column_name = 'InterestRate') THEN
        ALTER TABLE microcredit_loan_applications 
        ADD COLUMN "InterestRate" numeric(5,4) NOT NULL DEFAULT 0;
    END IF;

    -- Add MonthlyInterestRate column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'microcredit_loan_applications' 
                   AND column_name = 'MonthlyInterestRate') THEN
        ALTER TABLE microcredit_loan_applications 
        ADD COLUMN "MonthlyInterestRate" numeric(5,4) NOT NULL DEFAULT 0;
    END IF;

    -- Add CollateralType column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'microcredit_loan_applications' 
                   AND column_name = 'CollateralType') THEN
        ALTER TABLE microcredit_loan_applications 
        ADD COLUMN "CollateralType" varchar(200);
    END IF;

    -- Add CollateralDescription column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'microcredit_loan_applications' 
                   AND column_name = 'CollateralDescription') THEN
        ALTER TABLE microcredit_loan_applications 
        ADD COLUMN "CollateralDescription" text;
    END IF;

    -- Add Guarantor1Name column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'microcredit_loan_applications' 
                   AND column_name = 'Guarantor1Name') THEN
        ALTER TABLE microcredit_loan_applications 
        ADD COLUMN "Guarantor1Name" varchar(100);
    END IF;

    -- Add Guarantor1Phone column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'microcredit_loan_applications' 
                   AND column_name = 'Guarantor1Phone') THEN
        ALTER TABLE microcredit_loan_applications 
        ADD COLUMN "Guarantor1Phone" varchar(20);
    END IF;

    -- Add Guarantor1Relation column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'microcredit_loan_applications' 
                   AND column_name = 'Guarantor1Relation') THEN
        ALTER TABLE microcredit_loan_applications 
        ADD COLUMN "Guarantor1Relation" varchar(50);
    END IF;

    -- Add Guarantor2Name column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'microcredit_loan_applications' 
                   AND column_name = 'Guarantor2Name') THEN
        ALTER TABLE microcredit_loan_applications 
        ADD COLUMN "Guarantor2Name" varchar(100);
    END IF;

    -- Add Guarantor2Phone column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'microcredit_loan_applications' 
                   AND column_name = 'Guarantor2Phone') THEN
        ALTER TABLE microcredit_loan_applications 
        ADD COLUMN "Guarantor2Phone" varchar(20);
    END IF;

    -- Add Guarantor2Relation column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'microcredit_loan_applications' 
                   AND column_name = 'Guarantor2Relation') THEN
        ALTER TABLE microcredit_loan_applications 
        ADD COLUMN "Guarantor2Relation" varchar(50);
    END IF;

    -- Add Reference1Name column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'microcredit_loan_applications' 
                   AND column_name = 'Reference1Name') THEN
        ALTER TABLE microcredit_loan_applications 
        ADD COLUMN "Reference1Name" varchar(100);
    END IF;

    -- Add Reference1Phone column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'microcredit_loan_applications' 
                   AND column_name = 'Reference1Phone') THEN
        ALTER TABLE microcredit_loan_applications 
        ADD COLUMN "Reference1Phone" varchar(20);
    END IF;

    -- Add Reference2Name column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'microcredit_loan_applications' 
                   AND column_name = 'Reference2Name') THEN
        ALTER TABLE microcredit_loan_applications 
        ADD COLUMN "Reference2Name" varchar(100);
    END IF;

    -- Add Reference2Phone column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'microcredit_loan_applications' 
                   AND column_name = 'Reference2Phone') THEN
        ALTER TABLE microcredit_loan_applications 
        ADD COLUMN "Reference2Phone" varchar(20);
    END IF;

    -- Add HasNationalId column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'microcredit_loan_applications' 
                   AND column_name = 'HasNationalId') THEN
        ALTER TABLE microcredit_loan_applications 
        ADD COLUMN "HasNationalId" boolean NOT NULL DEFAULT false;
    END IF;

    -- Add HasProofOfResidence column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'microcredit_loan_applications' 
                   AND column_name = 'HasProofOfResidence') THEN
        ALTER TABLE microcredit_loan_applications 
        ADD COLUMN "HasProofOfResidence" boolean NOT NULL DEFAULT false;
    END IF;

    -- Add HasProofOfIncome column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'microcredit_loan_applications' 
                   AND column_name = 'HasProofOfIncome') THEN
        ALTER TABLE microcredit_loan_applications 
        ADD COLUMN "HasProofOfIncome" boolean NOT NULL DEFAULT false;
    END IF;

    -- Add HasCollateralDocs column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'microcredit_loan_applications' 
                   AND column_name = 'HasCollateralDocs') THEN
        ALTER TABLE microcredit_loan_applications 
        ADD COLUMN "HasCollateralDocs" boolean NOT NULL DEFAULT false;
    END IF;

    -- Add Notes column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'microcredit_loan_applications' 
                   AND column_name = 'Notes') THEN
        ALTER TABLE microcredit_loan_applications 
        ADD COLUMN "Notes" text;
    END IF;

    -- Add CustomerAddressJson column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'microcredit_loan_applications' 
                   AND column_name = 'CustomerAddressJson') THEN
        ALTER TABLE microcredit_loan_applications 
        ADD COLUMN "CustomerAddressJson" text;
    END IF;

    -- Add CustomerEmail column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'microcredit_loan_applications' 
                   AND column_name = 'CustomerEmail') THEN
        ALTER TABLE microcredit_loan_applications 
        ADD COLUMN "CustomerEmail" varchar(200);
    END IF;

    -- Add CustomerName column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'microcredit_loan_applications' 
                   AND column_name = 'CustomerName') THEN
        ALTER TABLE microcredit_loan_applications 
        ADD COLUMN "CustomerName" varchar(200);
    END IF;

    -- Add CustomerPhone column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'microcredit_loan_applications' 
                   AND column_name = 'CustomerPhone') THEN
        ALTER TABLE microcredit_loan_applications 
        ADD COLUMN "CustomerPhone" varchar(20);
    END IF;

    -- Add Occupation column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'microcredit_loan_applications' 
                   AND column_name = 'Occupation') THEN
        ALTER TABLE microcredit_loan_applications 
        ADD COLUMN "Occupation" varchar(100);
    END IF;

    -- Add ApprovedAmount column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'microcredit_loan_applications' 
                   AND column_name = 'ApprovedAmount') THEN
        ALTER TABLE microcredit_loan_applications 
        ADD COLUMN "ApprovedAmount" numeric(18,2);
    END IF;

    -- Add SavingsAccountNumber column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'microcredit_loan_applications' 
                   AND column_name = 'SavingsAccountNumber') THEN
        ALTER TABLE microcredit_loan_applications 
        ADD COLUMN "SavingsAccountNumber" varchar(12) NOT NULL DEFAULT '';
    END IF;

    -- Add DisbursementDate column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'microcredit_loan_applications' 
                   AND column_name = 'DisbursementDate') THEN
        ALTER TABLE microcredit_loan_applications 
        ADD COLUMN "DisbursementDate" timestamp;
    END IF;

END $$;

SELECT 'Kolòn yo ajoute nan microcredit_loan_applications' as status;
