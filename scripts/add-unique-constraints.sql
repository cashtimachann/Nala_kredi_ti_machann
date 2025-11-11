-- =============================================
-- ADD UNIQUE CONSTRAINTS FOR ACCOUNT TABLES
-- =============================================
-- This script adds UNIQUE constraints to enforce:
-- One account per customer per currency per account type
-- =============================================

-- =============================================
-- IMPORTANT: Run identify-duplicate-accounts.sql first!
-- =============================================
-- If duplicates exist, you MUST clean them up before applying constraints
-- Use the cleanup-duplicate-accounts.sql script for this
-- =============================================

-- Add unique constraint for CurrentAccounts (CustomerId, Currency)
-- This prevents multiple current accounts with same currency for same customer
ALTER TABLE public."CurrentAccounts"
ADD CONSTRAINT "UQ_CurrentAccounts_CustomerId_Currency"
UNIQUE ("CustomerId", "Currency");

-- Add unique constraint for SavingsAccounts (CustomerId, Currency)
-- This prevents multiple savings accounts with same currency for same customer
ALTER TABLE public."SavingsAccounts"
ADD CONSTRAINT "UQ_SavingsAccounts_CustomerId_Currency"
UNIQUE ("CustomerId", "Currency");

-- Add unique constraint for TermSavingsAccounts (CustomerId, Currency)
-- This prevents multiple term savings accounts with same currency for same customer
ALTER TABLE public."TermSavingsAccounts"
ADD CONSTRAINT "UQ_TermSavingsAccounts_CustomerId_Currency"
UNIQUE ("CustomerId", "Currency");

-- =============================================
-- VERIFICATION QUERIES
-- =============================================

-- Verify constraints were added successfully
SELECT
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'UNIQUE'
    AND tc.table_name IN ('CurrentAccounts', 'SavingsAccounts', 'TermSavingsAccounts')
    AND tc.constraint_name LIKE 'UQ_%_CustomerId_Currency'
ORDER BY tc.table_name, tc.constraint_name;