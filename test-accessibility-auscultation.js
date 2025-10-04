/**
 * Script de test pour l'auscultation d'accessibilité
 * Simule des événements d'accessibilité Android pour tester le système
 */

const axios = require('axios');

const SERVER_URL = 'http://localhost:3001';

// Données de test simulées
const mockAccessibilityEvents = [
  {
    eventType: 'VIEW_CLICKED',
    timestamp: new Date(Date.now() - 30000).toISOString(),
    data: {
      packageName: 'com.carrefour.mobile',
      activity: 'com.carrefour.mobile.MainActivity',
      element: {
        className: 'android.widget.Button',
        id: 'add_to_cart_button',
        text: 'Ajouter au panier',
        contentDescription: 'Ajouter au panier',
        bounds: { left: 100, top: 500, right: 300, bottom: 550 }
      },
      productInfo: {
        productName: 'Bananes bio',
        price: '2.99€',
        cartAction: 'Ajouter au panier',
        allTexts: ['Bananes bio', '2.99€', 'Ajouter au panier']
      }
    }
  },
  {
    eventType: 'VIEW_CLICKED',
    timestamp: new Date(Date.now() - 25000).toISOString(),
    data: {
      packageName: 'com.carrefour.mobile',
      activity: 'com.carrefour.mobile.MainActivity',
      element: {
        className: 'android.widget.TextView',
        id: 'search_field',
        text: 'Rechercher des produits',
        contentDescription: 'Champ de recherche',
        bounds: { left: 50, top: 100, right: 350, bottom: 150 }
      }
    }
  },
  {
    eventType: 'SCROLL',
    timestamp: new Date(Date.now() - 20000).toISOString(),
    data: {
      packageName: 'com.carrefour.mobile',
      activity: 'com.carrefour.mobile.MainActivity',
      element: {
        className: 'androidx.recyclerview.widget.RecyclerView',
        id: 'product_list',
        bounds: { left: 0, top: 200, right: 400, bottom: 800 }
      },
      scrollInfo: {
        context: 'product_list',
        scrollX: 0,
        scrollY: 100
      }
    }
  },
  {
    eventType: 'VIEW_CLICKED',
    timestamp: new Date(Date.now() - 15000).toISOString(),
    data: {
      packageName: 'com.carrefour.mobile',
      activity: 'com.carrefour.mobile.MainActivity',
      element: {
        className: 'android.widget.ImageView',
        id: 'cart_icon',
        text: '',
        contentDescription: 'Panier',
        bounds: { left: 350, top: 50, right: 400, bottom: 100 }
      }
    }
  },
  {
    eventType: 'CONTENT_CHANGED',
    timestamp: new Date(Date.now() - 10000).toISOString(),
    data: {
      packageName: 'com.carrefour.mobile',
      activity: 'com.carrefour.mobile.CartActivity',
      element: {
        className: 'android.widget.TextView',
        id: 'cart_total',
        text: 'Total: 5.98€',
        contentDescription: 'Total du panier',
        bounds: { left: 50, top: 600, right: 200, bottom: 650 }
      }
    }
  },
  {
    eventType: 'VIEW_CLICKED',
    timestamp: new Date(Date.now() - 5000).toISOString(),
    data: {
      packageName: 'com.carrefour.mobile',
      activity: 'com.carrefour.mobile.CartActivity',
      element: {
        className: 'android.widget.Button',
        id: 'checkout_button',
        text: 'Commander',
        contentDescription: 'Passer la commande',
        bounds: { left: 100, top: 700, right: 300, bottom: 750 }
      }
    }
  }
];

