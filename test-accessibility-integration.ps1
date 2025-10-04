# Test d'intégration de l'auscultation d'accessibilité
Write-Host "🧪 Test d'intégration de l'auscultation d'accessibilité" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan

# Vérifier que Node.js est installé
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js détecté: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js n'est pas installé ou pas dans le PATH" -ForegroundColor Red
    exit 1
}

# Vérifier que le serveur est en cours d'exécution
Write-Host "`n🔍 Vérification du serveur..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/accessibility-stats" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Serveur accessible sur le port 3001" -ForegroundColor Green
    } else {
        Write-Host "❌ Serveur répond avec le code: $($response.StatusCode)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Serveur non accessible. Démarrez le serveur avec: node server.js" -ForegroundColor Red
    exit 1
}

# Exécuter le test d'intégration
Write-Host "`n🚀 Exécution du test d'intégration..." -ForegroundColor Yellow
try {
    node test-accessibility-integration.js
    Write-Host "`n✅ Test d'intégration terminé avec succès!" -ForegroundColor Green
} catch {
    Write-Host "`n❌ Erreur lors de l'exécution du test" -ForegroundColor Red
    exit 1
}

# Afficher les URLs utiles
Write-Host "`n📱 URLs utiles:" -ForegroundColor Cyan
Write-Host "   Dashboard d'accessibilité: http://localhost:3001/accessibility-dashboard" -ForegroundColor White
Write-Host "   Statistiques API: http://localhost:3001/api/accessibility-stats" -ForegroundColor White
Write-Host "   Rapports API: http://localhost:3001/api/auscultation-reports" -ForegroundColor White

Write-Host "`n🎉 Intégration d'auscultation d'accessibilité opérationnelle!" -ForegroundColor Green
