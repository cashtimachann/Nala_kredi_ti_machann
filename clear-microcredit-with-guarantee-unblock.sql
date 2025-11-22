-- ============================================================================
-- Script pou efase done mikwokredi epi debloke garanti yo
-- ATANSYON: Script sa a ap efase done epi debloke kòb garanti yo!
-- ============================================================================

-- 1. Afiche done kounye a
SELECT 'DONE KOUNYE A:' as info;

SELECT COUNT(*) as nouvelles_demandes 
FROM microcredit_loan_applications 
WHERE "Status" IN (0, 1, 2); -- Draft, Submitted, UnderReview

SELECT COUNT(*) as prets_actifs 
FROM microcredit_loans 
WHERE "Status" IN (2, 4); -- Active, Overdue

SELECT COUNT(*) as prets_a_decaisser 
FROM microcredit_loans 
WHERE "Status" = 1; -- Approved

-- Afiche total kòb garanti ki bloke
SELECT 
    COUNT(*) as applications_avec_garantie,
    SUM("BlockedGuaranteeAmount") as total_garanti_bloke
FROM microcredit_loan_applications 
WHERE "BlockedGuaranteeAmount" IS NOT NULL 
AND "BlockedSavingsAccountId" IS NOT NULL
AND "Status" IN (0, 1, 2, 3); -- Draft, Submitted, UnderReview, Approved

-- 2. Debloke garanti yo avan efasaj
BEGIN;

-- Debloke garanti pou aplikasyon yo
UPDATE "SavingsAccounts" 
SET 
    "BlockedBalance" = "BlockedBalance" - COALESCE(apps."BlockedGuaranteeAmount", 0),
    "AvailableBalance" = "AvailableBalance" + COALESCE(apps."BlockedGuaranteeAmount", 0),
    "UpdatedAt" = NOW()
FROM microcredit_loan_applications apps
WHERE "SavingsAccounts"."Id" = apps."BlockedSavingsAccountId"
AND apps."BlockedGuaranteeAmount" IS NOT NULL
AND apps."Status" IN (0, 1, 2, 3); -- Draft, Submitted, UnderReview, Approved

SELECT ROW_COUNT() as garanti_debloke;

-- Debloke garanti pou prè yo (si gen garanti ki toujou bloke pou prè aktif)
UPDATE "SavingsAccounts" 
SET 
    "BlockedBalance" = "BlockedBalance" - COALESCE(apps."BlockedGuaranteeAmount", 0),
    "AvailableBalance" = "AvailableBalance" + COALESCE(apps."BlockedGuaranteeAmount", 0),
    "UpdatedAt" = NOW()
FROM microcredit_loans loans
INNER JOIN microcredit_loan_applications apps ON loans."ApplicationId" = apps."Id"
WHERE "SavingsAccounts"."Id" = apps."BlockedSavingsAccountId"
AND apps."BlockedGuaranteeAmount" IS NOT NULL
AND loans."Status" IN (0, 1, 2, 4); -- Pending, Approved, Active, Overdue

-- 3. Efase done nan lòd kòrèk pou respekte foreign keys
DELETE FROM microcredit_payments 
WHERE "LoanId" IN (
    SELECT "Id" FROM microcredit_loans 
    WHERE "Status" IN (0, 1, 2, 4) -- Pending, Approved, Active, Overdue
);

DELETE FROM microcredit_guarantees 
WHERE "ApplicationId" IN (
    SELECT "Id" FROM microcredit_loan_applications 
    WHERE "Status" IN (0, 1, 2, 3) -- Draft, Submitted, UnderReview, Approved
);

DELETE FROM microcredit_application_documents 
WHERE "ApplicationId" IN (
    SELECT "Id" FROM microcredit_loan_applications 
    WHERE "Status" IN (0, 1, 2, 3) -- Draft, Submitted, UnderReview, Approved
);

DELETE FROM microcredit_payment_schedules 
WHERE "LoanId" IN (
    SELECT "Id" FROM microcredit_loans 
    WHERE "Status" IN (0, 1, 2, 4) -- Pending, Approved, Active, Overdue
);

DELETE FROM microcredit_collection_notes 
WHERE "LoanId" IN (
    SELECT "Id" FROM microcredit_loans 
    WHERE "Status" IN (0, 1, 2, 4) -- Pending, Approved, Active, Overdue
);

DELETE FROM microcredit_approval_steps 
WHERE "ApplicationId" IN (
    SELECT "Id" FROM microcredit_loan_applications 
    WHERE "Status" IN (0, 1, 2, 3) -- Draft, Submitted, UnderReview, Approved
);

DELETE FROM microcredit_loans 
WHERE "Status" IN (0, 1, 2, 4); -- Pending, Approved, Active, Overdue

DELETE FROM microcredit_loan_applications 
WHERE "Status" IN (0, 1, 2, 3); -- Draft, Submitted, UnderReview, Approved

COMMIT;

-- 4. Verifye rezilta
SELECT 'APRE EFASAJ:' as info;

SELECT COUNT(*) as nouvelles_demandes_restantes 
FROM microcredit_loan_applications 
WHERE "Status" IN (0, 1, 2); -- Draft, Submitted, UnderReview

SELECT COUNT(*) as prets_actifs_restants 
FROM microcredit_loans 
WHERE "Status" IN (2, 4); -- Active, Overdue

SELECT COUNT(*) as prets_a_decaisser_restants 
FROM microcredit_loans 
WHERE "Status" = 1; -- Approved

-- Verifye ki pa gen garanti ki toujou bloke
SELECT 
    COUNT(*) as applications_avec_garantie_restantes,
    SUM("BlockedGuaranteeAmount") as total_garanti_bloke_restant
FROM microcredit_loan_applications 
WHERE "BlockedGuaranteeAmount" IS NOT NULL 
AND "BlockedSavingsAccountId" IS NOT NULL;

SELECT 'SIKSÈ: Done efase epi garanti yo debloke!' as resultat;
