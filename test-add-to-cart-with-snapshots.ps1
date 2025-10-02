# Test script with before/after cart snapshots
$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TEST AJOUTS PANIER AVEC SNAPSHOTS" -ForegroundColor Cyan
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

# 3. Launch Carrefour automatically
Write-Host "3. Lancement de Carrefour..." -ForegroundColor Yellow
cmd /c "adb shell monkey -p com.carrefour.fid.android -c android.intent.category.LAUNCHER 1 >nul 2>&1"
Start-Sleep -Seconds 3
Write-Host "   Carrefour lance" -ForegroundColor Green
Write-Host ""

# 4. Take initial snapshot
Write-Host "4. Snapshot INITIAL du panier..." -ForegroundColor Yellow
Write-Host "   Clic sur l'icone panier en cours..." -ForegroundColor Gray
adb shell input tap 972 2263
Start-Sleep -Seconds 3
Write-Host "   Snapshot initial capture!" -ForegroundColor Green
Write-Host ""

# 5. Return to home
Write-Host "5. Retour a l'accueil Carrefour..." -ForegroundColor Yellow
adb shell input keyevent KEYCODE_BACK
Start-Sleep -Seconds 2
Write-Host ""

# 6. Stop existing server
Write-Host "6. Arret du serveur existant..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*node.exe*" } | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1
Write-Host "   Serveur arrete" -ForegroundColor Green
Write-Host ""

# 7. Start monitoring in background
Write-Host "7. Demarrage du monitoring..." -ForegroundColor Yellow
$monitoringJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    .\start-monitoring.ps1 -DurationSeconds 25
}
Start-Sleep -Seconds 3
Write-Host "   Monitoring actif" -ForegroundColor Green
Write-Host ""

# 8. Countdown and start beep
Write-Host "========================================" -ForegroundColor Green
Write-Host "  PREPARATION" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Prepare-toi a faire tes courses!" -ForegroundColor Cyan
Write-Host ""

# Countdown
Write-Host "3..." -ForegroundColor Yellow
[console]::beep(800, 300)
Start-Sleep -Seconds 1
Write-Host "2..." -ForegroundColor Yellow
[console]::beep(800, 300)
Start-Sleep -Seconds 1
Write-Host "1..." -ForegroundColor Yellow
[console]::beep(800, 300)
Start-Sleep -Seconds 1

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  GO! AJOUTE DES PRODUITS AU PANIER!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
[console]::beep(1200, 500)
Write-Host ""
Write-Host "Tu as 20 secondes!" -ForegroundColor Cyan
Write-Host ""

# 9. Wait 20 seconds
Start-Sleep -Seconds 20

# 10. End beep (whistle)
Write-Host ""
Write-Host "========================================" -ForegroundColor Red
Write-Host "  STOP! FIN DES COURSES!" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Red
[console]::beep(1500, 200)
Start-Sleep -Milliseconds 100
[console]::beep(1500, 200)
Start-Sleep -Milliseconds 100
[console]::beep(1500, 500)
Write-Host ""

# 11. Take final snapshot
Write-Host "11. Snapshot FINAL du panier..." -ForegroundColor Yellow
Write-Host "    Clic sur l'icone panier en cours..." -ForegroundColor Gray
adb shell input tap 972 2263
Start-Sleep -Seconds 3
Write-Host "    Snapshot final capture!" -ForegroundColor Green
Write-Host ""

# 12. Wait for monitoring to finish
Write-Host "12. Attente de la fin du monitoring..." -ForegroundColor Yellow
Wait-Job $monitoringJob | Out-Null
$monitoringOutput = Receive-Job $monitoringJob
Remove-Job $monitoringJob
Write-Host ""

# 13. Analyze results
Write-Host "========================================" -ForegroundColor Green
Write-Host "  ANALYSE DES RESULTATS" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Extract log filename
$logFile = $monitoringOutput | Select-String -Pattern "Log file saved: (.*)" | ForEach-Object { $_.Matches.Groups[1].Value }

