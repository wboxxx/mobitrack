# Script pour analyser automatiquement les logs de monitoring
param(
    [string]$LogFile
)

if (-not $LogFile) {
    # Trouver le fichier de log le plus récent
    $LogFile = Get-ChildItem -Filter "monitoring-logs-*.txt" | Sort-Object LastWriteTime -Descending | Select-Object -First 1 -ExpandProperty Name
    
    if (-not $LogFile) {
        Write-Host "No monitoring log files found!" -ForegroundColor Red
        exit 1
    }
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  LOG ANALYSIS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Analyzing: $LogFile" -ForegroundColor Yellow
Write-Host ""

$content = Get-Content $LogFile

# Statistiques
$totalLines = $content.Count
$apkLines = ($content | Where-Object { $_ -match "\[APK\]" }).Count
$serverLines = ($content | Where-Object { $_ -match "\[SERVER\]" }).Count

# Événements détectés
$addToCartEvents = ($content | Where-Object { $_ -match "ADD_TO_CART" }).Count
$viewClickedEvents = ($content | Where-Object { $_ -match "VIEW_CLICKED" }).Count
$scrollEvents = ($content | Where-Object { $_ -match "SCROLL" }).Count

# Détection de contexte recherche
$searchContextDetected = ($content | Where-Object { $_ -match "Contexte recherche/navigation détecté" }).Count

# Vrais boutons panier détectés
$realCartButtons = ($content | Where-Object { $_ -match "Vrai bouton panier détecté" }).Count

Write-Host "STATISTICS:" -ForegroundColor Green
Write-Host "  Total lines: $totalLines"
Write-Host "  APK logs: $apkLines"
Write-Host "  Server logs: $serverLines"
Write-Host ""

Write-Host "EVENTS DETECTED:" -ForegroundColor Green
Write-Host "  ADD_TO_CART: $addToCartEvents"
Write-Host "  VIEW_CLICKED: $viewClickedEvents"
Write-Host "  SCROLL: $scrollEvents"
Write-Host ""

Write-Host "APK DETECTION:" -ForegroundColor Green
Write-Host "  Search context blocked: $searchContextDetected"
Write-Host "  Real cart buttons found: $realCartButtons"
Write-Host ""

# Afficher les derniers événements ADD_TO_CART
Write-Host "LAST 5 ADD_TO_CART EVENTS:" -ForegroundColor Yellow
$content | Where-Object { $_ -match "ADD_TO_CART" } | Select-Object -Last 5 | ForEach-Object {
    Write-Host "  $_" -ForegroundColor Cyan
}
Write-Host ""

# Afficher les détections de contexte recherche
if ($searchContextDetected -gt 0) {
    Write-Host "SEARCH CONTEXT DETECTIONS:" -ForegroundColor Yellow
    $content | Where-Object { $_ -match "Contexte recherche/navigation détecté" } | ForEach-Object {
        Write-Host "  $_" -ForegroundColor Magenta
    }
    Write-Host ""
}

# Afficher les vrais boutons panier
if ($realCartButtons -gt 0) {
    Write-Host "REAL CART BUTTONS DETECTED:" -ForegroundColor Yellow
    $content | Where-Object { $_ -match "Vrai bouton panier détecté" } | ForEach-Object {
        Write-Host "  $_" -ForegroundColor Green
    }
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Full log available in: $LogFile" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
