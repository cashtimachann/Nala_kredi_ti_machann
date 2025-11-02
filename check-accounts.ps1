# Script pou tcheke kont yo nan database PostgreSQL
Write-Host "TCHEKE KONT NAN DATABASE" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Itilize psql pou konekte
$query = "SELECT `"Id`", `"Email`", `"FirstName`", `"LastName`", `"Role`", `"IsActive`", `"CreatedAt`" FROM `"AspNetUsers`" ORDER BY `"CreatedAt`" DESC;"

Write-Host "Kont ki nan database la:" -ForegroundColor Yellow
Write-Host ""

try {
    # Eseye avèk psql
    $env:PGPASSWORD = "JCS823ch!!"
    $result = & psql -h localhost -U postgres -d nalakreditimachann_db -c $query 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host $result -ForegroundColor White
        Write-Host ""
        
        # Konté yo
        $countQuery = "SELECT COUNT(*) as Total_Users FROM `"AspNetUsers`";"
        Write-Host "Total:" -ForegroundColor Yellow
        $countResult = & psql -h localhost -U postgres -d nalakreditimachann_db -c $countQuery 2>&1
        Write-Host $countResult -ForegroundColor White
    } else {
        Write-Host "Ere koneksyon psql" -ForegroundColor Red
        Write-Host $result -ForegroundColor Red
        Write-Host ""
        Write-Host "Eseye yon lot metod..." -ForegroundColor Yellow
        
        # Metod altènatif: itilize API backend la
        Write-Host "Eseye konekte avek API backend la..." -ForegroundColor Yellow
        
        # Premye, eseye login avèk yon kont admin
        $loginData = @{
            email = "admin@nalacredit.com"
            password = "Admin123!"
        } | ConvertTo-Json
        
        try {
            $loginResponse = Invoke-RestMethod -Uri "http://localhost:7001/api/auth/login" -Method POST -Body $loginData -ContentType "application/json"
            
            if ($loginResponse.token) {
                Write-Host "Konekte avek sikse!" -ForegroundColor Green
                
                # Eseye jwenn lis itilizate yo
                $headers = @{
                    "Authorization" = "Bearer $($loginResponse.token)"
                    "Accept" = "application/json"
                }
                
                try {
                    $users = Invoke-RestMethod -Uri "http://localhost:7001/api/users" -Method GET -Headers $headers
                    Write-Host ""
                    Write-Host "ITILIZATE YO:" -ForegroundColor Cyan
                    $users | Format-Table -AutoSize
                } catch {
                    Write-Host "Endpoint users pa disponib: $($_.Exception.Message)" -ForegroundColor Red
                }
            }
        } catch {
            Write-Host "Pa kapab konekte: $($_.Exception.Message)" -ForegroundColor Red
            Write-Host ""
            Write-Host "Posib kont admin pa kreye anko" -ForegroundColor Yellow
            Write-Host "Eseye kouri: dotnet run --project CreateSuperAdmin" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "Ere: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Verifikasyon fini." -ForegroundColor White
