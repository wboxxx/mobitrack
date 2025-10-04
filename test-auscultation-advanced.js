/**
 * Test d'auscultation avancée selon le prompt original
 */

const axios = require('axios');

const SERVER_URL = 'http://localhost:3001';

// Simuler des événements d'auscultation sophistiqués
const mockAuscultationEvents = [
    {
        timestamp: Date.now(),
        packageName: 'com.carrefour.fid.android',
        activity: 'com.carrefour.MainActivity',
        rawType: 'TYPE_VIEW_CLICKED',
        category: 'SEARCH',
        confidence: 0.95,
        widget: {
            className: 'android.widget.EditText',
            id: 'search_input',
            text: 'lait bio',
            desc: 'Champ de recherche'
        },
        bounds: { l: 50, t: 100, r: 950, b: 150 },
        context: {
            screenGuess: 'SEARCH',
            productGuess: null
        },
        evidence: ['raw_event:TYPE_VIEW_CLICKED', 'id_present:search_input', 'text_present:lait bio'],
        inferences: [
            {
                hypothesis: 'SEARCH_PERFORMED',
                because: ['Click on search field', 'Search text entered'],
                confidence: 0.9,
                evidence: ['search_field_click', 'search_text']
            }
        ],
        appProfile: {
            packageName: 'com.carrefour.fid.android',
            likelyBrand: 'Carrefour',
            firstSeen: Date.now() - 300000,
            capabilityMap: {
                emitsClicks: true,
                emitsScrolls: true,
                exposesIds: true,
                textRichness: 'HIGH'
            }
        }
    },
    {
        timestamp: Date.now() + 2000,
        packageName: 'com.carrefour.fid.android',
        activity: 'com.carrefour.ProductListActivity',
        rawType: 'TYPE_VIEW_SCROLLED',
        category: 'PRODUCT_LIST',
        confidence: 0.88,
        widget: {
            className: 'androidx.recyclerview.widget.RecyclerView',
            id: 'product_list',
            text: '',
            desc: 'Liste des produits'
        },
        bounds: { l: 0, t: 200, r: 1080, b: 1800 },
        context: {
            screenGuess: 'PRODUCT_LIST',
            productGuess: null
        },
        evidence: ['raw_event:TYPE_VIEW_SCROLLED', 'recyclerview_scroll', 'product_list_context'],
        inferences: [
            {
                hypothesis: 'PRODUCT_LIST_SCROLLED',
                because: ['RecyclerView scrolled', 'Product list context'],
                confidence: 0.85,
                evidence: ['recyclerview_scroll', 'product_list']
            }
        ],
        appProfile: {
            packageName: 'com.carrefour.fid.android',
            likelyBrand: 'Carrefour',
            firstSeen: Date.now() - 300000,
            capabilityMap: {
                emitsClicks: true,
                emitsScrolls: true,
                exposesIds: true,
                textRichness: 'HIGH'
            }
        }
    },
    {
        timestamp: Date.now() + 5000,
        packageName: 'com.carrefour.fid.android',
        activity: 'com.carrefour.ProductDetailActivity',
        rawType: 'TYPE_VIEW_CLICKED',
        category: 'ADD_TO_CART',
        confidence: 0.92,
        widget: {
            className: 'android.widget.Button',
            id: 'btn_add_to_cart',
            text: 'Ajouter au panier',
            desc: 'Bouton d\'ajout au panier'
        },
        bounds: { l: 100, t: 1650, r: 980, b: 1780 },
        context: {
            screenGuess: 'PRODUCT_DETAIL',
            productGuess: {
                title: 'Lait Bio 1L',
                price: '2.99€'
            }
        },
        evidence: ['raw_event:TYPE_VIEW_CLICKED', 'id_present:btn_add_to_cart', 'text_match:ajouter|panier', 'price_on_screen'],
        inferences: [
            {
                hypothesis: 'ADD_TO_CART',
                because: ['Click on add to cart button', 'Product context detected', 'Price visible'],
                confidence: 0.92,
                evidence: ['add_to_cart_button', 'product_context', 'price_display']
            }
        ],
        appProfile: {
            packageName: 'com.carrefour.fid.android',
            likelyBrand: 'Carrefour',
            firstSeen: Date.now() - 300000,
            capabilityMap: {
                emitsClicks: true,
                emitsScrolls: true,
                exposesIds: true,
                textRichness: 'HIGH'
            }
        }
    },
    {
        timestamp: Date.now() + 8000,
        packageName: 'com.carrefour.fid.android',
        activity: 'com.carrefour.CartActivity',
        rawType: 'TYPE_WINDOW_STATE_CHANGED',
        category: 'CART_VIEW',
        confidence: 0.78,
        widget: {
            className: 'android.widget.TextView',
            id: 'cart_total',
            text: 'Total: 15.97€',
            desc: 'Total du panier'
        },
        bounds: { l: 200, t: 100, r: 880, b: 150 },
        context: {
            screenGuess: 'CART_VIEW',
            productGuess: null
        },
        evidence: ['raw_event:TYPE_WINDOW_STATE_CHANGED', 'cart_context', 'total_display'],
        inferences: [
            {
                hypothesis: 'CART_OPENED',
                because: ['Cart screen detected', 'Total price displayed'],
                confidence: 0.78,
                evidence: ['cart_screen', 'total_price']
            }
        ],
        appProfile: {
            packageName: 'com.carrefour.fid.android',
            likelyBrand: 'Carrefour',
            firstSeen: Date.now() - 300000,
            capabilityMap: {
                emitsClicks: true,
                emitsScrolls: true,
                exposesIds: true,
                textRichness: 'HIGH'
            }
        }
    }
];

