using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NalaCreditAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddTestSavingsDataFixed : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Insert test savings customer with sufficient balance
            migrationBuilder.Sql(@"
                INSERT INTO ""SavingsCustomers"" (
                    ""Id"", ""FirstName"", ""LastName"", ""DateOfBirth"", ""Gender"", ""Street"",
                    ""Commune"", ""Department"", ""Country"", ""PrimaryPhone"", ""Email"",
                    ""EmergencyContactName"", ""EmergencyContactPhone"", ""DocumentType"", ""DocumentNumber"",
                    ""IssuedDate"", ""ExpiryDate"", ""IssuingAuthority"", ""Occupation"", ""EmployerName"",
                    ""MonthlyIncome"", ""IsActive"", ""CreatedAt"", ""UpdatedAt""
                ) VALUES (
                    'TEST-CUST-001',
                    'Jean',
                    'Pierre',
                    '1985-05-15',
                    0, -- Male
                    '123 Rue de la Paix',
                    'Port-au-Prince',
                    'Ouest',
                    'Haiti',
                    '+509 1234-5678',
                    'jean.pierre@test.com',
                    'Marie Pierre',
                    '+509 1234-5679',
                    0, -- CIN
                    '1234567890123',
                    '2020-05-15',
                    '2030-05-15',
                    'ONI',
                    'Teacher',
                    'École Primaire',
                    25000.00,
                    true,
                    NOW(),
                    NOW()
                ) ON CONFLICT (""Id"") DO NOTHING;
            ");

            migrationBuilder.Sql(@"
                INSERT INTO ""SavingsAccounts"" (
                    ""Id"", ""AccountNumber"", ""CustomerId"", ""BranchId"", ""Currency"",
                    ""Balance"", ""AvailableBalance"", ""MinimumBalance"", ""OpeningDate"",
                    ""Status"", ""InterestRate"", ""AccruedInterest"", ""DailyWithdrawalLimit"",
                    ""MonthlyWithdrawalLimit"", ""DailyDepositLimit"", ""BlockedBalance"", 
                    ""MaxBalance"", ""MinWithdrawalAmount"", ""MaxWithdrawalAmount"",
                    ""CreatedAt"", ""UpdatedAt""
                ) VALUES (
                    gen_random_uuid(),
                    '001123456789',
                    'TEST-CUST-001',
                    (SELECT ""Id"" FROM ""Branches"" LIMIT 1), -- Use first branch
                    0, -- HTG
                    150000.00, -- Sufficient balance for 15% of max loan (500k * 0.15 = 75k)
                    150000.00,
                    100.00,
                    NOW(),
                    0, -- Active
                    0.05, -- 5% interest
                    0.00, -- Accrued interest
                    50000.00, -- Daily withdrawal limit
                    200000.00, -- Monthly withdrawal limit
                    1000000.00, -- Daily deposit limit
                    0.00, -- Blocked balance
                    5000000.00, -- Max balance
                    100.00, -- Min withdrawal amount
                    50000.00, -- Max withdrawal amount
                    NOW(),
                    NOW()
                ) ON CONFLICT (""AccountNumber"") DO NOTHING;
            ");

            // Insert test customer with insufficient balance
            migrationBuilder.Sql(@"
                INSERT INTO ""SavingsCustomers"" (
                    ""Id"", ""FirstName"", ""LastName"", ""DateOfBirth"", ""Gender"", ""Street"",
                    ""Commune"", ""Department"", ""Country"", ""PrimaryPhone"", ""Email"",
                    ""EmergencyContactName"", ""EmergencyContactPhone"", ""DocumentType"", ""DocumentNumber"",
                    ""IssuedDate"", ""ExpiryDate"", ""IssuingAuthority"", ""Occupation"", ""EmployerName"",
                    ""MonthlyIncome"", ""IsActive"", ""CreatedAt"", ""UpdatedAt""
                ) VALUES (
                    'TEST-CUST-002',
                    'Marie',
                    'Joseph',
                    '1990-08-20',
                    1, -- Female
                    '456 Avenue des Champs',
                    'Port-au-Prince',
                    'Ouest',
                    'Haiti',
                    '+509 2345-6789',
                    'marie.joseph@test.com',
                    'Pierre Joseph',
                    '+509 2345-6790',
                    0, -- CIN
                    '2345678901234',
                    '2020-08-20',
                    '2035-08-20',
                    'ONI',
                    'Nurse',
                    'Hôpital Général',
                    30000.00,
                    true,
                    NOW(),
                    NOW()
                ) ON CONFLICT (""Id"") DO NOTHING;
            ");

            migrationBuilder.Sql(@"
                INSERT INTO ""SavingsAccounts"" (
                    ""Id"", ""AccountNumber"", ""CustomerId"", ""BranchId"", ""Currency"",
                    ""Balance"", ""AvailableBalance"", ""MinimumBalance"", ""OpeningDate"",
                    ""Status"", ""InterestRate"", ""AccruedInterest"", ""DailyWithdrawalLimit"",
                    ""MonthlyWithdrawalLimit"", ""DailyDepositLimit"", ""BlockedBalance"",
                    ""MaxBalance"", ""MinWithdrawalAmount"", ""MaxWithdrawalAmount"",
                    ""CreatedAt"", ""UpdatedAt""
                ) VALUES (
                    gen_random_uuid(),
                    '002234567890',
                    'TEST-CUST-002',
                    (SELECT ""Id"" FROM ""Branches"" LIMIT 1), -- Use first branch
                    0, -- HTG
                    25000.00, -- Insufficient balance for 15% of 200k loan (30k required)
                    25000.00,
                    100.00,
                    NOW(),
                    0, -- Active
                    0.05, -- 5% interest
                    0.00, -- Accrued interest
                    50000.00, -- Daily withdrawal limit
                    200000.00, -- Monthly withdrawal limit
                    1000000.00, -- Daily deposit limit
                    0.00, -- Blocked balance
                    5000000.00, -- Max balance
                    100.00, -- Min withdrawal amount
                    50000.00, -- Max withdrawal amount
                    NOW(),
                    NOW()
                ) ON CONFLICT (""AccountNumber"") DO NOTHING;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Remove test data
            migrationBuilder.Sql("DELETE FROM \"SavingsAccounts\" WHERE \"AccountNumber\" IN ('001123456789', '002234567890');");
            migrationBuilder.Sql("DELETE FROM \"SavingsCustomers\" WHERE \"Id\" IN ('TEST-CUST-001', 'TEST-CUST-002');");
        }
    }
}
