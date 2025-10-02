#!/usr/bin/env node

/**
 * Script de démonstration du système de détection d'ajout panier fiable
 * Montre les capacités du système avec des exemples concrets
 */

const axios = require('axios');

const SERVER_URL = 'http://localhost:3001';

// Couleurs pour la console
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorLog(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function printHeader() {
  colorLog('\n' + '='.repeat(80), 'cyan');
  colorLog('🛒 DÉMONSTRATION - SYSTÈME DE DÉTECTION D\'AJOUT PANIER FIABLE', 'bright');
  colorLog('='.repeat(80), 'cyan');
  colorLog('Version 2.0 - Score de confiance et validation multi-critères', 'yellow');
  colorLog('', 'reset');
}

function printSection(title) {
  colorLog(`\n📋 ${title}`, 'magenta');
  colorLog('-'.repeat(60), 'magenta');
}

function printResult(eventName, result) {
  const status = result.recommendation === 'ACCEPT' ? '✅ ACCEPTÉ' :
                result.recommendation === 'CONVERT_TO_VIEW' ? '🔄 CONVERTI' :
                '❌ REJETÉ';
  
  const statusColor = result.recommendation === 'ACCEPT' ? 'green' :
                     result.recommendation === 'CONVERT_TO_VIEW' ? 'yellow' :
                     'red';
  
  colorLog(`\n${status} ${eventName}`, statusColor);
  colorLog(`   Produit: ${result.productName}`, 'reset');
  colorLog(`   Score: ${result.confidenceScore} (${result.confidenceLevel})`, 'blue');
  colorLog(`   Raisons: ${result.reasons.join(', ')}`, 'cyan');
  
  if (result.details) {
    colorLog(`   Détails: Produit valide: ${result.isValidProduct ? 'Oui' : 'Non'}, Prix: ${result.hasPrice ? 'Oui' : 'Non'}`, 'reset');
  }
}

async function checkServer() {
  try {
    await axios.get(`${SERVER_URL}/api/tracking-data`);
    colorLog('✅ Serveur accessible', 'green');
    return true;
  } catch (error) {
    colorLog('❌ Serveur non accessible. Démarrez le serveur avec: npm start', 'red');
    return false;
  }
}

async function demonstrateBasicDetection() {
  printSection('DÉTECTION BASIQUE - Vrais vs Faux Ajouts Panier');
  
  const basicTests = [
    {
      name: "Vrai ajout panier - Bananes bio",
      event: {
        eventType: "ADD_TO_CART",
        data: {
          packageName: "com.carrefour.fid.android",
          productInfo: {
            productName: "Bananes bio 1kg 2,50€",
            price: "2,50€",
            cartAction: "Ajouter un produit dans le panier",
            allTexts: ["Bananes bio", "1kg", "2,50€", "Ajouter au panier"]
          }
        }
      }
    },
    {
      name: "Navigation - Bouton panier",
      event: {
        eventType: "ADD_TO_CART",
        data: {
          packageName: "com.carrefour.fid.android",
          productInfo: {
            productName: "Panier",
            price: "",
            cartAction: "Ouvrir le panier",
            allTexts: ["Panier", "Ouvrir le panier"]
          }
        }
      }
    },
    {
      name: "Événement suspect - Prix N/A",
      event: {
        eventType: "ADD_TO_CART",
        data: {
          packageName: "com.carrefour.fid.android",
          productInfo: {
            productName: "Produit Prix N/A",
            price: "Prix N/A",
            cartAction: "Ajouter un produit dans le panier",
            allTexts: ["Produit", "Prix N/A", "Ajouter au panier"]
          }
        }
      }
    }
  ];

  try {
    const response = await axios.post(`${SERVER_URL}/api/test-cart-detection`, {
      testEvents: basicTests.map(t => t.event)
    });

    basicTests.forEach((test, index) => {
      printResult(test.name, response.data.results[index]);
    });

  } catch (error) {
    colorLog(`❌ Erreur lors du test basique: ${error.message}`, 'red');
  }
}

async function demonstrateAdvancedScenarios() {
  printSection('SCÉNARIOS AVANCÉS - Cas Limites et Edge Cases');
  
  const advancedTests = [
    {
      name: "Produit avec prix au kilo",
      event: {
        eventType: "ADD_TO_CART",
        data: {
          packageName: "com.carrefour.fid.android",
          productInfo: {
            productName: "Saucisses de Toulouse 4,20€/kg",
            price: "4,20€/kg",
            cartAction: "Ajouter un produit dans le panier",
            allTexts: ["Saucisses de Toulouse", "4,20€/kg", "Ajouter au panier"]
          }
        }
      }
    },
    {
      name: "Prix dans allTexts mais pas dans productName",
      event: {
        eventType: "ADD_TO_CART",
        data: {
          packageName: "com.carrefour.fid.android",
          productInfo: {
            productName: "Pommes Golden",
            price: "",
            cartAction: "Ajouter un produit dans le panier",
            allTexts: ["Pommes Golden", "3,20€", "Ajouter au panier"]
          }
        }
      }
    },
    {
      name: "Promotion - Devrait être filtré",
      event: {
        eventType: "ADD_TO_CART",
        data: {
          packageName: "com.carrefour.fid.android",
          productInfo: {
            productName: "Promotion Club - 2€ cagnottés",
            price: "2,00€",
            cartAction: "Ajouter un produit dans le panier",
            allTexts: ["Promotion Club", "2€ cagnottés", "Ajouter au panier"]
          }
        }
      }
    },
    {
      name: "Produit avec nom très long et détaillé",
      event: {
        eventType: "ADD_TO_CART",
        data: {
          packageName: "com.carrefour.fid.android",
          productInfo: {
            productName: "Emmental râpé Carrefour 200g 2,80€",
            price: "2,80€",
            cartAction: "Ajouter un produit dans le panier",
            allTexts: ["Emmental râpé Carrefour", "200g", "2,80€", "Ajouter au panier"]
          }
        }
      }
    },
    {
      name: "Événement système Android",
      event: {
        eventType: "ADD_TO_CART",
        data: {
          packageName: "com.carrefour.fid.android",
          productInfo: {
            productName: "com.android.systemui - 10:30 AM",
            price: "",
            cartAction: "Notification système",
            allTexts: ["com.android.systemui", "10:30 AM", "Notification"]
          }
        }
      }
    }
  ];

  try {
    const response = await axios.post(`${SERVER_URL}/api/test-cart-detection`, {
      testEvents: advancedTests.map(t => t.event)
    });

    advancedTests.forEach((test, index) => {
      printResult(test.name, response.data.results[index]);
    });

  } catch (error) {
    colorLog(`❌ Erreur lors du test avancé: ${error.message}`, 'red');
  }
}

async function demonstrateConfidenceScoring() {
  printSection('SYSTÈME DE SCORE DE CONFIANCE - Analyse Détaillée');
  
  const confidenceTests = [
    {
      name: "Score HAUT - Produit parfait",
      event: {
        eventType: "ADD_TO_CART",
        data: {
          packageName: "com.carrefour.fid.android",
          productInfo: {
            productName: "Bananes bio 1kg 2,50€",
            price: "2,50€",
            cartAction: "Ajouter un produit dans le panier",
            allTexts: ["Bananes bio", "1kg", "2,50€", "Ajouter au panier", "Produit frais", "Bio certifié"]
          }
        }
      }
    },
    {
      name: "Score MOYEN - Produit correct",
      event: {
        eventType: "ADD_TO_CART",
        data: {
          packageName: "com.carrefour.fid.android",
          productInfo: {
            productName: "Pommes",
            price: "3,20€",
            cartAction: "Ajouter un produit dans le panier",
            allTexts: ["Pommes", "3,20€", "Ajouter au panier"]
          }
        }
      }
    },
    {
      name: "Score FAIBLE - Produit suspect",
      event: {
        eventType: "ADD_TO_CART",
        data: {
          packageName: "com.carrefour.fid.android",
          productInfo: {
            productName: "Produit",
            price: "1,00€",
            cartAction: "Ajouter un produit dans le panier",
            allTexts: ["Produit", "1,00€"]
          }
        }
      }
    },
    {
      name: "Score REJET - Événement invalide",
      event: {
        eventType: "ADD_TO_CART",
        data: {
          packageName: "com.carrefour.fid.android",
          productInfo: {
            productName: "X",
            price: "Prix N/A",
            cartAction: "Ajouter un produit dans le panier",
            allTexts: ["X", "Prix N/A"]
          }
        }
      }
    }
  ];

  try {
    const response = await axios.post(`${SERVER_URL}/api/test-cart-detection`, {
      testEvents: confidenceTests.map(t => t.event)
    });

    colorLog('\n📊 ANALYSE DES SCORES DE CONFIANCE:', 'bright');
    
    confidenceTests.forEach((test, index) => {
      const result = response.data.results[index];
      const scoreColor = result.confidenceScore >= 80 ? 'green' :
                        result.confidenceScore >= 60 ? 'yellow' :
                        result.confidenceScore >= 40 ? 'red' : 'magenta';
      
      colorLog(`\n${test.name}:`, 'bright');
      colorLog(`   Score: ${result.confidenceScore}/100`, scoreColor);
      colorLog(`   Niveau: ${result.confidenceLevel}`, scoreColor);
      colorLog(`   Recommandation: ${result.recommendation}`, scoreColor);
      colorLog(`   Raisons: ${result.reasons.join(', ')}`, 'cyan');
    });

  } catch (error) {
    colorLog(`❌ Erreur lors du test de confiance: ${error.message}`, 'red');
  }
}

async function showRealTimeStats() {
  printSection('STATISTIQUES TEMPS RÉEL - État du Système');
  
  try {
    const response = await axios.get(`${SERVER_URL}/api/confidence-stats`);
    const data = response.data;
    
    if (data.success) {
      colorLog(`📈 Événements panier récents: ${data.stats.totalCartEvents}`, 'blue');
      colorLog(`🟢 Confiance élevée: ${data.stats.highConfidence}`, 'green');
      colorLog(`🟡 Confiance moyenne: ${data.stats.mediumConfidence}`, 'yellow');
      colorLog(`🟠 Confiance faible: ${data.stats.lowConfidence}`, 'red');
      colorLog(`❌ Rejetés: ${data.stats.rejected}`, 'magenta');
      colorLog(`📊 Score moyen: ${data.stats.averageConfidence}/100`, 'cyan');
      
      if (data.recentEvents.length > 0) {
        colorLog('\n📋 DERNIERS ÉVÉNEMENTS ANALYSÉS:', 'bright');
        data.recentEvents.slice(-3).forEach(event => {
          const time = new Date(event.timestamp).toLocaleTimeString();
          colorLog(`   ${time} - ${event.productName} (${event.confidenceScore})`, 'reset');
        });
      } else {
        colorLog('ℹ️ Aucun événement panier récent', 'yellow');
      }
    } else {
      colorLog(`❌ Erreur: ${data.error}`, 'red');
    }
  } catch (error) {
    colorLog(`❌ Erreur lors de la récupération des stats: ${error.message}`, 'red');
  }
}

async function showUsageInstructions() {
  printSection('INSTRUCTIONS D\'UTILISATION');
  
  colorLog('🌐 Dashboard Web:', 'bright');
  colorLog('   http://localhost:3001/cart-detection-test', 'cyan');
  
  colorLog('\n🧪 Script de test:', 'bright');
  colorLog('   node test-cart-detection.js', 'cyan');
  
  colorLog('\n📊 API Endpoints:', 'bright');
  colorLog('   POST /api/test-cart-detection - Tester des événements', 'cyan');
  colorLog('   GET  /api/confidence-stats - Statistiques temps réel', 'cyan');
  colorLog('   GET  /api/filtered-events - Événements filtrés', 'cyan');
  
  colorLog('\n📚 Documentation:', 'bright');
  colorLog('   CART_DETECTION_GUIDE.md - Guide complet', 'cyan');
}

async function main() {
  printHeader();
  
  // Vérifier que le serveur est accessible
  const serverOk = await checkServer();
  if (!serverOk) {
    process.exit(1);
  }
  
  // Démonstrations
  await demonstrateBasicDetection();
  await demonstrateAdvancedScenarios();
  await demonstrateConfidenceScoring();
  await showRealTimeStats();
  await showUsageInstructions();
  
  colorLog('\n' + '='.repeat(80), 'green');
  colorLog('🎉 DÉMONSTRATION TERMINÉE - Système de détection d\'ajout panier fiable opérationnel !', 'bright');
  colorLog('='.repeat(80), 'green');
  colorLog('', 'reset');
}

// Exécuter la démonstration
if (require.main === module) {
  main().catch(error => {
    colorLog(`❌ Erreur générale: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { main };
