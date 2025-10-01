# Script pour lancer Appium avec les bonnes options de sécurité
Write-Host "🚀 Lancement d'Appium avec adb_shell activé..." -ForegroundColor Cyan
Write-Host ""
Write-Host "Options activées:" -ForegroundColor Yellow
Write-Host "  - uiautomator2:adb_shell : Permet d'exécuter des commandes shell via Appium" -ForegroundColor Gray
Write-Host ""

# Lancer Appium avec les options de sécurité (syntaxe Appium 3.x)
appium --allow-insecure uiautomator2:adb_shell
