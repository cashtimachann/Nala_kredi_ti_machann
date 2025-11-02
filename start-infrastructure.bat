@echo off
echo Starting Nala Kredi Infrastructure Services...

echo.
echo Starting Redis Server...
start "Redis Server" cmd /k "redis-server --port 6379"

echo.
echo Waiting for Redis to start...
timeout /t 3 /nobreak > nul

echo.
echo Starting RabbitMQ Server...
start "RabbitMQ Server" cmd /k "rabbitmq-server"

echo.
echo Waiting for RabbitMQ to start...
timeout /t 5 /nobreak > nul

echo.
echo Infrastructure services started!
echo.
echo Redis: http://localhost:6379
echo RabbitMQ Management: http://localhost:15672 (guest/guest)
echo.
echo Press any key to continue...
pause > nul