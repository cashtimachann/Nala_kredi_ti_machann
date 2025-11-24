-- Script pour corriger les noms de succursale manquants dans les paiements
-- Ce script met à jour les paiements qui n'ont pas de BranchName en récupérant
-- l'information depuis le prêt associé

-- Mettre à jour BranchName depuis le prêt associé
UPDATE mp
SET 
    mp.BranchName = ml.BranchName,
    mp.BranchId = ml.BranchId,
    mp.UpdatedAt = GETUTCDATE()
FROM microcredit_payments mp
INNER JOIN microcredit_loans ml ON mp.LoanId = ml.Id
WHERE mp.BranchName IS NULL 
   OR mp.BranchName = '' 
   OR mp.BranchId = 0;

-- Afficher le nombre de paiements mis à jour
SELECT 
    COUNT(*) as PaymentsUpdated,
    'Paiements avec succursale mise à jour' as Description
FROM microcredit_payments
WHERE BranchName IS NOT NULL AND BranchName != '';

-- Vérifier s'il reste des paiements sans succursale
SELECT 
    p.Id,
    p.PaymentNumber,
    p.PaymentDate,
    p.Amount,
    p.BranchId,
    p.BranchName,
    l.BranchName as LoanBranchName
FROM microcredit_payments p
LEFT JOIN microcredit_loans l ON p.LoanId = l.Id
WHERE p.BranchName IS NULL OR p.BranchName = '' OR p.BranchId = 0;
