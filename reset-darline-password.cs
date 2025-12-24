using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using NalaCreditAPI.Data;
using NalaCreditAPI.Models;

var connectionString = "Host=localhost;Port=5432;Database=nalakreditimachann_db;Username=nalauser;Password=Nala_kredi823@@!!";

var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
optionsBuilder.UseNpgsql(connectionString);

using var context = new AppDbContext(optionsBuilder.Options);

var userStore = new Microsoft.AspNetCore.Identity.EntityFrameworkCore.UserStore<User>(context);
var passwordHasher = new PasswordHasher<User>();
var userManager = new UserManager<User>(
    userStore,
    null,
    passwordHasher,
    null,
    null,
    null,
    null,
    null,
    null
);

// Find Darline
var darline = await context.Users.FirstOrDefaultAsync(u => u.Email == "darline@nalakreditimachann.com");

if (darline != null)
{
    // Reset password to: Cashier123!
    var resetToken = await userManager.GeneratePasswordResetTokenAsync(darline);
    var result = await userManager.ResetPasswordAsync(darline, resetToken, "Cashier123!");
    
    if (result.Succeeded)
    {
        Console.WriteLine("Password reset successfully for darline@nalakreditimachann.com");
        Console.WriteLine("New password: Cashier123!");
    }
    else
    {
        Console.WriteLine("Failed to reset password:");
        foreach (var error in result.Errors)
        {
            Console.WriteLine($"- {error.Description}");
        }
    }
}
else
{
    Console.WriteLine("User not found!");
}
