-- =============================================
-- UNIQUE ACCOUNT CONSTRAINTS IMPLEMENTATION
-- =============================================
-- This script implements the business rule:
-- A client can have only ONE account per currency for each account type
--
-- ✅ Allowed: 1 savings HTG + 1 savings USD for same client
-- ❌ Forbidden: 2 savings HTG for same client
-- =============================================

-- =============================================
-- 1. IDENTIFICATION OF DUPLICATE ACCOUNTS
-- =============================================

-- Check for duplicate Current Accounts (same CustomerId + Currency)
SELECT
    "CustomerId",
    "Currency",
    COUNT(*) as DuplicateCount,
    STRING_AGG("AccountNumber", ', ') as AccountNumbers,
    STRING_AGG("Id", ', ') as AccountIds
FROM public."CurrentAccounts"
WHERE "Status" = 0  -- Active accounts only
GROUP BY "CustomerId", "Currency"
HAVING COUNT(*) > 1
ORDER BY "CustomerId", "Currency";

-- Check for duplicate Savings Accounts (same CustomerId + Currency)
SELECT
    "CustomerId",
    "Currency",
    COUNT(*) as DuplicateCount,
    STRING_AGG("AccountNumber", ', ') as AccountNumbers,
    STRING_AGG("Id", ', ') as AccountIds
FROM public."SavingsAccounts"
WHERE "Status" = 0  -- Active accounts only
GROUP BY "CustomerId", "Currency"
HAVING COUNT(*) > 1
ORDER BY "CustomerId", "Currency";

-- Check for duplicate Term Savings Accounts (same CustomerId + Currency)
SELECT
    "CustomerId",
    "Currency",
    COUNT(*) as DuplicateCount,
    STRING_AGG("AccountNumber", ', ') as AccountNumbers,
    STRING_AGG("Id", ', ') as AccountIds
FROM public."TermSavingsAccounts"
WHERE "Status" = 0  -- Active accounts only
GROUP BY "CustomerId", "Currency"
HAVING COUNT(*) > 1
ORDER BY "CustomerId", "Currency";

-- =============================================
-- 2. SUMMARY REPORT OF ALL DUPLICATES
-- =============================================

-- Combined report of all duplicate accounts
WITH DuplicateCurrent AS (
    SELECT
        'Current Account' as AccountType,
        "CustomerId",
        "Currency",
        COUNT(*) as DuplicateCount,
        STRING_AGG("AccountNumber", ', ') as AccountNumbers,
        STRING_AGG("Id", ', ') as AccountIds,
        MAX("Balance") as MaxBalance,
        MAX("CreatedAt") as LatestCreation
    FROM public."CurrentAccounts"
    WHERE "Status" = 0
    GROUP BY "CustomerId", "Currency"
    HAVING COUNT(*) > 1
),
DuplicateSavings AS (
    SELECT
        'Savings Account' as AccountType,
        "CustomerId",
        "Currency",
        COUNT(*) as DuplicateCount,
        STRING_AGG("AccountNumber", ', ') as AccountNumbers,
        STRING_AGG("Id", ', ') as AccountIds,
        MAX("Balance") as MaxBalance,
        MAX("CreatedAt") as LatestCreation
    FROM public."SavingsAccounts"
    WHERE "Status" = 0
    GROUP BY "CustomerId", "Currency"
    HAVING COUNT(*) > 1
),
DuplicateTermSavings AS (
    SELECT
        'Term Savings Account' as AccountType,
        "CustomerId",
        "Currency",
        COUNT(*) as DuplicateCount,
        STRING_AGG("AccountNumber", ', ') as AccountNumbers,
        STRING_AGG("Id", ', ') as AccountIds,
        MAX("Balance") as MaxBalance,
        MAX("CreatedAt") as LatestCreation
    FROM public."TermSavingsAccounts"
    WHERE "Status" = 0
    GROUP BY "CustomerId", "Currency"
    HAVING COUNT(*) > 1
)
SELECT * FROM DuplicateCurrent
UNION ALL
SELECT * FROM DuplicateSavings
UNION ALL
SELECT * FROM DuplicateTermSavings
ORDER BY AccountType, CustomerId, Currency;