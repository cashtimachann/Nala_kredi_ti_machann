#!/bin/bash

echo "================================================"
echo "    NALA KREDI TI MACHANN - SYSTEM STARTUP"
echo "================================================"
echo ""

# Check prerequisites
echo "Checking prerequisites..."

# Check .NET
if ! command -v dotnet &> /dev/null; then
    echo "ERROR: .NET 8.0 SDK is not installed"
    echo "Please install .NET 8.0 SDK from https://dotnet.microsoft.com/download"
    exit 1
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed"
    echo "Please install Node.js from https://nodejs.org"
    exit 1
fi

echo "Prerequisites OK!"
echo ""

# Function to check if PostgreSQL is running
check_postgresql() {
    if command -v pg_isready &> /dev/null; then
        pg_isready -q
        return $?
    else
        # Try to connect with psql
        psql -U postgres -c "SELECT 1;" &> /dev/null
        return $?
    fi
}

# Start PostgreSQL if not running
echo "Checking PostgreSQL..."
if ! check_postgresql; then
    echo "Starting PostgreSQL..."
    if command -v brew &> /dev/null; then
        # macOS with Homebrew
        brew services start postgresql
    elif command -v systemctl &> /dev/null; then
        # Linux with systemd
        sudo systemctl start postgresql
    else
        echo "WARNING: Please ensure PostgreSQL is running manually"
    fi
else
    echo "PostgreSQL is already running"
fi

# Start Redis if available
echo "Checking Redis..."
if command -v redis-server &> /dev/null; then
    if ! pgrep redis-server > /dev/null; then
        echo "Starting Redis..."
        redis-server --daemonize yes
    else
        echo "Redis is already running"
    fi
else
    echo "WARNING: Redis not found. Install with: brew install redis (macOS) or sudo apt install redis-server (Ubuntu)"
fi

echo ""
echo "================================================"
echo "              STARTING BACKEND API"
echo "================================================"
echo ""

# Start Backend API
cd "$(dirname "$0")/backend/NalaCreditAPI"
if [ ! -d "bin" ]; then
    echo "Building backend..."
    dotnet build
fi

echo "Starting backend API on https://localhost:7001..."
gnome-terminal --title="Backend API" -- bash -c "dotnet run --urls https://localhost:7001; exec bash" 2>/dev/null || \
xterm -title "Backend API" -e "dotnet run --urls https://localhost:7001; bash" 2>/dev/null || \
osascript -e 'tell app "Terminal" to do script "cd \"'$(pwd)'\" && dotnet run --urls https://localhost:7001"' 2>/dev/null || \
(echo "Starting backend in background..." && nohup dotnet run --urls https://localhost:7001 > backend.log 2>&1 &)

# Wait for backend to start
sleep 5

echo ""
echo "================================================"
echo "            STARTING FRONTEND WEB"
echo "================================================"
echo ""

# Start Frontend Web
cd "$(dirname "$0")/frontend-web"
if [ ! -d "node_modules" ]; then
    echo "Installing npm dependencies..."
    npm install
fi

echo "Starting frontend web on http://localhost:3000..."
gnome-terminal --title="Frontend Web" -- bash -c "npm start; exec bash" 2>/dev/null || \
xterm -title "Frontend Web" -e "npm start; bash" 2>/dev/null || \
osascript -e 'tell app "Terminal" to do script "cd \"'$(pwd)'\" && npm start"' 2>/dev/null || \
(echo "Starting frontend in background..." && nohup npm start > frontend.log 2>&1 &)

echo ""
echo "================================================"
echo "                   COMPLETED!"
echo "================================================"
echo ""
echo "Nala Kredi Ti Machann system is now starting:"
echo ""
echo "- Backend API: https://localhost:7001"
echo "- Frontend Web: http://localhost:3000"
echo "- API Documentation: https://localhost:7001/swagger"
echo ""
echo "Default accounts:"
echo "- Super Admin: superadmin@nalacredit.com / SuperAdmin123!"
echo "- Supervisor: supervisor@nalacredit.com / Supervisor123!"
echo "- Cashier: cashier@nalacredit.com / Cashier123!"
echo "- Credit Agent: credit@nalacredit.com / Credit123!"
echo ""
echo "Press any key to exit..."
read -n 1