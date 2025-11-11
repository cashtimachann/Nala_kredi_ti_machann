-- =============================================
-- ADD UNIQUE INDEXES FOR ACCOUNT CONSTRAINTS
-- =============================================
-- This script adds the unique indexes that were defined in the DbContext
-- to enforce the business rule: One account per currency per account type per customer
-- =============================================

-- Add unique index for SavingsAccounts (CustomerId, Currency)
-- This matches the EF configuration: entity.HasIndex(sa => new { sa.CustomerId, sa.Currency }).IsUnique()
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'SavingsAccounts'
        AND indexname = 'IX_SavingsAccounts_CustomerId_Currency_Unique'
    ) THEN
        CREATE UNIQUE INDEX "IX_SavingsAccounts_CustomerId_Currency_Unique"
        ON public."SavingsAccounts" ("CustomerId", "Currency");
        RAISE NOTICE 'Created unique index IX_SavingsAccounts_CustomerId_Currency_Unique';
    ELSE
        RAISE NOTICE 'Unique index IX_SavingsAccounts_CustomerId_Currency_Unique already exists';
    END IF;
END $$;

-- Add unique index for CurrentAccounts (CustomerId, Currency)
-- This matches the EF configuration: entity.HasIndex(ca => new { ca.CustomerId, ca.Currency }).IsUnique()
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'CurrentAccounts'
        AND indexname = 'IX_CurrentAccounts_CustomerId_Currency_Unique'
    ) THEN
        CREATE UNIQUE INDEX "IX_CurrentAccounts_CustomerId_Currency_Unique"
        ON public."CurrentAccounts" ("CustomerId", "Currency");
        RAISE NOTICE 'Created unique index IX_CurrentAccounts_CustomerId_Currency_Unique';
    ELSE
        RAISE NOTICE 'Unique index IX_CurrentAccounts_CustomerId_Currency_Unique already exists';
    END IF;
END $$;

-- Add unique index for TermSavingsAccounts (CustomerId, Currency)
-- This matches the EF configuration: entity.HasIndex(tsa => new { tsa.CustomerId, tsa.Currency }).IsUnique()
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'TermSavingsAccounts'
        AND indexname = 'IX_TermSavingsAccounts_CustomerId_Currency_Unique'
    ) THEN
        CREATE UNIQUE INDEX "IX_TermSavingsAccounts_CustomerId_Currency_Unique"
        ON public."TermSavingsAccounts" ("CustomerId", "Currency");
        RAISE NOTICE 'Created unique index IX_TermSavingsAccounts_CustomerId_Currency_Unique';
    ELSE
        RAISE NOTICE 'Unique index IX_TermSavingsAccounts_CustomerId_Currency_Unique already exists';
    END IF;
END $$;

-- =============================================
-- VERIFICATION
-- =============================================

-- Check that all unique indexes were created
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('SavingsAccounts', 'CurrentAccounts', 'TermSavingsAccounts')
AND indexname LIKE '%CustomerId_Currency_Unique'
ORDER BY tablename, indexname;

-- Test the constraints (should return no rows if constraints are working)
SELECT 'WARNING: Duplicate CurrentAccounts found!' as issue, COUNT(*) as count
FROM public."CurrentAccounts"
WHERE "Status" = 0
GROUP BY "CustomerId", "Currency"
HAVING COUNT(*) > 1

UNION ALL

SELECT 'WARNING: Duplicate SavingsAccounts found!' as issue, COUNT(*) as count
FROM public."SavingsAccounts"
WHERE "Status" = 0
GROUP BY "CustomerId", "Currency"
HAVING COUNT(*) > 1

UNION ALL

SELECT 'WARNING: Duplicate TermSavingsAccounts found!' as issue, COUNT(*) as count
FROM public."TermSavingsAccounts"
WHERE "Status" = 0
GROUP BY "CustomerId", "Currency"
HAVING COUNT(*) > 1;