@echo off
echo ========================================
echo ARIHAAN AI Chat Backend - Quick Setup
echo ========================================
echo.

echo [1/3] Installing backend dependencies...
cd server
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo [2/3] Checking environment configuration...
if not exist .env (
    echo Creating .env file from template...
    copy .env.example .env
    echo.
    echo ⚠️  IMPORTANT: Edit server\.env and add your OpenAI API key!
    echo    Get your key from: https://platform.openai.com/api-keys
    echo.
) else (
    echo ✓ .env file already exists
)

echo.
echo [3/3] Setup complete!
echo.
echo ========================================
echo Next Steps:
echo ========================================
echo 1. Edit server\.env and add your OpenAI API key
echo 2. Run: npm run dev (from root directory)
echo 3. Open: http://localhost:3000
echo 4. Click the chat button to test!
echo.
echo For detailed instructions, see GETTING_STARTED.md
echo ========================================
echo.

cd ..
pause
