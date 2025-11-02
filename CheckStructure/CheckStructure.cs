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

            // Vérifier la structure de SavingsCustomers
            Console.WriteLine("=== STRUCTURE DE SavingsCustomers ===");
            using (var cmd = new NpgsqlCommand("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'SavingsCustomers' ORDER BY ordinal_position;", conn))
            using (var reader = cmd.ExecuteReader())
            {
                while (reader.Read())
                {
                    Console.WriteLine($"{reader.GetString(0)}: {reader.GetString(1)} ({reader.GetString(2)})");
                }
            }

            Console.WriteLine("\n=== STRUCTURE DE SavingsAccounts ===");
            using (var cmd = new NpgsqlCommand("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'SavingsAccounts' ORDER BY ordinal_position;", conn))
            using (var reader = cmd.ExecuteReader())
            {
                while (reader.Read())
                {
                    Console.WriteLine($"{reader.GetString(0)}: {reader.GetString(1)} ({reader.GetString(2)})");
                }
            }
        }
    }
}