using System;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Identity;
using Npgsql;

class CreateSuperAdmin
{
    // Update connection string to production values
    private static readonly string ConnectionString = "Host=localhost;Database=nalakreditimachann_db;Username=postgres;Password=JCS823ch!!;Include Error Detail=true";
    
    static async Task Main(string[] args)
    {
        Console.WriteLine("========================================");
        Console.WriteLine("   KREYASYON SUPERADMIN");
        Console.WriteLine("========================================");
        Console.WriteLine("");
        
        var email = "superadmin@nalacredit.com";
        var password = "Admin@2024!";
        var firstName = "Super";
        var lastName = "Admin";
        
        // Use ASP.NET Core Identity PasswordHasher
        var hasher = new PasswordHasher<object>();
        var passwordHash = hasher.HashPassword(null, password);
        
        Console.WriteLine($"Email: {email}");
        Console.WriteLine($"Password: {password}");
        Console.WriteLine($"Hash: {passwordHash[..50]}...");
        Console.WriteLine("");

        try
        {
            await using var connection = new NpgsqlConnection(ConnectionString);
            await connection.OpenAsync();
            Console.WriteLine("✅ Koneksyon database etabli");
            Console.WriteLine("");

            // Check if user already exists
            var checkUserQuery = @"SELECT ""Id"" FROM ""AspNetUsers"" WHERE ""Email"" = @email";
            string? existingUserId = null;
            await using (var cmd = new NpgsqlCommand(checkUserQuery, connection))
            {
                cmd.Parameters.AddWithValue("email", email);
                await using var reader = await cmd.ExecuteReaderAsync();
                if (await reader.ReadAsync())
                {
                    existingUserId = reader.GetString(0);
                }
            }

            string userId;
            if (existingUserId != null)
            {
                // Update existing user's password
                Console.WriteLine("⚠️  Kont deja egziste, ap mete ajou password la");
                userId = existingUserId;
                
                var updateQuery = @"
                    UPDATE ""AspNetUsers"" 
                    SET 
                        ""PasswordHash"" = @passwordHash,
                        ""SecurityStamp"" = @securityStamp,
                        ""ConcurrencyStamp"" = @concurrencyStamp,
                        ""IsActive"" = true,
                        ""Role"" = 5
                    WHERE ""Id"" = @userId
                ";
                
                await using (var cmd = new NpgsqlCommand(updateQuery, connection))
                {
                    cmd.Parameters.AddWithValue("userId", userId);
                    cmd.Parameters.AddWithValue("passwordHash", passwordHash);
                    cmd.Parameters.AddWithValue("securityStamp", Guid.NewGuid().ToString());
                    cmd.Parameters.AddWithValue("concurrencyStamp", Guid.NewGuid().ToString());
                    await cmd.ExecuteNonQueryAsync();
                }
                Console.WriteLine("✅ Password mete ajou");
            }
            else
            {
                // Create new user
                userId = Guid.NewGuid().ToString();
                var insertUserQuery = @"
                    INSERT INTO ""AspNetUsers"" (
                        ""Id"", ""UserName"", ""NormalizedUserName"", ""Email"", ""NormalizedEmail"",
                        ""EmailConfirmed"", ""PasswordHash"", ""SecurityStamp"", ""ConcurrencyStamp"",
                        ""PhoneNumberConfirmed"", ""TwoFactorEnabled"", ""LockoutEnabled"", ""AccessFailedCount"",
                        ""FirstName"", ""LastName"", ""Role"", ""IsActive"", ""CreatedAt""
                    )
                    VALUES (
                        @userId, @email, @normalizedEmail, @email, @normalizedEmail,
                        true, @passwordHash, @securityStamp, @concurrencyStamp,
                        false, false, true, 0,
                        @firstName, @lastName, 5, true, @createdAt
                    )
                ";

                await using (var cmd = new NpgsqlCommand(insertUserQuery, connection))
                {
                    cmd.Parameters.AddWithValue("userId", userId);
                    cmd.Parameters.AddWithValue("email", email);
                    cmd.Parameters.AddWithValue("normalizedEmail", email.ToUpper());
                    cmd.Parameters.AddWithValue("passwordHash", passwordHash);
                    cmd.Parameters.AddWithValue("securityStamp", Guid.NewGuid().ToString());
                    cmd.Parameters.AddWithValue("concurrencyStamp", Guid.NewGuid().ToString());
                    cmd.Parameters.AddWithValue("firstName", firstName);
                    cmd.Parameters.AddWithValue("lastName", lastName);
                    cmd.Parameters.AddWithValue("createdAt", DateTime.UtcNow);
                    await cmd.ExecuteNonQueryAsync();
                }
                Console.WriteLine("✅ Itilizatè SuperAdmin kreye");
            }

            // Get SuperAdmin role ID from database
            var getRoleIdQuery = @"SELECT ""Id"" FROM ""AspNetRoles"" WHERE ""Name"" = 'SuperAdmin' LIMIT 1";
            string? roleId = null;
            await using (var cmd = new NpgsqlCommand(getRoleIdQuery, connection))
            {
                await using var reader = await cmd.ExecuteReaderAsync();
                if (await reader.ReadAsync())
                {
                    roleId = reader.GetString(0);
                }
            }

            if (roleId == null)
            {
                Console.WriteLine("❌ Wòl SuperAdmin pa jwenn nan database");
                return;
            }

            // Add user to SuperAdmin role
            var insertRoleQuery = @"
                INSERT INTO ""AspNetUserRoles"" (""UserId"", ""RoleId"")
                VALUES (@userId, @roleId)
                ON CONFLICT DO NOTHING
            ";

            await using (var cmd = new NpgsqlCommand(insertRoleQuery, connection))
            {
                cmd.Parameters.AddWithValue("userId", userId);
                cmd.Parameters.AddWithValue("roleId", roleId);
                await cmd.ExecuteNonQueryAsync();
            }
            Console.WriteLine("✅ Wòl SuperAdmin ajoute");

            Console.WriteLine("");
            Console.WriteLine("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            Console.WriteLine("✅ SUPERADMIN KREYE AK SIKSÈ!");
            Console.WriteLine("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            Console.WriteLine("");
            Console.WriteLine($"   📧 Email: {email}");
            Console.WriteLine($"   🔑 Password: {password}");
            Console.WriteLine($"   🌐 URL: https://admin.nalakreditimachann.com/login");
            Console.WriteLine("");
            Console.WriteLine("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ ERE: {ex.Message}");
            Console.WriteLine(ex.StackTrace);
        }
    }
}
