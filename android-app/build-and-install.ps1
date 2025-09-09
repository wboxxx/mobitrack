# PowerShell script to build and install Android app
Write-Host "🔨 Building Android App..." -ForegroundColor Green
Write-Host ""

# Navigate to android app directory
Set-Location "C:\Users\Vincent B\CascadeProjects\web-tracking-system\android-app"

# Clean previous build
Write-Host "🧹 Cleaning previous build..." -ForegroundColor Yellow
& .\gradlew clean

# Build debug APK
Write-Host "📱 Building debug APK..." -ForegroundColor Yellow
& .\gradlew assembleDebug

# Check if build was successful
$apkPath = "app\build\outputs\apk\debug\app-debug.apk"
if (Test-Path $apkPath) {
    Write-Host ""
    Write-Host "✅ Build successful!" -ForegroundColor Green
    Write-Host "📦 APK location: $apkPath" -ForegroundColor Cyan
    Write-Host ""
    
    # Try to install on connected device/emulator
    Write-Host "🚀 Installing on device/emulator..." -ForegroundColor Yellow
    try {
        & adb install -r $apkPath
        Write-Host "✅ Installation successful!" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Auto-install failed. Manual install command:" -ForegroundColor Yellow
        Write-Host "   adb install -r $apkPath" -ForegroundColor Cyan
    }
} else {
    Write-Host ""
    Write-Host "❌ Build failed!" -ForegroundColor Red
    Write-Host "Check the output above for errors." -ForegroundColor Yellow
}

Write-Host ""
Read-Host "Press Enter to continue"
