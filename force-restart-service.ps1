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

# Etape 3 : Forcer la reconfiguration manuelle systematique
Write-Host "3. Configuration manuelle des permissions d'accessibilite..." -ForegroundColor Yellow
Write-Host "   (Reconfiguration systematique pour s'assurer que ca fonctionne)" -ForegroundColor Gray
Write-Host ""

# Désactiver temporairement le service s'il était actif
Write-Host "   Desactivation temporaire du service..." -ForegroundColor Yellow
adb shell settings put secure enabled_accessibility_services null
Start-Sleep -Seconds 1

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
Write-Host "   d) Verifie que le service est bien actif" -ForegroundColor Cyan
Write-Host ""

Read-Host "Appuie sur Enter quand c est fait et que le service est actif"

Write-Host ""

# Retour a l accueil
Write-Host "6. Retour a l ecran d accueil..." -ForegroundColor Yellow
adb shell input keyevent KEYCODE_HOME
Start-Sleep -Seconds 1
Write-Host "   Retour accueil OK" -ForegroundColor Green
Write-Host ""

# Le service de tracking se lance automatiquement quand l'accessibilité est activée
# Pas besoin de le lancer manuellement

# Lancer Carrefour
Write-Host "7. Lancement de Carrefour..." -ForegroundColor Yellow
cmd /c "adb shell monkey -p com.carrefour.fid.android -c android.intent.category.LAUNCHER 1 >nul 2>&1"
Start-Sleep -Seconds 2
Write-Host "   Carrefour lance" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "  SERVICE REDEMARRE AVEC NOUVEL APK" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Tu peux maintenant lancer le monitoring!" -ForegroundColor Cyan
Write-Host "  .\start-monitoring.ps1 -DurationSeconds 60" -ForegroundColor Gray
Write-Host ""
