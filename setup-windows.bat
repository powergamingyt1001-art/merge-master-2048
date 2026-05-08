@echo off
echo ============================================
echo   Merge Master 2048 - Auto Setup Script
echo ============================================
echo.

:: Check Node.js
echo [1/5] Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js NOT found! Please install from https://nodejs.org first.
    echo Download the LTS version, install it, then run this script again.
    pause
    exit /b 1
)
echo ✅ Node.js found!

:: Check npm
echo [2/5] Checking npm...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm NOT found! Reinstall Node.js from https://nodejs.org
    pause
    exit /b 1
)
echo ✅ npm found!

:: Install dependencies
echo [3/5] Installing dependencies (5-10 minutes)...
call npm install
if %errorlevel% neq 0 (
    echo ❌ npm install failed! Check internet connection.
    pause
    exit /b 1
)
echo ✅ Dependencies installed!

:: Build Next.js
echo [4/5] Building Next.js static export...
call npx next build
if %errorlevel% neq 0 (
    echo ❌ Build failed! Check for errors above.
    pause
    exit /b 1
)
echo ✅ Build complete!

:: Sync with Android
echo [5/5] Syncing with Android project...
call npx cap sync android
if %errorlevel% neq 0 (
    echo ❌ Sync failed! Check for errors above.
    pause
    exit /b 1
)
echo ✅ Android sync complete!

echo.
echo ============================================
echo   🎉 ALL DONE! Next steps:
echo ============================================
echo.
echo   1. Open Android Studio
echo   2. Click "Open" 
echo   3. Select this folder's "android" subfolder
echo   4. Wait for Gradle sync (2-3 min)
echo   5. Click Build ^> Build APK
echo   6. APK file will be at:
echo      android\app\build\outputs\apk\debug\app-debug.apk
echo.
echo   OR run: npx cap open android
echo   (This opens Android Studio automatically)
echo.
pause
