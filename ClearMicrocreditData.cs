using System;
using Npgsql;

class ClearMicrocreditData
{
    static void Main()
    {
        string connectionString = "Host=localhost;Database=nalakreditimachann_db;Username=postgres;Password=JCS823ch!!";
        
        Console.WriteLine("========================================");
        Console.WriteLine("  EFASAJ DONE MIKWOKREDI");
        Console.WriteLine("========================================");
        Console.WriteLine();
        
        try
        {
            using var conn = new NpgsqlConnection(connectionString);
            conn.Open();
            
            // 1. Afiche done kounye a
            Console.WriteLine("1. Verifye done kounye a...");
            Console.WriteLine();
            
            var cmdCheck = new NpgsqlCommand(@"
                SELECT 
                    (SELECT COUNT(*) FROM ""MicrocreditLoanApplications"" WHERE ""ApplicationStatus"" IN ('Draft', 'Submitted', 'UnderReview', 'Pending')) as applications,
                    (SELECT COUNT(*) FROM ""MicrocreditLoans"" WHERE ""Status"" IN ('Active', 'Overdue')) as active_loans,
                    (SELECT COUNT(*) FROM ""MicrocreditLoans"" WHERE ""Status"" = 'Approved') as approved_loans
            ", conn);
            
            using (var reader = cmdCheck.ExecuteReader())
            {
                if (reader.Read())
                {
                    Console.WriteLine($"   Nouvelles Demandes (Pending): {reader.GetInt64(0)}");
                    Console.WriteLine($"   Prêts Actifs: {reader.GetInt64(1)}");
                    Console.WriteLine($"   Prêts à Décaisser: {reader.GetInt64(2)}");
                }
            }
            
            Console.WriteLine();
            Console.Write("Ou vle efase done sa yo? (tape OUI pou kontinye): ");
            string confirm = Console.ReadLine();
            
            if (confirm != "OUI")
            {
                Console.WriteLine("Operasyon anile!");
                return;
            }
            
            Console.WriteLine();
            Console.WriteLine("2. Efasaj done...");
            
            // 2. Efase done
            using (var transaction = conn.BeginTransaction())
            {
                try
                {
                    // Efase payments
                    var cmd1 = new NpgsqlCommand(@"
                        DELETE FROM ""MicrocreditPayments"" 
                        WHERE ""LoanId"" IN (
                            SELECT ""Id"" FROM ""MicrocreditLoans"" 
                            WHERE ""Status"" IN ('Pending', 'Approved', 'Active', 'Overdue')
                        )
                    ", conn, transaction);
                    int payments = cmd1.ExecuteNonQuery();
                    Console.WriteLine($"   - {payments} payments efase");
                    
                    // Efase guarantees
                    var cmd2 = new NpgsqlCommand(@"
                        DELETE FROM ""MicrocreditGuarantees"" 
                        WHERE ""ApplicationId"" IN (
                            SELECT ""Id"" FROM ""MicrocreditLoanApplications"" 
                            WHERE ""ApplicationStatus"" IN ('Draft', 'Submitted', 'UnderReview', 'Pending', 'Approved')
                        )
                    ", conn, transaction);
                    int guarantees = cmd2.ExecuteNonQuery();
                    Console.WriteLine($"   - {guarantees} guarantees efase");
                    
                    // Efase documents
                    var cmd3 = new NpgsqlCommand(@"
                        DELETE FROM ""MicrocreditDocuments"" 
                        WHERE ""ApplicationId"" IN (
                            SELECT ""Id"" FROM ""MicrocreditLoanApplications"" 
                            WHERE ""ApplicationStatus"" IN ('Draft', 'Submitted', 'UnderReview', 'Pending', 'Approved')
                        )
                    ", conn, transaction);
                    int documents = cmd3.ExecuteNonQuery();
                    Console.WriteLine($"   - {documents} documents efase");
                    
                    // Efase loans
                    var cmd4 = new NpgsqlCommand(@"
                        DELETE FROM ""MicrocreditLoans"" 
                        WHERE ""Status"" IN ('Pending', 'Approved', 'Active', 'Overdue')
                    ", conn, transaction);
                    int loans = cmd4.ExecuteNonQuery();
                    Console.WriteLine($"   - {loans} loans efase");
                    
                    // Efase applications
                    var cmd5 = new NpgsqlCommand(@"
                        DELETE FROM ""MicrocreditLoanApplications"" 
                        WHERE ""ApplicationStatus"" IN ('Draft', 'Submitted', 'UnderReview', 'Pending', 'Approved')
                    ", conn, transaction);
                    int applications = cmd5.ExecuteNonQuery();
                    Console.WriteLine($"   - {applications} applications efase");
                    
                    transaction.Commit();
                    Console.WriteLine();
                    Console.WriteLine("Done efase avek sikse!");
                }
                catch (Exception ex)
                {
                    transaction.Rollback();
                    Console.WriteLine($"Erè: {ex.Message}");
                    throw;
                }
            }
            
            // 3. Verifye rezilta
            Console.WriteLine();
            Console.WriteLine("3. Verifye rezilta...");
            Console.WriteLine();
            
            var cmdCheckAfter = new NpgsqlCommand(@"
                SELECT 
                    (SELECT COUNT(*) FROM ""MicrocreditLoanApplications"" WHERE ""ApplicationStatus"" IN ('Draft', 'Submitted', 'UnderReview', 'Pending')) as applications,
                    (SELECT COUNT(*) FROM ""MicrocreditLoans"" WHERE ""Status"" IN ('Active', 'Overdue')) as active_loans,
                    (SELECT COUNT(*) FROM ""MicrocreditLoans"" WHERE ""Status"" = 'Approved') as approved_loans
            ", conn);
            
            using (var reader = cmdCheckAfter.ExecuteReader())
            {
                if (reader.Read())
                {
                    Console.WriteLine($"   Nouvelles Demandes restantes: {reader.GetInt64(0)}");
                    Console.WriteLine($"   Prêts Actifs restants: {reader.GetInt64(1)}");
                    Console.WriteLine($"   Prêts à Décaisser restants: {reader.GetInt64(2)}");
                }
            }
            
            Console.WriteLine();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Erè: {ex.Message}");
        }
    }
}
