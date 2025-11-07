-- Test data for loan application testing
-- Insert test savings customer
INSERT INTO savings_customers (
    "Id", "FirstName", "LastName", "DateOfBirth", "Gender", "PhoneNumber",
    "Email", "Address", "City", "State", "ZipCode", "Country",
    "IdentificationType", "IdentificationNumber", "IdentificationExpiryDate",
    "Occupation", "MonthlyIncome", "Employer", "EmergencyContactName",
    "EmergencyContactPhone", "IsActive", "CreatedAt", "UpdatedAt"
) VALUES (
    'TEST-CUST-001',
    'Jean',
    'Pierre',
    '1985-05-15',
    1, -- Male
    '+509 1234-5678',
    'jean.pierre@test.com',
    '123 Rue de la Paix',
    'Port-au-Prince',
    'Ouest',
    'HT6110',
    'Haiti',
    1, -- National ID
    '1234567890123',
    '2030-05-15',
    'Teacher',
    25000.00,
    'École Primaire',
    'Marie Pierre',
    '+509 1234-5679',
    true,
    NOW(),
    NOW()
) ON CONFLICT ("Id") DO NOTHING;

-- Insert test savings account with sufficient balance for loan guarantee
INSERT INTO savings_accounts (
    "Id", "AccountNumber", "CustomerId", "AccountType", "Status",
    "Balance", "AvailableBalance", "InterestRate", "MinimumBalance",
    "OpeningDate", "LastTransactionDate", "BranchId", "Currency",
    "IsActive", "CreatedAt", "UpdatedAt"
) VALUES (
    gen_random_uuid(),
    '001-123456789',
    'TEST-CUST-001',
    1, -- Regular savings
    1, -- Active
    150000.00, -- Sufficient balance for 15% of max loan (500k * 0.15 = 75k)
    150000.00,
    0.05, -- 5% interest
    100.00,
    NOW(),
    NOW(),
    (SELECT "Id" FROM branches LIMIT 1), -- Use first branch
    1, -- HTG
    true,
    NOW(),
    NOW()
) ON CONFLICT ("AccountNumber") DO NOTHING;

-- Insert another test customer with lower balance (insufficient for guarantee)
INSERT INTO savings_customers (
    "Id", "FirstName", "LastName", "DateOfBirth", "Gender", "PhoneNumber",
    "Email", "Address", "City", "State", "ZipCode", "Country",
    "IdentificationType", "IdentificationNumber", "IdentificationExpiryDate",
    "Occupation", "MonthlyIncome", "Employer", "EmergencyContactName",
    "EmergencyContactPhone", "IsActive", "CreatedAt", "UpdatedAt"
) VALUES (
    'TEST-CUST-002',
    'Marie',
    'Joseph',
    '1990-08-20',
    2, -- Female
    '+509 2345-6789',
    'marie.joseph@test.com',
    '456 Avenue des Champs',
    'Port-au-Prince',
    'Ouest',
    'HT6110',
    'Haiti',
    1, -- National ID
    '2345678901234',
    '2035-08-20',
    'Nurse',
    30000.00,
    'Hôpital Général',
    'Pierre Joseph',
    '+509 2345-6790',
    true,
    NOW(),
    NOW()
) ON CONFLICT ("Id") DO NOTHING;

-- Insert test savings account with insufficient balance for loan guarantee
INSERT INTO savings_accounts (
    "Id", "AccountNumber", "CustomerId", "AccountType", "Status",
    "Balance", "AvailableBalance", "InterestRate", "MinimumBalance",
    "OpeningDate", "LastTransactionDate", "BranchId", "Currency",
    "IsActive", "CreatedAt", "UpdatedAt"
) VALUES (
    gen_random_uuid(),
    '002-234567890',
    'TEST-CUST-002',
    1, -- Regular savings
    1, -- Active
    25000.00, -- Insufficient balance for 15% of 200k loan (30k required)
    25000.00,
    0.05, -- 5% interest
    100.00,
    NOW(),
    NOW(),
    (SELECT "Id" FROM branches LIMIT 1), -- Use first branch
    1, -- HTG
    true,
    NOW(),
    NOW()
) ON CONFLICT ("AccountNumber") DO NOTHING;

-- Verify the inserted data
SELECT
    sc."FirstName",
    sc."LastName",
    sa."AccountNumber",
    sa."Balance",
    sa."Status"
FROM savings_customers sc
JOIN savings_accounts sa ON sc."Id" = sa."CustomerId"
WHERE sc."Id" LIKE 'TEST-CUST-%';