using System;
using System.Threading.Tasks;
using Npgsql;

class CheckCustomer
{
    static async Task Main(string[] args)
    {
        var connString = "Host=localhost;Database=nalakreditimachann_db;Username=postgres;Password=JCS823ch!!";
        
        try
        {
            await using var conn = new NpgsqlConnection(connString);
            await conn.OpenAsync();
            
            // Check if customer MJ5380 exists
            var query = @"SELECT ""Id"", ""FirstName"", ""LastName"", ""Contact_PrimaryPhone"", ""IsActive""
                         FROM ""SavingsCustomers""
                         WHERE ""Id"" = @id";
            
            await using var cmd = new NpgsqlCommand(query, conn);
            cmd.Parameters.AddWithValue("id", "MJ5380");
            
            await using var reader = await cmd.ExecuteReaderAsync();
            
            if (await reader.ReadAsync())
            {
                Console.WriteLine("✓ Kliyan jwenn!");
                Console.WriteLine($"  ID: {reader.GetString(0)}");
                Console.WriteLine($"  Non: {reader.GetString(1)} {reader.GetString(2)}");
                Console.WriteLine($"  Telefòn: {reader.GetString(3)}");
                Console.WriteLine($"  Aktif: {(reader.GetBoolean(4) ? "Wi" : "Non")}");
                
                await reader.CloseAsync();
                
                // Check accounts
                var accountQuery = @"SELECT COUNT(*) as count
                                    FROM ""SavingsAccounts""
                                    WHERE ""CustomerId"" = @id";
                
                await using var accountCmd = new NpgsqlCommand(accountQuery, conn);
                accountCmd.Parameters.AddWithValue("id", "MJ5380");
                
                var accountCount = await accountCmd.ExecuteScalarAsync();
                Console.WriteLine($"\n  Nonb kont: {accountCount}");
            }
            else
            {
                Console.WriteLine("✗ Kliyan MJ5380 pa jwenn nan baz done a");
                
                await reader.CloseAsync();
                
                // Check similar IDs
                var similarQuery = @"SELECT ""Id"", ""FirstName"", ""LastName""
                                    FROM ""SavingsCustomers""
                                    WHERE ""Id"" LIKE 'MJ%'
                                    LIMIT 5";
                
                await using var similarCmd = new NpgsqlCommand(similarQuery, conn);
                await using var similarReader = await similarCmd.ExecuteReaderAsync();
                
                Console.WriteLine("\nKliyan ki gen ID ki sanble (ki kòmanse ak 'MJ'):");
                while (await similarReader.ReadAsync())
                {
                    Console.WriteLine($"  - {similarReader.GetString(0)}: {similarReader.GetString(1)} {similarReader.GetString(2)}");
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Erè: {ex.Message}");
        }
    }
}
