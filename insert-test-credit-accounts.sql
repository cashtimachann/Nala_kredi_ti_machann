-- Quick test accounts for credit application testing
-- These accounts can be used to test the CreateCreditRequestWindow

-- Insert test customer 1 (for SA001)
INSERT INTO savings_customers (
    "Id", "CustomerCode", "FirstName", "LastName", "DateOfBirth", "Gender", 
    "Street", "Commune", "Department", "PrimaryPhone", "SecondaryPhone", "Email",
    "DocumentType", "DocumentNumber", "IssuedDate", "ExpiryDate", "IssuingAuthority",
    "Occupation", "MonthlyIncome", "EmployerName", "WorkAddress",
    "EmergencyContactName", "EmergencyContactPhone",
    "BirthPlace", "Nationality", "MaritalStatus", "NumberOfDependents",
    "IsActive", "CreatedAt", "UpdatedAt"
) VALUES (
    gen_random_uuid(),
    'CL001',
    'Jean',
    'Baptiste',
    '1985-05-15',
    0, -- Male
    '123 Rue de la Paix',
    'Delmas',
    'Ouest',
    '+509 3712-3456',
    '+509 4712-3456',
    'jean.baptiste@test.com',
    1, -- National ID
    'NIF-12345678',
    '2020-01-15',
    '2030-01-15',
    'ONI',
    'Commerçant',
    35000.00,
    'Commerce Baptiste',
    '123 Rue Commerce, Delmas',
    'Marie Baptiste',
    '+509 3712-9999',
    'Port-au-Prince',
    'Haïtienne',
    'Marié(e)',
    3,
    true,
    NOW(),
    NOW()
) ON CONFLICT ("CustomerCode") DO NOTHING;

-- Insert savings account SA001 with good balance
INSERT INTO savings_accounts (
    "Id", "AccountNumber", "CustomerId", "AccountType", "Status",
    "Balance", "AvailableBalance", "BlockedBalance",
    "InterestRate", "MinimumBalance",
    "OpeningDate", "LastTransactionDate", 
    "BranchId", "Currency",
    "IsActive", "CreatedAt", "UpdatedAt"
) VALUES (
    gen_random_uuid(),
    'SA001',
    (SELECT "Id" FROM savings_customers WHERE "CustomerCode" = 'CL001'),
    0, -- Savings
    0, -- Active
    125000.00,
    125000.00,
    0.00,
    0.05,
    500.00,
    NOW() - INTERVAL '6 months',
    NOW(),
    1, -- Branch 1
    0, -- HTG
    true,
    NOW(),
    NOW()
) ON CONFLICT ("AccountNumber") DO UPDATE SET 
    "Balance" = EXCLUDED."Balance",
    "AvailableBalance" = EXCLUDED."AvailableBalance",
    "UpdatedAt" = NOW();

-- Insert test customer 2 (for SA002)
INSERT INTO savings_customers (
    "Id", "CustomerCode", "FirstName", "LastName", "DateOfBirth", "Gender", 
    "Street", "Commune", "Department", "PrimaryPhone", "Email",
    "DocumentType", "DocumentNumber", "IssuedDate", "ExpiryDate", "IssuingAuthority",
    "Occupation", "MonthlyIncome",
    "EmergencyContactName", "EmergencyContactPhone",
    "BirthPlace", "Nationality", "IsActive", "CreatedAt", "UpdatedAt"
) VALUES (
    gen_random_uuid(),
    'CL002',
    'Marie',
    'Joseph',
    '1990-08-20',
    1, -- Female
    '456 Avenue Martin Luther King',
    'Pétion-Ville',
    'Ouest',
    '+509 3823-4567',
    'marie.joseph@test.com',
    1, -- National ID
    'NIF-23456789',
    '2021-03-10',
    '2031-03-10',
    'ONI',
    'Infirmière',
    42000.00,
    'Pierre Joseph',
    '+509 3823-9999',
    'Jacmel',
    'Haïtienne',
    true,
    NOW(),
    NOW()
) ON CONFLICT ("CustomerCode") DO NOTHING;

