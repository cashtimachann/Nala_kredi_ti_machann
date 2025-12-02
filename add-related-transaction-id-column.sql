-- Migration to add RelatedTransactionId column to transaction tables
-- Date: 2025-12-02
-- Database: PostgreSQL
-- Purpose: Add support for linking related transactions (e.g., transfers, reversals)

-- Add RelatedTransactionId to CurrentAccountTransactions
ALTER TABLE "CurrentAccountTransactions" 
ADD COLUMN IF NOT EXISTS "RelatedTransactionId" TEXT;

-- Add RelatedTransactionId to SavingsTransactions
ALTER TABLE "SavingsTransactions" 
ADD COLUMN IF NOT EXISTS "RelatedTransactionId" TEXT;

-- Add RelatedTransactionId to TermSavingsTransactions
ALTER TABLE "TermSavingsTransactions" 
ADD COLUMN IF NOT EXISTS "RelatedTransactionId" TEXT;

-- Add RelatedTransactionId to ExchangeTransactions
ALTER TABLE "ExchangeTransactions" 
ADD COLUMN IF NOT EXISTS "RelatedTransactionId" TEXT;

-- Create indexes for better query performance on related transactions
CREATE INDEX IF NOT EXISTS "IX_CurrentAccountTransactions_RelatedTransactionId" 
    ON "CurrentAccountTransactions"("RelatedTransactionId") 
    WHERE "RelatedTransactionId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "IX_SavingsTransactions_RelatedTransactionId" 
    ON "SavingsTransactions"("RelatedTransactionId") 
    WHERE "RelatedTransactionId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "IX_TermSavingsTransactions_RelatedTransactionId" 
    ON "TermSavingsTransactions"("RelatedTransactionId") 
    WHERE "RelatedTransactionId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "IX_ExchangeTransactions_RelatedTransactionId" 
    ON "ExchangeTransactions"("RelatedTransactionId") 
    WHERE "RelatedTransactionId" IS NOT NULL;

-- Confirmation message
SELECT 'RelatedTransactionId column added to all transaction tables with indexes!' AS "Message";
