# Script de compilation simplifie avec JAVA_HOME fixe
$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  COMPILATION APK" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Fixer JAVA_HOME
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
Write-Host "JAVA_HOME: $env:JAVA_HOME" -ForegroundColor Gray
Write-Host ""

# Verifier que Java existe
$javaPath = Join-Path $env:JAVA_HOME "bin\java.exe"
if (-not (Test-Path $javaPath)) {
    Write-Host "ERREUR: Java introuvable a $javaPath" -ForegroundColor Red
    exit 1
}

# Compiler
Write-Host "1. Compilation en cours..." -ForegroundColor Yellow
& .\gradlew assembleDebug

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERREUR: Compilation echouee" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "2. Installation de l'APK..." -ForegroundColor Yellow

# Trouver l'APK
$apkPath = "app\build\outputs\apk\debug\app-debug.apk"
if (Test-Path $apkPath) {
    adb install -r $apkPath
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "  SUCCES!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "APK installe avec succes" -ForegroundColor Green
        Write-Host ""
        Write-Host "Prochaine etape: Redemarrer le service" -ForegroundColor Yellow
        Write-Host "  cd .." -ForegroundColor Cyan
        Write-Host "  .\force-restart-service.ps1" -ForegroundColor Cyan
    } else {
        Write-Host ""
        Write-Host "ERREUR: Installation echouee" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host ""
    Write-Host "ERREUR: APK introuvable a $apkPath" -ForegroundColor Red
    exit 1
}

Write-Host ""