-- Insert savings account SA002
INSERT INTO savings_accounts (
    "Id", "AccountNumber", "CustomerId", "AccountType", "Status",
    "Balance", "AvailableBalance", "BlockedBalance",
    "InterestRate", "MinimumBalance",
    "OpeningDate", "LastTransactionDate", 
    "BranchId", "Currency",
    "IsActive", "CreatedAt", "UpdatedAt"
) VALUES (
    gen_random_uuid(),
    'SA002',
    (SELECT "Id" FROM savings_customers WHERE "CustomerCode" = 'CL002'),
    0, -- Savings
    0, -- Active
    85000.00,
    85000.00,
    0.00,
    0.05,
    500.00,
    NOW() - INTERVAL '3 months',
    NOW(),
    1, -- Branch 1
    0, -- HTG
    true,
    NOW(),
    NOW()
) ON CONFLICT ("AccountNumber") DO UPDATE SET 
    "Balance" = EXCLUDED."Balance",
    "AvailableBalance" = EXCLUDED."AvailableBalance",
    "UpdatedAt" = NOW();

-- Insert test customer 3 (for SA003) - USD account
INSERT INTO savings_customers (
    "Id", "CustomerCode", "FirstName", "LastName", "DateOfBirth", "Gender", 
    "Street", "Commune", "Department", "PrimaryPhone", "Email",
    "DocumentType", "DocumentNumber", "IssuedDate", "ExpiryDate", "IssuingAuthority",
    "Occupation", "MonthlyIncome",
    "EmergencyContactName", "EmergencyContactPhone",
    "BirthPlace", "Nationality", "IsActive", "CreatedAt", "UpdatedAt"
) VALUES (
    gen_random_uuid(),
    'CL003',
    'Pierre',
    'Duval',
    '1988-12-05',
    0, -- Male
    '789 Rue Geffrard',
    'Port-au-Prince',
    'Ouest',
    '+509 3934-5678',
    'pierre.duval@test.com',
    0, -- Passport
    'P12345678',
    '2022-01-01',
    '2032-01-01',
    'Direction de l\'Immigration',
    'Entrepreneur',
    1500.00, -- USD equivalent
    'Rose Duval',
    '+509 3934-9999',
    'Cap-Haïtien',
    'Haïtienne',
    true,
    NOW(),
    NOW()
) ON CONFLICT ("CustomerCode") DO NOTHING;

-- Insert USD savings account SA003
INSERT INTO savings_accounts (
    "Id", "AccountNumber", "CustomerId", "AccountType", "Status",
    "Balance", "AvailableBalance", "BlockedBalance",
    "InterestRate", "MinimumBalance",
    "OpeningDate", "LastTransactionDate", 
    "BranchId", "Currency",
    "IsActive", "CreatedAt", "UpdatedAt"
) VALUES (
    gen_random_uuid(),
    'SA003',
    (SELECT "Id" FROM savings_customers WHERE "CustomerCode" = 'CL003'),
    0, -- Savings
    0, -- Active
    2500.00, -- USD
    2500.00,
    0.00,
    0.03,
    10.00,
    NOW() - INTERVAL '1 year',
    NOW(),
    1, -- Branch 1
    1, -- USD
    true,
    NOW(),
    NOW()
) ON CONFLICT ("AccountNumber") DO UPDATE SET 
    "Balance" = EXCLUDED."Balance",
    "AvailableBalance" = EXCLUDED."AvailableBalance",
    "UpdatedAt" = NOW();

-- Verify inserted accounts
SELECT 
    sc."CustomerCode",
    sc."FirstName",
    sc."LastName",
    sa."AccountNumber",
    sa."Balance",
    CASE sa."Currency" 
        WHEN 0 THEN 'HTG'
        WHEN 1 THEN 'USD'
        ELSE 'Unknown'
    END AS "Currency",
    CASE sa."Status"
        WHEN 0 THEN 'Active'
        WHEN 1 THEN 'Inactive'
        WHEN 2 THEN 'Suspended'
        WHEN 3 THEN 'Closed'
        ELSE 'Unknown'
    END AS "Status",
    sa."BranchId"
FROM savings_customers sc
JOIN savings_accounts sa ON sc."Id" = sa."CustomerId"
WHERE sc."CustomerCode" IN ('CL001', 'CL002', 'CL003')
ORDER BY sc."CustomerCode";
