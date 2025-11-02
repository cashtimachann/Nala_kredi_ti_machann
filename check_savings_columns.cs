using Npgsql;
using Microsoft.Extensions.Configuration;

var configuration = new ConfigurationBuilder()
    .SetBasePath(Directory.GetCurrentDirectory())
    .AddJsonFile("appsettings.json")
    .Build();

var connectionString = configuration.GetConnectionString("DefaultConnection");

Console.WriteLine("Vérification des colonnes de SavingsCustomers...");

try
{
    using var connection = new NpgsqlConnection(connectionString);
    await connection.OpenAsync();

    var query = @"
        SELECT column_name, data_type, is_nullable, character_maximum_length
        FROM information_schema.columns
        WHERE table_name = 'SavingsCustomers'
        AND table_schema = 'public'
        ORDER BY ordinal_position;";

    using var command = new NpgsqlCommand(query, connection);
    using var reader = await command.ExecuteReaderAsync();

    Console.WriteLine("Colonnes de la table SavingsCustomers:");
    Console.WriteLine("=====================================");

    while (await reader.ReadAsync())
    {
        var columnName = reader.GetString(0);
        var dataType = reader.GetString(1);
        var isNullable = reader.GetString(2);
        var maxLength = reader.IsDBNull(3) ? "N/A" : reader.GetInt32(3).ToString();

        Console.WriteLine($"{columnName,-35} | {dataType,-20} | Nullable: {isNullable,-3} | MaxLength: {maxLength}");
    }

    // Vérifier spécifiquement les colonnes des représentants légaux
    Console.WriteLine("\nColonnes des représentants légaux:");
    Console.WriteLine("==================================");

    var repColumns = new[] {
        "RepresentativeFirstName",
        "RepresentativeLastName",
        "RepresentativeTitle",
        "RepresentativeDocumentType",
        "RepresentativeDocumentNumber",
        "RepresentativeIssuedDate",
        "RepresentativeExpiryDate",
        "RepresentativeIssuingAuthority"
    };

    foreach (var col in repColumns)
    {
        var existsQuery = $"SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'SavingsCustomers' AND column_name = '{col}')";
        using var existsCmd = new NpgsqlCommand(existsQuery, connection);
        var exists = (bool)await existsCmd.ExecuteScalarAsync();
        Console.WriteLine($"{col,-35} | {(exists ? "EXISTS" : "MISSING")}");
    }

    await connection.CloseAsync();
}
catch (Exception ex)
{
    Console.WriteLine($"Erreur: {ex.Message}");
}