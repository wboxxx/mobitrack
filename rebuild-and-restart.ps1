# Script automatisé complet : Build + Install + Restart Service (SANS intervention manuelle)
param(
    [switch]$SkipBuild = $false
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  REBUILD & RESTART (AUTOMATIQUE)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Etape 1 : Build et Install APK
if (-not $SkipBuild) {
    Write-Host "1. Compilation et installation de l'APK..." -ForegroundColor Yellow
    
    Push-Location "android-app"
    
    Write-Host "   🧹 Nettoyage..." -ForegroundColor Gray
    & .\gradlew clean | Out-Null
    
    Write-Host "   🔨 Compilation..." -ForegroundColor Gray
    & .\gradlew assembleDebug
    
    $apkPath = "app\build\outputs\apk\debug\app-debug.apk"
    if (-not (Test-Path $apkPath)) {
        Write-Host "   ❌ Build échoué!" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    
    Write-Host "   📦 Installation..." -ForegroundColor Gray
    & adb install -r $apkPath 2>&1 | Out-Null
    
    Pop-Location
    
    Write-Host "   ✅ APK installé" -ForegroundColor Green
} else {
    Write-Host "1. Build ignoré (SkipBuild)" -ForegroundColor Gray
}
Write-Host ""

# Etape 2 : Force stop de l'app
Write-Host "2. Arrêt de l'app de tracking..." -ForegroundColor Yellow
& adb shell am force-stop com.bascule.leclerctracking 2>&1 | Out-Null
Write-Host "   ✅ App arrêtée" -ForegroundColor Green
Write-Host ""

# Etape 3 : Vider le cache Logcat
Write-Host "3. Vidage du cache Logcat..." -ForegroundColor Yellow
& adb logcat -c 2>&1 | Out-Null
Write-Host "   ✅ Cache vidé" -ForegroundColor Green
Write-Host ""

# Etape 4 : Vérifier qu'Appium tourne
Write-Host "4. Vérification d'Appium..." -ForegroundColor Yellow
$appiumRunning = netstat -ano | findstr ":4723"
if (-not $appiumRunning) {
    Write-Host "   ❌ Appium n'est pas lancé!" -ForegroundColor Red
    Write-Host "   Lance Appium dans un autre terminal: appium" -ForegroundColor Yellow
    exit 1
}
Write-Host "   ✅ Appium actif" -ForegroundColor Green
Write-Host ""

# Etape 5 : Redémarrer le service d'accessibilité via Appium (AUTOMATIQUE)
Write-Host "5. Redémarrage automatique du service d'accessibilité..." -ForegroundColor Yellow
Push-Location "test-automation"
try {
    & npm run restart-accessibility 2>&1 | ForEach-Object {
        if ($_ -match "✅|🔄|🟢|🔴|⚠️") {
            Write-Host "   $_" -ForegroundColor Gray
        }
    }
    Write-Host "   ✅ Service redémarré" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️ Erreur lors du restart, mais on continue..." -ForegroundColor Yellow
}
Pop-Location
Write-Host ""

# Etape 6 : Retour à l'accueil
Write-Host "6. Retour à l'écran d'accueil..." -ForegroundColor Yellow
& adb shell input keyevent KEYCODE_HOME 2>&1 | Out-Null
Start-Sleep -Seconds 1
Write-Host "   ✅ Accueil OK" -ForegroundColor Green
Write-Host ""

# Etape 7 : Lancer l'app de tracking
Write-Host "7. Lancement de l'app de tracking..." -ForegroundColor Yellow
& adb shell monkey -p com.bascule.leclerctracking -c android.intent.category.LAUNCHER 1 2>&1 | Out-Null
Start-Sleep -Seconds 2
Write-Host "   ✅ App lancée" -ForegroundColor Green
Write-Host ""

# Etape 8 : Lancer Carrefour
Write-Host "8. Lancement de Carrefour..." -ForegroundColor Yellow
& adb shell monkey -p com.carrefour.fid.android -c android.intent.category.LAUNCHER 1 2>&1 | Out-Null
Start-Sleep -Seconds 2
Write-Host "   ✅ Carrefour lancé" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "  ✅ PRÊT POUR LES TESTS!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Prochaines étapes:" -ForegroundColor Cyan
Write-Host "  - Lance le monitoring: .\start-monitoring.ps1 -DurationSeconds 60" -ForegroundColor Gray
Write-Host "  - Ou lance un test automatisé: npm run test:carrefour-banana" -ForegroundColor Gray
Write-Host ""
