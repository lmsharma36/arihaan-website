@echo off
echo ========================================
echo ARIHAAN ENTERPRISES - Service Starter
echo ========================================
echo.

REM Start MongoDB Service
echo [1/2] Starting MongoDB...
net start MongoDB 2>nul
if %errorlevel% == 0 (
    echo     ✓ MongoDB started
) else if %errorlevel% == 2 (
    echo     ✓ MongoDB already running
) else (
    echo     ✗ MongoDB failed to start - you may need to run as Administrator
)
echo.

REM Start Backend Server in a new window
echo [2/2] Starting Backend Server...
cd /d "%~dp0server"
start "Backend Server" cmd /k "npm run dev"
echo     ✓ Backend server starting in new window
echo.

echo ========================================
echo All services started!
echo ========================================
echo.
echo Backend will be available at: http://localhost:5000
echo Frontend (if running): http://localhost:3000
echo.
echo IMPORTANT: Keep the Backend window open!
echo Close this window to continue.
echo.
pause
