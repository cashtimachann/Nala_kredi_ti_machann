using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using NalaCreditAPI.Data;
using NalaCreditAPI.Models;
using Npgsql;

// Configuration pour la connexion PostgreSQL
var configuration = new ConfigurationBuilder()
    .SetBasePath(Directory.GetCurrentDirectory())
    .AddJsonFile("appsettings.json")
    .Build();

var connectionString = configuration.GetConnectionString("DefaultConnection");

Console.WriteLine("🔍 VÉRIFICATION DE LA BASE DE DONNÉES PostgreSQL");
Console.WriteLine("==============================================");
Console.WriteLine($"📡 Connexion: {connectionString?.Replace("JCS823ch!!", "****")}");
Console.WriteLine();

try
{
    // Test de connexion directe avec Npgsql
    using var connection = new NpgsqlConnection(connectionString);
    await connection.OpenAsync();
    
    Console.WriteLine("✅ Connexion PostgreSQL réussie!");
    Console.WriteLine();
    
    // Vérifier les tables existantes
    Console.WriteLine("📋 Tables dans la base de données:");
    var tablesQuery = @"
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;";
    
    using var tablesCmd = new NpgsqlCommand(tablesQuery, connection);
    using var tablesReader = await tablesCmd.ExecuteReaderAsync();
    
    var tables = new List<string>();
    while (await tablesReader.ReadAsync())
    {
        var tableName = tablesReader.GetString(0);
        tables.Add(tableName);
        Console.WriteLine($"   • {tableName}");
    }
    tablesReader.Close();
    
    Console.WriteLine();
    
    // Vérifier les utilisateurs dans AspNetUsers
    if (tables.Contains("AspNetUsers"))
    {
        Console.WriteLine("👥 UTILISATEURS DANS AspNetUsers:");
        var usersQuery = @"
            SELECT ""Id"", ""UserName"", ""Email"", ""FirstName"", ""LastName"", ""Role"", ""IsActive"", ""EmailConfirmed""
            FROM ""AspNetUsers""
            ORDER BY ""Role"";";
        
        using var usersCmd = new NpgsqlCommand(usersQuery, connection);
        using var usersReader = await usersCmd.ExecuteReaderAsync();
        
        var userCount = 0;
        while (await usersReader.ReadAsync())
        {
            userCount++;
            var id = usersReader.GetString(0);
            var userName = usersReader.GetString(1);
            var email = usersReader.GetString(2);
            var firstName = usersReader.IsDBNull(3) ? "N/A" : usersReader.GetString(3);
            var lastName = usersReader.IsDBNull(4) ? "N/A" : usersReader.GetString(4);
            var role = usersReader.GetInt32(5);
            var isActive = usersReader.GetBoolean(6);
            var emailConfirmed = usersReader.GetBoolean(7);
            
            Console.WriteLine($"   {userCount}. 📧 {email}");
            Console.WriteLine($"      👤 {firstName} {lastName}");
            Console.WriteLine($"      🔑 Rôle: {(UserRole)role}");
            Console.WriteLine($"      ✅ Actif: {isActive} | Email confirmé: {emailConfirmed}");
            Console.WriteLine($"      🆔 ID: {id[..8]}...");
            Console.WriteLine();
        }
        usersReader.Close();
        
        if (userCount == 0)
        {
            Console.WriteLine("   ❌ AUCUN UTILISATEUR TROUVÉ!");
            Console.WriteLine("   💡 La table AspNetUsers est vide.");
        }
        else
        {
            Console.WriteLine($"✅ Total: {userCount} utilisateur(s) trouvé(s)");
        }
    }
    else
    {
        Console.WriteLine("❌ Table AspNetUsers introuvable!");
    }
    
    Console.WriteLine();
    
    // Vérifier les rôles
    if (tables.Contains("AspNetRoles"))
    {
        Console.WriteLine("🔐 RÔLES DANS AspNetRoles:");
        var rolesQuery = @"SELECT ""Name"" FROM ""AspNetRoles"" ORDER BY ""Name"";";
        
        using var rolesCmd = new NpgsqlCommand(rolesQuery, connection);
        using var rolesReader = await rolesCmd.ExecuteReaderAsync();
        
        var roleCount = 0;
        while (await rolesReader.ReadAsync())
        {
            roleCount++;
            var roleName = rolesReader.GetString(0);
            Console.WriteLine($"   • {roleName}");
        }
        rolesReader.Close();
        
        Console.WriteLine($"✅ Total: {roleCount} rôle(s)");
    }
    
    Console.WriteLine();
    
    // Vérifier les branches
    if (tables.Contains("Branches"))
    {
        Console.WriteLine("🏢 BRANCHES:");
        var branchesQuery = @"SELECT ""Name"", ""Address"", ""IsActive"" FROM ""Branches"";";
        
        using var branchesCmd = new NpgsqlCommand(branchesQuery, connection);
        using var branchesReader = await branchesCmd.ExecuteReaderAsync();
        
        var branchCount = 0;
        while (await branchesReader.ReadAsync())
        {
            branchCount++;
            var name = branchesReader.GetString(0);
            var address = branchesReader.IsDBNull(1) ? "N/A" : branchesReader.GetString(1);
            var isActive = branchesReader.GetBoolean(2);
            
            Console.WriteLine($"   • {name} ({address}) - Actif: {isActive}");
        }
        branchesReader.Close();
        
        Console.WriteLine($"✅ Total: {branchCount} branche(s)");
    }
    
    await connection.CloseAsync();
}
catch (Exception ex)
{
    Console.WriteLine($"❌ Erreur de connexion: {ex.Message}");
    Console.WriteLine($"🔍 Détails: {ex}");
}

Console.WriteLine();
Console.WriteLine("==============================================");
Console.WriteLine("Appuyez sur une touche pour fermer...");
Console.ReadKey();