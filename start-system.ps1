# Simple startup script
Write-Host "=== NALA KREDI TI MACHANN ===" -ForegroundColor Green
Write-Host "Starting Nala Kredi System..." -ForegroundColor Yellow
Write-Host ""

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Cyan

# Check .NET
$dotnetVersion = & "C:\Program Files\dotnet\dotnet.exe" --version
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] .NET SDK found: $dotnetVersion" -ForegroundColor Green
} else {
    Write-Host "[ERROR] .NET SDK not found. Please install .NET 8.0 SDK" -ForegroundColor Red
    Write-Host "Download from: https://dotnet.microsoft.com/download" -ForegroundColor Yellow
    Read-Host
    exit 1
}

# Add Node.js to PATH if not already there
$nodePath = "C:\Program Files\nodejs"
if ($env:Path -notlike "*$nodePath*") {
    $env:Path += ";$nodePath"
    Write-Host "[OK] Node.js added to PATH" -ForegroundColor Green
}

# Check Node.js
$nodeVersion = & node --version
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Node.js found: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Node.js not found. Please install Node.js" -ForegroundColor Red
    Write-Host "Download from: https://nodejs.org" -ForegroundColor Yellow
    Read-Host
    exit 1
}

Write-Host ""

# Start Backend API
Write-Host "Starting Backend API..." -ForegroundColor Cyan
$backendPath = ".\backend\NalaCreditAPI"
if (Test-Path $backendPath) {
    Write-Host "   Directory: $backendPath" -ForegroundColor Gray
    Write-Host "   Command: dotnet run" -ForegroundColor Gray
    Write-Host ""
    Start-Process -FilePath "C:\Program Files\dotnet\dotnet.exe" -ArgumentList "run" -WorkingDirectory $backendPath -WindowStyle Normal
    Write-Host "   [OK] Backend API started" -ForegroundColor Green
    Write-Host "   API: https://localhost:7001/api" -ForegroundColor Magenta
    Write-Host "   Swagger: https://localhost:7001/swagger" -ForegroundColor Magenta
} else {
    Write-Host "   [ERROR] Backend directory not found: $backendPath" -ForegroundColor Red
}

Write-Host ""

# Start Frontend Web
Write-Host "Starting Frontend Web..." -ForegroundColor Cyan
$frontendPath = ".\frontend-web"
if (Test-Path $frontendPath) {
    Write-Host "   Directory: $frontendPath" -ForegroundColor Gray
    Write-Host "   Command: npm start" -ForegroundColor Gray
    Write-Host ""
    
    # Start npm with explicit PATH for Node.js
    $npmProcess = Start-Process -FilePath "powershell" -ArgumentList "-Command", "cd '$frontendPath'; `$env:Path += ';C:\Program Files\nodejs'; npm start" -WindowStyle Normal -PassThru
    
    Write-Host "   [OK] Frontend Web started (Process ID: $($npmProcess.Id))" -ForegroundColor Green
    Write-Host "   Web Interface: http://localhost:3000" -ForegroundColor Magenta
} else {
    Write-Host "   [ERROR] Frontend directory not found: $frontendPath" -ForegroundColor Red
}

Write-Host ""
Write-Host ""
Write-Host "Waiting 10 seconds for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host "=== SYSTEM STARTED ===" -ForegroundColor Green
Write-Host ""
Write-Host "ACCESS SYSTEM:" -ForegroundColor Yellow
Write-Host "   - Web Interface: http://localhost:3000" -ForegroundColor White
Write-Host "   - Backend API: https://localhost:7001/api" -ForegroundColor White
Write-Host "   - API Documentation: https://localhost:7001/swagger" -ForegroundColor White
Write-Host ""
Write-Host "DATABASE CONFIGURATION:" -ForegroundColor Yellow
Write-Host "   - Database: nalakreditimachann_db" -ForegroundColor White
Write-Host "   - Username: postgres" -ForegroundColor White
Write-Host "   - Host: localhost:5432" -ForegroundColor White
Write-Host ""
Write-Host "DEFAULT ACCOUNTS:" -ForegroundColor Yellow
Write-Host "   - Super Admin: superadmin@nalacredit.com / SuperAdmin123!" -ForegroundColor White
Write-Host "   - Supervisor: supervisor@nalacredit.com / Supervisor123!" -ForegroundColor White
Write-Host "   - Cashier: cashier@nalacredit.com / Cashier123!" -ForegroundColor White
Write-Host "   - Credit Agent: creditagent@nalacredit.com / CreditAgent123!" -ForegroundColor White
Write-Host ""
Write-Host "CONNECTIVITY TEST:" -ForegroundColor Cyan
Write-Host "Run: .\test-connectivity.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "To start WPF Desktop Application:" -ForegroundColor Cyan
Write-Host "cd '.\frontend-desktop\NalaCreditDesktop'" -ForegroundColor Gray
Write-Host "dotnet run" -ForegroundColor Gray
Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor Yellow
Read-Host