async function testAccessibilityAuscultation() {
  console.log('🧪 Test de l\'auscultation d\'accessibilité');
  console.log('==========================================');

  try {
    // 1. Envoyer des événements d'accessibilité
    console.log('\n📱 1. Envoi des événements d\'accessibilité...');
    const eventsResponse = await axios.post(`${SERVER_URL}/api/accessibility-events`, {
      events: mockAccessibilityEvents,
      deviceId: 'test-device-001',
      sessionId: 'test-session-' + Date.now()
    });

    if (eventsResponse.data.success) {
      console.log(`✅ ${eventsResponse.data.count} événements envoyés avec succès`);
    } else {
      console.log('❌ Erreur lors de l\'envoi des événements');
      return;
    }

    // 2. Attendre un peu pour que les événements soient traités
    console.log('\n⏳ Attente de 2 secondes...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 3. Récupérer les statistiques
    console.log('\n📊 2. Récupération des statistiques...');
    const statsResponse = await axios.get(`${SERVER_URL}/api/accessibility-stats`);
    
    if (statsResponse.data.success) {
      const stats = statsResponse.data.stats;
      console.log('✅ Statistiques récupérées:');
      console.log(`   - Événements totaux: ${stats.totalEvents}`);
      console.log(`   - Périphériques uniques: ${stats.uniqueDevices}`);
      console.log(`   - Sessions uniques: ${stats.uniqueSessions}`);
      console.log(`   - Types d'événements:`, stats.eventTypes);
    } else {
      console.log('❌ Erreur lors de la récupération des statistiques');
    }

    // 4. Générer un rapport d'auscultation
    console.log('\n📋 3. Génération du rapport d\'auscultation...');
    const reportResponse = await axios.post(`${SERVER_URL}/api/auscultation-report`, {
      deviceId: 'test-device-001'
    });

    if (reportResponse.data.success) {
      console.log(`✅ Rapport généré avec succès (ID: ${reportResponse.data.reportId})`);
      console.log(`   - Événements analysés: ${reportResponse.data.eventCount}`);
      
      // Afficher le résumé du rapport
      const report = reportResponse.data.report;
      console.log('\n📄 Résumé du rapport:');
      console.log('===================');
      console.log(report.summary_md);
      
      // Afficher les détails du profil de l'app
      console.log('\n📱 Profil de l\'application:');
      console.log(`   - Package: ${report.app_profile.package}`);
      console.log(`   - Marque: ${report.app_profile.likely_brand}`);
      console.log(`   - Événements: ${report.app_profile.event_count}`);
      
      // Afficher les capacités détectées
      console.log('\n🎯 Capacités détectées:');
      const capabilities = report.capability_map;
      console.log(`   - Émet des clics: ${capabilities.emits_clicks ? '✅' : '❌'}`);
      console.log(`   - Émet des scrolls: ${capabilities.emits_scrolls ? '✅' : '❌'}`);
      console.log(`   - Expose des IDs: ${capabilities.exposes_ids ? '✅' : '❌'}`);
      console.log(`   - Richesse du texte: ${capabilities.text_richness}`);
      
      // Afficher la timeline
      console.log('\n⏰ Timeline des événements:');
      report.session_timeline.forEach((event, index) => {
        console.log(`   ${index + 1}. ${event.ts}: ${event.category} - ${event.label} (${(event.confidence * 100).toFixed(1)}%)`);
      });
      
      // Afficher les catégories détectées
      console.log('\n📊 Catégories détectées:');
      report.categorized_events.forEach(category => {
        console.log(`   - ${category.category}: ${category.count} événements`);
        if (category.examples.length > 0) {
          console.log(`     Exemples: ${category.examples.join(', ')}`);
        }
      });
      
    } else {
      console.log('❌ Erreur lors de la génération du rapport');
      console.log(`   Message: ${reportResponse.data.message}`);
    }

    // 5. Récupérer la liste des rapports
    console.log('\n📋 4. Récupération de la liste des rapports...');
    const reportsResponse = await axios.get(`${SERVER_URL}/api/auscultation-reports`);
    
    if (reportsResponse.data.success) {
      console.log(`✅ ${reportsResponse.data.reports.length} rapports trouvés`);
      reportsResponse.data.reports.forEach((report, index) => {
        console.log(`   ${index + 1}. Rapport ${report.id} (${report.eventCount} événements) - ${report.createdAt}`);
      });
    } else {
      console.log('❌ Erreur lors de la récupération des rapports');
    }

    console.log('\n🎉 Test terminé avec succès!');
    console.log('\n💡 Vous pouvez maintenant:');
    console.log('   - Ouvrir http://localhost:3001/accessibility-dashboard pour voir l\'interface');
    console.log('   - Consulter les rapports générés');
    console.log('   - Analyser les événements d\'accessibilité');

  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
    if (error.response) {
      console.error('   Détails:', error.response.data);
    }
  }
}

// Fonction pour nettoyer les données de test
async function cleanupTestData() {
  try {
    console.log('\n🧹 Nettoyage des données de test...');
    await axios.post(`${SERVER_URL}/api/accessibility-events-clear`, {});
    console.log('✅ Données de test effacées');
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error.message);
  }
}

// Exécuter le test
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--cleanup')) {
    cleanupTestData();
  } else {
    testAccessibilityAuscultation();
  }
}

module.exports = {
  testAccessibilityAuscultation,
  cleanupTestData,
  mockAccessibilityEvents
};
