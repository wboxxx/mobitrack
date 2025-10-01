# Test automatisé complet : Build + Restart + Test Banane + Analyse logs
param(
    [switch]$SkipBuild = $false,
    [int]$MonitorDuration = 10
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TEST AUTOMATISÉ : BANANE CARREFOUR 🍌" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Etape 1 : Vérifier qu'Appium tourne
Write-Host "1. Vérification d'Appium..." -ForegroundColor Yellow
$appiumRunning = netstat -ano | findstr ":4723"
if (-not $appiumRunning) {
    Write-Host "   ❌ Appium n'est pas lancé!" -ForegroundColor Red
    Write-Host "   Lance Appium dans un autre terminal: appium" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Appuie sur Enter quand Appium est lancé"
}
Write-Host "   ✅ Appium actif" -ForegroundColor Green
Write-Host ""

# Etape 2 : Rebuild et restart (si demandé)
if (-not $SkipBuild) {
    Write-Host "2. Rebuild et restart du service..." -ForegroundColor Yellow
    & .\rebuild-and-restart.ps1
    Write-Host ""
} else {
    Write-Host "2. Build ignoré (SkipBuild)" -ForegroundColor Gray
    Write-Host ""
}

# Etape 3 : Démarrer le monitoring en arrière-plan
Write-Host "3. Démarrage du monitoring en arrière-plan..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$logFile = "monitoring-logs-$timestamp.txt"

# Lancer adb logcat en arrière-plan
$logcatJob = Start-Job -ScriptBlock {
    param($logFile)
    & adb logcat -c
    & adb logcat -s CrossAppTracking:D AndroidTracking:D *:S > $logFile
} -ArgumentList $logFile

Write-Host "   ✅ Monitoring démarré (fichier: $logFile)" -ForegroundColor Green
Write-Host ""

# Etape 4 : Lancer le test Appium
Write-Host "4. Lancement du test automatisé (ajout banane)..." -ForegroundColor Yellow
Write-Host "   🍌 Le test va automatiquement:" -ForegroundColor Cyan
Write-Host "      - Ouvrir Carrefour" -ForegroundColor Gray
Write-Host "      - Rechercher 'banane'" -ForegroundColor Gray
Write-Host "      - Sélectionner le premier résultat" -ForegroundColor Gray
Write-Host "      - Ajouter au panier" -ForegroundColor Gray
Write-Host ""

Push-Location "test-automation"
try {
    & npm run test:carrefour-banana
    Write-Host "   ✅ Test terminé" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️ Erreur lors du test, mais on continue..." -ForegroundColor Yellow
}
Pop-Location
Write-Host ""

# Etape 5 : Attendre un peu plus pour capturer tous les logs
Write-Host "5. Attente de capture des logs ($MonitorDuration secondes)..." -ForegroundColor Yellow
Start-Sleep -Seconds $MonitorDuration
Write-Host "   ✅ Capture terminée" -ForegroundColor Green
Write-Host ""

# Etape 6 : Arrêter le monitoring
Write-Host "6. Arrêt du monitoring..." -ForegroundColor Yellow
Stop-Job -Job $logcatJob
Remove-Job -Job $logcatJob
Write-Host "   ✅ Monitoring arrêté" -ForegroundColor Green
Write-Host ""

# Etape 7 : Analyser les logs
Write-Host "7. Analyse des logs..." -ForegroundColor Yellow
if (Test-Path $logFile) {
    $fileSize = (Get-Item $logFile).Length
    Write-Host "   📊 Fichier de log: $logFile ($fileSize octets)" -ForegroundColor Cyan
    Write-Host ""
    
    # Afficher les événements ADD_TO_CART
    Write-Host "   🔍 Événements ADD_TO_CART détectés:" -ForegroundColor Cyan
    $addToCartEvents = Select-String -Path $logFile -Pattern "ADD_TO_CART" -Context 0,2
    
    if ($addToCartEvents) {
        foreach ($event in $addToCartEvents) {
            Write-Host "   $($event.Line)" -ForegroundColor Green
            foreach ($contextLine in $event.Context.PostContext) {
                Write-Host "   $contextLine" -ForegroundColor Gray
            }
            Write-Host ""
        }
        
        $eventCount = ($addToCartEvents | Measure-Object).Count
        Write-Host "   ✅ Total: $eventCount événement(s) ADD_TO_CART" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️ Aucun événement ADD_TO_CART détecté!" -ForegroundColor Yellow
        Write-Host "   Vérifie que le service d'accessibilité est bien actif" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "   📄 Log complet disponible: $logFile" -ForegroundColor Cyan
    
    # Analyser avec le script d'analyse si disponible
    if (Test-Path ".\analyze-logs.ps1") {
        Write-Host ""
        Write-Host "   📊 Analyse détaillée:" -ForegroundColor Cyan
        & .\analyze-logs.ps1 -LogFile $logFile
    }
} else {
    Write-Host "   ❌ Fichier de log introuvable: $logFile" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  ✅ TEST TERMINÉ!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Résumé:" -ForegroundColor Cyan
Write-Host "  - Logs: $logFile" -ForegroundColor Gray
Write-Host "  - Pour relancer: .\test-banana-flow.ps1 -SkipBuild" -ForegroundColor Gray
Write-Host ""
