# Script de build pour l'APK avec intégration d'auscultation d'accessibilité
Write-Host "🔨 Build de l'APK avec intégration d'auscultation d'accessibilité" -ForegroundColor Cyan
Write-Host "=" * 70 -ForegroundColor Cyan

# Vérifier que nous sommes dans la bonne branche
Write-Host "`n🔍 Vérification de la branche..." -ForegroundColor Yellow
$currentBranch = git branch --show-current
if ($currentBranch -ne "feature/diff-detection-with-docs") {
    Write-Host "⚠️  Branche actuelle: $currentBranch" -ForegroundColor Yellow
    Write-Host "   Branche recommandée: feature/diff-detection-with-docs" -ForegroundColor Yellow
    $continue = Read-Host "Continuer quand même? (y/N)"
    if ($continue -ne "y" -and $continue -ne "Y") {
        Write-Host "❌ Build annulé" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ Branche correcte: $currentBranch" -ForegroundColor Green
}

# Vérifier que les fichiers d'accessibilité existent
Write-Host "`n🔍 Vérification des fichiers d'accessibilité..." -ForegroundColor Yellow
$accessibilityFiles = @(
    "android-app/app/src/main/java/com/bascule/leclerctracking/utils/AccessibilityHttpClient.kt",
    "public/accessibility-dashboard.html",
    "accessibility-auscultation.js"
)

$missingFiles = @()
foreach ($file in $accessibilityFiles) {
    if (Test-Path $file) {
        Write-Host "✅ $file" -ForegroundColor Green
    } else {
        Write-Host "❌ $file" -ForegroundColor Red
        $missingFiles += $file
    }
}

if ($missingFiles.Count -gt 0) {
    Write-Host "`n❌ Fichiers d'accessibilité manquants:" -ForegroundColor Red
    $missingFiles | ForEach-Object { Write-Host "   - $_" -ForegroundColor Red }
    Write-Host "`nVeuillez créer ces fichiers avant de continuer." -ForegroundColor Yellow
    exit 1
}

# Nettoyer le build précédent
Write-Host "`n🧹 Nettoyage du build précédent..." -ForegroundColor Yellow
try {
    Set-Location android-app
    ./gradlew clean
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Nettoyage réussi" -ForegroundColor Green
    } else {
        Write-Host "❌ Erreur lors du nettoyage" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Erreur lors du nettoyage: $_" -ForegroundColor Red
    exit 1
} finally {
    Set-Location ..
}

# Construire l'APK
Write-Host "`n🔨 Construction de l'APK..." -ForegroundColor Yellow
Write-Host "   Cela peut prendre 2-3 minutes..." -ForegroundColor Gray
try {
    Set-Location android-app
    ./gradlew assembleDebug
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ APK construit avec succès" -ForegroundColor Green
    } else {
        Write-Host "❌ Erreur lors de la construction de l'APK" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Erreur lors de la construction: $_" -ForegroundColor Red
    exit 1
} finally {
    Set-Location ..
}

# Vérifier que l'APK existe
$apkPath = "android-app/app/build/outputs/apk/debug/app-debug.apk"
if (Test-Path $apkPath) {
    $apkSize = (Get-Item $apkPath).Length / 1MB
    Write-Host "`n✅ APK généré: $apkPath" -ForegroundColor Green
    Write-Host "   Taille: $([math]::Round($apkSize, 2)) MB" -ForegroundColor Gray
} else {
    Write-Host "`n❌ APK non trouvé: $apkPath" -ForegroundColor Red
    exit 1
}

# Installer l'APK (optionnel)
$install = Read-Host "`nVoulez-vous installer l'APK sur l'appareil connecté? (y/N)"
if ($install -eq "y" -or $install -eq "Y") {
    Write-Host "`n📱 Installation de l'APK..." -ForegroundColor Yellow
    try {
        $fullPath = (Resolve-Path $apkPath).Path
        adb install -r $fullPath
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ APK installé avec succès" -ForegroundColor Green
        } else {
            Write-Host "❌ Erreur lors de l'installation" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ Erreur lors de l'installation: $_" -ForegroundColor Red
    }
}

# Afficher les prochaines étapes
Write-Host "`n📋 Prochaines étapes:" -ForegroundColor Cyan
Write-Host "   1. Démarrer le serveur: node server.js" -ForegroundColor White
Write-Host "   2. Ouvrir le dashboard: http://localhost:3001/accessibility-dashboard" -ForegroundColor White
Write-Host "   3. Activer le service d'accessibilité dans les paramètres Android" -ForegroundColor White
Write-Host "   4. Lancer l'application Carrefour" -ForegroundColor White
Write-Host "   5. Observer les événements d'accessibilité en temps réel" -ForegroundColor White

Write-Host "`n🎉 Build terminé avec succès!" -ForegroundColor Green
