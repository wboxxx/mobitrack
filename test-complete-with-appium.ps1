# Test complet : Compilation + Monitoring + Capture Appium
$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TEST COMPLET AVEC APPIUM" -ForegroundColor Cyan
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

# 4. Create session directory
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$sessionDir = "appium-complete-session-$timestamp"
New-Item -ItemType Directory -Path $sessionDir -Force | Out-Null
Write-Host "Session directory: $sessionDir" -ForegroundColor Green
Write-Host ""

# 5. Start APK log capture in background
Write-Host "4. Demarrage de la capture des logs APK..." -ForegroundColor Yellow
$logFile = Join-Path (Get-Location) "$sessionDir\tracking-logs.txt"
$logJob = Start-Job -ScriptBlock {
    param($logPath)
    adb logcat -c
    adb logcat -s CrossAppTracking:D AndroidTracking:D | Out-File -FilePath $logPath -Encoding UTF8
} -ArgumentList $logFile

Start-Sleep -Seconds 1
Write-Host "   Logs APK en cours de capture" -ForegroundColor Green
Write-Host ""

# 6. Instructions for Appium Inspector
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  INSTRUCTIONS APPIUM INSPECTOR" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Maintenant dans Appium Inspector:" -ForegroundColor Yellow
Write-Host "  1. Ouvre l'app Carrefour" -ForegroundColor Gray
Write-Host "  2. Va sur une page avec des produits" -ForegroundColor Gray
Write-Host "  3. Selectionne un element (ex: bouton +)" -ForegroundColor Gray
Write-Host "  4. Copie 'Selected Element' (JSON)" -ForegroundColor Gray
Write-Host "  5. Copie 'App Source' (XML AVANT)" -ForegroundColor Gray
Write-Host "  6. Clique 'Tap' pour forward to app" -ForegroundColor Gray
Write-Host "  7. Attends 1-2 secondes" -ForegroundColor Gray
Write-Host "  8. Copie 'App Source' (XML APRES)" -ForegroundColor Gray
Write-Host ""
Write-Host "Le script va monitorer:" -ForegroundColor Yellow
Write-Host "  - Le clipboard (copies XML/JSON)" -ForegroundColor Gray
Write-Host "  - Les logs APK (tracking events)" -ForegroundColor Gray
Write-Host ""
Write-Host "Appuie sur Ctrl+C pour arreter" -ForegroundColor Gray
Write-Host ""

# 7. Monitor clipboard and logs simultaneously
$copyCount = 0
$previousClipboard = ""
$startTime = Get-Date

Add-Type -AssemblyName System.Windows.Forms

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MONITORING ACTIF" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

try {
    while ($true) {
        Start-Sleep -Milliseconds 500
        
        # Check clipboard
        $clipboard = [System.Windows.Forms.Clipboard]::GetText()
        
        $hasValidLength = $clipboard.Length -gt 500
        $isXmlHierarchy = $clipboard -match "<\?xml" -and $clipboard -match "<hierarchy"
        $isAndroidElement = $clipboard -match "<android\." -and $clipboard.Length -gt 500
        $isAppiumJson = $clipboard.StartsWith("[{") -and $clipboard.Contains("elementId") -and $clipboard.Contains("com.carrefour")
        
        $isValidContent = $clipboard -ne $previousClipboard -and $hasValidLength -and ($isXmlHierarchy -or $isAndroidElement -or $isAppiumJson)
        
        if ($isValidContent) {
            $copyCount++
            $copyTimestamp = Get-Date -Format "HH:mm:ss.fff"
            
            # Determine file name
            $extension = if ($clipboard.StartsWith("[{")) { "json" } else { "xml" }
            $fileName = switch ($copyCount) {
                1 { "1-selected-element.$extension" }
                2 { "2-app-source-before.$extension" }
                3 { "3-app-source-after.$extension" }
                default { "$copyCount-extra-copy.$extension" }
            }
            
            $filePath = Join-Path $sessionDir $fileName
            $clipboard | Out-File -FilePath $filePath -Encoding UTF8
            
            $elementCount = ([regex]::Matches($clipboard, "<android\.")).Count
            
            Write-Host "[$copyTimestamp] " -NoNewline -ForegroundColor Cyan
            Write-Host "Copie #$copyCount detectee: " -NoNewline -ForegroundColor White
            Write-Host "$fileName " -NoNewline -ForegroundColor Green
            Write-Host "($elementCount elements)" -ForegroundColor Gray
            
            if ($copyCount -eq 1) {
                Write-Host "  -> Element selectionne sauvegarde" -ForegroundColor Yellow
                Write-Host "  -> Maintenant copie 'App Source' (AVANT le clic)" -ForegroundColor Yellow
            }
            elseif ($copyCount -eq 2) {
                Write-Host "  -> Etat AVANT sauvegarde" -ForegroundColor Yellow
                Write-Host "  -> Maintenant clique 'Tap' puis attends 1-2 sec" -ForegroundColor Yellow
            }
            elseif ($copyCount -eq 3) {
                Write-Host "  -> Etat APRES sauvegarde" -ForegroundColor Yellow
                Write-Host "  -> Session complete! Analyse en cours..." -ForegroundColor Green
                Write-Host ""
                break
            }
            
            $previousClipboard = $clipboard
        }
        
        # Show recent DIFF logs every 2 seconds
        if (((Get-Date) - $startTime).TotalSeconds % 2 -lt 0.5 -and (Test-Path $logFile)) {
            $recentLogs = Get-Content $logFile -Tail 5 | Where-Object { 
                $_ -match "DIFF STATE|>>> DIFF|DIFF DETECTE|Build Fingerprint" 
            }
            
            if ($recentLogs) {
                $recentLogs | ForEach-Object {
                    if ($_ -match "Build Fingerprint") {
                        Write-Host "[LOG] $_" -ForegroundColor Magenta
                    }
                    elseif ($_ -match ">>> DIFF") {
                        Write-Host "[LOG] $_" -ForegroundColor Green
                    }
                    elseif ($_ -match "DIFF DETECTE") {
                        Write-Host "[LOG] $_" -ForegroundColor Cyan
                    }
                    elseif ($_ -match "DIFF STATE") {
                        Write-Host "[LOG] $_" -ForegroundColor Yellow
                    }
                }
            }
        }
    }
}
catch {
    Write-Host "Monitoring interrompu: $_" -ForegroundColor Red
}
finally {
    # Stop log capture
    Write-Host ""
    Write-Host "Arret de la capture des logs..." -ForegroundColor Yellow
    Stop-Job -Job $logJob
    Receive-Job -Job $logJob | Out-Null
    Remove-Job -Job $logJob
    Write-Host "Logs sauvegardes" -ForegroundColor Green
}

