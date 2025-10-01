# Script de monitoring simplifie (sans emojis)
param(
    [int]$DurationSeconds = 60
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MONITORING FILTRE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Vider le cache logcat
Write-Host "Vidage du cache logcat..." -ForegroundColor Yellow
adb logcat -c
Write-Host ""

# Timestamp pour le fichier
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$logFile = "monitoring-$timestamp.txt"

Write-Host "Monitoring pendant $DurationSeconds secondes..." -ForegroundColor Green
Write-Host "Fichier de log: $logFile" -ForegroundColor Gray
Write-Host ""

# Lancer adb logcat et capturer dans un fichier
Write-Host "Debut du monitoring..." -ForegroundColor Yellow
Write-Host ""

$job = Start-Job -ScriptBlock {
    param($duration, $logFile)
    $endTime = (Get-Date).AddSeconds($duration)
    $process = Start-Process -FilePath "adb" -ArgumentList "logcat -s CrossAppTracking:D AndroidTracking:D" -NoNewWindow -PassThru -RedirectStandardOutput $logFile
    while ((Get-Date) -lt $endTime) {
        Start-Sleep -Seconds 1
    }
    Stop-Process -Id $process.Id -Force
} -ArgumentList $DurationSeconds, $logFile

# Attendre
Start-Sleep -Seconds $DurationSeconds

# Attendre la fin du job
Wait-Job -Job $job | Out-Null
Remove-Job -Job $job

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  MONITORING TERMINE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Analyser le fichier de log
if (Test-Path $logFile) {
    Write-Host "Analyse des resultats..." -ForegroundColor Cyan
    Write-Host ""
    
    $content = Get-Content $logFile
    
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
        foreach ($bananaEvent in $bananaEvents) {
            Write-Host "  $bananaEvent" -ForegroundColor Cyan
        }
    } else {
        Write-Host "Aucun evenement BANANE detecte" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "Log complet: $logFile" -ForegroundColor Gray
}

Write-Host ""
