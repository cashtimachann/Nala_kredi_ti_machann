using System;
using System.Data;
using Npgsql;

class Program
{
    static void Main()
    {
        string connectionString = "Host=localhost;Database=nalakreditimachann_db;Username=postgres;Password=JCS823ch!!";

        using (var conn = new NpgsqlConnection(connectionString))
        {
            conn.Open();

            // Vérifier s'il y a déjà des comptes
            string checkQuery = "SELECT COUNT(*) FROM \"SavingsAccounts\";";
            using (var checkCmd = new NpgsqlCommand(checkQuery, conn))
            {
                var count = Convert.ToInt32(checkCmd.ExecuteScalar());
                if (count > 0)
                {
                    Console.WriteLine($"Il y a déjà {count} comptes dans la base de données. Aucune donnée de test créée.");
                    return;
                }
            }

            // Vérifier s'il y a déjà des clients
            string checkCustomersQuery = "SELECT COUNT(*) FROM \"SavingsCustomers\";";
            using (var checkCustomersCmd = new NpgsqlCommand(checkCustomersQuery, conn))
            {
                var customerCount = Convert.ToInt32(checkCustomersCmd.ExecuteScalar());
                if (customerCount > 0)
                {
                    Console.WriteLine($"Il y a déjà {customerCount} clients dans la base de données. Aucune donnée de test créée.");
                    return;
                }
            }

            Console.WriteLine("=== CRÉATION DE DONNÉES DE TEST ===");

            // Récupérer l'ID de la branche
            string branchQuery = "SELECT \"Id\" FROM \"Branches\" LIMIT 1;";
            int branchId = 0;
            using (var branchCmd = new NpgsqlCommand(branchQuery, conn))
            using (var reader = branchCmd.ExecuteReader())
            {
                if (reader.Read())
                {
                    branchId = reader.GetInt32(0);
                }
                else
                {
                    Console.WriteLine("❌ Aucune branche trouvée. Impossible de créer des comptes.");
                    return;
                }
            }

            // Insérer des clients
            var customerInserts = new[]
            {
                @"INSERT INTO ""SavingsCustomers"" (""Id"", ""FirstName"", ""LastName"", ""DateOfBirth"", ""Gender"", ""Street"", ""Commune"", ""Department"", ""Country"", ""PrimaryPhone"", ""SecondaryPhone"", ""Email"", ""DocumentType"", ""DocumentNumber"", ""IssuedDate"", ""ExpiryDate"", ""IssuingAuthority"", ""Occupation"", ""MonthlyIncome"", ""IsActive"", ""CreatedAt"", ""UpdatedAt"")
                VALUES ('550e8400-e29b-41d4-a716-446655440001', 'Jean', 'Pierre', '1985-05-15', 0, 'Rue du Centre', 'Port-au-Prince', 'Ouest', 'Haïti', '509-1234-5678', '509-8765-4321', 'jean.pierre@email.com', 0, '123456789', '2020-01-01', '2030-01-01', 'ONI', 'Commerçant', 25000, true, NOW(), NOW());",

                @"INSERT INTO ""SavingsCustomers"" (""Id"", ""FirstName"", ""LastName"", ""DateOfBirth"", ""Gender"", ""Street"", ""Commune"", ""Department"", ""Country"", ""PrimaryPhone"", ""Email"", ""DocumentType"", ""DocumentNumber"", ""IssuedDate"", ""ExpiryDate"", ""IssuingAuthority"", ""Occupation"", ""MonthlyIncome"", ""IsActive"", ""CreatedAt"", ""UpdatedAt"")
                VALUES ('550e8400-e29b-41d4-a716-446655440002', 'Marie', 'Joseph', '1990-08-22', 1, 'Avenue Christophe', 'Pétion-Ville', 'Ouest', 'Haïti', '509-2345-6789', 'marie.joseph@email.com', 1, 'P123456', '2021-06-15', '2031-06-15', 'Ministère des Affaires Étrangères', 'Enseignante', 18000, true, NOW(), NOW());",

                @"INSERT INTO ""SavingsCustomers"" (""Id"", ""FirstName"", ""LastName"", ""DateOfBirth"", ""Gender"", ""Street"", ""Commune"", ""Department"", ""Country"", ""PrimaryPhone"", ""SecondaryPhone"", ""Email"", ""DocumentType"", ""DocumentNumber"", ""IssuedDate"", ""ExpiryDate"", ""IssuingAuthority"", ""Occupation"", ""MonthlyIncome"", ""IsActive"", ""CreatedAt"", ""UpdatedAt"")
                VALUES ('550e8400-e29b-41d4-a716-446655440003', 'Pierre', 'Louis', '1978-12-03', 0, 'Boulevard Harry Truman', 'Port-au-Prince', 'Ouest', 'Haïti', '509-3456-7890', '509-9876-5432', 'pierre.louis@email.com', 0, '987654321', '2019-03-10', '2029-03-10', 'ONI', 'Médecin', 45000, true, NOW(), NOW());"
            };

            foreach (var insert in customerInserts)
            {
                using (var cmd = new NpgsqlCommand(insert, conn))
                {
                    cmd.ExecuteNonQuery();
                }
            }
            Console.WriteLine("✅ 3 clients créés");

            // Insérer des comptes d'épargne
            var accountInserts = new[]
            {
                $@"INSERT INTO ""SavingsAccounts"" (""Id"", ""AccountNumber"", ""CustomerId"", ""BranchId"", ""Currency"", ""Balance"", ""AvailableBalance"", ""MinimumBalance"", ""OpeningDate"", ""Status"", ""InterestRate"", ""AccruedInterest"", ""DailyWithdrawalLimit"", ""DailyDepositLimit"", ""MonthlyWithdrawalLimit"", ""MaxBalance"", ""MinWithdrawalAmount"", ""MaxWithdrawalAmount"", ""CreatedAt"", ""UpdatedAt"", ""LastTransactionDate"")
                VALUES ('660e8400-e29b-41d4-a716-446655440001', 'SAV00123456', '550e8400-e29b-41d4-a716-446655440001', {branchId}, 0, 45000, 45000, 500, NOW() - INTERVAL '30 days', 0, 0.02, 0, 50000, 500000, 1000000, 10000000, 100, 50000, NOW() - INTERVAL '30 days', NOW(), NOW() - INTERVAL '5 days');",

                $@"INSERT INTO ""SavingsAccounts"" (""Id"", ""AccountNumber"", ""CustomerId"", ""BranchId"", ""Currency"", ""Balance"", ""AvailableBalance"", ""MinimumBalance"", ""OpeningDate"", ""Status"", ""InterestRate"", ""AccruedInterest"", ""DailyWithdrawalLimit"", ""DailyDepositLimit"", ""MonthlyWithdrawalLimit"", ""MaxBalance"", ""MinWithdrawalAmount"", ""MaxWithdrawalAmount"", ""CreatedAt"", ""UpdatedAt"", ""LastTransactionDate"")
                VALUES ('660e8400-e29b-41d4-a716-446655440002', 'SAV00234567', '550e8400-e29b-41d4-a716-446655440002', {branchId}, 0, 25000, 25000, 500, NOW() - INTERVAL '15 days', 0, 0.02, 0, 50000, 500000, 1000000, 10000000, 100, 50000, NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days', NOW() - INTERVAL '2 days');",

                $@"INSERT INTO ""SavingsAccounts"" (""Id"", ""AccountNumber"", ""CustomerId"", ""BranchId"", ""Currency"", ""Balance"", ""AvailableBalance"", ""MinimumBalance"", ""OpeningDate"", ""Status"", ""InterestRate"", ""AccruedInterest"", ""DailyWithdrawalLimit"", ""DailyDepositLimit"", ""MonthlyWithdrawalLimit"", ""MaxBalance"", ""MinWithdrawalAmount"", ""MaxWithdrawalAmount"", ""CreatedAt"", ""UpdatedAt"", ""LastTransactionDate"")
                VALUES ('660e8400-e29b-41d4-a716-446655440003', 'SAV00345678', '550e8400-e29b-41d4-a716-446655440003', {branchId}, 1, 1500, 1500, 10, NOW() - INTERVAL '60 days', 0, 0.015, 0, 500, 5000, 10000, 100000, 5, 500, NOW() - INTERVAL '60 days', NOW() - INTERVAL '60 days', NOW() - INTERVAL '10 days');"
            };

            foreach (var insert in accountInserts)
            {
                using (var cmd = new NpgsqlCommand(insert, conn))
                {
                    cmd.ExecuteNonQuery();
                }
            }
            Console.WriteLine("✅ 3 comptes d'épargne créés");

            // Insérer des transactions
            var transactionInserts = new[]
            {
                $@"INSERT INTO ""SavingsTransactions"" (""Id"", ""AccountId"", ""Type"", ""Amount"", ""Currency"", ""BalanceBefore"", ""BalanceAfter"", ""Description"", ""Reference"", ""ProcessedBy"", ""BranchId"", ""Status"", ""ProcessedAt"", ""CreatedAt"", ""Fees"")
                VALUES ('770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', 0, 50000, 0, 0, 50000, 'Dépôt initial d''ouverture', 'DEP-20241001-SAV00123456', 'SYSTEM', {branchId}, 0, NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days', 0);",

                $@"INSERT INTO ""SavingsTransactions"" (""Id"", ""AccountId"", ""Type"", ""Amount"", ""Currency"", ""BalanceBefore"", ""BalanceAfter"", ""Description"", ""Reference"", ""ProcessedBy"", ""BranchId"", ""Status"", ""ProcessedAt"", ""CreatedAt"", ""Fees"")
                VALUES ('770e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440002', 0, 25000, 0, 0, 25000, 'Dépôt initial d''ouverture', 'DEP-20241016-SAV00234567', 'SYSTEM', {branchId}, 0, NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days', 0);",

                $@"INSERT INTO ""SavingsTransactions"" (""Id"", ""AccountId"", ""Type"", ""Amount"", ""Currency"", ""BalanceBefore"", ""BalanceAfter"", ""Description"", ""Reference"", ""ProcessedBy"", ""BranchId"", ""Status"", ""ProcessedAt"", ""CreatedAt"", ""Fees"")
                VALUES ('770e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440003', 0, 1500, 1, 0, 1500, 'Dépôt initial d''ouverture', 'DEP-20240811-SAV00345678', 'SYSTEM', {branchId}, 0, NOW() - INTERVAL '60 days', NOW() - INTERVAL '60 days', 0);",

                $@"INSERT INTO ""SavingsTransactions"" (""Id"", ""AccountId"", ""Type"", ""Amount"", ""Currency"", ""BalanceBefore"", ""BalanceAfter"", ""Description"", ""Reference"", ""ProcessedBy"", ""BranchId"", ""Status"", ""ProcessedAt"", ""CreatedAt"", ""Fees"")
                VALUES ('770e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440001', 1, 5000, 0, 50000, 45000, 'Retrait pour achat', 'WD-20241026-SAV00123456', 'SYSTEM', {branchId}, 0, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days', 0);"
            };

            foreach (var insert in transactionInserts)
            {
                using (var cmd = new NpgsqlCommand(insert, conn))
                {
                    cmd.ExecuteNonQuery();
                }
            }
            Console.WriteLine("✅ 4 transactions créées");

            Console.WriteLine("\n=== DONNÉES DE TEST CRÉÉES AVEC SUCCÈS ===");
            Console.WriteLine("Vous pouvez maintenant accéder à la section 'Comptes Clients' dans la sidebar");
            Console.WriteLine("et voir les comptes créés dans l'interface.");
        }
    }
}