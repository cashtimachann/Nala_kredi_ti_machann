using System;
using System.Threading.Tasks;
using Npgsql;
using Microsoft.AspNetCore.Identity;
using System.Security.Cryptography;
using System.Text;

class Program
{
    static async Task Main(string[] args)
    {
        var connectionString = "Host=localhost;Database=nalakreditimachann_db;Username=postgres;Password=JCS823ch!!";
        
        Console.WriteLine("🔧 CRÉATION D'UN NOUVEAU SUPERADMIN");
        Console.WriteLine("===================================");
        Console.WriteLine();
        
        // Nouvelles informations du superadmin
        var newEmail = "admin@nalacredit.com";
        var newPassword = "Admin2025!";
        var firstName = "Administrateur";
        var lastName = "Principal";
        
        Console.WriteLine("📝 Nouvelles informations de connexion:");
        Console.WriteLine($"   📧 Email: {newEmail}");
        Console.WriteLine($"   🔐 Mot de passe: {newPassword}");
        Console.WriteLine($"   👤 Nom: {firstName} {lastName}");
        Console.WriteLine();
        
        try
        {
            using var connection = new NpgsqlConnection(connectionString);
            await connection.OpenAsync();
            
            Console.WriteLine("✅ Connexion à PostgreSQL réussie!");
            Console.WriteLine();
            
            // 1. Supprimer l'ancien superadmin s'il existe
            Console.WriteLine("🗑️ Suppression de l'ancien superadmin...");
            var deleteQuery = @"DELETE FROM ""AspNetUsers"" WHERE ""Role"" = 0;";
            
            using var deleteCmd = new NpgsqlCommand(deleteQuery, connection);
            var deletedCount = await deleteCmd.ExecuteNonQueryAsync();
            
            Console.WriteLine($"   ✅ {deletedCount} ancien(s) superadmin(s) supprimé(s)");
            Console.WriteLine();
            
            // 2. Créer le hash du nouveau mot de passe (ASP.NET Core Identity compatible)
            Console.WriteLine("🔐 Génération du hash du mot de passe...");
            var passwordHash = HashPassword(newPassword);
            Console.WriteLine("   ✅ Hash généré avec succès");
            Console.WriteLine();
            
            // 3. Insérer le nouveau superadmin
            Console.WriteLine("👤 Création du nouveau superadmin...");
            var userId = Guid.NewGuid().ToString();
            var now = DateTime.UtcNow;
            
            var insertQuery = @"
                INSERT INTO ""AspNetUsers"" (
                    ""Id"", 
                    ""UserName"", 
                    ""NormalizedUserName"",
                    ""Email"", 
                    ""NormalizedEmail"",
                    ""EmailConfirmed"",
                    ""PasswordHash"",
                    ""SecurityStamp"",
                    ""ConcurrencyStamp"",
                    ""PhoneNumberConfirmed"",
                    ""TwoFactorEnabled"",
                    ""LockoutEnabled"",
                    ""AccessFailedCount"",
                    ""FirstName"",
                    ""LastName"",
                    ""Role"",
                    ""IsActive"",
                    ""CreatedAt""
                ) VALUES (
                    @Id,
                    @UserName,
                    @NormalizedUserName,
                    @Email,
                    @NormalizedEmail,
                    @EmailConfirmed,
                    @PasswordHash,
                    @SecurityStamp,
                    @ConcurrencyStamp,
                    @PhoneNumberConfirmed,
                    @TwoFactorEnabled,
                    @LockoutEnabled,
                    @AccessFailedCount,
                    @FirstName,
                    @LastName,
                    @Role,
                    @IsActive,
                    @CreatedAt
                );";
            
            using var insertCmd = new NpgsqlCommand(insertQuery, connection);
            insertCmd.Parameters.AddWithValue("@Id", userId);
            insertCmd.Parameters.AddWithValue("@UserName", newEmail);
            insertCmd.Parameters.AddWithValue("@NormalizedUserName", newEmail.ToUpperInvariant());
            insertCmd.Parameters.AddWithValue("@Email", newEmail);
            insertCmd.Parameters.AddWithValue("@NormalizedEmail", newEmail.ToUpperInvariant());
            insertCmd.Parameters.AddWithValue("@EmailConfirmed", true);
            insertCmd.Parameters.AddWithValue("@PasswordHash", passwordHash);
            insertCmd.Parameters.AddWithValue("@SecurityStamp", Guid.NewGuid().ToString());
            insertCmd.Parameters.AddWithValue("@ConcurrencyStamp", Guid.NewGuid().ToString());
            insertCmd.Parameters.AddWithValue("@PhoneNumberConfirmed", false);
            insertCmd.Parameters.AddWithValue("@TwoFactorEnabled", false);
            insertCmd.Parameters.AddWithValue("@LockoutEnabled", true);
            insertCmd.Parameters.AddWithValue("@AccessFailedCount", 0);
            insertCmd.Parameters.AddWithValue("@FirstName", firstName);
            insertCmd.Parameters.AddWithValue("@LastName", lastName);
            insertCmd.Parameters.AddWithValue("@Role", 0); // SuperAdmin = 0
            insertCmd.Parameters.AddWithValue("@IsActive", true);
            insertCmd.Parameters.AddWithValue("@CreatedAt", now);
            
            var rowsInserted = await insertCmd.ExecuteNonQueryAsync();
            
            if (rowsInserted > 0)
            {
                Console.WriteLine("   ✅ Nouveau superadmin créé avec succès!");
                Console.WriteLine();
                
                // 4. Vérifier la création
                Console.WriteLine("🔍 Vérification du nouveau superadmin...");
                var verifyQuery = @"
                    SELECT 
                        ""Email"", 
                        ""FirstName"", 
                        ""LastName"", 
                        ""IsActive"", 
                        ""EmailConfirmed"",
                        ""CreatedAt""
                    FROM ""AspNetUsers"" 
                    WHERE ""Role"" = 0;";
                
                using var verifyCmd = new NpgsqlCommand(verifyQuery, connection);
                using var reader = await verifyCmd.ExecuteReaderAsync();
                
                if (await reader.ReadAsync())
                {
                    var email = reader.GetString(0);
                    var fName = reader.GetString(1);
                    var lName = reader.GetString(2);
                    var isActive = reader.GetBoolean(3);
                    var emailConfirmed = reader.GetBoolean(4);
                    var createdAt = reader.GetDateTime(5);
                    
                    Console.WriteLine("   ✅ Superadmin trouvé dans la base:");
                    Console.WriteLine($"      📧 Email: {email}");
                    Console.WriteLine($"      👤 Nom: {fName} {lName}");
                    Console.WriteLine($"      ✅ Actif: {isActive}");
                    Console.WriteLine($"      📧 Email confirmé: {emailConfirmed}");
                    Console.WriteLine($"      📅 Créé: {createdAt:yyyy-MM-dd HH:mm:ss}");
                }
                
                Console.WriteLine();
                Console.WriteLine("🎉 SUCCÈS!");
                Console.WriteLine("===========");
                Console.WriteLine("Le nouveau superadmin a été créé avec succès.");
                Console.WriteLine();
                Console.WriteLine("🔑 INFORMATIONS DE CONNEXION:");
                Console.WriteLine($"   📧 Email/Nom d'utilisateur: {newEmail}");
                Console.WriteLine($"   🔐 Mot de passe: {newPassword}");
                Console.WriteLine();
                Console.WriteLine("💡 Vous pouvez maintenant vous connecter avec ces informations!");
            }
            else
            {
                Console.WriteLine("   ❌ Erreur lors de la création du superadmin");
            }
            
            await connection.CloseAsync();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Erreur: {ex.Message}");
            Console.WriteLine($"💥 Détails: {ex}");
        }
        
        Console.WriteLine();
        Console.WriteLine("===================================");
        Console.WriteLine("✅ Opération terminée.");
        Console.WriteLine("Appuyez sur une touche pour fermer...");
        Console.ReadKey();
    }
    
    // Méthode pour hasher le mot de passe compatible avec ASP.NET Core Identity
    static string HashPassword(string password)
    {
        // Utilise la même méthode que ASP.NET Core Identity v2+
        byte[] salt = new byte[128 / 8];
        using (var rng = RandomNumberGenerator.Create())
        {
            rng.GetBytes(salt);
        }
        
        byte[] hash = new Rfc2898DeriveBytes(password, salt, 10000, HashAlgorithmName.SHA256).GetBytes(256 / 8);
        
        byte[] hashBytes = new byte[salt.Length + hash.Length];
        Array.Copy(salt, 0, hashBytes, 0, salt.Length);
        Array.Copy(hash, 0, hashBytes, salt.Length, hash.Length);
        
        // Format compatible ASP.NET Core Identity
        return "AQAAAAIAAYagAAAAE" + Convert.ToBase64String(hashBytes);
    }
}