# Test script to check next payment date field from API
try {
    $body = @{
        username = 'admin@nalacredit.com'
        password = 'admin123'
    } | ConvertTo-Json

    $loginResp = Invoke-RestMethod -Uri 'http://localhost:5000/api/auth/login' -Method POST -Body $body -ContentType 'application/json' -ErrorAction Stop
    $token = $loginResp.token

    $headers = @{
        Authorization = "Bearer $token"
    }

    $loans = Invoke-RestMethod -Uri 'http://localhost:5000/api/microcreditloan?page=1&pageSize=2' -Headers $headers -ErrorAction Stop
    
    Write-Host "`n=== Checking NextPayment field in API Response ===" -ForegroundColor Cyan
    Write-Host "Total loans returned: $($loans.data.Count)" -ForegroundColor Yellow
    
    foreach ($loan in $loans.data) {
        Write-Host "`n--- Loan: $($loan.loanNumber) ---" -ForegroundColor Green
        Write-Host "  PrincipalAmount: $($loan.principalAmount)"
        Write-Host "  DurationMonths: $($loan.durationMonths)"
        Write-Host "  Status: $($loan.status)"
        
        # Check all possible date fields
        $dateFields = @('nextPaymentDue', 'nextPaymentDate', 'NextPaymentDue', 'NextPaymentDate')
        foreach ($field in $dateFields) {
            if ($loan.PSObject.Properties.Name -contains $field) {
                $value = $loan.$field
                Write-Host "  $field : $value (Type: $($value.GetType().Name))" -ForegroundColor Cyan
            }
        }
        
        # Show LastPaymentDate for comparison
        if ($loan.PSObject.Properties.Name -contains 'lastPaymentDate') {
            Write-Host "  lastPaymentDate: $($loan.lastPaymentDate)" -ForegroundColor Yellow
        }
        
        # Show FirstInstallmentDate
        if ($loan.PSObject.Properties.Name -contains 'firstInstallmentDate') {
            Write-Host "  firstInstallmentDate: $($loan.firstInstallmentDate)" -ForegroundColor Yellow
        }
        
        Write-Host "`n  All date fields in response:" -ForegroundColor Magenta
        $loan.PSObject.Properties | Where-Object { $_.Name -like '*date*' -or $_.Name -like '*Date*' -or $_.Name -like '*due*' } | ForEach-Object {
            Write-Host "    $($_.Name): $($_.Value)"
        }
    }
}
catch {
    Write-Host "`nError: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Stack Trace: $($_.Exception.StackTrace)" -ForegroundColor Red
}