async function testAdvancedAuscultation() {
    console.log('🔍 Test d\'auscultation avancée (selon le prompt original)');
    console.log('=' .repeat(70));

    try {
        // Test 1: Vérifier que le serveur répond
        console.log('\n1. Test de connectivité du serveur...');
        const statsResponse = await axios.get(`${SERVER_URL}/api/accessibility-stats`);
        console.log('✅ Serveur accessible');
        console.log(`   Événements actuels: ${statsResponse.data.stats.totalEvents}`);

        // Test 2: Envoyer des événements d'auscultation sophistiqués
        console.log('\n2. Envoi d\'événements d\'auscultation avancés...');
        const eventsData = {
            events: mockAuscultationEvents,
            deviceId: 'auscultation-device-001',
            sessionId: 'auscultation-session-001'
        };

        const eventsResponse = await axios.post(`${SERVER_URL}/api/accessibility-events`, eventsData);
        console.log('✅ Événements d\'auscultation envoyés avec succès');
        console.log(`   Réponse: ${eventsResponse.data.message}`);

        // Test 3: Vérifier les statistiques mises à jour
        console.log('\n3. Vérification des statistiques...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const updatedStatsResponse = await axios.get(`${SERVER_URL}/api/accessibility-stats`);
        console.log('✅ Statistiques mises à jour');
        console.log(`   Événements totaux: ${updatedStatsResponse.data.stats.totalEvents}`);

        // Test 4: Générer un rapport d'auscultation
        console.log('\n4. Génération d\'un rapport d\'auscultation...');
        const reportData = {
            deviceId: 'auscultation-device-001',
            sessionId: 'auscultation-session-001'
        };

        const reportResponse = await axios.post(`${SERVER_URL}/api/auscultation-report`, reportData);
        console.log('✅ Rapport d\'auscultation généré avec succès');
        console.log(`   ID du rapport: ${reportResponse.data.report?.id || 'N/A'}`);

        // Test 5: Tester le dashboard d'auscultation avancé
        console.log('\n5. Test du dashboard d\'auscultation avancé...');
        const dashboardResponse = await axios.get(`${SERVER_URL}/auscultation-dashboard`);
        console.log('✅ Dashboard d\'auscultation accessible');
        console.log(`   Taille de la page: ${dashboardResponse.data.length} caractères`);

        // Test 6: Tester le dashboard d'accessibilité standard
        console.log('\n6. Test du dashboard d\'accessibilité standard...');
        const standardDashboardResponse = await axios.get(`${SERVER_URL}/accessibility-dashboard`);
        console.log('✅ Dashboard d\'accessibilité standard accessible');
        console.log(`   Taille de la page: ${standardDashboardResponse.data.length} caractères`);

        console.log('\n' + '='.repeat(70));
        console.log('🎉 Tous les tests d\'auscultation avancée sont passés !');
        console.log('\n📱 Dashboards disponibles:');
        console.log('   - Auscultation avancée: http://localhost:3001/auscultation-dashboard');
        console.log('   - Accessibilité standard: http://localhost:3001/accessibility-dashboard');
        console.log('\n🔍 Fonctionnalités d\'auscultation:');
        console.log('   - Détection d\'app et profil d\'auscultation');
        console.log('   - Normalisation des événements bruts');
        console.log('   - Catégorisation e-commerce (ADD_TO_CART, PRODUCT_DETAIL, etc.)');
        console.log('   - Inférence d\'actions métier avec justification');
        console.log('   - Scoring de confiance détaillé');
        console.log('   - Rapport structuré JSON + résumé Markdown');

    } catch (error) {
        console.error('\n❌ Erreur lors du test d\'auscultation:', error.message);
        if (error.response) {
            console.error('   Détails:', error.response.data);
        }
        process.exit(1);
    }
}

// Exécuter les tests
testAdvancedAuscultation();
