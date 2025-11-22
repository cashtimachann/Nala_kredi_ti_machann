-- ============================================================================
-- Script pou efase done mikwokredi nan database la
-- ATANSYON: Script sa a ap efase done! Fè backup avan ou rantre li!
-- ============================================================================

-- Konekte ak database la:
-- psql -h localhost -U postgres -d nalakreditimachann_db

BEGIN;

-- 1. Afiche done ki pral efase yo
SELECT 'DONE KOUNYE A:' as info;
SELECT 
    'Nouvelles Demandes (Applications): ' || COUNT(*) as count 
FROM "MicrocreditLoanApplications" 
WHERE "ApplicationStatus" IN ('Draft', 'Submitted', 'UnderReview', 'Pending');

SELECT 
    'Prêts Actifs: ' || COUNT(*) as count 
FROM "MicrocreditLoans" 
WHERE "Status" IN ('Active', 'Overdue');

SELECT 
    'Prêts à Décaisser (Approved): ' || COUNT(*) as count 
FROM "MicrocreditLoans" 
WHERE "Status" = 'Approved';

-- 2. Efase done nan lòd kòrèk pou respekte foreign keys

-- OPSYON 1: Efase tout done mikwokredi (atansyon: pi danjere!)
-- Dekomante liy sa yo si ou vle efase TOU:
-- DELETE FROM microcredit_payments;
-- DELETE FROM microcredit_guarantees;
-- DELETE FROM microcredit_application_documents;
-- DELETE FROM microcredit_payment_schedules;
-- DELETE FROM microcredit_collection_notes;
-- DELETE FROM microcredit_approval_steps;
-- DELETE FROM microcredit_loans;
-- DELETE FROM microcredit_loan_applications;

-- OPSYON 2: Efase sèlman kèk kategori (pi sekirite)
BEGIN;

-- Premye: Debloke garanti yo avan efase aplikasyon yo
UPDATE "SavingsAccounts" 
SET 
    "BlockedBalance" = "BlockedBalance" - COALESCE(apps."BlockedGuaranteeAmount", 0),
    "AvailableBalance" = "AvailableBalance" + COALESCE(apps."BlockedGuaranteeAmount", 0),
    "UpdatedAt" = NOW()
FROM microcredit_loan_applications apps
WHERE "SavingsAccounts"."Id" = apps."BlockedSavingsAccountId"
AND apps."BlockedGuaranteeAmount" IS NOT NULL
AND apps."Status" IN (0, 1, 2, 3); -- Draft, Submitted, UnderReview, Approved

-- Efase payments pou prè espesifik yo
DELETE FROM microcredit_payments 
WHERE "LoanId" IN (
    SELECT "Id" FROM microcredit_loans 
    WHERE "Status" IN (0, 1, 2, 4)
);

-- Efase guarantees pou aplikasyon yo
DELETE FROM microcredit_guarantees 
WHERE "ApplicationId" IN (
    SELECT "Id" FROM microcredit_loan_applications 
    WHERE "Status" IN (0, 1, 2, 3)
);

-- Efase documents pou aplikasyon yo
DELETE FROM microcredit_application_documents 
WHERE "ApplicationId" IN (
    SELECT "Id" FROM microcredit_loan_applications 
    WHERE "Status" IN (0, 1, 2, 3)
);

-- Efase payment schedules
DELETE FROM microcredit_payment_schedules 
WHERE "LoanId" IN (
    SELECT "Id" FROM microcredit_loans 
    WHERE "Status" IN (0, 1, 2, 4)
);

-- Efase collection notes
DELETE FROM microcredit_collection_notes 
WHERE "LoanId" IN (
    SELECT "Id" FROM microcredit_loans 
    WHERE "Status" IN (0, 1, 2, 4)
);

-- Efase approval steps
DELETE FROM microcredit_approval_steps 
WHERE "ApplicationId" IN (
    SELECT "Id" FROM microcredit_loan_applications 
    WHERE "Status" IN (0, 1, 2, 3)
);

-- Efase prè yo (Active, Overdue, Approved, Pending)
DELETE FROM microcredit_loans 
WHERE "Status" IN (0, 1, 2, 4);

-- Efase aplikasyon yo (Draft, Submitted, UnderReview, Approved)
DELETE FROM microcredit_loan_applications 
WHERE "Status" IN (0, 1, 2, 3);

-- 3. Verifye rezilta
SELECT 'APRE EFASAJ:' as info;
SELECT 
    'Nouvelles Demandes restantes: ' || COUNT(*) as count 
FROM microcredit_loan_applications 
WHERE "Status" IN (0, 1, 2);

SELECT 
    'Prêts Actifs restants: ' || COUNT(*) as count 
FROM microcredit_loans 
WHERE "Status" IN (2, 4);

SELECT 
    'Prêts à Décaisser restants: ' || COUNT(*) as count 
FROM microcredit_loans 
WHERE "Status" = 1;

-- Verifye ki pa gen garanti ki toujou bloke
SELECT 
    'Garanties bloquées restantes: ' || COUNT(*) as count 
FROM microcredit_loan_applications 
WHERE "BlockedGuaranteeAmount" IS NOT NULL;

-- 4. KONFIME oswa ANNILE chanjman yo
-- Dekomante youn nan liy sa yo:

-- COMMIT;   -- <-- Dekomante sa a pou KONFIME efasaj la
ROLLBACK;    -- <-- Liy sa a aktif - li ANNILE tout chanjman (sekirite)

-- ============================================================================
-- ENSTRIKSYON:
-- 1. Ouvri terminal: psql -h localhost -U postgres -d nalakreditimachann_db
-- 2. Rantre: \i 'c:/Users/Administrator/Desktop/Kredi Ti Machann/clear-microcredit-data.sql'
-- 3. Verifye rezilta yo
-- 4. Si ou satisfè, chanje ROLLBACK an COMMIT epi re-rantre script la
-- ============================================================================
