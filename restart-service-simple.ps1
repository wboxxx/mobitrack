# Script simple pour redemarrer le service d accessibilite via ADB
Write-Host "Redemarrage du service d accessibilite..." -ForegroundColor Cyan
Write-Host ""

# Ouvrir les parametres d accessibilite
Write-Host "1. Ouverture des parametres..." -ForegroundColor Yellow
adb shell am start -a android.settings.ACCESSIBILITY_SETTINGS
Start-Sleep -Seconds 2

Write-Host ""
Write-Host "2. Sur l emulateur:" -ForegroundColor Yellow
Write-Host "   - Trouve 'Bascule Cross-App Tracking'" -ForegroundColor Gray
Write-Host "   - Clique dessus" -ForegroundColor Gray
Write-Host "   - Desactive le switch" -ForegroundColor Gray
Write-Host "   - Reactive le switch" -ForegroundColor Gray
Write-Host ""

Read-Host "Appuie sur Enter quand c est fait"

# Retour a l ecran d accueil
Write-Host ""
Write-Host "3. Retour a l ecran d accueil..." -ForegroundColor Yellow
adb shell input keyevent KEYCODE_HOME

Write-Host ""
Write-Host "Service redemarre!" -ForegroundColor Green
Write-Host ""
