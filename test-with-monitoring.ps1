# Script qui lance le monitoring ET le test en parallele
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TEST BANANE AVEC MONITORING" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verifier qu'Appium tourne
$appiumRunning = netstat -ano | findstr ":4723"
if (-not $appiumRunning) {
    Write-Host "ERREUR: Appium n'est pas lance!" -ForegroundColor Red
    Write-Host "Lance Appium d'abord: .\start-appium.ps1" -ForegroundColor Yellow
    exit 1
}

# Timestamp
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$logFile = "monitoring-$timestamp.txt"

Write-Host "1. Demarrage du monitoring..." -ForegroundColor Yellow
adb logcat -c

# Lancer le monitoring en arriere-plan
$logFilePath = Join-Path $PSScriptRoot $logFile
$monitorJob = Start-Job -ScriptBlock {
    param($logPath)
    $process = Start-Process -FilePath "adb" -ArgumentList "logcat -s CrossAppTracking:D AndroidTracking:D" -NoNewWindow -PassThru -RedirectStandardOutput $logPath
    Wait-Process -Id $process.Id
} -ArgumentList $logFilePath

Start-Sleep -Seconds 2
Write-Host "   Monitoring demarre (fichier: $logFile)" -ForegroundColor Green
Write-Host ""

# Lancer le test
Write-Host "2. Lancement du test Appium..." -ForegroundColor Yellow
Push-Location "test-automation"
& npm run test:carrefour-banana-cart
Pop-Location
Write-Host ""

# Attendre un peu pour capturer les logs
Write-Host "3. Attente de 5 secondes pour capture des logs..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Arreter le monitoring
Stop-Job -Job $monitorJob
Remove-Job -Job $monitorJob
Write-Host "   Monitoring arrete" -ForegroundColor Green
Write-Host ""

# Analyser les resultats
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ANALYSE DES RESULTATS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if (Test-Path $logFilePath) {
    $content = Get-Content $logFilePath
    
    # Filtrer les evenements Carrefour (hors systemui)
    $carrefourEvents = $content | Where-Object { 
        $_ -match "ADD_TO_CART" -and 
        $_ -match "com.carrefour.fid.android" -and
        $_ -notmatch "com.android.systemui"
    }
    
    # Evenements avec prix
    $validPriceEvents = $carrefourEvents | Where-Object { $_ -match "price=" }
    
    # Chercher les bananes
    $bananaEvents = $carrefourEvents | Where-Object { $_ -match "Banane|banane|BANANE" }
    
    Write-Host "RESUME:" -ForegroundColor Yellow
    Write-Host "  Total evenements Carrefour: $($carrefourEvents.Count)" -ForegroundColor White
    Write-Host "  Avec prix valide: $($validPriceEvents.Count)" -ForegroundColor Green
    Write-Host "  Contenant Banane: $($bananaEvents.Count)" -ForegroundColor Yellow
    Write-Host ""
    
    if ($bananaEvents.Count -gt 0) {
        Write-Host "EVENEMENTS BANANE DETECTES:" -ForegroundColor Green
        Write-Host ""
        foreach ($bananaEvent in $bananaEvents) {
            Write-Host $bananaEvent -ForegroundColor Cyan
            Write-Host ""
        }
        Write-Host "TEST REUSSI! Les bananes ont ete detectees!" -ForegroundColor Green
    } else {
        Write-Host "AUCUN EVENEMENT BANANE DETECTE" -ForegroundColor Red
        Write-Host ""
        if ($carrefourEvents.Count -gt 0) {
            Write-Host "Autres evenements detectes:" -ForegroundColor Yellow
            $carrefourEvents | Select-Object -First 5 | ForEach-Object {
                Write-Host "  $_" -ForegroundColor Gray
            }
        }
    }
    
    Write-Host ""
    Write-Host "Log complet: $logFile" -ForegroundColor Gray
} else {
    Write-Host "ERREUR: Fichier de log introuvable" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  TERMINE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
