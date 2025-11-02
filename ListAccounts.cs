using System;
using Npgsql;

class ListAccounts
{
    static void Main()
    {
        var connString = "Host=localhost;Port=5432;Database=nalacredit_db;Username=postgres;Password=1234";
        
        try
        {
            using var conn = new NpgsqlConnection(connString);
            conn.Open();
            
            Console.WriteLine("\n========================================");
            Console.WriteLine("KONT POU LOGIN DESKTOP APP");
            Console.WriteLine("========================================\n");
            
            var sql = @"
                SELECT 
                    ""Email"",
                    ""UserName"",
                    CASE ""Role""
                        WHEN 0 THEN 'Cashier'
                        WHEN 1 THEN 'Employee'
                        WHEN 2 THEN 'Manager'
                        WHEN 3 THEN 'Admin'
                        WHEN 4 THEN 'SupportTechnique'
                        WHEN 5 THEN 'SuperAdmin'
                        ELSE 'Unknown'
                    END as RoleName,
                    ""Role"",
                    ""AdminType"",
                    ""IsActive"",
                    ""Department"",
                    ""FirstName"",
                    ""LastName""
                FROM ""AspNetUsers""
                WHERE ""Role"" IS NOT NULL
                ORDER BY ""Role"", ""Email"";
            ";
            
            using var cmd = new NpgsqlCommand(sql, conn);
            using var reader = cmd.ExecuteReader();
            
            Console.WriteLine("{0,-40} {1,-20} {2,-15} {3,-10}", 
                "Email", "Nom", "Role", "AdminType");
            Console.WriteLine(new string('=', 90));
            
            int count = 0;
            while (reader.Read())
            {
                var email = reader.GetString(0);
                var username = reader.IsDBNull(1) ? "N/A" : reader.GetString(1);
                var roleName = reader.GetString(2);
                var adminType = reader.IsDBNull(4) ? "NULL" : reader.GetInt32(4).ToString();
                var firstName = reader.IsDBNull(7) ? "" : reader.GetString(7);
                var lastName = reader.IsDBNull(8) ? "" : reader.GetString(8);
                var fullName = $"{firstName} {lastName}".Trim();
                if (string.IsNullOrEmpty(fullName)) fullName = username;
                
                Console.WriteLine("{0,-40} {1,-20} {2,-15} {3,-10}",
                    email, fullName, roleName, adminType);
                count++;
            }
            
            Console.WriteLine(new string('=', 90));
            Console.WriteLine("Total: {0} kont\n", count);
            
            Console.WriteLine("========================================");
            Console.WriteLine("DEFAULT PASSWORDS");
            Console.WriteLine("========================================");
            Console.WriteLine("SuperAdmin:  SuperAdmin123!");
            Console.WriteLine("Manager:     Manager123!");
            Console.WriteLine("Caissier:    Cashier123!");
            Console.WriteLine("Employee:    Employee123!");
            Console.WriteLine("\n========================================");
            Console.WriteLine("MAPPING DESKTOP");
            Console.WriteLine("========================================");
            Console.WriteLine("Cashier (0)          → MainWindow (Caissier Dashboard)");
            Console.WriteLine("Employee (1)         → SecretaryDashboard");
            Console.WriteLine("Manager (2)          → BranchManagerDashboard ⭐");
            Console.WriteLine("Admin (3)            → (Under development)");
            Console.WriteLine("SupportTechnique (4) → SecretaryDashboard");
            Console.WriteLine("SuperAdmin (5)       → (Under development)");
            Console.WriteLine("========================================\n");
        }
        catch (Exception ex)
        {
            Console.WriteLine("Ere: " + ex.Message);
            Console.WriteLine("\nStack: " + ex.StackTrace);
        }
    }
}
