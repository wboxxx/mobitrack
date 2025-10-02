# Test complet avec compilation, installation et monitoring Appium
$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TEST COMPLET AVEC APPIUM MONITORING" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Compile and install
Write-Host "1. Compilation et installation de l'APK..." -ForegroundColor Yellow
Set-Location android-app
.\build-simple.ps1
Set-Location ..
Write-Host ""

# 2. Restart service
Write-Host "2. Redemarrage du service..." -ForegroundColor Yellow
.\force-restart-service.ps1
Write-Host ""

# 3. Wait for service to be ready
Write-Host "3. Attente du demarrage du service (3s)..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
Write-Host ""

# 4. Start APK log capture in background
Write-Host "4. Demarrage de la capture des logs APK..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$sessionDir = "appium-test-session-$timestamp"
New-Item -ItemType Directory -Path $sessionDir -Force | Out-Null
$logFile = Join-Path $sessionDir "tracking-logs.txt"

$logJob = Start-Job -ScriptBlock {
    param($logPath)
    adb logcat -c
    adb logcat -s CrossAppTracking:D AndroidTracking:D | Out-File -FilePath $logPath -Encoding UTF8
} -ArgumentList $logFile

Start-Sleep -Seconds 1
Write-Host "   Logs APK en cours de capture" -ForegroundColor Green
Write-Host "   Fichiers sauvegardes dans: $sessionDir" -ForegroundColor Green
Write-Host ""

# 5. Instructions for Appium Inspector
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  INSTRUCTIONS APPIUM INSPECTOR" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Maintenant dans Appium Inspector:" -ForegroundColor Yellow
Write-Host "  1. Ouvre l'app Carrefour" -ForegroundColor Gray
Write-Host "  2. Va sur une page avec des produits" -ForegroundColor Gray
Write-Host "  3. Clique sur un bouton '+' pour ajouter un produit" -ForegroundColor Gray
Write-Host "  4. Observe les logs en temps reel ci-dessous" -ForegroundColor Gray
Write-Host ""
Write-Host "Le monitoring va durer 60 secondes..." -ForegroundColor Yellow
Write-Host "Appuie sur Ctrl+C pour arreter avant" -ForegroundColor Gray
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  LOGS EN TEMPS REEL" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 6. Monitor logs in real-time for 60 seconds
$startTime = Get-Date
$duration = 60

try {
    while (((Get-Date) - $startTime).TotalSeconds -lt $duration) {
        Start-Sleep -Seconds 2
        
        # Read new logs
        if (Test-Path $logFile) {
            $logs = Get-Content $logFile -Tail 20 | Where-Object { 
                $_ -match "DIFF STATE|>>> DIFF|DIFF DETECTE|Build Fingerprint" 
            }
            
            if ($logs) {
                $logs | ForEach-Object {
                    if ($_ -match "Build Fingerprint") {
                        Write-Host $_ -ForegroundColor Magenta
                    }
                    elseif ($_ -match ">>> DIFF") {
                        Write-Host $_ -ForegroundColor Green
                    }
                    elseif ($_ -match "DIFF DETECTE") {
                        Write-Host $_ -ForegroundColor Cyan
                    }
                    elseif ($_ -match "DIFF STATE") {
                        Write-Host $_ -ForegroundColor Yellow
                    }
                    else {
                        Write-Host $_ -ForegroundColor Gray
                    }
                }
            }
        }
    }
}
catch {
    Write-Host "Monitoring interrompu" -ForegroundColor Yellow
}
finally {
    # Stop log capture
    Write-Host ""
    Write-Host "Arret de la capture des logs..." -ForegroundColor Yellow
    Stop-Job -Job $logJob
    Receive-Job -Job $logJob | Out-Null
    Remove-Job -Job $logJob
    Write-Host "Logs sauvegardes dans: $logFile" -ForegroundColor Green
}

# 7. Analysis
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ANALYSE DES LOGS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if (Test-Path $logFile) {
    # Extract Build Fingerprint
    $fingerprint = Select-String -Path $logFile -Pattern "Build Fingerprint" | Select-Object -First 1
    if ($fingerprint) {
        Write-Host "Build detecte:" -ForegroundColor Yellow
        Write-Host "  $fingerprint" -ForegroundColor Gray
        Write-Host ""
    }
    
    # Extract DIFF events
    $diffEvents = Select-String -Path $logFile -Pattern ">>> DIFF:"
    if ($diffEvents) {
        Write-Host "Evenements DIFF detectes: $($diffEvents.Count)" -ForegroundColor Green
        $diffEvents | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
    }
    else {
        Write-Host "Aucun evenement DIFF detecte" -ForegroundColor Red
        Write-Host ""
        Write-Host "Causes possibles:" -ForegroundColor Yellow
        Write-Host "  - Aucun produit ajoute pendant le test" -ForegroundColor Gray
        Write-Host "  - Le service n'a pas capture les evenements" -ForegroundColor Gray
        Write-Host "  - Le produit n'etait pas visible a l'ecran" -ForegroundColor Gray
    }
    
    # Extract DIFF STATE logs
    Write-Host ""
    $diffStates = Select-String -Path $logFile -Pattern "DIFF STATE" | Select-Object -Last 5
    if ($diffStates) {
        Write-Host "Derniers etats captures:" -ForegroundColor Yellow
        $diffStates | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test termine!" -ForegroundColor Green
Write-Host "Logs complets dans: $sessionDir" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
