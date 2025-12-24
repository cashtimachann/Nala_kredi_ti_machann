using Microsoft.AspNetCore.Identity;
using Npgsql;

var password = "Test123!!";
var hasher = new PasswordHasher<object>();
var hash = hasher.HashPassword(null, password);

Console.WriteLine($"Password: {password}");
Console.WriteLine($"Hash: {hash}");
Console.WriteLine();

// Insert test user
var connString = "Host=142.93.78.111;Port=5432;Database=nalakreditimachann_db;Username=nalauser;Password=Nala_kredi823@@!!";
await using var conn = new NpgsqlConnection(connString);
await conn.OpenAsync();

var email = "testcashier@nalacredit.com";
var deleteQuery = "DELETE FROM \"AspNetUsers\" WHERE \"Email\" = @email";
await using (var deleteCmd = new NpgsqlCommand(deleteQuery, conn))
{
    deleteCmd.Parameters.AddWithValue("email", email);
    await deleteCmd.ExecuteNonQueryAsync();
}

var insertQuery = @"
INSERT INTO ""AspNetUsers"" 
(""Id"", ""UserName"", ""NormalizedUserName"", ""Email"", ""NormalizedEmail"", 
 ""EmailConfirmed"", ""PasswordHash"", ""SecurityStamp"", ""ConcurrencyStamp"",
 ""PhoneNumberConfirmed"", ""TwoFactorEnabled"", ""LockoutEnabled"", ""AccessFailedCount"",
 ""FirstName"", ""LastName"", ""Role"", ""IsActive"", ""CreatedAt"", ""BranchId"")
VALUES 
(@id, @username, @normalizedUsername, @email, @normalizedEmail,
 true, @passwordHash, @securityStamp, @concurrencyStamp,
 false, false, true, 0,
 @firstName, @lastName, 1, true, NOW(), 1)";

await using var insertCmd = new NpgsqlCommand(insertQuery, conn);
insertCmd.Parameters.AddWithValue("id", Guid.NewGuid().ToString());
insertCmd.Parameters.AddWithValue("username", email);
insertCmd.Parameters.AddWithValue("normalizedUsername", email.ToUpper());
insertCmd.Parameters.AddWithValue("email", email);
insertCmd.Parameters.AddWithValue("normalizedEmail", email.ToUpper());
insertCmd.Parameters.AddWithValue("passwordHash", hash);
insertCmd.Parameters.AddWithValue("securityStamp", Guid.NewGuid().ToString());
insertCmd.Parameters.AddWithValue("concurrencyStamp", Guid.NewGuid().ToString());
insertCmd.Parameters.AddWithValue("firstName", "Test");
insertCmd.Parameters.AddWithValue("lastName", "Cashier");

await insertCmd.ExecuteNonQueryAsync();

Console.WriteLine($"✓ User created: {email}");
Console.WriteLine($"✓ Password: {password}");
Console.WriteLine();
Console.WriteLine("You can now login with:");
Console.WriteLine($"  Email: {email}");
Console.WriteLine($"  Password: {password}");
