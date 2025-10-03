#!/usr/bin/env pwsh
# Script complet pour demarrer le systeme Carrefour avec compilation et installation

Write-Host "========================================" -ForegroundColor Green
Write-Host "DEBUG CARREFOUR EVENTS - SYSTEME COMPLET" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

# Verifier les prerequis
Write-Host "1. Verification des prerequis..." -ForegroundColor Cyan

# Verifier Node.js
try {
    $nodeVersion = node --version 2>$null
    Write-Host "   Node.js detecte: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "   Node.js non trouve" -ForegroundColor Red
    exit 1
}

# Verifier Python
try {
    $pythonVersion = py --version 2>$null
    Write-Host "   Python detecte: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "   Python non trouve" -ForegroundColor Red
    exit 1
}

# Verifier ADB
try {
    $adbVersion = adb version 2>$null | Select-Object -First 1
    Write-Host "   ADB detecte: $adbVersion" -ForegroundColor Green
} catch {
    Write-Host "   ADB non trouve" -ForegroundColor Red
    exit 1
}

# Verifier que l'emulateur est connecte
try {
    $devices = adb devices 2>$null | Where-Object { $_ -match "device$" }
    if ($devices.Count -eq 0) {
        Write-Host "   Aucun emulateur connecte" -ForegroundColor Red
        exit 1
    }
    Write-Host "   Emulateur connecte: OK" -ForegroundColor Green
} catch {
    Write-Host "   Erreur verification emulateur" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "COMPILATION APK" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

Write-Host "2. Compilation de l'APK avec logs de debug..." -ForegroundColor Cyan

# Aller dans le dossier android-app
Set-Location android-app

# Compiler l'APK
Write-Host "   Execution: gradlew assembleDebug" -ForegroundColor Yellow
try {
    $compileResult = & ./gradlew assembleDebug 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   BUILD SUCCESSFUL" -ForegroundColor Green
    } else {
        Write-Host "   BUILD FAILED" -ForegroundColor Red
        Write-Host $compileResult -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "   Erreur compilation" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "3. Installation de l'APK..." -ForegroundColor Cyan

# Retourner au dossier racine
Set-Location ..

# Installer l'APK
Write-Host "   Execution: adb install -r app\build\outputs\apk\debug\app-debug.apk" -ForegroundColor Yellow
try {
    $installResult = & adb install -r android-app\app\build\outputs\apk\debug\app-debug.apk 2>&1
    if ($installResult -match "Success") {
        Write-Host "   APK installe avec succes" -ForegroundColor Green
    } else {
        Write-Host "   Erreur installation APK" -ForegroundColor Red
        Write-Host $installResult -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "   Erreur installation" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "FORCE RESTART SERVICE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

Write-Host "4. Redemarrage du service..." -ForegroundColor Cyan

# Arreter l'app de tracking
Write-Host "   Arret force de l'app de tracking..." -ForegroundColor Yellow
& adb shell am force-stop com.bascule.leclerctracking
Write-Host "   App arretee" -ForegroundColor Green

# Vider le cache Logcat
Write-Host "   Vidage du cache Logcat..." -ForegroundColor Yellow
& adb logcat -c
Write-Host "   Cache vide" -ForegroundColor Green

# Desactiver temporairement le service
Write-Host "   Desactivation temporaire du service..." -ForegroundColor Yellow
& adb shell settings put secure enabled_accessibility_services ""

Write-Host ""
Write-Host "5. Ouverture des parametres d'accessibilite..." -ForegroundColor Cyan
Write-Host "   Execution: adb shell am start -a android.settings.ACCESSIBILITY_SETTINGS" -ForegroundColor Yellow
& adb shell am start -a android.settings.ACCESSIBILITY_SETTINGS
Write-Host "   Parametres ouverts" -ForegroundColor Green

Write-Host ""
Write-Host "SUR L'EMULATEUR:" -ForegroundColor Yellow
Write-Host "a) Trouve 'Carrefour Debug v2'" -ForegroundColor White
Write-Host "b) Active le switch" -ForegroundColor White
Write-Host "c) Confirme OK si popup" -ForegroundColor White
Write-Host "d) Verifie que le service est bien actif" -ForegroundColor White
Write-Host ""
Write-Host "Appuie sur Entree quand c'est fait et que le service est actif:" -ForegroundColor Cyan
Read-Host

# Retour a l'ecran d'accueil
Write-Host "6. Retour a l'ecran d'accueil..." -ForegroundColor Cyan
& adb shell input keyevent KEYCODE_HOME
Write-Host "   Retour accueil OK" -ForegroundColor Green

# Lancement de Carrefour
Write-Host "7. Lancement de Carrefour..." -ForegroundColor Cyan
Write-Host "   Execution: adb shell monkey -p com.carrefour.fid.android -c android.intent.category.LAUNCHER 1" -ForegroundColor Yellow
try {
    & adb shell monkey -p com.carrefour.fid.android -c android.intent.category.LAUNCHER 1
    Write-Host "   Carrefour lance" -ForegroundColor Green
} catch {
    Write-Host "   Erreur lancement Carrefour" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "DEMARRAGE SYSTEME MONITORING" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

Write-Host "8. Demarrage du serveur Node.js..." -ForegroundColor Cyan
$nodeJob = Start-Job -ScriptBlock { Set-Location $using:PWD; node server.js }
Start-Sleep -Seconds 3

Write-Host "9. Demarrage du script de capture ADB..." -ForegroundColor Cyan
$adbJob = Start-Job -ScriptBlock { Set-Location $using:PWD; py carrefour-adb-capture.py }
Start-Sleep -Seconds 2

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "SUCCES!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

Write-Host "Systeme Carrefour demarre avec succes!" -ForegroundColor Green
Write-Host "Dashboard: http://localhost:3001/carrefour-dashboard" -ForegroundColor Cyan
Write-Host "Serveur principal: http://localhost:3001" -ForegroundColor Cyan

# Ouvrir le dashboard
try {
    Start-Process "http://localhost:3001/carrefour-dashboard"
    Write-Host "Dashboard ouvert dans le navigateur" -ForegroundColor Green
} catch {
    Write-Host "Ouvrez manuellement: http://localhost:3001/carrefour-dashboard" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Instructions:" -ForegroundColor Yellow
Write-Host "- Naviguez dans l'application Carrefour sur l'emulateur" -ForegroundColor White
Write-Host "- Les pages s'afficheront en temps reel dans le dashboard" -ForegroundColor White
Write-Host "- Appuyez sur Ctrl+C pour arreter tous les services" -ForegroundColor White
Write-Host ""

# Surveillance des services
try {
    while ($true) {
        Start-Sleep -Seconds 5
        
        $nodeState = (Get-Job -Id $nodeJob.Id).State
        $adbState = (Get-Job -Id $adbJob.Id).State
        
        if ($nodeState -eq "Failed" -or $nodeState -eq "Completed") {
            Write-Host "Serveur Node.js arrete (Etat: $nodeState)" -ForegroundColor Red
            break
        }
        
        if ($adbState -eq "Failed" -or $adbState -eq "Completed") {
            Write-Host "Script ADB arrete (Etat: $adbState)" -ForegroundColor Red
            break
        }
        
        # Afficher les logs recents
        $recentOutput = Receive-Job -Id $nodeJob.Id -Keep
        if ($recentOutput) {
            Write-Host "Serveur: $($recentOutput[-1])" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "Interruption detectee" -ForegroundColor Yellow
} finally {
    Write-Host ""
    Write-Host "Arret des services..." -ForegroundColor Yellow
    
    if ($nodeJob) {
        Stop-Job -Id $nodeJob.Id
        Remove-Job -Id $nodeJob.Id
        Write-Host "Serveur Node.js arrete" -ForegroundColor Green
    }
    
    if ($adbJob) {
        Stop-Job -Id $adbJob.Id
        Remove-Job -Id $adbJob.Id
        Write-Host "Script ADB arrete" -ForegroundColor Green
    }
    
    Write-Host "Systeme arrete" -ForegroundColor Green
}
