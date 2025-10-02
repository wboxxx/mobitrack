#!/usr/bin/env node

/**
 * Script de test pour la détection d'ajout panier fiable
 * Teste différents scénarios d'événements pour valider la robustesse du système
 */

const axios = require('axios');

const SERVER_URL = 'http://localhost:3001';

// Scénarios de test pour différents types d'événements
const testScenarios = [
  // ✅ Vrais ajouts panier (devraient être acceptés)
  {
    name: "Vrai ajout panier - Bananes avec prix",
    event: {
      id: 1,
      eventType: "ADD_TO_CART",
      timestamp: new Date().toISOString(),
      data: {
        packageName: "com.carrefour.fid.android",
        productInfo: {
          productName: "Bananes bio 1kg 2,50€",
          price: "2,50€",
          cartAction: "Ajouter un produit dans le panier",
          allTexts: ["Bananes bio", "1kg", "2,50€", "Ajouter au panier"]
        }
      }
    },
    expectedResult: "ACCEPT"
  },
  {
    name: "Vrai ajout panier - Saucisses avec prix au kilo",
    event: {
      id: 2,
      eventType: "ADD_TO_CART",
      timestamp: new Date().toISOString(),
      data: {
        packageName: "com.carrefour.fid.android",
        productInfo: {
          productName: "Saucisses de Toulouse 4,20€/kg",
          price: "4,20€/kg",
          cartAction: "Ajouter un produit dans le panier",
          allTexts: ["Saucisses de Toulouse", "4,20€/kg", "Ajouter au panier"]
        }
      }
    },
    expectedResult: "ACCEPT"
  },
  
  // ❌ Faux ajouts panier (devraient être rejetés ou convertis)
  {
    name: "Navigation - Bouton panier",
    event: {
      id: 3,
      eventType: "ADD_TO_CART",
      timestamp: new Date().toISOString(),
      data: {
        packageName: "com.carrefour.fid.android",
        productInfo: {
          productName: "Panier",
          price: "",
          cartAction: "Ouvrir le panier",
          allTexts: ["Panier", "Ouvrir le panier"]
        }
      }
    },
    expectedResult: "CONVERT_TO_VIEW"
  },
  {
    name: "Navigation - Recherche",
    event: {
      id: 4,
      eventType: "ADD_TO_CART",
      timestamp: new Date().toISOString(),
      data: {
        packageName: "com.carrefour.fid.android",
        productInfo: {
          productName: "Rechercher",
          price: "",
          cartAction: "Ouvrir la recherche",
          allTexts: ["Rechercher", "Ouvrir la recherche"]
        }
      }
    },
    expectedResult: "CONVERT_TO_VIEW"
  },
  {
    name: "Événement système - Prix N/A",
    event: {
      id: 5,
      eventType: "ADD_TO_CART",
      timestamp: new Date().toISOString(),
      data: {
        packageName: "com.carrefour.fid.android",
        productInfo: {
          productName: "Produit Prix N/A",
          price: "Prix N/A",
          cartAction: "Ajouter un produit dans le panier",
          allTexts: ["Produit", "Prix N/A", "Ajouter au panier"]
        }
      }
    },
    expectedResult: "REJECT"
  },
  {
    name: "Événement générique - Nom trop court",
    event: {
      id: 6,
      eventType: "ADD_TO_CART",
      timestamp: new Date().toISOString(),
      data: {
        packageName: "com.carrefour.fid.android",
        productInfo: {
          productName: "X",
          price: "1,50€",
          cartAction: "Ajouter un produit dans le panier",
          allTexts: ["X", "1,50€"]
        }
      }
    },
    expectedResult: "REJECT"
  },
  {
    name: "Prix zéro - Suspect",
    event: {
      id: 7,
      eventType: "ADD_TO_CART",
      timestamp: new Date().toISOString(),
      data: {
        packageName: "com.carrefour.fid.android",
        productInfo: {
          productName: "Produit gratuit 0,00€",
          price: "0,00€",
          cartAction: "Ajouter un produit dans le panier",
          allTexts: ["Produit gratuit", "0,00€"]
        }
      }
    },
    expectedResult: "REJECT"
  },
  
  // 🟡 Cas limites (peuvent être acceptés ou convertis selon la configuration)
  {
    name: "Produit sans prix dans productName mais avec prix dans allTexts",
    event: {
      id: 8,
      eventType: "ADD_TO_CART",
      timestamp: new Date().toISOString(),
      data: {
        packageName: "com.carrefour.fid.android",
        productInfo: {
          productName: "Pommes Golden",
          price: "",
          cartAction: "Ajouter un produit dans le panier",
          allTexts: ["Pommes Golden", "3,20€", "Ajouter au panier"]
        }
      }
    },
    expectedResult: "ACCEPT"
  },
  {
    name: "Produit avec nom long et prix valide",
    event: {
      id: 9,
      eventType: "ADD_TO_CART",
      timestamp: new Date().toISOString(),
      data: {
        packageName: "com.carrefour.fid.android",
        productInfo: {
          productName: "Emmental râpé Carrefour 200g 2,80€",
          price: "2,80€",
          cartAction: "Ajouter un produit dans le panier",
          allTexts: ["Emmental râpé Carrefour", "200g", "2,80€", "Ajouter au panier"]
        }
      }
    },
    expectedResult: "ACCEPT"
  },
  {
    name: "Promotion - Devrait être filtré",
    event: {
      id: 10,
      eventType: "ADD_TO_CART",
      timestamp: new Date().toISOString(),
      data: {
        packageName: "com.carrefour.fid.android",
        productInfo: {
          productName: "Promotion Club - 2€ cagnottés",
          price: "2,00€",
          cartAction: "Ajouter un produit dans le panier",
          allTexts: ["Promotion Club", "2€ cagnottés", "Ajouter au panier"]
        }
      }
    },
    expectedResult: "REJECT"
  }
];