if ($logFile) {
    Write-Host "Fichier de log: $logFile" -ForegroundColor Cyan
    Write-Host ""
    
    # Find snapshot events
    $snapshotLines = Select-String -Path $logFile -Pattern "Snapshot capture|Fin du scan|Produit ajoute au snapshot|Badge detecte" -CaseSensitive:$false
    
    if ($snapshotLines) {
        Write-Host "SNAPSHOTS DETECTES:" -ForegroundColor Green
        Write-Host ""
        
        # Parse snapshots
        $snapshots = @()
        $currentSnapshot = $null
        
        foreach ($line in $snapshotLines) {
            $text = $line.Line
            
            if ($text -match "Debut du scan") {
                $currentSnapshot = @{
                    Products = @()
                    TotalItems = 0
                    TotalValue = 0
                }
            }
            elseif ($text -match "Badge detecte: (\d+) articles") {
                if ($currentSnapshot) {
                    $currentSnapshot.TotalItems = [int]$matches[1]
                }
            }
            elseif ($text -match "Produit ajoute au snapshot: (.+) - ([0-9,\.]+)") {
                if ($currentSnapshot) {
                    $currentSnapshot.Products += @{
                        Name = $matches[1]
                        Price = $matches[2]
                    }
                }
            }
            elseif ($text -match "Fin du scan: (\d+) produits") {
                if ($currentSnapshot) {
                    $currentSnapshot.DetectedCount = [int]$matches[1]
                    $snapshots += $currentSnapshot
                    $currentSnapshot = $null
                }
            }
        }
        
        if ($snapshots.Count -ge 2) {
            $initialSnapshot = $snapshots[0]
            $finalSnapshot = $snapshots[-1]
            
            Write-Host "SNAPSHOT INITIAL:" -ForegroundColor Yellow
            Write-Host "  Produits detectes: $($initialSnapshot.DetectedCount)" -ForegroundColor White
            Write-Host "  Total dans le panier: $($initialSnapshot.TotalItems)" -ForegroundColor White
            foreach ($product in $initialSnapshot.Products) {
                Write-Host "    - $($product.Name) - $($product.Price) euros" -ForegroundColor Gray
            }
            Write-Host ""
            
            Write-Host "SNAPSHOT FINAL:" -ForegroundColor Yellow
            Write-Host "  Produits detectes: $($finalSnapshot.DetectedCount)" -ForegroundColor White
            Write-Host "  Total dans le panier: $($finalSnapshot.TotalItems)" -ForegroundColor White
            foreach ($product in $finalSnapshot.Products) {
                Write-Host "    - $($product.Name) - $($product.Price) euros" -ForegroundColor Gray
            }
            Write-Host ""
            
            # Calculate difference
            $addedCount = $finalSnapshot.TotalItems - $initialSnapshot.TotalItems
            Write-Host "DIFFERENCE:" -ForegroundColor Cyan
            Write-Host "  Produits ajoutes (attendus): $addedCount" -ForegroundColor White
            Write-Host ""
        }
        else {
            Write-Host "Pas assez de snapshots detectes (besoin de 2, trouve: $($snapshots.Count))" -ForegroundColor Yellow
        }
    }
    
    # Check ADD_TO_CART events
    Write-Host "EVENEMENTS ADD_TO_CART DETECTES:" -ForegroundColor Yellow
    $addEvents = Select-String -Path $logFile -Pattern "cartAction=Ajouter" -CaseSensitive:$false
    
    if ($addEvents) {
        Write-Host "  Nombre d'ajouts detectes: $($addEvents.Count)" -ForegroundColor White
        Write-Host ""
        
        $eventNum = 1
        foreach ($addEvent in $addEvents) {
            Write-Host "  $eventNum. $($addEvent.Line)" -ForegroundColor Gray
            $eventNum++
        }
    }
    else {
        Write-Host "  Aucun evenement d'ajout detecte pendant les 20 secondes" -ForegroundColor Red
    }
    Write-Host ""
    
    # Summary
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  RESUME" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  Log: $logFile" -ForegroundColor Green
    Write-Host "  Dashboard: http://localhost:3001" -ForegroundColor Green
    Write-Host ""
    
} else {
    Write-Host "Impossible de trouver le fichier de log" -ForegroundColor Red
    Write-Host ""
}

Write-Host "Test complete!" -ForegroundColor Green
Write-Host ""
