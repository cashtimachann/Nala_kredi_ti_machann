using System;
using System.Threading.Tasks;
using Npgsql;

class Program
{
    static async Task Main(string[] args)
    {
        var connectionString = "Host=localhost;Database=nalakreditimachann_db;Username=postgres;Password=JCS823ch!!";
        var fix = args.Length > 0 && (args[0].Equals("--fix", StringComparison.OrdinalIgnoreCase) || args[0].Equals("fix", StringComparison.OrdinalIgnoreCase));
        
        Console.WriteLine("🔍 VÉRIFICATION SUPERADMIN DANS LA BASE DE DONNÉES");
        Console.WriteLine("==================================================");
        Console.WriteLine();
        
        try
        {
            using var connection = new NpgsqlConnection(connectionString);
            await connection.OpenAsync();
            
            Console.WriteLine("✅ Connexion à PostgreSQL réussie!");
            Console.WriteLine();
            
            // Vérifier l'utilisateur spécifique et les SuperAdmin (Role = 5)
            var emailToCheck = "superadmin@nalacredit.com";

            var userQuery = @"
                SELECT 
                    ""Email"",
                    ""FirstName"", 
                    ""LastName"",
                    ""Role"",
                    ""IsActive"",
                    ""EmailConfirmed"",
                    ""CreatedAt""
                FROM ""AspNetUsers"" 
                WHERE ""Email"" = @email
                ORDER BY ""CreatedAt"";";

            using var cmd = new NpgsqlCommand(userQuery, connection);
            cmd.Parameters.AddWithValue("@email", emailToCheck);
            using var reader = await cmd.ExecuteReaderAsync();
            
            var foundUser = false;
            while (await reader.ReadAsync())
            {
                foundUser = true;
                var email = reader.GetString(0);
                var firstName = reader.IsDBNull(1) ? "N/A" : reader.GetString(1);
                var lastName = reader.IsDBNull(2) ? "N/A" : reader.GetString(2);
                var role = reader.GetInt32(3);
                var isActive = reader.GetBoolean(4);
                var emailConfirmed = reader.GetBoolean(5);
                var createdAt = reader.GetDateTime(6);

                string roleName = role switch
                {
                    5 => "SuperAdmin",
                    2 => "Manager",
                    0 => "Cashier",
                    1 => "Employee",
                    3 => "Admin",
                    4 => "SupportTechnique",
                    _ => $"Inconnu ({role})"
                };

                Console.WriteLine("🎯 UTILISATEUR TROUVÉ:");
                Console.WriteLine("======================");
                Console.WriteLine($"   📧 Email: {email}");
                Console.WriteLine($"   👤 Nom: {firstName} {lastName}");
                Console.WriteLine($"   🔑 Rôle: {role} ({roleName})");
                Console.WriteLine($"   ✅ Actif: {(isActive ? "OUI" : "NON")} | Email confirmé: {(emailConfirmed ? "OUI" : "NON")}");
                Console.WriteLine($"   📅 Créé: {createdAt:yyyy-MM-dd HH:mm:ss}");
                Console.WriteLine();
            }
            
            if (!foundUser)
            {
                Console.WriteLine("❌ Utilisateur superadmin@nalacredit.com introuvable dans la base.");
            }
            else if (fix)
            {
                // Mettre à jour le rôle si nécessaire
                reader.Dispose();
                var updateCmd = new NpgsqlCommand(@"UPDATE ""AspNetUsers"" SET ""Role"" = 5 WHERE ""Email"" = @email;", connection);
                updateCmd.Parameters.AddWithValue("@email", emailToCheck);
                var rows = await updateCmd.ExecuteNonQueryAsync();
                Console.WriteLine(rows > 0
                    ? "✅ Rôle mis à jour: SuperAdmin (5) pour superadmin@nalacredit.com"
                    : "⚠️ Aucune ligne mise à jour (peut-être déjà SuperAdmin)");

                // Relire l'utilisateur pour confirmer
                var confirmCmd = new NpgsqlCommand(userQuery, connection);
                confirmCmd.Parameters.AddWithValue("@email", emailToCheck);
                using var confirmReader = await confirmCmd.ExecuteReaderAsync();
                if (await confirmReader.ReadAsync())
                {
                    var newRole = confirmReader.GetInt32(3);
                    Console.WriteLine($"🔁 Nouveau rôle pour {emailToCheck}: {newRole} {(newRole == 5 ? "(SuperAdmin)" : string.Empty)}");
                }
            }
            
            reader.Close();
            
            Console.WriteLine();
            
            // Compter tous les utilisateurs par rôle pour contexte
            Console.WriteLine("📊 STATISTIQUES GÉNÉRALES:");
            Console.WriteLine("==========================");
            
            var roleStatsQuery = @"
                SELECT 
                    ""Role"",
                    COUNT(*) as count
                FROM ""AspNetUsers""
                GROUP BY ""Role""
                ORDER BY ""Role"";";
            
            using var statsCmd = new NpgsqlCommand(roleStatsQuery, connection);
            using var statsReader = await statsCmd.ExecuteReaderAsync();
            
            var totalUsers = 0;
            while (await statsReader.ReadAsync())
            {
                var role = statsReader.GetInt32(0);
                var roleCount = (long)statsReader.GetInt64(1);
                totalUsers += (int)roleCount;
                
                var roleName = role switch
                {
                    5 => "SuperAdmin",
                    2 => "Manager",
                    0 => "Cashier",
                    1 => "Employee",
                    3 => "Admin",
                    4 => "SupportTechnique",
                    _ => $"Rôle inconnu ({role})"
                };
                
                Console.WriteLine($"   • {roleName}: {roleCount} utilisateur(s)");
            }
            
            Console.WriteLine($"   📊 Total général: {totalUsers} utilisateur(s)");
            
            await connection.CloseAsync();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Erreur: {ex.Message}");
            Console.WriteLine($"💥 Détails: {ex}");
        }
        
        Console.WriteLine();
        Console.WriteLine("==================================================");
        Console.WriteLine("✅ Vérification terminée.");
    }
}