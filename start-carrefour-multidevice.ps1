# Script pour demarrer le systeme Carrefour multi-device
# Lance le serveur Node.js et le script de capture ADB multi-device

Write-Host "Demarrage du systeme Carrefour multi-device"
Write-Host "============================================="

# Verification des prerequis
Write-Host "1. Verification des prerequis..."

# Verifier que Node.js est installe
try {
    $nodeVersion = node --version 2>$null
    Write-Host "   Node.js detecte: $nodeVersion"
} catch {
    Write-Host "   Node.js non trouve. Veuillez installer Node.js."
    exit 1
}

# Verifier que Python est installe
try {
    $pythonVersion = py --version 2>$null
    Write-Host "   Python detecte: $pythonVersion"
} catch {
    Write-Host "   Python non trouve. Veuillez installer Python."
    exit 1
}

# Verifier que ADB est accessible
try {
    $adbVersion = adb version 2>$null | Select-Object -First 1
    Write-Host "   ADB detecte: $adbVersion"
} catch {
    Write-Host "   ADB non trouve. Veuillez installer Android SDK Platform Tools."
    exit 1
}

# Verifier qu'au moins un device est connecte
try {
    $deviceStatus = adb devices | Select-String -Pattern "\tdevice"
    if (-not $deviceStatus) {
        Write-Host "   Aucun device detecte. Veuillez connecter un emulateur ou un telephone."
        exit 1
    }
    $deviceCount = ($deviceStatus | Measure-Object).Count
    Write-Host "   $deviceCount device(s) connecte(s): OK"
} catch {
    Write-Host "   Erreur lors de la verification des devices."
    exit 1
}

Write-Host ""
Write-Host "========================================"
Write-Host "DEMARRAGE SYSTEME MONITORING"
Write-Host "========================================"
Write-Host "2. Demarrage du serveur Node.js..."
$nodeJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    node server.js
}

Start-Sleep -Seconds 3

Write-Host "3. Demarrage du script de capture ADB multi-device..."
$adbJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    py carrefour-adb-capture-multidevice.py
}

Start-Sleep -Seconds 2

Write-Host ""
Write-Host "========================================"
Write-Host "SUCCES!"
Write-Host "========================================"
Write-Host "Systeme Carrefour multi-device demarre avec succes!"
Write-Host "Dashboard: http://localhost:3001/carrefour-dashboard"
Write-Host "Serveur principal: http://localhost:3001"
Write-Host "Dashboard ouvert dans le navigateur"

try {
    Start-Process "http://localhost:3001/carrefour-dashboard"
    Write-Host "Navigateur ouvert"
} catch {
    Write-Host "Impossible d'ouvrir automatiquement le navigateur."
    Write-Host "Ouvrez manuellement: http://localhost:3001/carrefour-dashboard"
}

Write-Host ""
Write-Host "Instructions:"
Write-Host "- Naviguez dans l'application Carrefour sur vos devices"
Write-Host "- Les pages s'afficheront en temps reel dans le dashboard"
Write-Host "- Utilisez le selecteur de device pour filtrer par device"
Write-Host "- Appuyez sur Ctrl+C pour arreter tous les services"
Write-Host ""

try {
    while ($true) {
        Start-Sleep -Seconds 5

        $nodeState = (Get-Job -Id $nodeJob.Id).State
        $adbState = (Get-Job -Id $adbJob.Id).State

        if ($nodeState -eq "Failed" -or $nodeState -eq "Completed") {
            Write-Host "Serveur Node.js arrete (Etat: $nodeState)"
            break
        }

        if ($adbState -eq "Failed" -or $adbState -eq "Completed") {
            Write-Host "Script ADB arrete (Etat: $adbState)"
            break
        }
    }
} catch {
    Write-Host "Interruption detectee"
} finally {
    Write-Host ""
    Write-Host "Arret des services..."

    if ($nodeJob) {
        Stop-Job -Id $nodeJob.Id
        Remove-Job -Id $nodeJob.Id
        Write-Host "Serveur Node.js arrete"
    }

    if ($adbJob) {
        Stop-Job -Id $adbJob.Id
        Remove-Job -Id $adbJob.Id
        Write-Host "Script ADB arrete"
    }

    Write-Host "Systeme arrete"
}
