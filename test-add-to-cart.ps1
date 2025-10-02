# Test script for manual cart additions
$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TEST AJOUTS AU PANIER" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Compile and install
Write-Host "1. Compilation de l'APK..." -ForegroundColor Yellow
Set-Location android-app
.\build-simple.ps1
Set-Location ..
Write-Host ""

# 2. Restart service
Write-Host "2. Redemarrage du service..." -ForegroundColor Yellow
.\force-restart-service.ps1
Write-Host ""

# 3. Stop existing server
Write-Host "3. Arret du serveur existant..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*node.exe*" } | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1
Write-Host "   Serveur arrete" -ForegroundColor Green
Write-Host ""

# 4. Start monitoring in background
Write-Host "4. Demarrage du monitoring (20s)..." -ForegroundColor Yellow
$monitoringJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    .\start-monitoring.ps1 -DurationSeconds 20
}
Start-Sleep -Seconds 3
Write-Host "   Monitoring actif" -ForegroundColor Green
Write-Host ""

# 5. User instructions
Write-Host "========================================" -ForegroundColor Green
Write-Host "  AJOUTE DES PRODUITS AU PANIER" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Tu as 20 secondes pour:" -ForegroundColor Cyan
Write-Host "  1. Ouvrir Carrefour sur l'emulateur" -ForegroundColor White
Write-Host "  2. Chercher des produits" -ForegroundColor White
Write-Host "  3. Cliquer sur les boutons '+' pour ajouter au panier" -ForegroundColor White
Write-Host ""
Write-Host "Le systeme va tracker:" -ForegroundColor Yellow
Write-Host "  - Nom du produit" -ForegroundColor Gray
Write-Host "  - Prix unitaire" -ForegroundColor Gray
Write-Host "  - Quantite ajoutee" -ForegroundColor Gray
Write-Host "  - Action (Ajouter/Retirer)" -ForegroundColor Gray
Write-Host ""
Write-Host "Monitoring en cours..." -ForegroundColor Cyan

# 6. Wait for monitoring to finish
Wait-Job $monitoringJob | Out-Null
$monitoringOutput = Receive-Job $monitoringJob
Remove-Job $monitoringJob
Write-Host ""

# 7. Display results
Write-Host "========================================" -ForegroundColor Green
Write-Host "  ANALYSE DES RESULTATS" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Extract log filename
$logFile = $monitoringOutput | Select-String -Pattern "Log file saved: (.*)" | ForEach-Object { $_.Matches.Groups[1].Value }

if ($logFile) {
    Write-Host "Fichier de log: $logFile" -ForegroundColor Cyan
    Write-Host ""
    
    # Analyze ADD_TO_CART events
    $addToCartEvents = Select-String -Path $logFile -Pattern "cartAction=Ajouter|Produit ajoute au snapshot" -CaseSensitive:$false
    
    if ($addToCartEvents) {
        Write-Host "EVENEMENTS DETECTES:" -ForegroundColor Green
        Write-Host ""
        
        # Count events
        $eventCount = $addToCartEvents.Count
        Write-Host "  Nombre total d'evenements: $eventCount" -ForegroundColor White
        Write-Host ""
        
        # Display event details
        Write-Host "DETAILS DES AJOUTS:" -ForegroundColor Yellow
        Write-Host ""
        
        $eventNumber = 1
        foreach ($cartEvent in $addToCartEvents) {
            $line = $cartEvent.Line
            Write-Host "  $eventNumber. $line" -ForegroundColor Cyan
            Write-Host ""
            $eventNumber++
        }
        
        # Check if dashboard was updated
        Write-Host "DASHBOARD:" -ForegroundColor Yellow
        $dashboardEvents = Select-String -Path $logFile -Pattern "ADD_TO_CART" -CaseSensitive:$false
        if ($dashboardEvents) {
            Write-Host "  Dashboard mis a jour ($($dashboardEvents.Count) evenements envoyes)" -ForegroundColor Green
        } else {
            Write-Host "  Aucun evenement envoye au dashboard" -ForegroundColor Red
        }
        Write-Host ""
        
        # Summary
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "  RESUME" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "  Evenements detectes: $eventCount" -ForegroundColor Green
        Write-Host "  Log sauvegarde: $logFile" -ForegroundColor Green
        Write-Host "  Dashboard accessible: http://localhost:3001" -ForegroundColor Green
        Write-Host ""
        
    } else {
        Write-Host "Aucun evenement ADD_TO_CART detecte" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Verifie que:" -ForegroundColor Cyan
        Write-Host "  - Tu as bien clique sur des boutons '+' dans Carrefour" -ForegroundColor Gray
        Write-Host "  - Le service d'accessibilite est actif" -ForegroundColor Gray
        Write-Host "  - Les produits ont un prix visible" -ForegroundColor Gray
        Write-Host ""
    }
    
    # Offer to open dashboard
    Write-Host "Veux-tu ouvrir le dashboard? (O/N)" -ForegroundColor Yellow
    $response = Read-Host
    if ($response -eq "O" -or $response -eq "o") {
        Start-Process "http://localhost:3001"
    }
    
} else {
    Write-Host "Impossible de trouver le fichier de log" -ForegroundColor Red
    Write-Host ""
}

Write-Host "Test complete!" -ForegroundColor Green
Write-Host ""
