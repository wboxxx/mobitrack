# Script pour forcer le redemarrage complet du service
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  FORCE RESTART SERVICE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Etape 1 : Forcer l arret de l app
Write-Host "1. Arret force de l app de tracking..." -ForegroundColor Yellow
adb shell am force-stop com.bascule.leclerctracking
Write-Host "   App arretee" -ForegroundColor Green
Write-Host ""

# Etape 2 : Vider le cache Logcat
Write-Host "2. Vidage du cache Logcat..." -ForegroundColor Yellow
adb logcat -c
Write-Host "   Cache vide" -ForegroundColor Green
Write-Host ""

# Etape 3 : Verifier si le service est deja actif
Write-Host "3. Verification du service d'accessibilite..." -ForegroundColor Yellow
$serviceStatus = adb shell settings get secure enabled_accessibility_services
$isServiceEnabled = $serviceStatus -like "*com.bascule.leclerctracking*"

if ($isServiceEnabled) {
    Write-Host "   Service deja actif - Redemarrage force..." -ForegroundColor Green
    
    # Killer le processus pour forcer le rechargement du nouveau code
    # Android relancera automatiquement le service (permissions preservees)
    Write-Host "   Kill du processus..." -ForegroundColor Yellow
    adb shell am force-stop com.bascule.leclerctracking
    Start-Sleep -Seconds 1
    
    # Forcer le redemarrage immediat en lançant l'app
    Write-Host "   Relancement du service..." -ForegroundColor Yellow
    adb shell monkey -p com.bascule.leclerctracking -c android.intent.category.LAUNCHER 1 2>$null
    Start-Sleep -Seconds 2
    
    Write-Host "   Service redemarre avec nouveau code (permissions preservees)" -ForegroundColor Green
} else {
    Write-Host "   Service non actif - Configuration manuelle requise" -ForegroundColor Yellow
    Write-Host ""
    
    # Ouvrir les parametres d accessibilite
    Write-Host "4. Ouverture des parametres d accessibilite..." -ForegroundColor Yellow
    adb shell am start -a android.settings.ACCESSIBILITY_SETTINGS
    Start-Sleep -Seconds 2
    Write-Host "   Parametres ouverts" -ForegroundColor Green
    Write-Host ""
    
    # Instructions manuelles
    Write-Host "5. SUR L EMULATEUR:" -ForegroundColor Yellow
    Write-Host "   a) Trouve 'Bascule Cross-App Tracking'" -ForegroundColor Cyan
    Write-Host "   b) Active le switch" -ForegroundColor Cyan
    Write-Host "   c) Confirme OK si popup" -ForegroundColor Cyan
    Write-Host ""
    
    Read-Host "Appuie sur Enter quand c est fait"
}

Write-Host ""

# Retour a l accueil
Write-Host "4. Retour a l ecran d accueil..." -ForegroundColor Yellow
adb shell input keyevent KEYCODE_HOME
Start-Sleep -Seconds 1
Write-Host "   Retour accueil OK" -ForegroundColor Green
Write-Host ""

# Lancer l app de tracking
Write-Host "5. Lancement de l app de tracking..." -ForegroundColor Yellow
cmd /c "adb shell monkey -p com.bascule.leclerctracking -c android.intent.category.LAUNCHER 1 >nul 2>&1"
Start-Sleep -Seconds 2
Write-Host "   App lancee" -ForegroundColor Green
Write-Host ""

# Lancer Carrefour
Write-Host "6. Lancement de Carrefour..." -ForegroundColor Yellow
cmd /c "adb shell monkey -p com.carrefour.fid.android -c android.intent.category.LAUNCHER 1 >nul 2>&1"
Write-Host "   Carrefour lance" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "  SERVICE REDEMARRE AVEC NOUVEL APK" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Tu peux maintenant lancer le monitoring!" -ForegroundColor Cyan
Write-Host "  .\start-monitoring.ps1 -DurationSeconds 60" -ForegroundColor Gray
Write-Host ""