async function runTests() {
  console.log('🧪 Démarrage des tests de détection d\'ajout panier...\n');
  
  try {
    // Vérifier que le serveur est accessible
    await axios.get(`${SERVER_URL}/api/tracking-data`);
    console.log('✅ Serveur accessible\n');
  } catch (error) {
    console.error('❌ Impossible de se connecter au serveur. Assurez-vous qu\'il est démarré sur le port 3001');
    process.exit(1);
  }
  
  const testEvents = testScenarios.map(scenario => scenario.event);
  
  try {
    // Envoyer les événements de test
    const response = await axios.post(`${SERVER_URL}/api/test-cart-detection`, {
      testEvents: testEvents
    });
    
    const results = response.data.results;
    const stats = response.data.stats;
    
    console.log('📊 RÉSULTATS DES TESTS\n');
    console.log('=' * 60);
    
    // Afficher les résultats détaillés
    testScenarios.forEach((scenario, index) => {
      const result = results[index];
      const status = result.recommendation === scenario.expectedResult ? '✅' : '❌';
      
      console.log(`${status} ${scenario.name}`);
      console.log(`   Produit: ${result.productName}`);
      console.log(`   Score de confiance: ${result.confidenceScore} (${result.confidenceLevel})`);
      console.log(`   Attendu: ${scenario.expectedResult} | Obtenu: ${result.recommendation}`);
      console.log(`   Raisons: ${result.reasons.join(', ')}`);
      console.log('');
    });
    
    // Afficher les statistiques globales
    console.log('📈 STATISTIQUES GLOBALES\n');
    console.log(`Total d'événements testés: ${stats.total}`);
    console.log(`Acceptés: ${stats.accepted} (${Math.round(stats.accepted/stats.total*100)}%)`);
    console.log(`Convertis en VIEW: ${stats.converted} (${Math.round(stats.converted/stats.total*100)}%)`);
    console.log(`Rejetés: ${stats.rejected} (${Math.round(stats.rejected/stats.total*100)}%)`);
    console.log(`Score de confiance moyen: ${stats.averageConfidence}`);
    console.log(`Confiance élevée: ${stats.highConfidence}`);
    console.log(`Confiance moyenne: ${stats.mediumConfidence}`);
    console.log(`Confiance faible: ${stats.lowConfidence}`);
    
    // Calculer le taux de réussite
    const correctPredictions = testScenarios.filter((scenario, index) => 
      results[index].recommendation === scenario.expectedResult
    ).length;
    
    const successRate = Math.round(correctPredictions / testScenarios.length * 100);
    
    console.log(`\n🎯 TAUX DE RÉUSSITE: ${successRate}% (${correctPredictions}/${testScenarios.length})`);
    
    if (successRate >= 80) {
      console.log('🎉 Excellent ! Le système de détection fonctionne très bien.');
    } else if (successRate >= 60) {
      console.log('👍 Bon ! Le système fonctionne bien mais peut être amélioré.');
    } else {
      console.log('⚠️ Le système nécessite des améliorations.');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'exécution des tests:', error.message);
    if (error.response) {
      console.error('Détails:', error.response.data);
    }
  }
}

// Fonction pour tester avec des événements réels du serveur
async function testWithRealEvents() {
  console.log('\n🔍 Test avec les événements réels du serveur...\n');
  
  try {
    const response = await axios.get(`${SERVER_URL}/api/confidence-stats`);
    const data = response.data;
    
    console.log('📊 STATISTIQUES DE CONFIANCE (100 derniers événements)\n');
    console.log(`Total d'événements panier: ${data.stats.totalCartEvents}`);
    console.log(`Confiance élevée: ${data.stats.highConfidence}`);
    console.log(`Confiance moyenne: ${data.stats.mediumConfidence}`);
    console.log(`Confiance faible: ${data.stats.lowConfidence}`);
    console.log(`Rejetés: ${data.stats.rejected}`);
    console.log(`Score moyen: ${data.stats.averageConfidence}`);
    
    if (data.recentEvents.length > 0) {
      console.log('\n📋 DERNIERS ÉVÉNEMENTS ANALYSÉS:\n');
      data.recentEvents.slice(-5).forEach(event => {
        console.log(`• ${event.productName} (${event.confidenceScore} - ${event.confidenceLevel})`);
        console.log(`  Raisons: ${event.reasons.join(', ')}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des événements réels:', error.message);
  }
}

// Exécuter les tests
if (require.main === module) {
  runTests().then(() => {
    return testWithRealEvents();
  }).then(() => {
    console.log('\n✅ Tests terminés !');
  }).catch(error => {
    console.error('❌ Erreur générale:', error);
    process.exit(1);
  });
}

module.exports = { runTests, testWithRealEvents, testScenarios };
