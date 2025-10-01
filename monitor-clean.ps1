# Script de monitoring avec filtrage intelligent des logs
param(
    [int]$DurationSeconds = 60
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MONITORING PROPRE (filtré)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Vider le cache logcat
Write-Host "🧹 Vidage du cache logcat..." -ForegroundColor Yellow
adb logcat -c
Write-Host ""

# Timestamp pour le fichier
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$logFile = "monitoring-clean-$timestamp.txt"

Write-Host "📊 Monitoring pendant $DurationSeconds secondes..." -ForegroundColor Green
Write-Host "📝 Fichier de log: $logFile" -ForegroundColor Gray
Write-Host ""
Write-Host "🔍 Filtrage actif:" -ForegroundColor Cyan
Write-Host "   ✅ Événements ADD_TO_CART de Carrefour" -ForegroundColor Green
Write-Host "   ✅ Événements avec prix valide" -ForegroundColor Green
Write-Host "   ❌ Horloge système (com.android.systemui)" -ForegroundColor Red
Write-Host "   ❌ Boutons de navigation" -ForegroundColor Red
Write-Host ""

# Lancer le monitoring en arrière-plan
$job = Start-Job -ScriptBlock {
    param($duration, $logFile)
    
    $endTime = (Get-Date).AddSeconds($duration)
    
    # Capturer les logs
    $process = Start-Process -FilePath "adb" -ArgumentList "logcat -s CrossAppTracking:D AndroidTracking:D" -NoNewWindow -PassThru -RedirectStandardOutput $logFile
    
    # Attendre la durée spécifiée
    while ((Get-Date) -lt $endTime) {
        Start-Sleep -Seconds 1
    }
    
    # Arrêter le processus
    Stop-Process -Id $process.Id -Force
} -ArgumentList $DurationSeconds, $logFile

# Afficher les logs en temps réel avec filtrage
$startTime = Get-Date
$lastLine = ""

Write-Host "⏱️ Début du monitoring..." -ForegroundColor Yellow
Write-Host ""

while ((Get-Date) -lt $startTime.AddSeconds($DurationSeconds)) {
    Start-Sleep -Milliseconds 500
    
    if (Test-Path $logFile) {
        $lines = Get-Content $logFile -Tail 50 -ErrorAction SilentlyContinue
        
        foreach ($line in $lines) {
            # Ignorer les lignes déjà affichées
            if ($line -eq $lastLine) { continue }
            
            # Filtrer les événements intéressants
            if ($line -match "ADD_TO_CART" -and $line -match "Carrefour") {
                # Ignorer com.android.systemui
                if ($line -notmatch "com.android.systemui") {
                    # Ignorer les boutons de navigation
                    $isNavigation = $line -match "Accueil|Rechercher|Promotions|Mon compte" -or $line -match "Panier, \d+ new"
                    if (-not $isNavigation) {
                        Write-Host $line -ForegroundColor Green
                    }
                }
            }
            elseif ($line -match "🛒 Produit envoyé" -and $line -match "Prix:") {
                # Afficher uniquement si prix valide (pas N/A)
                if ($line -notmatch "Prix: N/A") {
                    Write-Host $line -ForegroundColor Cyan
                }
            }
            elseif ($line -match "BANANE|Banane|banane") {
                Write-Host $line -ForegroundColor Yellow
            }
            
            $lastLine = $line
        }
    }
}

# Attendre la fin du job
Wait-Job -Job $job | Out-Null
Remove-Job -Job $job

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  MONITORING TERMINÉ" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Analyser le fichier de log
if (Test-Path $logFile) {
    Write-Host "📊 Analyse des résultats..." -ForegroundColor Cyan
    Write-Host ""
    
    $content = Get-Content $logFile
    
    # Compter les événements ADD_TO_CART de Carrefour (hors systemui)
    $carrefourEvents = $content | Where-Object { 
        $_ -match "ADD_TO_CART" -and 
        $_ -match "com.carrefour.fid.android" -and
        $_ -notmatch "com.android.systemui"
    }
    
    # Compter ceux avec un prix valide
    $validPriceEvents = $carrefourEvents | Where-Object { $_ -match "price=\d+[,\.]\d+€" }
    
    # Chercher les bananes
    $bananaEvents = $carrefourEvents | Where-Object { $_ -match "Banane|banane|BANANE" }
    
    Write-Host "📈 Résumé:" -ForegroundColor Yellow
    Write-Host "   Total événements Carrefour: $($carrefourEvents.Count)" -ForegroundColor White
    Write-Host "   Avec prix valide: $($validPriceEvents.Count)" -ForegroundColor Green
    Write-Host "   Contenant 'Banane': $($bananaEvents.Count)" -ForegroundColor Yellow
    Write-Host ""
    
    if ($bananaEvents.Count -gt 0) {
        Write-Host "🍌 Événements BANANE détectés:" -ForegroundColor Green
        foreach ($event in $bananaEvents) {
            Write-Host "   $event" -ForegroundColor Cyan
        }
    } else {
        Write-Host "⚠️ Aucun événement BANANE détecté" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "📄 Log complet: $logFile" -ForegroundColor Gray
}

Write-Host ""
