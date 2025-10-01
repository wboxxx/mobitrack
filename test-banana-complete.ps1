# Test automatisé complet : Monitoring + Test Banane
param(
    [int]$MonitorDuration = 30
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TEST BANANE AUTOMATISÉ COMPLET 🍌" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier qu'Appium tourne
Write-Host "1. Vérification d'Appium..." -ForegroundColor Yellow
$appiumRunning = netstat -ano | findstr ":4723"
if (-not $appiumRunning) {
    Write-Host "   ❌ Appium n'est pas lancé!" -ForegroundColor Red
    Write-Host ""
    Write-Host "   Lance Appium dans un autre terminal:" -ForegroundColor Yellow
    Write-Host "   .\start-appium.ps1" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}
Write-Host "   ✅ Appium actif" -ForegroundColor Green
Write-Host ""

# Vider le cache logcat
Write-Host "2. Préparation du monitoring..." -ForegroundColor Yellow
adb logcat -c
Write-Host "   ✅ Cache logcat vidé" -ForegroundColor Green
Write-Host ""

# Timestamp pour le fichier
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$logFile = "monitoring-clean-$timestamp.txt"

Write-Host "3. Démarrage du monitoring en arrière-plan..." -ForegroundColor Yellow
Write-Host "   📝 Fichier: $logFile" -ForegroundColor Gray

# Lancer le monitoring en arrière-plan
$monitorJob = Start-Job -ScriptBlock {
    param($duration, $logFile)
    
    $endTime = (Get-Date).AddSeconds($duration)
    $process = Start-Process -FilePath "adb" -ArgumentList "logcat -s CrossAppTracking:D AndroidTracking:D" -NoNewWindow -PassThru -RedirectStandardOutput $logFile
    
    while ((Get-Date) -lt $endTime) {
        Start-Sleep -Seconds 1
    }
    
    Stop-Process -Id $process.Id -Force
} -ArgumentList $MonitorDuration, $logFile

Start-Sleep -Seconds 2
Write-Host "   ✅ Monitoring démarré" -ForegroundColor Green
Write-Host ""

# Lancer le test Appium
Write-Host "4. Lancement du test automatisé..." -ForegroundColor Yellow
Write-Host "   🍌 Test d'ajout de banane au panier" -ForegroundColor Cyan
Write-Host ""

Push-Location "test-automation"
try {
    & npm run test:carrefour-banana-cart 2>&1 | ForEach-Object {
        if ($_ -match "✅|🍌|📱|🛒|⚠️|❌") {
            Write-Host "   $_" -ForegroundColor Gray
        }
    }
    Write-Host ""
    Write-Host "   ✅ Test terminé" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️ Erreur lors du test" -ForegroundColor Yellow
}
Pop-Location
Write-Host ""

# Attendre la fin du monitoring
Write-Host "5. Attente de la fin du monitoring..." -ForegroundColor Yellow
Wait-Job -Job $monitorJob | Out-Null
Remove-Job -Job $monitorJob
Write-Host "   ✅ Monitoring terminé" -ForegroundColor Green
Write-Host ""

# Analyser les résultats
Write-Host "6. Analyse des résultats..." -ForegroundColor Yellow
Write-Host ""

if (Test-Path $logFile) {
    $content = Get-Content $logFile
    
    # Filtrer les événements Carrefour (hors systemui et navigation)
    $carrefourEvents = $content | Where-Object { 
        $_ -match "ADD_TO_CART" -and 
        $_ -match "com.carrefour.fid.android" -and
        $_ -notmatch "com.android.systemui" -and
        $_ -notmatch "Accueil|Rechercher|Promotions|Mon compte" -and
        $_ -notmatch "Panier, \d+ new"
    }
    
    # Événements avec prix valide
    $validPriceEvents = $carrefourEvents | Where-Object { $_ -match "price=\d+[,\.]\d+€" }
    
    # Événements banane
    $bananaEvents = $carrefourEvents | Where-Object { $_ -match "Banane|banane|BANANE" }
    
    Write-Host "📊 Résumé:" -ForegroundColor Cyan
    Write-Host "   Total événements Carrefour (filtrés): $($carrefourEvents.Count)" -ForegroundColor White
    Write-Host "   Avec prix valide: $($validPriceEvents.Count)" -ForegroundColor Green
    Write-Host "   Contenant 'Banane': $($bananaEvents.Count)" -ForegroundColor Yellow
    Write-Host ""
    
    if ($bananaEvents.Count -gt 0) {
        Write-Host "🍌 ÉVÉNEMENTS BANANE DÉTECTÉS:" -ForegroundColor Green
        Write-Host ""
        foreach ($event in $bananaEvents) {
            # Extraire les infos importantes
            if ($event -match "productName=([^,}]+)") {
                $productName = $matches[1]
                Write-Host "   📦 Produit: $productName" -ForegroundColor Cyan
            }
            if ($event -match "price=([^,}]+)") {
                $price = $matches[1]
                Write-Host "   💰 Prix: $price" -ForegroundColor Green
            }
            if ($event -match "cartAction=([^,}]+)") {
                $action = $matches[1]
                Write-Host "   🛒 Action: $action" -ForegroundColor Yellow
            }
            Write-Host ""
        }
        
        Write-Host "✅ TEST RÉUSSI ! Les bananes ont été détectées !" -ForegroundColor Green
    } else {
        Write-Host "⚠️ AUCUN ÉVÉNEMENT BANANE DÉTECTÉ" -ForegroundColor Red
        Write-Host ""
        
        if ($validPriceEvents.Count -gt 0) {
            Write-Host "Autres produits détectés:" -ForegroundColor Yellow
            foreach ($event in $validPriceEvents | Select-Object -First 3) {
                if ($event -match "productName=([^,}]+)") {
                    Write-Host "   - $($matches[1])" -ForegroundColor Gray
                }
            }
        }
    }
    
    Write-Host ""
    Write-Host "📄 Log complet: $logFile" -ForegroundColor Gray
} else {
    Write-Host "❌ Fichier de log introuvable" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  TEST TERMINÉ" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