# 8. Analysis
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ANALYSE DE LA SESSION" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Analyze XML differences
if ((Test-Path (Join-Path $sessionDir "2-app-source-before.xml")) -and (Test-Path (Join-Path $sessionDir "3-app-source-after.xml"))) {
    Write-Host "Analyse des XML..." -ForegroundColor Yellow
    
    $beforeXml = Get-Content (Join-Path $sessionDir "2-app-source-before.xml") -Raw
    $afterXml = Get-Content (Join-Path $sessionDir "3-app-source-after.xml") -Raw
    
    # Extract quantities
    $beforeMatch = [regex]::Match($beforeXml, 'text="(\d+)" content-desc="\1 produits déjà ajoutés au panier"')
    $afterMatch = [regex]::Match($afterXml, 'text="(\d+)" content-desc="\1 produits déjà ajoutés au panier"')
    
    if ($beforeMatch.Success -and $afterMatch.Success) {
        $beforeQty = $beforeMatch.Groups[1].Value
        $afterQty = $afterMatch.Groups[1].Value
        
        Write-Host "Quantite AVANT: $beforeQty produits" -ForegroundColor Cyan
        Write-Host "Quantite APRES: $afterQty produits" -ForegroundColor Cyan
        
        if ($afterQty -gt $beforeQty) {
            $diff = $afterQty - $beforeQty
            Write-Host "CHANGEMENT DETECTE: +$diff produit(s) ajoute(s)" -ForegroundColor Green
        }
        elseif ($afterQty -lt $beforeQty) {
            $diff = $beforeQty - $afterQty
            Write-Host "CHANGEMENT DETECTE: -$diff produit(s) retire(s)" -ForegroundColor Yellow
        }
        else {
            Write-Host "Aucun changement de quantite" -ForegroundColor Gray
        }
    }
    else {
        Write-Host "Impossible d'extraire les quantites des XML" -ForegroundColor Red
    }
    Write-Host ""
}

# Analyze tracking logs
if (Test-Path $logFile) {
    Write-Host "Analyse des logs de tracking..." -ForegroundColor Yellow
    Write-Host ""
    
    # Extract Build Fingerprint
    $fingerprint = Select-String -Path $logFile -Pattern "Build Fingerprint" | Select-Object -First 1
    if ($fingerprint) {
        Write-Host "Build detecte:" -ForegroundColor Magenta
        Write-Host "  $fingerprint" -ForegroundColor Gray
        Write-Host ""
    }
    
    # Extract DIFF events
    $diffEvents = Select-String -Path $logFile -Pattern ">>> DIFF:"
    if ($diffEvents) {
        Write-Host "Evenements DIFF detectes par le service: $($diffEvents.Count)" -ForegroundColor Green
        $diffEvents | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
        Write-Host ""
    }
    else {
        Write-Host "Aucun evenement DIFF detecte par le service" -ForegroundColor Red
        Write-Host ""
        Write-Host "Cela signifie que:" -ForegroundColor Yellow
        Write-Host "  - Le clic via Appium Inspector ne declenche PAS les evenements d'accessibilite" -ForegroundColor Gray
        Write-Host "  - Le service Android n'a pas ete notifie du changement" -ForegroundColor Gray
        Write-Host "  - Il faut tester avec de vrais clics manuels sur l'appareil" -ForegroundColor Gray
        Write-Host ""
    }
    
    # Extract DIFF STATE logs
    $diffStates = Select-String -Path $logFile -Pattern "DIFF STATE" | Select-Object -Last 5
    if ($diffStates) {
        Write-Host "Derniers etats captures par le service:" -ForegroundColor Yellow
        $diffStates | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
        Write-Host ""
    }
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Session terminee!" -ForegroundColor Green
Write-Host "Fichiers sauvegardes dans: $sessionDir" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
