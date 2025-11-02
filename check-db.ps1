# Script de vérification de la base de données PostgreSQL
param(
    [string]$Server = "localhost",
    [string]$Database = "nalakreditimachann_db", 
    [string]$Username = "postgres",
    [string]$Password = "JCS823ch!!"
)

Write-Host "🔍 VÉRIFICATION BASE DE DONNÉES PostgreSQL" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "📡 Serveur: $Server" -ForegroundColor White
Write-Host "🗄️  Base: $Database" -ForegroundColor White
Write-Host "👤 Utilisateur: $Username" -ForegroundColor White
Write-Host ""

try {
    # Charger l'assembly Npgsql depuis le projet backend
    $backendPath = "C:\Users\Administrator\Desktop\Kredi Ti Machann\backend\NalaCreditAPI\bin\Debug\net8.0"
    if (Test-Path "$backendPath\Npgsql.dll") {
        Add-Type -Path "$backendPath\Npgsql.dll"
        Write-Host "✅ Assembly Npgsql chargé" -ForegroundColor Green
    } else {
        Write-Host "❌ Assembly Npgsql introuvable dans $backendPath" -ForegroundColor Red
        Write-Host "💡 Essayons une méthode alternative..." -ForegroundColor Yellow
        
        # Méthode alternative via dotnet
        $connectionString = "Host=$Server;Database=$Database;Username=$Username;Password=$Password"
        
        Write-Host "🔗 Test de connexion via dotnet..." -ForegroundColor Yellow
        
        # Créer un script C# temporaire pour tester la connexion
        $tempScript = @"
using System;
using Npgsql;
using System.Threading.Tasks;

var connectionString = "$connectionString";
Console.WriteLine("🔗 Tentative de connexion...");

try {
    using var connection = new NpgsqlConnection(connectionString);
    await connection.OpenAsync();
    Console.WriteLine("✅ Connexion PostgreSQL réussie!");
    
    // Compter les utilisateurs
    var userCountQuery = "SELECT COUNT(*) FROM \"AspNetUsers\"";
    using var userCmd = new NpgsqlCommand(userCountQuery, connection);
    var userCount = (long)await userCmd.ExecuteScalarAsync();
    Console.WriteLine($"👥 Nombre d'utilisateurs: {userCount}");
    
    if (userCount > 0) {
        // Lister les utilisateurs
        var usersQuery = "SELECT \"Email\", \"FirstName\", \"LastName\", \"Role\" FROM \"AspNetUsers\" ORDER BY \"Role\"";
        using var usersCmd = new NpgsqlCommand(usersQuery, connection);
        using var reader = await usersCmd.ExecuteReaderAsync();
        
        Console.WriteLine("📋 LISTE DES UTILISATEURS:");
        var count = 0;
        while (await reader.ReadAsync()) {
            count++;
            var email = reader.GetString(0);
            var firstName = reader.IsDBNull(1) ? "N/A" : reader.GetString(1);
            var lastName = reader.IsDBNull(2) ? "N/A" : reader.GetString(2);
            var role = reader.GetInt32(3);
            Console.WriteLine($"   {count}. {email} - {firstName} {lastName} (Rôle: {role})");
        }
    } else {
        Console.WriteLine("❌ AUCUN UTILISATEUR DANS LA BASE!");
    }
    
    await connection.CloseAsync();
} catch (Exception ex) {
    Console.WriteLine($"❌ Erreur: {ex.Message}");
}
"@
        
        # Sauvegarder le script temporaire
        $tempFile = "C:\Users\Administrator\Desktop\Kredi Ti Machann\temp-db-check.cs"
        $tempScript | Out-File -FilePath $tempFile -Encoding UTF8
        
        # Exécuter avec dotnet script ou compiler et exécuter
        Write-Host "⚡ Exécution du test de connexion..." -ForegroundColor Yellow
        
        # Essayer d'exécuter le script
        Push-Location "C:\Users\Administrator\Desktop\Kredi Ti Machann\backend\NalaCreditAPI"
        try {
            # Utiliser la compilation et exécution directe
            $output = dotnet run --no-build -- 2>&1
            Write-Host $output
        } catch {
            Write-Host "❌ Impossible d'exécuter le test via dotnet" -ForegroundColor Red
        }
        Pop-Location
        
        # Nettoyer le fichier temporaire
        if (Test-Path $tempFile) {
            Remove-Item $tempFile -Force
        }
        
        return
    }
} catch {
    Write-Host "❌ Erreur lors du chargement: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Vérification terminée." -ForegroundColor White