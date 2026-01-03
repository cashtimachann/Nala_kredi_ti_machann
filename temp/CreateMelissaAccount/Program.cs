using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using NalaCreditAPI.Data;
using NalaCreditAPI.Models;

var builder = WebApplication.CreateBuilder(args);

// Configure database
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql("Host=localhost;Database=nalakreditimachann_db;Username=postgres;Password=JCS823ch!!"));

// Configure Identity
builder.Services.AddIdentity<User, IdentityRole>(options =>
{
    options.Password.RequireDigit = true;
    options.Password.RequireLowercase = true;
    options.Password.RequireUppercase = true;
    options.Password.RequireNonAlphanumeric = true;
    options.Password.RequiredLength = 8;
})
.AddEntityFrameworkStores<ApplicationDbContext>()
.AddDefaultTokenProviders();

var app = builder.Build();

// Create/Update user
using (var scope = app.Services.CreateScope())
{
    var userManager = scope.ServiceProvider.GetRequiredService<UserManager<User>>();
    var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

    var email = "cashier@nalacredit.com";
    var password = "Cashier123!";
    var firstName = "Cashier";
    var lastName = "Test";

    Console.WriteLine("=" + new string('=', 59));
    Console.WriteLine($"🔐 Creating/Updating account for: {email}");
    Console.WriteLine("=" + new string('=', 59));
    Console.WriteLine();

    var user = await userManager.FindByEmailAsync(email);
    
    if (user != null)
    {
        Console.WriteLine($"⚠️  User already exists: {email}");
        Console.WriteLine($"    Current Status: {(user.IsActive ? "Active" : "Inactive")}");
        Console.WriteLine($"    Current Role: {user.Role}");
        Console.WriteLine("    Updating password...");

        // Reset password
        var token = await userManager.GeneratePasswordResetTokenAsync(user);
        var result = await userManager.ResetPasswordAsync(user, token, password);

        if (result.Succeeded)
        {
            // Update user status
            user.IsActive = true;
            user.Role = UserRole.Cashier;
            user.AccessFailedCount = 0;
            user.LockoutEnd = null;
            
            await userManager.UpdateAsync(user);
            
            Console.WriteLine("✅ Password updated successfully!");
        }
        else
        {
            Console.WriteLine("❌ Password update failed:");
            foreach (var error in result.Errors)
            {
                Console.WriteLine($"   - {error.Description}");
            }
        }
    }
    else
    {
        Console.WriteLine("📝 User not found. Creating new account...");
        
        user = new User
        {
            UserName = email,
            Email = email,
            FirstName = firstName,
            LastName = lastName,
            Role = UserRole.Cashier,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            BranchId = 1,
            PhoneNumber = "+509 1234-5678",
            EmailConfirmed = true
        };

        var result = await userManager.CreateAsync(user, password);

        if (result.Succeeded)
        {
            Console.WriteLine("✅ Account created successfully!");
        }
        else
        {
            Console.WriteLine("❌ Account creation failed:");
            foreach (var error in result.Errors)
            {
                Console.WriteLine($"   - {error.Description}");
            }
        }
    }

    Console.WriteLine();
    Console.WriteLine("=" + new string('=', 59));
    Console.WriteLine("🎉 SUCCESS! Account ready for login");
    Console.WriteLine("=" + new string('=', 59));
    Console.WriteLine();
    Console.WriteLine("📋 Login Credentials:");
    Console.WriteLine($"   Email: {email}");
    Console.WriteLine($"   Password: {password}");
    Console.WriteLine($"   Role: Cashier");
    Console.WriteLine($"   API URL: http://localhost:5000/api");
    Console.WriteLine();
}

Console.WriteLine("Press any key to exit...");
Console.ReadKey();
