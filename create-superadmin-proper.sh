#!/bin/bash

SSH_KEY="$HOME/.ssh/nala_deployment_rsa"
SERVER_IP="142.93.78.111"

echo "🔧 Ap kreye SuperAdmin ak C# PasswordHasher..."
echo ""

ssh -i "$SSH_KEY" root@$SERVER_IP << 'ENDSSH'

cd /var/www/nala-credit

# Kreye yon script C# tanporè pou hash password la
cat > /tmp/create_superadmin.cs << 'EOCS'
using System;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Npgsql;

var email = "superadmin@nalacredit.com";
var password = "Admin@2024!";
var firstName = "Super";
var lastName = "Admin";

// Hash password la
var hasher = new PasswordHasher<object>();
var passwordHash = hasher.HashPassword(null, password);

Console.WriteLine($"Email: {email}");
Console.WriteLine($"Password Hash: {passwordHash}");
Console.WriteLine("");

// Konekte ak database la
var connectionString = "Host=nala-postgres;Port=5432;Database=nalakreditimachann_db;Username=nalauser;Password=Nala_kredi823@@!!";

try 
{
    using var conn = new NpgsqlConnection(connectionString);
    await conn.OpenAsync();
    Console.WriteLine("✅ Konekte ak database");

    var userId = Guid.NewGuid().ToString();
    var securityStamp = Guid.NewGuid().ToString();
    var concurrencyStamp = Guid.NewGuid().ToString();

    // Insert roles si yo pa egziste
    var insertRolesSql = @"
        INSERT INTO ""AspNetRoles"" (""Id"", ""Name"", ""NormalizedName"", ""ConcurrencyStamp"")
        VALUES 
            ('superadmin-role', 'SuperAdmin', 'SUPERADMIN', @stamp1),
            ('admin-role', 'Admin', 'ADMIN', @stamp2),
            ('manager-role', 'Manager', 'MANAGER', @stamp3),
            ('cashier-role', 'Cashier', 'CASHIER', @stamp4),
            ('secretary-role', 'Secretary', 'SECRETARY', @stamp5)
        ON CONFLICT (""Id"") DO NOTHING;
    ";

    using (var cmd = new NpgsqlCommand(insertRolesSql, conn))
    {
        cmd.Parameters.AddWithValue("stamp1", Guid.NewGuid().ToString());
        cmd.Parameters.AddWithValue("stamp2", Guid.NewGuid().ToString());
        cmd.Parameters.AddWithValue("stamp3", Guid.NewGuid().ToString());
        cmd.Parameters.AddWithValue("stamp4", Guid.NewGuid().ToString());
        cmd.Parameters.AddWithValue("stamp5", Guid.NewGuid().ToString());
        await cmd.ExecuteNonQueryAsync();
    }
    Console.WriteLine("✅ Wòl kreye");

    // Efase itilizatè sa a si li egziste deja
    var deleteSql = @"DELETE FROM ""AspNetUsers"" WHERE ""Email"" = @email";
    using (var cmd = new NpgsqlCommand(deleteSql, conn))
    {
        cmd.Parameters.AddWithValue("email", email);
        await cmd.ExecuteNonQueryAsync();
    }

    // Insert itilizatè a
    var insertUserSql = @"
        INSERT INTO ""AspNetUsers"" (
            ""Id"", ""UserName"", ""NormalizedUserName"", ""Email"", ""NormalizedEmail"",
            ""EmailConfirmed"", ""PasswordHash"", ""SecurityStamp"", ""ConcurrencyStamp"",
            ""PhoneNumberConfirmed"", ""TwoFactorEnabled"", ""LockoutEnabled"", ""AccessFailedCount"",
            ""FirstName"", ""LastName"", ""Role"", ""IsActive"", ""CreatedAt""
        )
        VALUES (
            @userId, @email, @normalizedEmail, @email, @normalizedEmail,
            true, @passwordHash, @securityStamp, @concurrencyStamp,
            false, false, true, 0,
            @firstName, @lastName, 0, true, @createdAt
        )
    ";

    using (var cmd = new NpgsqlCommand(insertUserSql, conn))
    {
        cmd.Parameters.AddWithValue("userId", userId);
        cmd.Parameters.AddWithValue("email", email);
        cmd.Parameters.AddWithValue("normalizedEmail", email.ToUpper());
        cmd.Parameters.AddWithValue("passwordHash", passwordHash);
        cmd.Parameters.AddWithValue("securityStamp", securityStamp);
        cmd.Parameters.AddWithValue("concurrencyStamp", concurrencyStamp);
        cmd.Parameters.AddWithValue("firstName", firstName);
        cmd.Parameters.AddWithValue("lastName", lastName);
        cmd.Parameters.AddWithValue("createdAt", DateTime.UtcNow);
        await cmd.ExecuteNonQueryAsync();
    }
    Console.WriteLine("✅ Itilizatè kreye");

    // Ajoute wòl
    var insertUserRoleSql = @"
        INSERT INTO ""AspNetUserRoles"" (""UserId"", ""RoleId"")
        VALUES (@userId, 'superadmin-role')
        ON CONFLICT DO NOTHING
    ";

    using (var cmd = new NpgsqlCommand(insertUserRoleSql, conn))
    {
        cmd.Parameters.AddWithValue("userId", userId);
        await cmd.ExecuteNonQueryAsync();
    }
    Console.WriteLine("✅ Wòl ajoute");

    Console.WriteLine("");
    Console.WriteLine("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    Console.WriteLine("✅ SUPERADMIN KREYE AK SIKSÈ!");
    Console.WriteLine("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    Console.WriteLine("");
    Console.WriteLine($"   📧 Email: {email}");
    Console.WriteLine($"   🔑 Password: {password}");
    Console.WriteLine($"   🌐 URL: https://admin.nalakreditimachann.com/login");
    Console.WriteLine("");
    Console.WriteLine("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}
catch (Exception ex)
{
    Console.WriteLine($"❌ ERE: {ex.Message}");
    Console.WriteLine(ex.StackTrace);
}
EOCS

# Egzekite script la nan container backend la
docker exec nala-api dotnet script /tmp/create_superadmin.cs || {
    echo "❌ dotnet script pa disponib. Ann eseye yon lòt metòd..."
    
    # Kopi script la nan container
    docker cp /tmp/create_superadmin.cs nala-api:/tmp/
    
    # Kreye yon mini pwojè pou egzekite l
    docker exec nala-api sh -c 'cd /tmp && dotnet new console -n CreateAdmin -f net8.0 && cd CreateAdmin && cat > Program.cs < /tmp/create_superadmin.cs && dotnet add package Microsoft.AspNetCore.Identity && dotnet add package Npgsql && dotnet run'
}

ENDSSH

echo ""
echo "✅ Done!"
