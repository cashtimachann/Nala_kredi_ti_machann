using System;
using System.Threading.Tasks;
using Npgsql;

class Program
{
    static async Task Main(string[] args)
    {
        var connectionString = "Host=localhost;Database=nalakreditimachann_db;Username=postgres;Password=JCS823ch!!";
        
        Console.WriteLine("🔍 VÉRIFICATION DES INFORMATIONS SUPERADMIN");
        Console.WriteLine("===========================================");
        Console.WriteLine();
        
        try
        {
            using var connection = new NpgsqlConnection(connectionString);
            await connection.OpenAsync();
            
            Console.WriteLine("✅ Connexion à PostgreSQL réussie!");
            Console.WriteLine();
            
            // Récupérer les informations détaillées du superadmin
            var superAdminQuery = @"
                SELECT 
                    ""Id"",
                    ""UserName"",
                    ""Email"",
                    ""FirstName"", 
                    ""LastName"",
                    ""Role"",
                    ""IsActive"",
                    ""EmailConfirmed"",
                    ""PhoneNumberConfirmed"",
                    ""TwoFactorEnabled"",
                    ""LockoutEnabled"",
                    ""LockoutEnd"",
                    ""AccessFailedCount"",
                    ""PasswordHash"",
                    ""CreatedAt"",
                    ""LastLogin""
                FROM ""AspNetUsers"" 
                WHERE ""Role"" = 0
                ORDER BY ""CreatedAt"";";
            
            using var cmd = new NpgsqlCommand(superAdminQuery, connection);
            using var reader = await cmd.ExecuteReaderAsync();
            
            if (await reader.ReadAsync())
            {
                Console.WriteLine("🎯 INFORMATIONS DÉTAILLÉES DU SUPERADMIN:");
                Console.WriteLine("=========================================");
                
                var id = reader.GetString(0);
                var userName = reader.IsDBNull(1) ? "N/A" : reader.GetString(1);
                var email = reader.GetString(2);
                var firstName = reader.IsDBNull(3) ? "N/A" : reader.GetString(3);
                var lastName = reader.IsDBNull(4) ? "N/A" : reader.GetString(4);
                var role = reader.GetInt32(5);
                var isActive = reader.GetBoolean(6);
                var emailConfirmed = reader.GetBoolean(7);
                var phoneConfirmed = reader.GetBoolean(8);
                var twoFactorEnabled = reader.GetBoolean(9);
                var lockoutEnabled = reader.GetBoolean(10);
                var lockoutEnd = reader.IsDBNull(11) ? (DateTime?)null : reader.GetDateTime(11);
                var accessFailedCount = reader.GetInt32(12);
                var passwordHash = reader.IsDBNull(13) ? "N/A" : reader.GetString(13);
                var createdAt = reader.GetDateTime(14);
                var lastLogin = reader.IsDBNull(15) ? (DateTime?)null : reader.GetDateTime(15);
                
                Console.WriteLine($"📧 Email de connexion: {email}");
                Console.WriteLine($"👤 Nom d'utilisateur: {userName}");
                Console.WriteLine($"🔑 Nom complet: {firstName} {lastName}");
                Console.WriteLine($"🆔 ID: {id}");
                Console.WriteLine();
                
                Console.WriteLine("📊 STATUT DU COMPTE:");
                Console.WriteLine($"   ✅ Actif: {(isActive ? "OUI" : "NON")}");
                Console.WriteLine($"   📧 Email confirmé: {(emailConfirmed ? "OUI" : "NON")}");
                Console.WriteLine($"   📱 Téléphone confirmé: {(phoneConfirmed ? "OUI" : "NON")}");
                Console.WriteLine($"   🔐 2FA activé: {(twoFactorEnabled ? "OUI" : "NON")}");
                Console.WriteLine($"   � Verrouillage activé: {(lockoutEnabled ? "OUI" : "NON")}");
                Console.WriteLine($"   ⚠️ Tentatives échouées: {accessFailedCount}");
                
                if (lockoutEnd.HasValue)
                {
                    Console.WriteLine($"   🕐 Verrouillé jusqu'à: {lockoutEnd.Value:yyyy-MM-dd HH:mm:ss}");
                    if (lockoutEnd.Value > DateTime.UtcNow)
                    {
                        Console.WriteLine("   ⚠️ COMPTE ACTUELLEMENT VERROUILLÉ!");
                    }
                }
                
                Console.WriteLine();
                Console.WriteLine("🔐 MOT DE PASSE:");
                if (passwordHash == "N/A" || string.IsNullOrEmpty(passwordHash))
                {
                    Console.WriteLine("   ❌ AUCUN MOT DE PASSE DÉFINI!");
                    Console.WriteLine("   💡 C'est probablement pourquoi la connexion échoue.");
                }
                else
                {
                    Console.WriteLine("   ✅ Mot de passe défini (hash présent)");
                    Console.WriteLine($"   📝 Hash: {passwordHash[..Math.Min(50, passwordHash.Length)]}...");
                }
                
                Console.WriteLine();
                Console.WriteLine("📅 DATES:");
                Console.WriteLine($"   Créé: {createdAt:yyyy-MM-dd HH:mm:ss}");
                if (lastLogin.HasValue)
                {
                    Console.WriteLine($"   Dernière connexion: {lastLogin.Value:yyyy-MM-dd HH:mm:ss}");
                }
                else
                {
                    Console.WriteLine("   Dernière connexion: Jamais connecté");
                }
            }
            else
            {
                Console.WriteLine("❌ Aucun superadmin trouvé!");
            }
            
            await connection.CloseAsync();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Erreur: {ex.Message}");
        }
        
        Console.WriteLine();
        Console.WriteLine("===========================================");
        Console.WriteLine("✅ Vérification terminée.");
        Console.WriteLine("Appuyez sur une touche pour fermer...");
        Console.ReadKey();
    }
}