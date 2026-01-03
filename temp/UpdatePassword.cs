using Microsoft.AspNetCore.Identity;
using Npgsql;

var email = "cashier@nalacredit.com";
var password = "Cashier123!";

// Hash password
var hasher = new PasswordHasher<object>();
var passwordHash = hasher.HashPassword(null, password);

Console.WriteLine($"Updating {email}...");

var connectionString = "Host=localhost;Port=5432;Database=nalakreditimachann_db;Username=postgres;Password=JCS823ch!!";

try
{
    using var conn = new NpgsqlConnection(connectionString);
    conn.Open();
    
    using var cmd = new NpgsqlCommand(
        @"UPDATE ""AspNetUsers"" 
          SET ""PasswordHash"" = @hash,
              ""IsActive"" = true,
              ""AccessFailedCount"" = 0,
              ""LockoutEnd"" = NULL
          WHERE ""Email"" = @email", conn);
    
    cmd.Parameters.AddWithValue("hash", passwordHash);
    cmd.Parameters.AddWithValue("email", email);
    
    var rows = cmd.ExecuteNonQuery();
    
    Console.WriteLine($"Updated {rows} user(s)");
    Console.WriteLine($"Email: {email}");
    Console.WriteLine($"Password: {password}");
}
catch (Exception ex)
{
    Console.WriteLine($"Error: {ex.Message}");
}
