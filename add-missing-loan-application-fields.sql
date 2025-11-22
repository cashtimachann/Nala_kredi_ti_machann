-- Add missing fields to microcredit_loan_applications table
-- This script adds the fields that are collected by LoanApplicationForm but missing from the database

-- Add dependents field
ALTER TABLE public.microcredit_loan_applications
ADD COLUMN "Dependents" integer DEFAULT 0;

-- Add interest rate fields
ALTER TABLE public.microcredit_loan_applications
ADD COLUMN "InterestRate" numeric(5,4) DEFAULT 0;

ALTER TABLE public.microcredit_loan_applications
ADD COLUMN "MonthlyInterestRate" numeric(5,4) DEFAULT 0;

-- Add collateral fields
ALTER TABLE public.microcredit_loan_applications
ADD COLUMN "CollateralType" character varying(200);

ALTER TABLE public.microcredit_loan_applications
ADD COLUMN "CollateralDescription" text;

-- Add guarantor fields
ALTER TABLE public.microcredit_loan_applications
ADD COLUMN "Guarantor1Name" character varying(100);

ALTER TABLE public.microcredit_loan_applications
ADD COLUMN "Guarantor1Phone" character varying(20);

ALTER TABLE public.microcredit_loan_applications
ADD COLUMN "Guarantor1Relation" character varying(50);

ALTER TABLE public.microcredit_loan_applications
ADD COLUMN "Guarantor2Name" character varying(100);

ALTER TABLE public.microcredit_loan_applications
ADD COLUMN "Guarantor2Phone" character varying(20);

ALTER TABLE public.microcredit_loan_applications
ADD COLUMN "Guarantor2Relation" character varying(50);

-- Add reference fields
ALTER TABLE public.microcredit_loan_applications
ADD COLUMN "Reference1Name" character varying(100);

ALTER TABLE public.microcredit_loan_applications
ADD COLUMN "Reference1Phone" character varying(20);

ALTER TABLE public.microcredit_loan_applications
ADD COLUMN "Reference2Name" character varying(100);

ALTER TABLE public.microcredit_loan_applications
ADD COLUMN "Reference2Phone" character varying(20);

-- Add document verification fields
ALTER TABLE public.microcredit_loan_applications
ADD COLUMN "HasNationalId" boolean DEFAULT false;

ALTER TABLE public.microcredit_loan_applications
ADD COLUMN "HasProofOfResidence" boolean DEFAULT false;

ALTER TABLE public.microcredit_loan_applications
ADD COLUMN "HasProofOfIncome" boolean DEFAULT false;

ALTER TABLE public.microcredit_loan_applications
ADD COLUMN "HasCollateralDocs" boolean DEFAULT false;

-- Add notes field (if not already exists)
ALTER TABLE public.microcredit_loan_applications
ADD COLUMN "Notes" text;

-- Snapshot applicant fields
ALTER TABLE public.microcredit_loan_applications
ADD COLUMN "CustomerName" character varying(200);

ALTER TABLE public.microcredit_loan_applications
ADD COLUMN "CustomerPhone" character varying(20);

ALTER TABLE public.microcredit_loan_applications
ADD COLUMN "CustomerEmail" character varying(200);

ALTER TABLE public.microcredit_loan_applications
ADD COLUMN "CustomerAddressJson" text;

ALTER TABLE public.microcredit_loan_applications
ADD COLUMN "Occupation" character varying(100);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS "IX_microcredit_loan_applications_InterestRate" ON public.microcredit_loan_applications USING btree ("InterestRate");
CREATE INDEX IF NOT EXISTS "IX_microcredit_loan_applications_MonthlyInterestRate" ON public.microcredit_loan_applications USING btree ("MonthlyInterestRate");
CREATE INDEX IF NOT EXISTS "IX_microcredit_loan_applications_CollateralType" ON public.microcredit_loan_applications USING btree ("CollateralType");
CREATE INDEX IF NOT EXISTS "IX_microcredit_loan_applications_HasNationalId" ON public.microcredit_loan_applications USING btree ("HasNationalId");
CREATE INDEX IF NOT EXISTS "IX_microcredit_loan_applications_HasProofOfResidence" ON public.microcredit_loan_applications USING btree ("HasProofOfResidence");
CREATE INDEX IF NOT EXISTS "IX_microcredit_loan_applications_HasProofOfIncome" ON public.microcredit_loan_applications USING btree ("HasProofOfIncome");
CREATE INDEX IF NOT EXISTS "IX_microcredit_loan_applications_HasCollateralDocs" ON public.microcredit_loan_applications USING btree ("HasCollateralDocs");

-- Update owner
ALTER TABLE public.microcredit_loan_applications OWNER TO nalauser;