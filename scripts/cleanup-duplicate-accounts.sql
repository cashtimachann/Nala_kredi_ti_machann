-- =============================================
-- CLEANUP DUPLICATE ACCOUNTS SCRIPT
-- =============================================
-- This script identifies and cleans up duplicate accounts
-- where a client has multiple accounts of the same type in the same currency
--
-- STRATEGY: Keep the account with the highest balance/activity
-- =============================================

-- =============================================
-- STEP 1: IDENTIFY DUPLICATES WITH ACTIVITY SCORES
-- =============================================

-- Create a temporary table to store duplicate analysis
CREATE TEMP TABLE duplicate_analysis AS
WITH account_activity AS (
    -- Calculate activity score for each account
    SELECT
        ca."Id" as account_id,
        ca."CustomerId",
        ca."Currency",
        CASE
            WHEN ca."Status" = 0 THEN 'CurrentAccount'
            WHEN sa."Status" = 0 THEN 'SavingsAccount'
            WHEN tsa."Status" = 0 THEN 'TermSavingsAccount'
            ELSE 'Unknown'
        END as account_type,
        COALESCE(ca."Balance", sa."Balance", tsa."Balance", 0) as balance,
        COALESCE(ca."CreatedAt", sa."CreatedAt", tsa."CreatedAt") as created_at,

        -- Activity score: balance + transaction count + age in days
        COALESCE(ca."Balance", sa."Balance", tsa."Balance", 0) +
        COALESCE((SELECT COUNT(*) FROM public."CurrentAccountTransactions" cat WHERE cat."AccountId" = ca."Id"), 0) * 100 +
        COALESCE((SELECT COUNT(*) FROM public."SavingsTransactions" st WHERE st."AccountId" = sa."Id"), 0) * 100 +
        COALESCE((SELECT COUNT(*) FROM public."TermSavingsTransactions" tst WHERE tst."AccountId" = tsa."Id"), 0) * 100 +
        EXTRACT(EPOCH FROM (NOW() - COALESCE(ca."CreatedAt", sa."CreatedAt", tsa."CreatedAt"))) / 86400 as activity_score

    FROM public."CurrentAccounts" ca
    FULL OUTER JOIN public."SavingsAccounts" sa ON ca."Id" = sa."Id"
    FULL OUTER JOIN public."TermSavingsAccounts" tsa ON COALESCE(ca."Id", sa."Id") = tsa."Id"
    WHERE (ca."Status" = 0 OR sa."Status" = 0 OR tsa."Status" = 0)
),
duplicates_ranked AS (
    -- Rank accounts by activity score within each customer/currency/type group
    SELECT *,
           ROW_NUMBER() OVER (
               PARTITION BY "CustomerId", "Currency", account_type
               ORDER BY activity_score DESC, balance DESC, created_at ASC
           ) as rank_in_group
    FROM account_activity
    WHERE ("CustomerId", "Currency", account_type) IN (
        -- Find groups with duplicates
        SELECT "CustomerId", "Currency", account_type
        FROM account_activity
        GROUP BY "CustomerId", "Currency", account_type
        HAVING COUNT(*) > 1
    )
)
SELECT * FROM duplicates_ranked
ORDER BY "CustomerId", "Currency", account_type, rank_in_group;

-- =============================================
-- STEP 2: REPORT DUPLICATES BEFORE CLEANUP
-- =============================================

SELECT
    'DUPLICATE ACCOUNTS REPORT - BEFORE CLEANUP' as report_title,
    COUNT(*) as total_duplicate_groups,
    SUM(duplicate_count) as total_duplicate_accounts
FROM (
    SELECT
        "CustomerId",
        "Currency",
        account_type,
        COUNT(*) as duplicate_count
    FROM duplicate_analysis
    GROUP BY "CustomerId", "Currency", account_type
    HAVING COUNT(*) > 1
) duplicates;

-- Detailed report of accounts to keep vs delete
SELECT
    da."CustomerId",
    da."Currency",
    da.account_type,
    CASE WHEN da.rank_in_group = 1 THEN 'KEEP' ELSE 'DELETE' END as action,
    da.account_id,
    da.balance,
    ROUND(da.activity_score, 2) as activity_score,
    da.created_at
FROM duplicate_analysis da
ORDER BY da."CustomerId", da."Currency", da.account_type, da.rank_in_group;

-- =============================================
-- STEP 3: BACKUP DATA BEFORE DELETION
-- =============================================
-- IMPORTANT: Run this in a transaction and backup your database first!

