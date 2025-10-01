# Script pour lancer le test automatique interne (sans Appium)
$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TEST AUTOMATIQUE INTERNE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Vider le cache logcat
Write-Host "1. Vidage du cache Logcat..." -ForegroundColor Yellow
adb logcat -c
Write-Host "   Cache vide" -ForegroundColor Green
Write-Host ""

# Lancer l'app de tracking
Write-Host "2. Lancement de l'app de tracking..." -ForegroundColor Yellow
adb shell am start -n com.bascule.leclerctracking/.ui.ConsentActivity
Start-Sleep -Seconds 2
Write-Host "   App lancee" -ForegroundColor Green
Write-Host ""

# Lancer l'activité de test automatique
Write-Host "3. Lancement du test automatique..." -ForegroundColor Yellow
adb shell am start -n com.bascule.leclerctracking/.ui.AutoTestActivity
Start-Sleep -Seconds 2
Write-Host "   Test automatique lance" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  INSTRUCTIONS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Sur l'emulateur:" -ForegroundColor Yellow
Write-Host "  1. Clique sur le bouton 'DEMARRER LE TEST'" -ForegroundColor Cyan
Write-Host "  2. Le test va automatiquement:" -ForegroundColor Cyan
Write-Host "     - Lancer Carrefour" -ForegroundColor Gray
Write-Host "     - Ouvrir le panier" -ForegroundColor Gray
Write-Host "     - Scroller vers les bananes" -ForegroundColor Gray
Write-Host "     - Cliquer sur le bouton +" -ForegroundColor Gray
Write-Host "     - Capturer l'evenement ADD_TO_CART" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. Observe les logs dans l'app" -ForegroundColor Cyan
Write-Host ""

Write-Host "Pour voir les logs du service en temps reel:" -ForegroundColor Yellow
Write-Host "  adb logcat -s CrossAppTracking:D AndroidTracking:D AutoTestHelper:D" -ForegroundColor Gray
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "  PRET A TESTER!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
