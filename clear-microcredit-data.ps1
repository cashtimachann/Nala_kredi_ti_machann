# ============================================================================
# Script PowerShell pou efase done mikwokredi
# ============================================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  EFASAJ DONE MIKWOKREDI" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration database
$dbHost = "localhost"
$dbName = "nalakreditimachann_db"
$dbUser = "postgres"
$dbPassword = "JCS823ch!!"

# Kreyasyon koneksyon string
$env:PGPASSWORD = $dbPassword

Write-Host "1. Verifye done kounye a..." -ForegroundColor Yellow
Write-Host ""

# Chèk done ki egziste
$query1 = @"
SELECT 
    (SELECT COUNT(*) FROM "MicrocreditLoanApplications" WHERE "ApplicationStatus" IN ('Draft', 'Submitted', 'UnderReview', 'Pending')) as applications,
    (SELECT COUNT(*) FROM "MicrocreditLoans" WHERE "Status" IN ('Active', 'Overdue')) as active_loans,
    (SELECT COUNT(*) FROM "MicrocreditLoans" WHERE "Status" = 'Approved') as approved_loans;
"@

$result = & psql -h $dbHost -U $dbUser -d $dbName -t -c $query1

Write-Host "   Nouvelles Demandes (Pending): $($result.Split('|')[0].Trim())" -ForegroundColor White
Write-Host "   Prêts Actifs: $($result.Split('|')[1].Trim())" -ForegroundColor White
Write-Host "   Prêts à Décaisser: $($result.Split('|')[2].Trim())" -ForegroundColor White
Write-Host ""

# Mande konfirmasyon
$confirm = Read-Host "Ou vle efase done sa yo? (tape OUI pou kontinye)"

if ($confirm -ne "OUI") {
    Write-Host "Operasyon anile!" -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "2. Efasaj done..." -ForegroundColor Yellow

# Debloke garanti yo epi efase done
$deleteQuery = @"
BEGIN;

-- Debloke garanti yo avan efase aplikasyon yo
UPDATE ""SavingsAccounts"" 
SET 
    ""BlockedBalance"" = ""BlockedBalance"" - COALESCE(apps.""BlockedGuaranteeAmount"", 0),
    ""AvailableBalance"" = ""AvailableBalance"" + COALESCE(apps.""BlockedGuaranteeAmount"", 0),
    ""UpdatedAt"" = NOW()
FROM microcredit_loan_applications apps
WHERE ""SavingsAccounts"".""Id"" = apps.""BlockedSavingsAccountId""
AND apps.""BlockedGuaranteeAmount"" IS NOT NULL
AND apps.""Status"" IN (0, 1, 2, 3);

-- Efase payments
DELETE FROM microcredit_payments 
WHERE ""LoanId"" IN (
    SELECT ""Id"" FROM microcredit_loans 
    WHERE ""Status"" IN (0, 1, 2, 4)
);

-- Efase guarantees
DELETE FROM microcredit_guarantees 
WHERE ""ApplicationId"" IN (
    SELECT ""Id"" FROM microcredit_loan_applications 
    WHERE ""Status"" IN (0, 1, 2, 3)
);

-- Efase documents
DELETE FROM microcredit_application_documents 
WHERE ""ApplicationId"" IN (
    SELECT ""Id"" FROM microcredit_loan_applications 
    WHERE ""Status"" IN (0, 1, 2, 3)
);

-- Efase payment schedules
DELETE FROM microcredit_payment_schedules 
WHERE ""LoanId"" IN (
    SELECT ""Id"" FROM microcredit_loans 
    WHERE ""Status"" IN (0, 1, 2, 4)
);

-- Efase collection notes
DELETE FROM microcredit_collection_notes 
WHERE ""LoanId"" IN (
    SELECT ""Id"" FROM microcredit_loans 
    WHERE ""Status"" IN (0, 1, 2, 4)
);

-- Efase approval steps
DELETE FROM microcredit_approval_steps 
WHERE ""ApplicationId"" IN (
    SELECT ""Id"" FROM microcredit_loan_applications 
    WHERE ""Status"" IN (0, 1, 2, 3)
);

-- Efase loans
DELETE FROM microcredit_loans 
WHERE ""Status"" IN (0, 1, 2, 4);

-- Efase applications
DELETE FROM microcredit_loan_applications 
WHERE ""Status"" IN (0, 1, 2, 3);

COMMIT;
"@

& psql -h $dbHost -U $dbUser -d $dbName -c $deleteQuery

Write-Host ""
Write-Host "3. Verifye rezilta..." -ForegroundColor Yellow
Write-Host ""

# Verifye apre efasaj
$resultAfter = & psql -h $dbHost -U $dbUser -d $dbName -t -c $query1

Write-Host "   Nouvelles Demandes restantes: $($resultAfter.Split('|')[0].Trim())" -ForegroundColor Green
Write-Host "   Prêts Actifs restants: $($resultAfter.Split('|')[1].Trim())" -ForegroundColor Green
Write-Host "   Prêts à Décaisser restants: $($resultAfter.Split('|')[2].Trim())" -ForegroundColor Green
Write-Host ""

Write-Host "Done efase avek sikse!" -ForegroundColor Green
Write-Host ""

# Netwaye anviwonman
Remove-Item Env:\PGPASSWORD