-- Create backup tables (uncomment to use)
-- CREATE TABLE backup_duplicate_current_accounts AS SELECT * FROM public."CurrentAccounts" WHERE "Id" IN (SELECT account_id FROM duplicate_analysis WHERE rank_in_group > 1 AND account_type = 'CurrentAccount');
-- CREATE TABLE backup_duplicate_savings_accounts AS SELECT * FROM public."SavingsAccounts" WHERE "Id" IN (SELECT account_id FROM duplicate_analysis WHERE rank_in_group > 1 AND account_type = 'SavingsAccount');
-- CREATE TABLE backup_duplicate_term_savings_accounts AS SELECT * FROM public."TermSavingsAccounts" WHERE "Id" IN (SELECT account_id FROM duplicate_analysis WHERE rank_in_group > 1 AND account_type = 'TermSavingsAccount');

-- =============================================
-- STEP 4: CLEANUP DUPLICATES (CAUTION!)
-- =============================================
-- ONLY RUN THIS AFTER BACKING UP YOUR DATA!

-- Begin transaction
BEGIN;

-- Delete duplicate Current Accounts (keep only rank 1)
DELETE FROM public."CurrentAccountTransactions"
WHERE "AccountId" IN (
    SELECT account_id FROM duplicate_analysis
    WHERE rank_in_group > 1 AND account_type = 'CurrentAccount'
);

DELETE FROM public."CurrentAccountAuthorizedSigners"
WHERE "AccountId" IN (
    SELECT account_id FROM duplicate_analysis
    WHERE rank_in_group > 1 AND account_type = 'CurrentAccount'
);

DELETE FROM public."CurrentAccounts"
WHERE "Id" IN (
    SELECT account_id FROM duplicate_analysis
    WHERE rank_in_group > 1 AND account_type = 'CurrentAccount'
);

-- Delete duplicate Savings Accounts (keep only rank 1)
DELETE FROM public."SavingsTransactions"
WHERE "AccountId" IN (
    SELECT account_id FROM duplicate_analysis
    WHERE rank_in_group > 1 AND account_type = 'SavingsAccount'
);

DELETE FROM public."SavingsCustomerDocuments"
WHERE "CustomerId" IN (
    SELECT DISTINCT da."CustomerId"
    FROM duplicate_analysis da
    WHERE da.rank_in_group > 1 AND da.account_type = 'SavingsAccount'
)
AND "DocumentType" = 5; -- Photo documents associated with accounts

DELETE FROM public."SavingsAccounts"
WHERE "Id" IN (
    SELECT account_id FROM duplicate_analysis
    WHERE rank_in_group > 1 AND account_type = 'SavingsAccount'
);

-- Delete duplicate Term Savings Accounts (keep only rank 1)
DELETE FROM public."TermSavingsTransactions"
WHERE "AccountId" IN (
    SELECT account_id FROM duplicate_analysis
    WHERE rank_in_group > 1 AND account_type = 'TermSavingsAccount'
);

DELETE FROM public."TermSavingsAccounts"
WHERE "Id" IN (
    SELECT account_id FROM duplicate_analysis
    WHERE rank_in_group > 1 AND account_type = 'TermSavingsAccount'
);

-- Commit transaction
COMMIT;

-- =============================================
-- STEP 5: VERIFICATION AFTER CLEANUP
-- =============================================

-- Verify no duplicates remain
SELECT
    'VERIFICATION: Remaining duplicates after cleanup' as check_type,
    COUNT(*) as remaining_duplicates
FROM (
    SELECT "CustomerId", "Currency", COUNT(*)
    FROM public."CurrentAccounts"
    WHERE "Status" = 0
    GROUP BY "CustomerId", "Currency"
    HAVING COUNT(*) > 1

    UNION ALL

    SELECT "CustomerId", "Currency", COUNT(*)
    FROM public."SavingsAccounts"
    WHERE "Status" = 0
    GROUP BY "CustomerId", "Currency"
    HAVING COUNT(*) > 1

    UNION ALL

    SELECT "CustomerId", "Currency", COUNT(*)
    FROM public."TermSavingsAccounts"
    WHERE "Status" = 0
    GROUP BY "CustomerId", "Currency"
    HAVING COUNT(*) > 1
) as remaining;

-- Report cleanup summary
SELECT
    'CLEANUP SUMMARY' as summary,
    (SELECT COUNT(*) FROM duplicate_analysis WHERE rank_in_group = 1) as accounts_kept,
    (SELECT COUNT(*) FROM duplicate_analysis WHERE rank_in_group > 1) as accounts_deleted,
    (SELECT SUM(balance) FROM duplicate_analysis WHERE rank_in_group > 1) as total_balance_deleted;

-- =============================================
-- CLEANUP TEMPORARY DATA
-- =============================================

DROP TABLE IF EXISTS duplicate_analysis;