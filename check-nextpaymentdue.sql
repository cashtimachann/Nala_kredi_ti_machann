-- Check if microcredit loans have NextPaymentDue values
SELECT 
    LoanNumber,
    PrincipalAmount,
    Status,
    DisbursementDate,
    FirstInstallmentDate,
    MaturityDate,
    NextPaymentDue,
    InstallmentsPaid,
    DurationMonths
FROM 
    MicrocreditLoans
WHERE 
    Status = 'Active'
ORDER BY 
    LoanNumber;
