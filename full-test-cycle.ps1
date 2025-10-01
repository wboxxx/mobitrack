# Script complet : Build + Install + Restart Service + Monitor + Analyze
param(
    [int]$MonitorDuration = 60
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CYCLE DE TEST COMPLET" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Etape 1 : Arreter le serveur existant
Write-Host "1 Arret du serveur Node.js existant..." -ForegroundColor Yellow
$existingServer = netstat -ano | findstr ":3001"
if ($existingServer) {
    $pid = ($existingServer -split '\s+')[-1]
    taskkill /PID $pid /F 2>$null
    Write-Host "   Serveur arrete (PID: $pid)" -ForegroundColor Green
} else {
    Write-Host "   Aucun serveur actif" -ForegroundColor Gray
}
Write-Host ""

# Etape 2 : Build et install APK
Write-Host "2 Compilation et installation de l APK..." -ForegroundColor Yellow
Set-Location "android-app"
& .\build-and-install.ps1
Set-Location ".."
Write-Host "   APK installe" -ForegroundColor Green
Write-Host ""

# Etape 3 : Verifier qu Appium tourne
Write-Host "3 Verification d Appium..." -ForegroundColor Yellow
$appiumRunning = netstat -ano | findstr ":4723"
if (-not $appiumRunning) {
    Write-Host "   Appium n est pas lance!" -ForegroundColor Red
    Write-Host "   Lance Appium dans un autre terminal: appium" -ForegroundColor Yellow
    Read-Host "   Appuie sur Enter quand Appium est lance"
}
Write-Host "   Appium actif" -ForegroundColor Green
Write-Host ""

# Etape 4 : Redemarrer le service d accessibilite
Write-Host "4 Redemarrage du service d accessibilite..." -ForegroundColor Yellow
Set-Location "test-automation"
npm run restart-accessibility
Set-Location ".."
Write-Host "   Service redemarre" -ForegroundColor Green
Write-Host ""

# Etape 5 : Lancer le monitoring
Write-Host "5 Demarrage du monitoring ($MonitorDuration secondes)..." -ForegroundColor Yellow
Write-Host "   Utilise Carrefour maintenant!" -ForegroundColor Cyan
Write-Host ""
& .\start-monitoring.ps1 -DurationSeconds $MonitorDuration

# Etape 6 : Analyser les logs
Write-Host ""
Write-Host "6 Analyse des logs..." -ForegroundColor Yellow
$latestLog = Get-ChildItem -Filter "monitoring-logs-*.txt" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($latestLog) {
    & .\analyze-logs.ps1 -LogFile $latestLog.Name
} else {
    Write-Host "   Aucun fichier de log trouve" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  CYCLE TERMINE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
