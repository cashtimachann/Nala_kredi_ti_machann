-- ============================================================================
-- SCRIPT SEN SENP POU EFASE DONE MIKWOKREDI
-- Copy/Paste script sa a nan pgAdmin oswa yon PostgreSQL client
-- ============================================================================

-- PREMYE: Verifye done kounye a
SELECT 'DONE KOUNYE A:' as info;

SELECT 'Nouvelles Demandes:' as type, COUNT(*) as total 
FROM microcredit_loan_applications 
WHERE application_status IN ('Draft', 'Submitted', 'UnderReview', 'Pending')
UNION ALL
SELECT 'Prêts Actifs:' as type, COUNT(*) as total 
FROM microcredit_loans 
WHERE status IN ('Active', 'Overdue')
UNION ALL
SELECT 'Prêts à Décaisser:' as type, COUNT(*) as total 
FROM microcredit_loans 
WHERE status = 'Approved';

-- ============================================================================
-- DEZYÈM: Efase done yo (ATANSYON!)
-- ============================================================================

-- Efase payments
DELETE FROM microcredit_payments 
WHERE loan_id IN (
    SELECT id FROM microcredit_loans 
    WHERE status IN ('Pending', 'Approved', 'Active', 'Overdue')
);

-- Efase guarantees
DELETE FROM microcredit_guarantees 
WHERE application_id IN (
    SELECT id FROM microcredit_loan_applications 
    WHERE application_status IN ('Draft', 'Submitted', 'UnderReview', 'Pending', 'Approved')
);

-- Efase documents
DELETE FROM microcredit_application_documents 
WHERE application_id IN (
    SELECT id FROM microcredit_loan_applications 
    WHERE application_status IN ('Draft', 'Submitted', 'UnderReview', 'Pending', 'Approved')
);

-- Efase loans
DELETE FROM microcredit_loans 
WHERE status IN ('Pending', 'Approved', 'Active', 'Overdue');

-- Efase applications
DELETE FROM microcredit_loan_applications 
WHERE application_status IN ('Draft', 'Submitted', 'UnderReview', 'Pending', 'Approved');

-- ============================================================================
-- TWAZYÈM: Verifye rezilta
-- ============================================================================

SELECT 'APRE EFASAJ:' as info;

SELECT 'Nouvelles Demandes:' as type, COUNT(*) as total 
FROM microcredit_loan_applications 
WHERE application_status IN ('Draft', 'Submitted', 'UnderReview', 'Pending')
UNION ALL
SELECT 'Prêts Actifs:' as type, COUNT(*) as total 
FROM microcredit_loans 
WHERE status IN ('Active', 'Overdue')
UNION ALL
SELECT 'Prêts à Décaisser:' as type, COUNT(*) as total 
FROM microcredit_loans 
WHERE status = 'Approved';

-- FIN
