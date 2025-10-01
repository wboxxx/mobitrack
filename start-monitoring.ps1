# Script de monitoring complet : APK logs + Server logs
param(
    [int]$DurationSeconds = 300  # 5 minutes par défaut
)

$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$logFile = "monitoring-logs-$timestamp.txt"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MONITORING TRACKING SYSTEM" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Log file: $logFile" -ForegroundColor Yellow
Write-Host "Duration: $DurationSeconds seconds" -ForegroundColor Yellow
Write-Host ""

# Créer le fichier de log avec header
$header = @"
========================================
TRACKING SYSTEM MONITORING LOG
Started: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Duration: $DurationSeconds seconds
========================================

"@
$header | Out-File -FilePath $logFile -Encoding UTF8

# Fonction pour ajouter un log avec timestamp
function Add-Log {
    param([string]$Source, [string]$Message)
    $ts = Get-Date -Format "HH:mm:ss.fff"
    $logLine = "[$ts] [$Source] $Message"
    $logLine | Out-File -FilePath $logFile -Append -Encoding UTF8
    Write-Host $logLine
}

# Démarrer le serveur Node.js en arrière-plan
Add-Log "SYSTEM" "Starting Node.js server..."
$serverJob = Start-Job -ScriptBlock {
    Set-Location "C:\Users\Vincent B\CascadeProjects\web-tracking-system"
    node server.js 2>&1
}

Start-Sleep -Seconds 3
Add-Log "SYSTEM" "Node.js server started (Job ID: $($serverJob.Id))"

# Démarrer la capture des logs APK en arrière-plan
Add-Log "SYSTEM" "Starting APK log capture..."
$apkJob = Start-Job -ScriptBlock {
    adb logcat -s CrossAppTracking:D *:S 2>&1
}

Start-Sleep -Seconds 1
Add-Log "SYSTEM" "APK log capture started (Job ID: $($apkJob.Id))"

Add-Log "SYSTEM" "Monitoring active - Press Ctrl+C to stop early"
Write-Host ""

# Capturer les logs pendant la durée spécifiée
$endTime = (Get-Date).AddSeconds($DurationSeconds)
$lastServerOutput = ""
$lastApkOutput = ""

while ((Get-Date) -lt $endTime) {
    # Récupérer les logs du serveur
    $serverOutput = Receive-Job -Job $serverJob -Keep
    if ($serverOutput -and $serverOutput -ne $lastServerOutput) {
        $newLines = $serverOutput -replace [regex]::Escape($lastServerOutput), ""
        if ($newLines.Trim()) {
            foreach ($line in ($newLines -split "`n")) {
                if ($line.Trim()) {
                    Add-Log "SERVER" $line.Trim()
                }
            }
        }
        $lastServerOutput = $serverOutput
    }
    
    # Récupérer les logs APK
    $apkOutput = Receive-Job -Job $apkJob -Keep
    if ($apkOutput -and $apkOutput -ne $lastApkOutput) {
        $newLines = $apkOutput -replace [regex]::Escape($lastApkOutput), ""
        if ($newLines.Trim()) {
            foreach ($line in ($newLines -split "`n")) {
                if ($line.Trim()) {
                    Add-Log "APK" $line.Trim()
                }
            }
        }
        $lastApkOutput = $apkOutput
    }
    
    Start-Sleep -Milliseconds 500
}

# Arrêter les jobs
Add-Log "SYSTEM" "Stopping monitoring..."
Stop-Job -Job $serverJob
Stop-Job -Job $apkJob
Remove-Job -Job $serverJob
Remove-Job -Job $apkJob

Add-Log "SYSTEM" "Monitoring completed"
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  MONITORING COMPLETED" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Log file saved: $logFile" -ForegroundColor Yellow
Write-Host "File size: $((Get-Item $logFile).Length) bytes" -ForegroundColor Yellow
Write-Host ""
