using Microsoft.AspNetCore.Identity;
using Npgsql;
using System;
using System.Threading.Tasks;

// Create a test cashier account
var email = "melissa.jean@gmail.com";
var password = "Jesus123!!";
var firstName = "Melissa";
var lastName = "Jean";

// Hash the password
var hasher = new PasswordHasher<object>();
var passwordHash = hasher.HashPassword(null, password);

Console.WriteLine($"Creating account for: {email}");
Console.WriteLine($"Password: {password}");
Console.WriteLine($"Hash: {passwordHash}");
Console.WriteLine();

// Connect to database
var connectionString = "Host=142.93.78.111;Port=5432;Database=nalakreditimachann_db;Username=nalauser;Password=Nala_kredi823@@!!";

try
{
    await using var conn = new NpgsqlConnection(connectionString);
    await conn.OpenAsync();
    
    // Check if user exists
    await using (var checkCmd = new NpgsqlCommand(
        @"SELECT ""Email"", ""IsActive"" FROM ""AspNetUsers"" WHERE ""Email"" = @email", conn))
    {
        checkCmd.Parameters.AddWithValue("email", email);
        await using var reader = await checkCmd.ExecuteReaderAsync();
        if (await reader.ReadAsync())
        {
            Console.WriteLine($"⚠️  User already exists: {email}");
            Console.WriteLine("    Updating password...");
            reader.Close();
            
            // Update existing user
            await using var updateCmd = new NpgsqlCommand(
                @"UPDATE ""AspNetUsers"" 
                  SET ""PasswordHash"" = @hash, 
                      ""IsActive"" = true,
                      ""Role"" = 0
                  WHERE ""Email"" = @email", conn);
            updateCmd.Parameters.AddWithValue("hash", passwordHash);
            updateCmd.Parameters.AddWithValue("email", email);
            await updateCmd.ExecuteNonQueryAsync();
            
            Console.WriteLine("✅ Password updated!");
        }
        else
        {
            reader.Close();
            
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
            
            await insertCmd.ExecuteNonQueryAsync();
            
            Console.WriteLine("✅ User created successfully!");
        }
    }
    
    Console.WriteLine();
    Console.WriteLine("You can now login with:");
    Console.WriteLine($"  Email: {email}");
    Console.WriteLine($"  Password: {password}");
}
catch (Exception ex)
{
    Console.WriteLine($"❌ Error: {ex.Message}");
    Console.WriteLine($"Details: {ex}");
}
