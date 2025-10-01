# Script simplifié pour capturer le snapshot du panier
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CAPTURE SNAPSHOT PANIER" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Vérifier que Carrefour est lancé
Write-Host "1. Verification de Carrefour..." -ForegroundColor Yellow
$carrefourRunning = adb shell "dumpsys window windows | grep -E 'mCurrentFocus.*carrefour'"
if (-not $carrefourRunning) {
    Write-Host "   Carrefour n'est pas lance - Lancement..." -ForegroundColor Yellow
    adb shell monkey -p com.carrefour.fid.android -c android.intent.category.LAUNCHER 1 2>$null
    Start-Sleep -Seconds 3
    Write-Host "   Carrefour lance" -ForegroundColor Green
} else {
    Write-Host "   Carrefour deja lance" -ForegroundColor Green
}
Write-Host ""

# 2. Cliquer sur l'icône panier
Write-Host "2. Ouverture du panier..." -ForegroundColor Yellow
adb shell input tap 972 2263
Write-Host "   Clic effectue - Attente du chargement (3s)..." -ForegroundColor Green
Start-Sleep -Seconds 3
Write-Host ""

# 3. Vider le cache logcat et capturer les logs
Write-Host "3. Capture du snapshot..." -ForegroundColor Yellow
adb logcat -c
Start-Sleep -Seconds 1

# Attendre que le snapshot soit capturé (max 5s)
$timeout = 5
$elapsed = 0
$snapshotFound = $false

while ($elapsed -lt $timeout -and -not $snapshotFound) {
    $logs = adb logcat -d -s CrossAppTracking:D | Select-String "Snapshot capturé"
    if ($logs) {
        $snapshotFound = $true
        break
    }
    Start-Sleep -Milliseconds 500
    $elapsed += 0.5
}

if (-not $snapshotFound) {
    Write-Host "   Timeout - Snapshot non capture" -ForegroundColor Red
    Write-Host ""
    exit 1
}

Write-Host "   Snapshot capture!" -ForegroundColor Green
Write-Host ""

# 4. Extraire et afficher les produits
Write-Host "========================================" -ForegroundColor Green
Write-Host "  PRODUITS DETECTES" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

$allLogs = adb logcat -d -s CrossAppTracking:D
$products = @()
$productCount = 0

# Chercher les produits ajoutés
foreach ($line in $allLogs) {
    if ($line -match "Produit ajouté au snapshot: (.+) - (.+)") {
        $productName = $matches[1].Trim()
        $productPrice = $matches[2].Trim()
        $products += @{
            Name = $productName
            Price = $productPrice
        }
        $productCount++
    }
}

# Afficher les résultats
if ($productCount -eq 0) {
    Write-Host "Aucun produit trouvé dans le panier" -ForegroundColor Yellow
} else {
    Write-Host "Total: $productCount produit(s)" -ForegroundColor Cyan
    Write-Host ""
    
    $index = 1
    foreach ($product in $products) {
        Write-Host "  $index. $($product.Name)" -ForegroundColor White
        Write-Host "     Prix: $($product.Price)€" -ForegroundColor Gray
        Write-Host ""
        $index++
    }
    
    # Calculer le total
    $total = 0
    foreach ($product in $products) {
        $priceValue = $product.Price -replace ',', '.'
        $total += [double]$priceValue
    }
    
    Write-Host "----------------------------------------" -ForegroundColor Gray
    Write-Host "  TOTAL: $($total.ToString('0.00'))€" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
}

Write-Host ""
