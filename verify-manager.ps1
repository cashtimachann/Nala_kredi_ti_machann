Write-Host "=== Verification Compte Chef de Succursale ===" -ForegroundColor Cyan
Write-Host ""

# Connection string
$connectionString = "Host=localhost;Database=nalacredit_db;Username=postgres;Password=postgres"

# Function pou hash password
function Get-PasswordHash {
    param([string]$password)
    
    # Utilise BCrypt.Net-Next si disponib
    Add-Type -Path ".\backend\NalaCreditAPI\bin\Debug\net8.0\BCrypt.Net-Next.dll" -ErrorAction SilentlyContinue
    
    if ([BCrypt.Net.BCrypt]) {
        return [BCrypt.Net.BCrypt]::HashPassword($password)
    } else {
        Write-Host "BCrypt pa disponib, ap itilize hash senp" -ForegroundColor Yellow
        return "TempHash_$password"
    }
}

Write-Host "1. Ap tcheke si gen kont Manager..." -ForegroundColor Yellow

# Tcheke si gen Manager
$checkQuery = @"
SELECT 
    u."Id",
    u."Username",
    u."Email",
    u."FirstName",
    u."LastName",
    u."Role",
    u."IsActive",
    b."Name" as "BranchName"
FROM "Users" u
LEFT JOIN "Branches" b ON u."BranchId" = b."Id"
WHERE u."Role" = 2
ORDER BY u."CreatedAt" DESC;
"@

try {
    $result = psql -h localhost -U postgres -d nalacredit_db -t -c $checkQuery 2>$null
    
    if ($result -and $result.Trim()) {
        Write-Host "✅ Kont Manager jwenn:" -ForegroundColor Green
        Write-Host $result
        Write-Host ""
        
        # Ekstrak username pou login
        if ($result -match '\|\s*(\S+)\s*\|') {
            $username = $matches[1].Trim()
            Write-Host "📝 Username pou konekte: $username" -ForegroundColor Cyan
            Write-Host "🔑 Password: Manager123!" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "🌐 Pou teste dashboard:" -ForegroundColor Cyan
            Write-Host "   1. Konekte ak username la" -ForegroundColor White
            Write-Host "   2. Dashboard la ta dwe afiche otomatikman" -ForegroundColor White
        }
    } else {
        Write-Host "❌ Pa gen kont Manager" -ForegroundColor Red
        Write-Host ""
        Write-Host "2. Ap kreye kont Manager..." -ForegroundColor Yellow
        
        # Gen branch Port-au-Prince?
        $branchQuery = 'SELECT "Id" FROM "Branches" WHERE "Name" LIKE ''%Port-au-Prince%'' LIMIT 1;'
        $branchId = psql -h localhost -U postgres -d nalacredit_db -t -c $branchQuery 2>$null
        
        if (-not $branchId -or -not $branchId.Trim()) {
            Write-Host "❌ Branch Port-au-Prince pa egziste" -ForegroundColor Red
            Write-Host "Kreye branch la daprè..." -ForegroundColor Yellow
            
            $createBranchQuery = @"
INSERT INTO "Branches" ("Id", "Code", "Name", "Address", "Phone", "Email", "IsActive", "CreatedAt", "UpdatedAt")
VALUES (
    gen_random_uuid(),
    'PAP-001',
    'Succursale Port-au-Prince',
    '123 Rue Lamarre, Port-au-Prince',
    '+509 2222 3333',
    'pap@nalacredit.ht',
    true,
    NOW(),
    NOW()
)
RETURNING "Id";
"@
            $branchId = psql -h localhost -U postgres -d nalacredit_db -t -c $createBranchQuery 2>$null
            Write-Host "✅ Branch kreye ak ID: $($branchId.Trim())" -ForegroundColor Green
        } else {
            Write-Host "✅ Branch jwenn: $($branchId.Trim())" -ForegroundColor Green
        }
        
        # Hash password
        $passwordHash = Get-PasswordHash "Manager123!"
        
        # Kreye Manager
        $createUserQuery = @"
INSERT INTO "Users" (
    "Id",
    "Username",
    "Email",
    "PasswordHash",
    "FirstName",
    "LastName",
    "Role",
    "IsActive",
    "BranchId",
    "CreatedAt",
    "UpdatedAt"
)
VALUES (
    gen_random_uuid(),
    'chef.pap',
    'chef.pap@nalacredit.ht',
    '$passwordHash',
    'Jean',
    'Michel',
    2,
    true,
    '$($branchId.Trim())',
    NOW(),
    NOW()
)
RETURNING "Id", "Username";
"@
        
        $userId = psql -h localhost -U postgres -d nalacredit_db -t -c $createUserQuery 2>$null
        
        if ($userId -and $userId.Trim()) {
            Write-Host "✅ Kont Manager kreye!" -ForegroundColor Green
            Write-Host ""
            Write-Host "📝 ENFÒMASYON LOGIN:" -ForegroundColor Cyan
            Write-Host "   Username: chef.pap" -ForegroundColor White
            Write-Host "   Password: Manager123!" -ForegroundColor White
            Write-Host "   Email: chef.pap@nalacredit.ht" -ForegroundColor White
            Write-Host "   Branch: Port-au-Prince" -ForegroundColor White
            Write-Host ""
            Write-Host "⚠️  ENPÒTAN: Chanje password la nan premye koneksyon!" -ForegroundColor Yellow
        } else {
            Write-Host "❌ Erè nan kreye kont" -ForegroundColor Red
        }
    }
} catch {
    Write-Host "Ere: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Opsyon alternativ:" -ForegroundColor Yellow
    Write-Host "   1. Egzekite script SQL manyelman: check-create-manager.sql" -ForegroundColor White
    Write-Host "   2. Kreye kont atravè aplikasyon admin web" -ForegroundColor White
}

Write-Host ""
Write-Host "=== FIN ===" -ForegroundColor Cyan
