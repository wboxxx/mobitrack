# Script PowerShell pour tester l'auscultation d'accessibilité
# Usage: .\test-accessibility-auscultation.ps1

Write-Host "🔍 Test de l'Auscultation d'Accessibilité" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan

# Vérifier si Node.js est installé
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js détecté: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js n'est pas installé ou pas dans le PATH" -ForegroundColor Red
    Write-Host "Veuillez installer Node.js depuis https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Vérifier si le serveur est en cours d'exécution
Write-Host "`n🔍 Vérification du serveur..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001" -Method GET -TimeoutSec 5
    Write-Host "✅ Serveur accessible sur http://localhost:3001" -ForegroundColor Green
} catch {
    Write-Host "❌ Serveur non accessible sur http://localhost:3001" -ForegroundColor Red
    Write-Host "Veuillez démarrer le serveur avec: node server.js" -ForegroundColor Yellow
    exit 1
}

# Vérifier si axios est installé
Write-Host "`n📦 Vérification des dépendances..." -ForegroundColor Yellow
try {
    $axiosCheck = node -e "require('axios'); console.log('axios OK');"
    Write-Host "✅ axios disponible" -ForegroundColor Green
} catch {
    Write-Host "❌ axios non trouvé, installation..." -ForegroundColor Yellow
    npm install axios
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ axios installé avec succès" -ForegroundColor Green
    } else {
        Write-Host "❌ Erreur lors de l'installation d'axios" -ForegroundColor Red
        exit 1
    }
}

# Exécuter le test
Write-Host "`n🚀 Exécution du test d'auscultation..." -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Yellow

node test-accessibility-auscultation.js

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n🎉 Test terminé avec succès!" -ForegroundColor Green
    Write-Host "`n💡 Prochaines étapes:" -ForegroundColor Cyan
    Write-Host "   1. Ouvrez http://localhost:3001/accessibility-dashboard" -ForegroundColor White
    Write-Host "   2. Consultez les rapports générés" -ForegroundColor White
    Write-Host "   3. Analysez les événements d'accessibilité" -ForegroundColor White
    Write-Host "`n🔧 Commandes utiles:" -ForegroundColor Cyan
    Write-Host "   - Nettoyer les données: node test-accessibility-auscultation.js --cleanup" -ForegroundColor White
    Write-Host "   - Redémarrer le serveur: node server.js" -ForegroundColor White
} else {
    Write-Host "`n❌ Test échoué" -ForegroundColor Red
    Write-Host "Vérifiez les logs ci-dessus pour plus de détails" -ForegroundColor Yellow
}

Write-Host "`nAppuyez sur une touche pour continuer..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
