-- Script pou korije dat echeance yo nan payment schedules
-- Sa pral asire ke tout loans itilize menm lojik kalkil dat

-- ETAP 1: Backup done yo anvan koreksyon
CREATE TABLE IF NOT EXISTS microcredit_payment_schedules_backup_20251216 AS 
SELECT * FROM microcredit_payment_schedules;

-- ETAP 2: Afiche kèk egzanp pou konpare avan ak apre
SELECT 
    l.loan_number,
    l.first_installment_date,
    ps.installment_number,
    ps.due_date AS old_due_date,
    (l.first_installment_date + (ps.installment_number - 1) * INTERVAL '1 month')::date AS new_due_date,
    ps.status
FROM microcredit_loans l
JOIN microcredit_payment_schedules ps ON ps.loan_id = l.id
WHERE l.status IN ('Active', 'Approved')
ORDER BY l.loan_number, ps.installment_number
LIMIT 20;

-- ETAP 3: Mete ajou dat echeance yo pou tout schedules ki pa peye
-- Sa pral kalkile: first_installment_date + (installment_number - 1) mwa
UPDATE microcredit_payment_schedules ps
SET 
    due_date = (
        SELECT (l.first_installment_date + (ps.installment_number - 1) * INTERVAL '1 month')::date
        FROM microcredit_loans l
        WHERE l.id = ps.loan_id
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE ps.status = 'Pending'
  AND EXISTS (
      SELECT 1 FROM microcredit_loans l 
      WHERE l.id = ps.loan_id 
      AND l.status IN ('Active', 'Approved')
  );

-- ETAP 4: Mete ajou next_payment_due nan microcredit_loans table
UPDATE microcredit_loans l
SET next_payment_due = (
    SELECT MIN(ps.due_date)
    FROM microcredit_payment_schedules ps
    WHERE ps.loan_id = l.id
      AND ps.status = 'Pending'
)
WHERE l.status IN ('Active', 'Approved');

-- ETAP 5: Verifye rezilta yo
SELECT 
    l.loan_number,
    l.first_installment_date,
    l.next_payment_due,
    ps.installment_number,
    ps.due_date,
    ps.status
FROM microcredit_loans l
JOIN microcredit_payment_schedules ps ON ps.loan_id = l.id
WHERE l.status IN ('Active', 'Approved')
  AND ps.status = 'Pending'
ORDER BY l.loan_number, ps.installment_number
LIMIT 20;

-- ETAP 6: Kontwole ke tout dat yo byen kalkile
SELECT 
    l.loan_number,
    COUNT(CASE WHEN ps.due_date = (l.first_installment_date + (ps.installment_number - 1) * INTERVAL '1 month')::date THEN 1 END) AS correct_dates,
    COUNT(*) AS total_installments
FROM microcredit_loans l
JOIN microcredit_payment_schedules ps ON ps.loan_id = l.id
WHERE l.status IN ('Active', 'Approved')
GROUP BY l.loan_number
HAVING COUNT(CASE WHEN ps.due_date = (l.first_installment_date + (ps.installment_number - 1) * INTERVAL '1 month')::date THEN 1 END) < COUNT(*)
ORDER BY l.loan_number;

COMMIT;
