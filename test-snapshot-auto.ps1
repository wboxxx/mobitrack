# Script de test automatique du snapshot
$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TEST AUTOMATIQUE SNAPSHOT" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 0. Activer le feedback visuel des touches
Write-Host "0. Activation du feedback visuel..." -ForegroundColor Yellow
adb shell settings put system show_touches 1
adb shell settings put system pointer_location 1
Write-Host "   Feedback visuel activé ✅" -ForegroundColor Green
Write-Host ""

# 1. Compiler et installer
Write-Host "1. Compilation de l'APK..." -ForegroundColor Yellow
cd android-app
.\build-simple.ps1
cd ..
Write-Host ""

# 2. Redémarrer le service
Write-Host "2. Redémarrage du service..." -ForegroundColor Yellow
.\force-restart-service.ps1
Write-Host ""

# 3. Attendre que Carrefour soit bien lancé
Write-Host "3. Attente du chargement de Carrefour (5s)..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
Write-Host ""

# 4. Arrêter le serveur existant (si actif)
Write-Host "4. Arret du serveur existant..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*node.exe*" } | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1
Write-Host "   Serveur arrete" -ForegroundColor Green
Write-Host ""

# 5. Lancer le monitoring en arrière-plan
Write-Host "5. Demarrage du monitoring (20s)..." -ForegroundColor Yellow
$monitoringJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    .\start-monitoring.ps1 -DurationSeconds 10
}
Start-Sleep -Seconds 3
Write-Host "   Monitoring actif" -ForegroundColor Green
Write-Host ""

# 6. Cliquer sur l'icône panier (pendant le monitoring)
Write-Host "6. Clic sur le panier (tu verras le cercle blanc)..." -ForegroundColor Yellow
# Coordonnées de l'icône panier (bas droite de l'écran)
adb shell input tap 972 2263
Write-Host "   Clic effectue - Attente du chargement complet (8s)..." -ForegroundColor Green
Start-Sleep -Seconds 8
Write-Host ""

# 7. Attendre la fin du monitoring
Write-Host "7. Attente de la fin du monitoring..." -ForegroundColor Yellow
Wait-Job $monitoringJob | Out-Null
Receive-Job $monitoringJob
Remove-Job $monitoringJob
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "  TEST TERMINE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Désactiver le feedback visuel (optionnel)
<# Write-Host "Désactiver le feedback visuel? (O/N)" -ForegroundColor Yellow
$response = Read-Host
if ($response -eq "O" -or $response -eq "o") {
    adb shell settings put system show_touches 0
    adb shell settings put system pointer_location 0
    Write-Host "   Feedback visuel désactivé" -ForegroundColor Green
}
Write-Host ""

Write-Host "Verifie les logs pour voir le snapshot:" -ForegroundColor Cyan
Write-Host "  - Cherche 'Snapshot capture'" -ForegroundColor Gray
Write-Host "  - Cherche 'Produit ajoute au snapshot'" -ForegroundColor Gray
Write-Host ""
 #>