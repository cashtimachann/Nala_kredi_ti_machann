# Check Login Accounts for Desktop App
# Ann gade ki kont ki ka login

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "KONT POU LOGIN DESKTOP APP" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan

# Connect to PostgreSQL using Npgsql
$connectionString = "Host=localhost;Port=5432;Database=nalacredit_db;Username=postgres;Password=1234"

Add-Type -Path "C:\Program Files\dotnet\shared\Microsoft.NETCore.App\8.0.0\System.Data.Common.dll" -ErrorAction SilentlyContinue

try {
    # Load Npgsql if available
    $npgsqlPath = "C:\Users\Administrator\.nuget\packages\npgsql\8.0.3\lib\net8.0\Npgsql.dll"
    if (Test-Path $npgsqlPath) {
        Add-Type -Path $npgsqlPath
    } else {
        Write-Host "Npgsql pa jwenn. Ann itilize dotnet script..." -ForegroundColor Yellow
        
        # Create a simple C# program to query database
        $csharpCode = @"
using System;
using Npgsql;

class Program
{
    static void Main()
    {
        var connString = "Host=localhost;Port=5432;Database=nalacredit_db;Username=postgres;Password=1234";
        
        try
        {
            using var conn = new NpgsqlConnection(connString);
            conn.Open();
            
            var sql = @"
                SELECT 
                    ""Email"",
                    ""UserName"",
                    CASE ""Role""
                        WHEN 0 THEN 'Cashier'
                        WHEN 1 THEN 'Employee'
                        WHEN 2 THEN 'Manager'
                        WHEN 3 THEN 'Admin'
                        WHEN 4 THEN 'SupportTechnique'
                        WHEN 5 THEN 'SuperAdmin'
                        ELSE 'Unknown'
                    END as RoleName,
                    ""Role"",
                    ""AdminType"",
                    ""IsActive"",
                    ""Department""
                FROM ""AspNetUsers""
                WHERE ""Role"" IS NOT NULL
                ORDER BY ""Role"", ""Email"";
            ";
            
            using var cmd = new NpgsqlCommand(sql, conn);
            using var reader = cmd.ExecuteReader();
            
            Console.WriteLine(""\n{0,-35} {1,-20} {2,-15} {3,-10} {4,-8}"", 
                ""Email"", ""Username"", ""Role"", ""AdminType"", ""Active"");
            Console.WriteLine(new string('=', 95));
            
            int count = 0;
            while (reader.Read())
            {
                var email = reader.GetString(0);
                var username = reader.IsDBNull(1) ? ""N/A"" : reader.GetString(1);
                var roleName = reader.GetString(2);
                var adminType = reader.IsDBNull(4) ? ""NULL"" : reader.GetInt32(4).ToString();
                var isActive = reader.GetBoolean(5) ? ""Oui"" : ""Non"";
                var dept = reader.IsDBNull(6) ? ""N/A"" : reader.GetString(6);
                
                Console.WriteLine(""{0,-35} {1,-20} {2,-15} {3,-10} {4,-8}"",
                    email, username, roleName, adminType, isActive);
                count++;
            }
            
            Console.WriteLine(new string('=', 95));
            Console.WriteLine(""Total: {0} kont"", count);
        }
        catch (Exception ex)
        {
            Console.WriteLine(""Ere: "" + ex.Message);
        }
    }
}
"@
        
        # Save to temp file
        $tempFile = "$env:TEMP\CheckAccounts.cs"
        $csharpCode | Out-File -FilePath $tempFile -Encoding UTF8
        
        # Run with dotnet script
        Push-Location "C:\Users\Administrator\Desktop\Kredi Ti Machann\backend\NalaCreditAPI"
        dotnet script $tempFile
        Pop-Location
        
        Remove-Item $tempFile -ErrorAction SilentlyContinue
        return
    }
}
catch {
    Write-Host "Ere chaje Npgsql: $_" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "PASSWORDS DEFAULT" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SuperAdmin:  SuperAdmin123!" -ForegroundColor Green
Write-Host "Manager:     Manager123!" -ForegroundColor Green
Write-Host "Caissier:    Cashier123!" -ForegroundColor Green
Write-Host "Employee:    Employee123!" -ForegroundColor Green
Write-Host "`n========================================" -ForegroundColor Cyan
