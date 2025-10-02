# Monitor Appium Inspector session with clipboard tracking
$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  APPIUM SESSION MONITOR" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Ce script va monitorer:" -ForegroundColor Yellow
Write-Host "  1. Le clipboard (copies XML)" -ForegroundColor Gray
Write-Host "  2. Les logs APK (tracking events)" -ForegroundColor Gray
Write-Host ""
Write-Host "INSTRUCTIONS:" -ForegroundColor Yellow
Write-Host "  1. Ouvre Appium Inspector" -ForegroundColor Gray
Write-Host "  2. Selectionne un element (ex: bouton Acheter)" -ForegroundColor Gray
Write-Host "  3. Copie 'Selected Element' XML" -ForegroundColor Gray
Write-Host "  4. Copie 'App Source' XML (AVANT)" -ForegroundColor Gray
Write-Host "  5. Clique 'Tap' pour forward to app" -ForegroundColor Gray
Write-Host "  6. Attends 1-2 secondes" -ForegroundColor Gray
Write-Host "  7. Copie 'App Source' XML (APRES)" -ForegroundColor Gray
Write-Host "  8. Appuie sur Ctrl+C pour arreter" -ForegroundColor Gray
Write-Host ""

# Create session directory
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$sessionDir = "appium-session-$timestamp"
New-Item -ItemType Directory -Path $sessionDir -Force | Out-Null
Write-Host "Session directory: $sessionDir" -ForegroundColor Green
Write-Host ""

# Start APK log capture in background
Write-Host "Demarrage de la capture des logs APK..." -ForegroundColor Yellow
$logFile = Join-Path $sessionDir "tracking-logs.txt"
$logJob = Start-Job -ScriptBlock {
    param($logPath)
    adb logcat -c
    adb logcat -s CrossAppTracking:D AndroidTracking:D | Out-File -FilePath $logPath -Encoding UTF8
} -ArgumentList $logFile

Start-Sleep -Seconds 1
Write-Host "Logs APK en cours de capture" -ForegroundColor Green
Write-Host ""

# Monitor clipboard
Write-Host "Monitoring du clipboard actif..." -ForegroundColor Green
Write-Host "En attente des copies XML..." -ForegroundColor Yellow
Write-Host ""

$copyCount = 0
$previousClipboard = ""

Add-Type -AssemblyName System.Windows.Forms

try {
    while ($true) {
        Start-Sleep -Milliseconds 500
        
        # Get clipboard content
        $clipboard = [System.Windows.Forms.Clipboard]::GetText()
        
        # Check if clipboard changed and contains XML, JSON or Android elements
        $hasValidLength = $clipboard.Length -gt 500  # Increased to avoid false positives
        $isXmlHierarchy = $clipboard -match "<\?xml" -and $clipboard -match "<hierarchy"
        $isAndroidElement = $clipboard -match "<android\." -and $clipboard.Length -gt 500
        $isAppiumJson = $clipboard.StartsWith("[{") -and $clipboard.Contains("elementId") -and $clipboard.Contains("com.carrefour")
        
        $isValidContent = $clipboard -ne $previousClipboard -and $hasValidLength -and ($isXmlHierarchy -or $isAndroidElement -or $isAppiumJson)
        
        if ($isValidContent) {
            $copyCount++
            $timestamp = Get-Date -Format "HH:mm:ss.fff"
            
            # Determine file name based on copy count and content type
            $extension = if ($clipboard.StartsWith("[{")) { "json" } else { "xml" }
            $fileName = switch ($copyCount) {
                1 { "1-selected-element.$extension" }
                2 { "2-app-source-before.$extension" }
                3 { "3-app-source-after.$extension" }
                default { "$copyCount-extra-copy.$extension" }
            }
            
            $filePath = Join-Path $sessionDir $fileName
            $clipboard | Out-File -FilePath $filePath -Encoding UTF8
            
            # Count elements in XML
            $elementCount = ([regex]::Matches($clipboard, "<android\.")).Count
            
            Write-Host "[$timestamp] " -NoNewline -ForegroundColor Cyan
            Write-Host "Copie #$copyCount detectee: " -NoNewline -ForegroundColor White
            Write-Host "$fileName " -NoNewline -ForegroundColor Green
            Write-Host "($elementCount elements)" -ForegroundColor Gray
            
            # Special messages
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
    }
}
catch {
    Write-Host "Erreur: $_" -ForegroundColor Red
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

# Analysis
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ANALYSE DE LA SESSION" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Compare XML files
if (Test-Path (Join-Path $sessionDir "2-app-source-before.xml")) {
    $beforeXml = Get-Content (Join-Path $sessionDir "2-app-source-before.xml") -Raw
    $beforeProducts = ([regex]::Matches($beforeXml, 'text="[^"]*\u20AC"')).Count
    Write-Host "Etat AVANT:" -ForegroundColor Yellow
    Write-Host "  - $beforeProducts prix detectes" -ForegroundColor Gray
}

if (Test-Path (Join-Path $sessionDir "3-app-source-after.xml")) {
    $afterXml = Get-Content (Join-Path $sessionDir "3-app-source-after.xml") -Raw
    $afterProducts = ([regex]::Matches($afterXml, 'text="[^"]*\u20AC"')).Count
    Write-Host "Etat APRES:" -ForegroundColor Yellow
    Write-Host "  - $afterProducts prix detectes" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Fichiers sauvegardes dans: $sessionDir" -ForegroundColor Green
Write-Host ""
Write-Host "Analyse des logs de tracking..." -ForegroundColor Yellow

# Extract DIFF logs
if (Test-Path $logFile) {
    $diffLogs = Select-String -Path $logFile -Pattern "DIFF STATE|>>> DIFF|DIFF:" | Select-Object -Last 20
    if ($diffLogs) {
        Write-Host ""
        Write-Host "Logs DIFF detectes:" -ForegroundColor Green
        $diffLogs | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
    }
    else {
        Write-Host "  Aucun log DIFF trouve" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Session terminee!" -ForegroundColor Green
Write-Host "Ouvre les fichiers XML pour comparer manuellement" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
