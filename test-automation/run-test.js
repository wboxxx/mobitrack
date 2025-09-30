/**
 * Script principal pour lancer les tests automatisés
 * Usage: node run-test.js <app> <flow> [variables]
 * Exemple: node run-test.js carrefour addToCart
 */

const AppiumTestRunner = require('./appium-test-runner');
const fs = require('fs');
const path = require('path');

// Charger la configuration des apps
const configPath = path.join(__dirname, '..', 'app-configs.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

/**
 * Affiche l'aide
 */
function showHelp() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║          🤖 Test Automation Runner - E-commerce Apps          ║
╚════════════════════════════════════════════════════════════════╝

Usage:
  node run-test.js <app> <flow> [variables]

Apps disponibles:
  ${Object.keys(config.apps).map(app => `- ${app} (${config.apps[app].name})`).join('\n  ')}

Flows disponibles (par app):
  ${Object.entries(config.apps).map(([key, app]) => {
    const flows = Object.keys(app.testFlows || {});
    return `${key}:\n    ${flows.map(f => `- ${f}`).join('\n    ')}`;
  }).join('\n  ')}

Variables (optionnel):
  Passer des variables au format JSON
  Exemple: '{"productName":"banane","quantity":"2"}'

Exemples:
  node run-test.js carrefour addToCart
  node run-test.js amazon searchProduct '{"productName":"laptop"}'
  node run-test.js fnac browseCategory

Prérequis:
  - Appium Server lancé sur localhost:4723
  - Émulateur Android démarré
  - Apps installées sur l'émulateur
  `);
}

/**
 * Liste les apps et flows disponibles
 */
function listAvailable() {
  console.log('\n📱 Apps disponibles:\n');
  
  for (const [key, app] of Object.entries(config.apps)) {
    console.log(`\n🏪 ${app.name} (${key})`);
    console.log(`   Package: ${app.packageName}`);
    console.log(`   Flows de test:`);
    
    for (const [flowKey, flow] of Object.entries(app.testFlows || {})) {
      console.log(`     - ${flowKey}: ${flow.name} (${flow.steps.length} étapes)`);
    }
  }
  
  console.log('\n');
}

/**
 * Fonction principale
 */
async function main() {
  const args = process.argv.slice(2);
  
  // Afficher l'aide
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    showHelp();
    return;
  }
  
  // Lister les apps disponibles
  if (args[0] === '--list' || args[0] === '-l') {
    listAvailable();
    return;
  }
  
  // Vérifier les arguments
  if (args.length < 2) {
    console.error('❌ Erreur: Arguments insuffisants');
    showHelp();
    process.exit(1);
  }
  
  const [appKey, flowKey, variablesJson] = args;
  
  // Vérifier que l'app existe
  const appConfig = config.apps[appKey];
  if (!appConfig) {
    console.error(`❌ Erreur: App "${appKey}" introuvable`);
    console.log(`\nApps disponibles: ${Object.keys(config.apps).join(', ')}`);
    process.exit(1);
  }
  
  // Vérifier que le flow existe
  const testFlows = appConfig.testFlows || {};
  if (!testFlows[flowKey]) {
    console.error(`❌ Erreur: Flow "${flowKey}" introuvable pour ${appConfig.name}`);
    console.log(`\nFlows disponibles: ${Object.keys(testFlows).join(', ')}`);
    process.exit(1);
  }
  
  // Parser les variables
  let variables = {};
  if (variablesJson) {
    try {
      variables = JSON.parse(variablesJson);
    } catch (error) {
      console.error('❌ Erreur: Variables JSON invalides');
      console.error(error.message);
      process.exit(1);
    }
  }
  
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                    🚀 Lancement du test                        ║
╚════════════════════════════════════════════════════════════════╝

📱 Application: ${appConfig.name}
📦 Package: ${appConfig.packageName}
🔄 Flow: ${testFlows[flowKey].name}
📝 Variables: ${Object.keys(variables).length > 0 ? JSON.stringify(variables) : 'Aucune'}
  `);
  
  // Créer le runner de test
  const runner = new AppiumTestRunner(appConfig, testFlows);
  
  try {
    // Initialiser Appium
    await runner.initialize();
    
    // Exécuter le flow de test
    const results = await runner.runTestFlow(flowKey, variables);
    
    // Afficher le résumé
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║                      📊 Résumé du test                         ║
╚════════════════════════════════════════════════════════════════╝

${results.success ? '✅ SUCCÈS' : '❌ ÉCHEC'}
⏱️  Durée: ${results.duration}ms
📸 Screenshots: ${results.screenshots.length}
🔢 Étapes: ${results.steps.filter(s => s.success).length}/${results.steps.length} réussies
${results.error ? `\n❌ Erreur: ${results.error}` : ''}
    `);
    
    // Nettoyer
    await runner.cleanup();
    
    process.exit(results.success ? 0 : 1);
    
  } catch (error) {
    console.error('\n❌ Erreur fatale:', error);
    await runner.cleanup();
    process.exit(1);
  }
}

// Gestion des erreurs non capturées
process.on('unhandledRejection', (error) => {
  console.error('\n❌ Erreur non gérée:', error);
  process.exit(1);
});

// Lancer le script
main();
