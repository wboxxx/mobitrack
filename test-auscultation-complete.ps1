# Test complet d'auscultation d'accessibilité
Write-Host "🔍 Test Complet d'Auscultation d'Accessibilité" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan

# Vérifier que Python est installé
try {
    $pythonVersion = python --version
    Write-Host "✅ Python détecté: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python n'est pas installé ou pas dans le PATH" -ForegroundColor Red
    exit 1
}

# Vérifier que Node.js est installé
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js détecté: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js n'est pas installé ou pas dans le PATH" -ForegroundColor Red
    exit 1
}

# Vérifier que ADB est disponible
try {
    $adbVersion = adb version
    Write-Host "✅ ADB détecté" -ForegroundColor Green
} catch {
    Write-Host "❌ ADB n'est pas installé ou pas dans le PATH" -ForegroundColor Red
    exit 1
}

Write-Host "`n🚀 Exécution du test complet d'auscultation..." -ForegroundColor Yellow

# Test 1: Build avec auscultation
Write-Host "`n1. Build avec intégration d'auscultation..." -ForegroundColor Yellow
try {
    python rebuild_and_restart_auscultation.py --auscultation-only
    Write-Host "✅ Build d'auscultation réussi" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur lors du build d'auscultation" -ForegroundColor Red
    exit 1
}

# Test 2: Démarrage du serveur
Write-Host "`n2. Démarrage du serveur..." -ForegroundColor Yellow
try {
    python rebuild_and_restart_auscultation.py --start-server
    Write-Host "✅ Serveur démarré" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur lors du démarrage du serveur" -ForegroundColor Red
    exit 1
}

# Test 3: Test d'intégration d'auscultation
Write-Host "`n3. Test d'intégration d'auscultation..." -ForegroundColor Yellow
try {
    python rebuild_and_restart_auscultation.py --test-auscultation
    Write-Host "✅ Test d'intégration réussi" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur lors du test d'intégration" -ForegroundColor Red
    exit 1
}

# Test 4: Test d'auscultation avancée
Write-Host "`n4. Test d'auscultation avancée..." -ForegroundColor Yellow
try {
    python rebuild_and_restart_auscultation.py --test-advanced
    Write-Host "✅ Test d'auscultation avancée réussi" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur lors du test avancé" -ForegroundColor Red
    exit 1
}

# Test 5: Vérification des dashboards
Write-Host "`n5. Vérification des dashboards..." -ForegroundColor Yellow
try {
    python rebuild_and_restart_auscultation.py --check-dashboards
    Write-Host "✅ Dashboards vérifiés" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur lors de la vérification des dashboards" -ForegroundColor Red
    exit 1
}

# Test 6: Génération de rapport
Write-Host "`n6. Génération de rapport d'auscultation..." -ForegroundColor Yellow
try {
    python rebuild_and_restart_auscultation.py --generate-report
    Write-Host "✅ Rapport généré" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur lors de la génération du rapport" -ForegroundColor Red
    exit 1
}

# Test 7: Test complet
Write-Host "`n7. Test complet d'auscultation..." -ForegroundColor Yellow
try {
    python rebuild_and_restart_auscultation.py --full-auscultation
    Write-Host "✅ Test complet réussi" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur lors du test complet" -ForegroundColor Red
    exit 1
}

Write-Host "`n🎉 Tous les tests d'auscultation sont passés avec succès!" -ForegroundColor Green

Write-Host "`n📱 Dashboards d'auscultation disponibles:" -ForegroundColor Cyan
Write-Host "   🔍 Auscultation avancée: http://localhost:3001/auscultation-dashboard" -ForegroundColor White
Write-Host "   📊 Accessibilité standard: http://localhost:3001/accessibility-dashboard" -ForegroundColor White
Write-Host "   📈 Statistiques API: http://localhost:3001/api/accessibility-stats" -ForegroundColor White

Write-Host "`n🔍 Fonctionnalités d'auscultation implémentées:" -ForegroundColor Cyan
Write-Host "   ✅ Détection d'app et profil d'auscultation" -ForegroundColor Green
Write-Host "   ✅ Normalisation des événements bruts" -ForegroundColor Green
Write-Host "   ✅ Catégorisation e-commerce (ADD_TO_CART, PRODUCT_DETAIL, etc.)" -ForegroundColor Green
Write-Host "   ✅ Inférence d'actions métier avec justification" -ForegroundColor Green
Write-Host "   ✅ Scoring de confiance détaillé" -ForegroundColor Green
Write-Host "   ✅ Rapport structuré JSON + résumé Markdown" -ForegroundColor Green

Write-Host "`n🎯 Commandes utiles:" -ForegroundColor Cyan
Write-Host "   python rebuild_and_restart_auscultation.py --auscultation-only" -ForegroundColor White
Write-Host "   python rebuild_and_restart_auscultation.py --test-auscultation" -ForegroundColor White
Write-Host "   python rebuild_and_restart_auscultation.py --test-advanced" -ForegroundColor White
Write-Host "   python rebuild_and_restart_auscultation.py --full-auscultation" -ForegroundColor White

Write-Host "`n🚀 Système d'auscultation d'accessibilité opérationnel!" -ForegroundColor Green
