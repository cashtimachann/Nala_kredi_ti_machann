@echo off
echo ================================================
echo    NALA KREDI TI MACHANN - DEMARRAGE SYSTEME
echo ================================================
echo.

REM Check if .NET is installed
echo Verification des prerequis...
dotnet --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERREUR: .NET 8.0 SDK n'est pas installe
    echo Veuillez installer .NET 8.0 SDK depuis https://dotnet.microsoft.com/download
    pause
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERREUR: Node.js n'est pas installe
    echo Veuillez installer Node.js depuis https://nodejs.org
    pause
    exit /b 1
)

echo Prerequisites OK!
echo.

REM Start PostgreSQL (assuming it's installed as a service)
echo Demarrage de PostgreSQL...
sc query postgresql-x64-14 >nul 2>&1
if %errorlevel% equ 0 (
    net start postgresql-x64-14
) else (
    echo ATTENTION: PostgreSQL n'est pas detecte comme service
    echo Assurez-vous que PostgreSQL est en cours d'execution
)

REM Start Redis (assuming it's installed as a service)
echo Demarrage de Redis...
sc query Redis >nul 2>&1
if %errorlevel% equ 0 (
    net start Redis
) else (
    echo ATTENTION: Redis n'est pas detecte comme service
    echo Vous pouvez installer Redis avec: winget install Redis.Redis
)

echo.
echo ================================================
echo              DEMARRAGE BACKEND API
echo ================================================
echo.

REM Start Backend API
cd /d "%~dp0backend\NalaCreditAPI"
if not exist "bin" (
    echo Construction du backend...
    dotnet build
)

echo Demarrage de l'API backend sur https://localhost:7001...
start cmd /k "title Backend API && dotnet run --urls https://localhost:7001"

REM Wait a bit for backend to start
timeout /t 5 /nobreak >nul

echo.
echo ================================================
echo            DEMARRAGE FRONTEND WEB
echo ================================================
echo.

REM Start Frontend Web
cd /d "%~dp0frontend-web"
if not exist "node_modules" (
    echo Installation des dependances npm...
    npm install
)

echo Demarrage du frontend web sur http://localhost:3000...
start cmd /k "title Frontend Web && npm start"

echo.
echo ================================================
echo                   TERMINE!
echo ================================================
echo.
echo Le systeme Nala Kredi Ti Machann est maintenant en cours de demarrage:
echo.
echo - Backend API: https://localhost:7001
echo - Frontend Web: http://localhost:3000
echo - Documentation API: https://localhost:7001/swagger
echo.
echo Comptes par defaut:
echo - Super Admin: superadmin@nalacredit.com / SuperAdmin123!
echo - Superviseur: supervisor@nalacredit.com / Supervisor123!
echo - Caissier: cashier@nalacredit.com / Cashier123!
echo - Agent Credit: credit@nalacredit.com / Credit123!
echo.
echo Appuyez sur une touche pour fermer cette fenetre...
pause >nul