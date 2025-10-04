/**
 * Test d'intégration pour l'auscultation d'accessibilité
 */

const axios = require('axios');

const SERVER_URL = 'http://localhost:3001';

// Simuler des événements d'accessibilité
const mockAccessibilityEvents = [
    {
        eventType: 'VIEW_CLICKED',
        timestamp: Date.now(),
        data: {
            packageName: 'com.carrefour.fid.android',
            activity: 'MainActivity',
            element: {
                className: 'android.widget.Button',
                id: 'add_to_cart_button',
                text: 'Ajouter au panier',
                contentDescription: 'Ajouter le produit au panier'
            },
            productInfo: {
                productName: 'Bananes Bio',
                price: '2.99€',
                cartAction: 'ajouter'
            }
        }
    },
    {
        eventType: 'VIEW_SCROLLED',
        timestamp: Date.now() + 1000,
        data: {
            packageName: 'com.carrefour.fid.android',
            activity: 'ProductListActivity',
            element: {
                className: 'android.widget.RecyclerView',
                id: 'product_list',
                text: '',
                contentDescription: 'Liste des produits'
            },
            productInfo: {
                scrollDirection: 'down',
                scrollPosition: 150
            }
        }
    },
    {
        eventType: 'WINDOW_STATE_CHANGED',
        timestamp: Date.now() + 2000,
        data: {
            packageName: 'com.carrefour.fid.android',
            activity: 'CartActivity',
            element: {
                className: 'android.widget.TextView',
                id: 'cart_total',
                text: 'Total: 15.97€',
                contentDescription: 'Total du panier'
            },
            productInfo: {
                cartTotal: '15.97€',
                itemCount: 3
            }
        }
    }
];

async function testAccessibilityIntegration() {
    console.log('🧪 Test d\'intégration de l\'auscultation d\'accessibilité');
    console.log('=' .repeat(60));

    try {
        // Test 1: Vérifier que le serveur répond
        console.log('\n1. Test de connectivité du serveur...');
        const statsResponse = await axios.get(`${SERVER_URL}/api/accessibility-stats`);
        console.log('✅ Serveur accessible');
        console.log(`   Événements actuels: ${statsResponse.data.stats.totalEvents}`);

        // Test 2: Envoyer des événements d'accessibilité
        console.log('\n2. Envoi d\'événements d\'accessibilité...');
        const eventsData = {
            events: mockAccessibilityEvents,
            deviceId: 'test-device-001',
            sessionId: 'test-session-001'
        };

        const eventsResponse = await axios.post(`${SERVER_URL}/api/accessibility-events`, eventsData);
        console.log('✅ Événements envoyés avec succès');
        console.log(`   Réponse: ${eventsResponse.data.message}`);

        // Test 3: Vérifier les statistiques mises à jour
        console.log('\n3. Vérification des statistiques...');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Attendre 1 seconde
        
        const updatedStatsResponse = await axios.get(`${SERVER_URL}/api/accessibility-stats`);
        console.log('✅ Statistiques mises à jour');
        console.log(`   Événements totaux: ${updatedStatsResponse.data.stats.totalEvents}`);
        console.log(`   Événements récents: ${updatedStatsResponse.data.recentEvents ? updatedStatsResponse.data.recentEvents.length : 0}`);

        // Test 4: Générer un rapport d'auscultation
        console.log('\n4. Génération d\'un rapport d\'auscultation...');
        const reportData = {
            deviceId: 'test-device-001',
            sessionId: 'test-session-001'
        };

        const reportResponse = await axios.post(`${SERVER_URL}/api/auscultation-report`, reportData);
        console.log('✅ Rapport généré avec succès');
        console.log(`   ID du rapport: ${reportResponse.data.report.id}`);
        console.log(`   Événements analysés: ${reportResponse.data.report.totalEvents}`);

        // Test 5: Récupérer tous les rapports
        console.log('\n5. Récupération des rapports...');
        const reportsResponse = await axios.get(`${SERVER_URL}/api/auscultation-reports`);
        console.log('✅ Rapports récupérés');
        console.log(`   Nombre de rapports: ${reportsResponse.data.reports.length}`);

        // Test 6: Tester le dashboard
        console.log('\n6. Test du dashboard...');
        const dashboardResponse = await axios.get(`${SERVER_URL}/accessibility-dashboard`);
        console.log('✅ Dashboard accessible');
        console.log(`   Taille de la page: ${dashboardResponse.data.length} caractères`);

        console.log('\n' + '='.repeat(60));
        console.log('🎉 Tous les tests sont passés avec succès !');
        console.log('\n📱 Dashboard disponible sur: http://localhost:3001/accessibility-dashboard');
        console.log('📊 Statistiques disponibles sur: http://localhost:3001/api/accessibility-stats');

    } catch (error) {
        console.error('\n❌ Erreur lors du test:', error.message);
        if (error.response) {
            console.error('   Détails:', error.response.data);
        }
        process.exit(1);
    }
}

// Exécuter les tests
testAccessibilityIntegration();
