#r "nuget: Microsoft.AspNetCore.Identity, 8.0.0"
#r "nuget: Npgsql, 8.0.0"

using Microsoft.AspNetCore.Identity;
using Npgsql;
using System;
using System.Threading.Tasks;

// Create a test cashier account FOR LOCAL DATABASE
var email = "melissa.jean@gmail.com";
var password = "Jesus123!!";
var firstName = "Melissa";
var lastName = "Jean";

// Hash the password using ASP.NET Core Identity
var hasher = new PasswordHasher<object>();
var passwordHash = hasher.HashPassword(null, password);

Console.WriteLine("=" * 60);
Console.WriteLine($"🔐 Creating account for: {email}");
Console.WriteLine($"📧 Password: {password}");
Console.WriteLine($"🔒 Hash: {passwordHash}");
Console.WriteLine("=" * 60);
Console.WriteLine();

// Connect to LOCAL database
var connectionString = "Host=localhost;Port=5432;Database=nalakreditimachann_db;Username=postgres;Password=JCS823ch!!";

try
{
    await using var conn = new NpgsqlConnection(connectionString);
    await conn.OpenAsync();
    Console.WriteLine("✅ Connected to LOCAL database");
    Console.WriteLine();
    
    // Check if user exists
    await using (var checkCmd = new NpgsqlCommand(
        @"SELECT ""Email"", ""IsActive"", ""Role"" FROM ""AspNetUsers"" WHERE ""Email"" = @email", conn))
    {
        checkCmd.Parameters.AddWithValue("email", email);
        await using var reader = await checkCmd.ExecuteReaderAsync();
        if (await reader.ReadAsync())
        {
            var isActive = reader.GetBoolean(1);
            var role = reader.GetInt32(2);
            Console.WriteLine($"⚠️  User already exists: {email}");
            Console.WriteLine($"    Current Status: {(isActive ? "Active" : "Inactive")}");
            Console.WriteLine($"    Current Role: {role}");
            Console.WriteLine("    Updating password...");
            reader.Close();
            
            // Update existing user
            await using var updateCmd = new NpgsqlCommand(
                @"UPDATE ""AspNetUsers"" 
                  SET ""PasswordHash"" = @hash, 
                      ""IsActive"" = true,
                      ""Role"" = 0,
                      ""AccessFailedCount"" = 0,
                      ""LockoutEnd"" = NULL
                  WHERE ""Email"" = @email", conn);
            updateCmd.Parameters.AddWithValue("hash", passwordHash);
            updateCmd.Parameters.AddWithValue("email", email);
            var rowsAffected = await updateCmd.ExecuteNonQueryAsync();
            
            Console.WriteLine($"✅ Password updated! ({rowsAffected} row(s) affected)");
        }
        else
        {
            reader.Close();
            
            Console.WriteLine("📝 User not found. Creating new account...");
            
            // Create new user
            await using var insertCmd = new NpgsqlCommand(
                @"INSERT INTO ""AspNetUsers"" 
                  (""Id"", ""UserName"", ""NormalizedUserName"", ""Email"", ""NormalizedEmail"",
                   ""EmailConfirmed"", ""PasswordHash"", ""SecurityStamp"", ""ConcurrencyStamp"",
                   ""PhoneNumberConfirmed"", ""TwoFactorEnabled"", ""LockoutEnabled"", ""AccessFailedCount"",
                   ""FirstName"", ""LastName"", ""Role"", ""IsActive"", ""CreatedAt"", ""BranchId"", ""PhoneNumber"")
                  VALUES 
                  (@id, @username, @normalizedUsername, @email, @normalizedEmail,
                   true, @passwordHash, @securityStamp, @concurrencyStamp,
                   false, false, true, 0,
                   @firstName, @lastName, 0, true, NOW(), 1, '+509 1234-5678')", conn);
            
            insertCmd.Parameters.AddWithValue("id", Guid.NewGuid().ToString());
            insertCmd.Parameters.AddWithValue("username", email);
            insertCmd.Parameters.AddWithValue("normalizedUsername", email.ToUpper());
            insertCmd.Parameters.AddWithValue("email", email);
            insertCmd.Parameters.AddWithValue("normalizedEmail", email.ToUpper());
            insertCmd.Parameters.AddWithValue("passwordHash", passwordHash);
            insertCmd.Parameters.AddWithValue("securityStamp", Guid.NewGuid().ToString());
            insertCmd.Parameters.AddWithValue("concurrencyStamp", Guid.NewGuid().ToString());
            insertCmd.Parameters.AddWithValue("firstName", firstName);
            insertCmd.Parameters.AddWithValue("lastName", lastName);
            
            var rowsAffected = await insertCmd.ExecuteNonQueryAsync();
            Console.WriteLine($"✅ Account created! ({rowsAffected} row(s) affected)");
        }
    }
    
    Console.WriteLine();
    Console.WriteLine("=" * 60);
    Console.WriteLine("🎉 SUCCESS! Account ready for login");
    Console.WriteLine("=" * 60);
    Console.WriteLine();
    Console.WriteLine("📋 Login Credentials:");
    Console.WriteLine($"   Email: {email}");
    Console.WriteLine($"   Password: {password}");
    Console.WriteLine($"   Role: Cashier (0)");
    Console.WriteLine($"   API URL: http://localhost:5000/api");
    Console.WriteLine();
}
catch (Exception ex)
{
    Console.WriteLine($"❌ ERROR: {ex.Message}");
    Console.WriteLine($"   Stack trace: {ex.StackTrace}");
}
