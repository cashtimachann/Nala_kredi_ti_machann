#r "nuget: Npgsql, 8.0.0"
#r "nuget: Microsoft.AspNetCore.Identity, 8.0.0"

using Microsoft.AspNetCore.Identity;
using Npgsql;
using System;
using System.Threading.Tasks;

var email = "cashier@nalacredit.com";
var password = "Cashier123!";

// Hash password
var hasher = new PasswordHasher<object>();
var passwordHash = hasher.HashPassword(null, password);

Console.WriteLine("🔐 Updating cashier@nalacredit.com password...");
Console.WriteLine($"New Hash: {passwordHash}");

var connectionString = "Host=localhost;Port=5432;Database=nalakreditimachann_db;Username=postgres;Password=JCS823ch!!";

try
{
    await using var conn = new NpgsqlConnection(connectionString);
    await conn.OpenAsync();
    
    // Update password with SQL
    await using var cmd = new NpgsqlCommand(
        @"UPDATE ""AspNetUsers"" 
          SET ""PasswordHash"" = @hash,
              ""IsActive"" = true,
              ""AccessFailedCount"" = 0,
              ""LockoutEnd"" = NULL
          WHERE ""Email"" = @email", conn);
    
    cmd.Parameters.AddWithValue("hash", passwordHash);
    cmd.Parameters.AddWithValue("email", email);
    
    var rowsAffected = await cmd.ExecuteNonQueryAsync();
    
    if (rowsAffected > 0)
    {
        Console.WriteLine($"✅ Password updated! ({rowsAffected} row(s) affected)");
        Console.WriteLine();
        Console.WriteLine("📋 Login Credentials:");
        Console.WriteLine($"   Email: {email}");
        Console.WriteLine($"   Password: {password}");
    }
    else
    {
        Console.WriteLine("❌ User not found!");
    }
}
catch (Exception ex)
{
    Console.WriteLine($"❌ Error: {ex.Message}");
}
