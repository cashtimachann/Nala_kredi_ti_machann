using Microsoft.EntityFrameworkCore;
using NalaCreditAPI.Data;
using NalaCreditAPI.Models;
using Microsoft.AspNetCore.Identity;

// Script pour vérifier et créer un compte Chef de Succursale (Manager)
Console.WriteLine("=== Vérification Compte Chef de Succursale ===\n");

var optionsBuilder = new DbContextOptionsBuilder<ApplicationDbContext>();
optionsBuilder.UseNpgsql("Host=localhost;Port=5432;Database=nalakreditimachann;Username=postgres;Password=admin");

using var context = new ApplicationDbContext(optionsBuilder.Options);

// 1. Vérifier si un Manager existe déjà
Console.WriteLine("1. Recherche de comptes Manager...");
var managers = await context.Users
    .Include(u => u.Branch)
    .Where(u => u.Role == UserRole.Manager)
    .ToListAsync();

if (managers.Any())
{
    Console.WriteLine($"\n✅ {managers.Count} compte(s) Manager trouvé(s):\n");
    foreach (var manager in managers)
    {
        Console.WriteLine($"   ID: {manager.Id}");
        Console.WriteLine($"   Nom: {manager.FirstName} {manager.LastName}");
        Console.WriteLine($"   Email: {manager.Email}");
        Console.WriteLine($"   Role: {manager.Role} (Manager)");
        Console.WriteLine($"   Actif: {(manager.IsActive ? "✅ Oui" : "❌ Non")}");
        Console.WriteLine($"   Branche: {manager.Branch?.Name ?? "Aucune"}");
        Console.WriteLine($"   Date embauche: {manager.HireDate:yyyy-MM-dd}");
        Console.WriteLine();
    }
    
    Console.WriteLine("✅ Vous pouvez utiliser ces identifiants pour tester le dashboard.");
    Environment.Exit(0);
}

// 2. Aucun Manager trouvé, en créer un
Console.WriteLine("❌ Aucun compte Manager trouvé.\n");
Console.WriteLine("2. Création d'un compte Manager de test...\n");

// Vérifier qu'il existe une branche
var branch = await context.Branches.FirstOrDefaultAsync();
if (branch == null)
{
    Console.WriteLine("❌ ERREUR: Aucune branche trouvée. Créez d'abord une branche.");
    Environment.Exit(1);
}

Console.WriteLine($"   Branche sélectionnée: {branch.Name}\n");

// Créer le Manager
var passwordHasher = new PasswordHasher<User>();
var manager = new User
{
    Id = Guid.NewGuid(),
    FirstName = "Pierre",
    LastName = "Manager",
    Email = "manager@nalacredit.ht",
    Role = UserRole.Manager,
    IsActive = true,
    BranchId = branch.Id,
    HireDate = DateTime.UtcNow,
    Department = "Direction Succursale",
    CreatedAt = DateTime.UtcNow
};

// Hash le mot de passe "Manager123!"
manager.PasswordHash = passwordHasher.HashPassword(manager, "Manager123!");

try
{
    context.Users.Add(manager);
    await context.SaveChangesAsync();
    
    Console.WriteLine("✅ Compte Manager créé avec succès!\n");
    Console.WriteLine("=== IDENTIFIANTS DE CONNEXION ===");
    Console.WriteLine($"Email:        {manager.Email}");
    Console.WriteLine($"Mot de passe: Manager123!");
    Console.WriteLine($"Role:         Manager (Chef de Succursale)");
    Console.WriteLine($"Branche:      {branch.Name}");
    Console.WriteLine("\n✅ Utilisez ces identifiants pour vous connecter et tester le dashboard.");
}
catch (Exception ex)
{
    Console.WriteLine($"❌ ERREUR lors de la création: {ex.Message}");
    Environment.Exit(1);
}
