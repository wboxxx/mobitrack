# Test d'auscultation avancée selon le prompt original
Write-Host "🔍 Test d'auscultation avancée (selon le prompt original)" -ForegroundColor Cyan
Write-Host "=" * 70 -ForegroundColor Cyan

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

# Exécuter le test d'auscultation avancée
Write-Host "`n🚀 Exécution du test d'auscultation avancée..." -ForegroundColor Yellow
try {
    node test-auscultation-advanced.js
    Write-Host "`n✅ Test d'auscultation avancée terminé avec succès!" -ForegroundColor Green
} catch {
    Write-Host "`n❌ Erreur lors de l'exécution du test" -ForegroundColor Red
    exit 1
}

# Afficher les URLs utiles
Write-Host "`n📱 Dashboards d'auscultation disponibles:" -ForegroundColor Cyan
Write-Host "   🔍 Auscultation avancée: http://localhost:3001/auscultation-dashboard" -ForegroundColor White
Write-Host "   📊 Accessibilité standard: http://localhost:3001/accessibility-dashboard" -ForegroundColor White
Write-Host "   📈 Statistiques API: http://localhost:3001/api/accessibility-stats" -ForegroundColor White

Write-Host "`n🔍 Fonctionnalités d'auscultation implémentées:" -ForegroundColor Cyan
Write-Host "   ✅ Détection d'app et profil d'auscultation" -ForegroundColor Green
Write-Host "   ✅ Normalisation des événements bruts" -ForegroundColor Green
Write-Host "   ✅ Categorisation e-commerce (ADD_TO_CART, PRODUCT_DETAIL, etc.)" -ForegroundColor Green
Write-Host "   ✅ Inférence d'actions métier avec justification" -ForegroundColor Green
Write-Host "   ✅ Scoring de confiance détaillé" -ForegroundColor Green
Write-Host "   ✅ Rapport structuré JSON + résumé Markdown" -ForegroundColor Green

Write-Host "`n🎉 Systeme d'auscultation avancee operationnel!" -ForegroundColor Green
