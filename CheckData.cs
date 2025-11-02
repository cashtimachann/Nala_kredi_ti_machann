using Microsoft.EntityFrameworkCore;
using NalaCreditAPI.Data;
using System;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

    Console.WriteLine("=== VÉRIFICATION DES COMPTES D'ÉPARGNE ===");

    var savingsAccounts = await context.SavingsAccounts.ToListAsync();
    Console.WriteLine($"Nombre total de comptes d'épargne: {savingsAccounts.Count}");

    if (savingsAccounts.Any())
    {
        Console.WriteLine("\nDétails des comptes:");
        foreach (var account in savingsAccounts)
        {
            Console.WriteLine($"ID: {account.Id}, Numéro: {account.AccountNumber}, Solde: {account.Balance} {account.Currency}, Statut: {account.Status}");
        }
    }
    else
    {
        Console.WriteLine("Aucun compte d'épargne trouvé dans la base de données.");
    }

    Console.WriteLine("\n=== VÉRIFICATION DES CLIENTS ===");

    var customers = await context.SavingsCustomers.ToListAsync();
    Console.WriteLine($"Nombre total de clients: {customers.Count}");

    if (customers.Any())
    {
        Console.WriteLine("\nDétails des clients:");
        foreach (var customer in customers)
        {
            Console.WriteLine($"ID: {customer.Id}, Nom: {customer.FirstName} {customer.LastName}, Téléphone: {customer.PrimaryPhone}");
        }
    }
    else
    {
        Console.WriteLine("Aucun client trouvé dans la base de données.");
    }

    Console.WriteLine("\n=== VÉRIFICATION DES BRANCHES ===");

    var branches = await context.Branches.ToListAsync();
    Console.WriteLine($"Nombre total de branches: {branches.Count}");

    if (branches.Any())
    {
        Console.WriteLine("\nDétails des branches:");
        foreach (var branch in branches)
        {
            Console.WriteLine($"ID: {branch.Id}, Nom: {branch.Name}, Code: {branch.Code}");
        }
    }
    else
    {
        Console.WriteLine("Aucune branche trouvée dans la base de données.");
    }
}