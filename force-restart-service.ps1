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

# Etape 3 : Ouvrir les parametres d accessibilite
Write-Host "3. Ouverture des parametres d accessibilite..." -ForegroundColor Yellow
adb shell am start -a android.settings.ACCESSIBILITY_SETTINGS
Start-Sleep -Seconds 2
Write-Host "   Parametres ouverts" -ForegroundColor Green
Write-Host ""

# Etape 4 : Instructions manuelles
Write-Host "4. SUR L EMULATEUR:" -ForegroundColor Yellow
Write-Host "   a) Trouve 'Bascule Cross-App Tracking'" -ForegroundColor Cyan
Write-Host "   b) Si ACTIVE : Desactive le switch" -ForegroundColor Cyan
Write-Host "   c) Reactive le switch" -ForegroundColor Cyan
Write-Host "   d) Confirme OK si popup" -ForegroundColor Cyan
Write-Host ""

Read-Host "Appuie sur Enter quand c est fait"

# Etape 5 : Retour a l accueil
Write-Host ""
Write-Host "5. Retour a l ecran d accueil..." -ForegroundColor Yellow
adb shell input keyevent KEYCODE_HOME
Start-Sleep -Seconds 1
Write-Host "   Retour accueil OK" -ForegroundColor Green
Write-Host ""

# Etape 6 : Lancer l app de tracking
Write-Host "6. Lancement de l app de tracking..." -ForegroundColor Yellow
adb shell monkey -p com.bascule.leclerctracking -c android.intent.category.LAUNCHER 1
Start-Sleep -Seconds 2
Write-Host "   App lancee" -ForegroundColor Green
Write-Host ""

# Etape 7 : Lancer Carrefour
Write-Host "7. Lancement de Carrefour..." -ForegroundColor Yellow
adb shell monkey -p com.carrefour.fid.android -c android.intent.category.LAUNCHER 1
Write-Host "   Carrefour lance" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "  SERVICE REDEMARRE AVEC NOUVEL APK" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Tu peux maintenant lancer le monitoring!" -ForegroundColor Cyan
Write-Host "  .\start-monitoring.ps1 -DurationSeconds 60" -ForegroundColor Gray
Write-Host ""
