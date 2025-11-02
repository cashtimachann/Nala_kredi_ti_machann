using System;
using System.Security.Cryptography;
using System.Text;
using Npgsql;

class CreateTestUsers
{
    private static readonly string ConnectionString = "Host=localhost;Database=nalakreditimachann_db;Username=postgres;Password=JCS823ch!!;Include Error Detail=true";
    
    static async Task Main(string[] args)
    {
        Console.WriteLine("========================================");
        Console.WriteLine("   KREYASYON KONT TEST POU TOUT WOL");
        Console.WriteLine("========================================");
        Console.WriteLine("");
        
        var testUsers = new[]
        {
            new { Email = "cashier@nalacredit.com", Password = "Cashier123!", FirstName = "Marie", LastName = "Caissier", Role = 1, RoleName = "Caissier" },
            new { Email = "secretary@nalacredit.com", Password = "Secretary123!", FirstName = "Jean", LastName = "Secretary", Role = 2, RoleName = "Secrétaire" },
            new { Email = "creditagent@nalacredit.com", Password = "Agent123!", FirstName = "Pierre", LastName = "Agent", Role = 3, RoleName = "Agent de Crédit" },
            new { Email = "branchmanager@nalacredit.com", Password = "Manager123!", FirstName = "Paul", LastName = "Manager", Role = 4, RoleName = "Chef de Succursale" },
            new { Email = "supervisor@nalacredit.com", Password = "Supervisor123!", FirstName = "Sophie", LastName = "Supervisor", Role = 5, RoleName = "Superviseur" },
            new { Email = "admin@nalacredit.com", Password = "Admin2025!", FirstName = "Super", LastName = "Admin", Role = 0, RoleName = "Administrateur" }
        };
        
        try
        {
            using var connection = new NpgsqlConnection(ConnectionString);
            await connection.OpenAsync();
            
            Console.WriteLine("Koneksyon database etabli.");
            Console.WriteLine("");
            
            int created = 0;
            int existing = 0;
            
            foreach (var user in testUsers)
            {
                // Tcheke si itilizatè egziste deja
                var checkUserQuery = "SELECT COUNT(*) FROM \"AspNetUsers\" WHERE \"Email\" = @email";
                using var checkCmd = new NpgsqlCommand(checkUserQuery, connection);
                checkCmd.Parameters.AddWithValue("email", user.Email);
                
                var userExists = (long)(await checkCmd.ExecuteScalarAsync() ?? 0L) > 0;
                
                if (userExists)
                {
                    Console.WriteLine($"[SKIP] {user.RoleName}: {user.Email} - deja egziste");
                    existing++;
                    continue;
                }
                
                // Kreye hash modpas
                string passwordHash = HashPassword(user.Password);
                string newUserId = Guid.NewGuid().ToString();
                
                // Kreye nouvo itilizatè
                var insertUserQuery = @"
                    INSERT INTO ""AspNetUsers"" 
                    (""Id"", ""FirstName"", ""LastName"", ""Role"", ""BranchId"", ""IsActive"", 
                     ""CreatedAt"", ""LastLogin"", ""UserName"", ""NormalizedUserName"", ""Email"", 
                     ""NormalizedEmail"", ""EmailConfirmed"", ""PasswordHash"", ""SecurityStamp"", 
                     ""ConcurrencyStamp"", ""PhoneNumber"", ""PhoneNumberConfirmed"", ""TwoFactorEnabled"", 
                     ""LockoutEnd"", ""LockoutEnabled"", ""AccessFailedCount"")
                    VALUES 
                    (@id, @firstName, @lastName, @role, @branchId, @isActive,
                     @createdAt, @lastLogin, @username, @normalizedUsername, @email,
                     @normalizedEmail, @emailConfirmed, @passwordHash, @securityStamp,
                     @concurrencyStamp, @phoneNumber, @phoneNumberConfirmed, @twoFactorEnabled,
                     @lockoutEnd, @lockoutEnabled, @accessFailedCount)";
                     
                using var insertCmd = new NpgsqlCommand(insertUserQuery, connection);
                insertCmd.Parameters.AddWithValue("id", newUserId);
                insertCmd.Parameters.AddWithValue("firstName", user.FirstName);
                insertCmd.Parameters.AddWithValue("lastName", user.LastName);
                insertCmd.Parameters.AddWithValue("role", user.Role);
                insertCmd.Parameters.AddWithValue("branchId", user.Role == 0 ? DBNull.Value : (object)1); // BranchId = 1 pou tout lòt wòl
                insertCmd.Parameters.AddWithValue("isActive", true);
                insertCmd.Parameters.AddWithValue("createdAt", DateTime.UtcNow);
                insertCmd.Parameters.AddWithValue("lastLogin", DBNull.Value);
                insertCmd.Parameters.AddWithValue("username", user.Email);
                insertCmd.Parameters.AddWithValue("normalizedUsername", user.Email.ToUpper());
                insertCmd.Parameters.AddWithValue("email", user.Email);
                insertCmd.Parameters.AddWithValue("normalizedEmail", user.Email.ToUpper());
                insertCmd.Parameters.AddWithValue("emailConfirmed", true);
                insertCmd.Parameters.AddWithValue("passwordHash", passwordHash);
                insertCmd.Parameters.AddWithValue("securityStamp", Guid.NewGuid().ToString().ToUpper());
                insertCmd.Parameters.AddWithValue("concurrencyStamp", Guid.NewGuid().ToString());
                insertCmd.Parameters.AddWithValue("phoneNumber", DBNull.Value);
                insertCmd.Parameters.AddWithValue("phoneNumberConfirmed", false);
                insertCmd.Parameters.AddWithValue("twoFactorEnabled", false);
                insertCmd.Parameters.AddWithValue("lockoutEnd", DBNull.Value);
                insertCmd.Parameters.AddWithValue("lockoutEnabled", true);
                insertCmd.Parameters.AddWithValue("accessFailedCount", 0);
                
                await insertCmd.ExecuteNonQueryAsync();
                
                Console.WriteLine($"[OK] {user.RoleName}: {user.Email} - kreye avek sikse!");
                created++;
            }
            
            Console.WriteLine("");
            Console.WriteLine("========================================");
            Console.WriteLine($"  REZILTA:");
            Console.WriteLine($"  - {created} kont kreye");
            Console.WriteLine($"  - {existing} kont te deja egziste");
            Console.WriteLine($"  - TOTAL: {testUsers.Length} kont");
            Console.WriteLine("========================================");
            Console.WriteLine("");
            
            // Afiche lis tout kont yo
            Console.WriteLine("LIST KONT YO:");
            Console.WriteLine("");
            Console.WriteLine(String.Format("{0,-35} {1,-25} {2,-10}", "EMAIL", "NON", "WOL"));
            Console.WriteLine(new String('-', 70));
            
            var listQuery = @"
                SELECT ""Email"", ""FirstName"", ""LastName"", ""Role"" 
                FROM ""AspNetUsers"" 
                ORDER BY ""Role""";
                
            using var listCmd = new NpgsqlCommand(listQuery, connection);
            using var reader = await listCmd.ExecuteReaderAsync();
            
            while (await reader.ReadAsync())
            {
                var email = reader.GetString(0);
                var firstName = reader.GetString(1);
                var lastName = reader.GetString(2);
                var role = reader.GetInt32(3);
                var fullName = $"{firstName} {lastName}";
                
                var roleName = role switch
                {
                    0 => "Administrateur",
                    1 => "Caissier",
                    2 => "Secrétaire",
                    3 => "Agent Crédit",
                    4 => "Chef Succursale",
                    5 => "Superviseur",
                    _ => "Inconnu"
                };
                
                Console.WriteLine(String.Format("{0,-35} {1,-25} {2,-10}", email, fullName, roleName));
            }
            
            Console.WriteLine("");
            Console.WriteLine("========================================");
            Console.WriteLine("  Ou ka konekte avek nenpot kont sa yo");
            Console.WriteLine("  nan desktop app oswa web app la!");
            Console.WriteLine("========================================");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"ERE: {ex.Message}");
            Console.WriteLine($"Detay: {ex}");
        }
        
        Console.WriteLine("");
        Console.WriteLine("Peze yon touch pou kontinye...");
        Console.ReadKey();
    }
    
    private static string HashPassword(string password)
    {
        byte[] salt;
        byte[] buffer2;
        if (password == null)
        {
            throw new ArgumentNullException(nameof(password));
        }
        using (var bytes = new Rfc2898DeriveBytes(password, 16, 1000, HashAlgorithmName.SHA1))
        {
            salt = bytes.Salt;
            buffer2 = bytes.GetBytes(32);
        }
        byte[] dst = new byte[49];
        Buffer.BlockCopy(salt, 0, dst, 1, 16);
        Buffer.BlockCopy(buffer2, 0, dst, 17, 32);
        return Convert.ToBase64String(dst);
    }
}
