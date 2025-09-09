@echo off
echo 🔨 Building Android App...
echo.

REM Navigate to android app directory
cd /d "C:\Users\Vincent B\CascadeProjects\web-tracking-system\android-app"

REM Clean previous build
echo 🧹 Cleaning previous build...
call gradlew clean

REM Build debug APK
echo 📱 Building debug APK...
call gradlew assembleDebug

REM Check if build was successful
if exist "app\build\outputs\apk\debug\app-debug.apk" (
    echo.
    echo ✅ Build successful!
    echo 📦 APK location: app\build\outputs\apk\debug\app-debug.apk
    echo.
    echo 🚀 To install on device/emulator:
    echo    adb install app\build\outputs\apk\debug\app-debug.apk
    echo.
) else (
    echo.
    echo ❌ Build failed!
    echo Check the output above for errors.
    echo.
)

pause
