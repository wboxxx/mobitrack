#!/usr/bin/env pwsh
# Script pour démarrer le système Carrefour complet
# Lance le serveur Node.js et le script de capture ADB

Write-Host "🚀 Démarrage du système Carrefour complet" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green

# Vérifier que Node.js est installé
try {
    $nodeVersion = node --version 2>$null
    Write-Host "✅ Node.js détecté: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js non trouvé. Veuillez installer Node.js." -ForegroundColor Red
    exit 1
}

# Vérifier que Python est installé
try {
    $pythonVersion = py --version 2>$null
    Write-Host "✅ Python détecté: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python non trouvé. Veuillez installer Python." -ForegroundColor Red
    exit 1
}

# Vérifier que ADB est accessible
try {
    $adbVersion = adb version 2>$null | Select-Object -First 1
    Write-Host "✅ ADB détecté: $adbVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ ADB non trouvé. Veuillez installer Android SDK Platform Tools." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📋 Instructions:" -ForegroundColor Yellow
Write-Host "1. Le serveur Node.js va démarrer sur http://localhost:3001" -ForegroundColor White
Write-Host "2. Le script de capture ADB va démarrer automatiquement" -ForegroundColor White
Write-Host "3. Ouvrez http://localhost:3001/carrefour-dashboard dans votre navigateur" -ForegroundColor White
Write-Host "4. Naviguez dans l'application Carrefour sur votre émulateur" -ForegroundColor White
Write-Host "5. Les pages s'afficheront en temps réel dans le dashboard" -ForegroundColor White
Write-Host ""
Write-Host "⏹️ Appuyez sur Ctrl+C pour arrêter tous les services" -ForegroundColor Cyan
Write-Host ""

# Démarrer le serveur Node.js en arrière-plan
Write-Host "🚀 Démarrage du serveur Node.js..." -ForegroundColor Green
$nodeJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    node server.js
}

# Attendre que le serveur démarre
Start-Sleep -Seconds 3

# Démarrer le script de capture ADB en arrière-plan
Write-Host "🚀 Démarrage du script de capture ADB..." -ForegroundColor Green
$adbJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    py carrefour-adb-capture.py
}

# Attendre un peu pour que les services démarrent
Start-Sleep -Seconds 2

Write-Host ""
Write-Host "✅ Système démarré avec succès!" -ForegroundColor Green
Write-Host "🌐 Dashboard: http://localhost:3001/carrefour-dashboard" -ForegroundColor Cyan
Write-Host "📊 Serveur principal: http://localhost:3001" -ForegroundColor Cyan
Write-Host ""

# Ouvrir le dashboard dans le navigateur par défaut
try {
    Start-Process "http://localhost:3001/carrefour-dashboard"
    Write-Host "🌐 Dashboard ouvert dans le navigateur" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Impossible d'ouvrir automatiquement le navigateur" -ForegroundColor Yellow
    Write-Host "   Ouvrez manuellement: http://localhost:3001/carrefour-dashboard" -ForegroundColor White
}

Write-Host ""
Write-Host "📊 État des services:" -ForegroundColor Yellow
Write-Host "   - Serveur Node.js: En cours..." -ForegroundColor White
Write-Host "   - Capture ADB: En cours..." -ForegroundColor White
Write-Host ""

try {
    # Surveiller les jobs
    while ($true) {
        Start-Sleep -Seconds 5
        
        # Vérifier l'état des jobs
        $nodeState = (Get-Job -Id $nodeJob.Id).State
        $adbState = (Get-Job -Id $adbJob.Id).State
        
        if ($nodeState -eq "Failed" -or $nodeState -eq "Completed") {
            Write-Host "❌ Serveur Node.js arrêté (État: $nodeState)" -ForegroundColor Red
            break
        }
        
        if ($adbState -eq "Failed" -or $adbState -eq "Completed") {
            Write-Host "❌ Script ADB arrêté (État: $adbState)" -ForegroundColor Red
            break
        }
        
        # Afficher les logs récents (optionnel)
        $recentOutput = Receive-Job -Id $nodeJob.Id -Keep
        if ($recentOutput) {
            Write-Host "📊 Serveur: $($recentOutput[-1])" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "⚠️ Interruption détectée" -ForegroundColor Yellow
} finally {
    Write-Host ""
    Write-Host "🛑 Arrêt des services..." -ForegroundColor Yellow
    
    # Arrêter les jobs
    if ($nodeJob) {
        Stop-Job -Id $nodeJob.Id
        Remove-Job -Id $nodeJob.Id
        Write-Host "✅ Serveur Node.js arrêté" -ForegroundColor Green
    }
    
    if ($adbJob) {
        Stop-Job -Id $adbJob.Id
        Remove-Job -Id $adbJob.Id
        Write-Host "✅ Script ADB arrêté" -ForegroundColor Green
    }
    
    Write-Host "👋 Système arrêté" -ForegroundColor Green
}
