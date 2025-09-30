/**
 * Appium Test Runner pour automatisation des tests e-commerce
 * Permet de reproduire des flows de test standards sur différentes apps
 */

const { remote } = require('webdriverio');
const fs = require('fs');
const path = require('path');

class AppiumTestRunner {
  constructor(appConfig, testFlow) {
    this.appConfig = appConfig;
    this.testFlow = testFlow;
    this.driver = null;
    this.screenshots = [];
    this.events = [];
  }

  /**
   * Configuration Appium pour émulateur Android
   */
  getAppiumCapabilities() {
    if (!this.appConfig || !this.appConfig.packageName) {
      throw new Error('Configuration app invalide ou manquante');
    }
    
    const caps = {
      platformName: 'Android',
      'appium:platformVersion': '16', // Android 16 (correspond à votre émulateur)
      'appium:deviceName': 'Android Emulator',
      'appium:automationName': 'UiAutomator2',
      'appium:appPackage': this.appConfig.packageName,
      'appium:noReset': true,  // ✅ Ne pas réinitialiser l'app
      'appium:fullReset': false,
      'appium:newCommandTimeout': 300,
      'appium:autoGrantPermissions': true,
      'appium:disableWindowAnimation': true
    };
    
    // Ajouter l'activité seulement si elle est définie
    if (this.appConfig.mainActivity) {
      caps['appium:appActivity'] = this.appConfig.mainActivity;
    }
    
    return caps;
  }

  /**
   * Initialise la connexion Appium
   */
  async initialize() {
    console.log(`🚀 Initialisation du test pour ${this.appConfig.name}...`);
    
    this.driver = await remote({
      protocol: 'http',
      hostname: 'localhost',
      port: 4723,
      path: '/wd/hub',
      capabilities: this.getAppiumCapabilities(),
      logLevel: 'info'
    });

    console.log(`✅ Connexion Appium établie`);
    return this.driver;
  }

  /**
   * Exécute un flow de test complet
   */
  async runTestFlow(flowName, variables = {}) {
    const flow = this.testFlow[flowName];
    if (!flow) {
      throw new Error(`Flow de test "${flowName}" introuvable`);
    }

    console.log(`\n📋 Exécution du flow: ${flow.name}`);
    console.log(`📦 Application: ${this.appConfig.name}`);
    console.log(`🔢 Nombre d'étapes: ${flow.steps.length}\n`);

    const startTime = Date.now();
    const results = {
      flowName: flow.name,
      appName: this.appConfig.name,
      startTime: new Date().toISOString(),
      steps: [],
      screenshots: [],
      events: [],
      success: true,
      error: null
    };

    try {
      for (let i = 0; i < flow.steps.length; i++) {
        const step = flow.steps[i];
        console.log(`\n⏩ Étape ${i + 1}/${flow.steps.length}: ${step.action}`);
        
        const stepResult = await this.executeStep(step, variables);
        results.steps.push(stepResult);

        // Capture d'écran après chaque étape importante
        if (['click', 'input', 'scroll'].includes(step.action)) {
          const screenshot = await this.takeScreenshot(`step_${i + 1}_${step.action}`);
          results.screenshots.push(screenshot);
        }

        if (!stepResult.success) {
          results.success = false;
          results.error = stepResult.error;
          break;
        }
      }
    } catch (error) {
      console.error(`❌ Erreur lors de l'exécution du flow:`, error);
      results.success = false;
      results.error = error.message;
    }

    const duration = Date.now() - startTime;
    results.duration = duration;
    results.endTime = new Date().toISOString();

    console.log(`\n${results.success ? '✅' : '❌'} Flow terminé en ${duration}ms`);
    
    // Sauvegarde des résultats
    await this.saveResults(results);

    return results;
  }

  /**
   * Exécute une étape individuelle du flow
   */
  async executeStep(step, variables) {
    const result = {
      action: step.action,
      timestamp: new Date().toISOString(),
      success: false,
      error: null,
      data: {}
    };

    try {
      switch (step.action) {
        case 'launch':
          await this.driver.activateApp(step.target);
          result.data.package = step.target;
          console.log(`  ✓ Application lancée: ${step.target}`);
          break;

        case 'wait':
          await this.driver.pause(step.duration);
          result.data.duration = step.duration;
          console.log(`  ✓ Attente: ${step.duration}ms`);
          break;

        case 'click':
          const clickElement = await this.findElement(step.selector);
          await clickElement.click();
          result.data.selector = step.selector;
          console.log(`  ✓ Clic effectué`);
          break;

        case 'input':
          const inputElement = await this.findElement(step.selector);
          const text = this.replaceVariables(step.text, variables);
          await inputElement.setValue(text);
          result.data.text = text;
          console.log(`  ✓ Texte saisi: ${text}`);
          break;

        case 'scroll':
          await this.performScroll(step.direction, step.count || 1);
          result.data.direction = step.direction;
          result.data.count = step.count;
          console.log(`  ✓ Scroll ${step.direction} x${step.count}`);
          break;

        case 'pressKey':
          await this.driver.pressKeyCode(this.getKeyCode(step.key));
          result.data.key = step.key;
          console.log(`  ✓ Touche pressée: ${step.key}`);
          break;

        case 'swipe':
          await this.performSwipe(step.direction);
          result.data.direction = step.direction;
          console.log(`  ✓ Swipe ${step.direction}`);
          break;

        case 'verify':
          const verifyResult = await this.verifyElement(step.selector, step.expected);
          result.data.verified = verifyResult;
          console.log(`  ✓ Vérification: ${verifyResult ? 'OK' : 'ÉCHEC'}`);
          break;

        default:
          throw new Error(`Action inconnue: ${step.action}`);
      }

      result.success = true;
    } catch (error) {
      console.error(`  ✗ Erreur:`, error.message);
      result.error = error.message;
      
      // Capture d'écran en cas d'erreur
      await this.takeScreenshot(`error_${step.action}`);
    }

    return result;
  }

  /**
   * Trouve un élément avec différents sélecteurs
   */
  async findElement(selector) {
    if (selector.text) {
      return await this.driver.$(`android=new UiSelector().text("${selector.text}")`);
    } else if (selector['content-desc']) {
      return await this.driver.$(`android=new UiSelector().description("${selector['content-desc']}")`);
    } else if (selector.id) {
      return await this.driver.$(`id=${selector.id}`);
    } else if (selector.class) {
      // Si la classe contient déjà "android.", ne pas ajouter de préfixe
      const className = selector.class.includes('.') ? selector.class : `android.widget.${selector.class}`;
      return await this.driver.$(`android=new UiSelector().className("${className}")`);
    } else if (selector.xpath) {
      return await this.driver.$(selector.xpath);
    } else if (selector.index !== undefined) {
      const elements = await this.driver.$$('android.view.View');
      return elements[selector.index];
    }
    
    throw new Error('Sélecteur invalide');
  }

  /**
   * Effectue un scroll
   */
  async performScroll(direction, count = 1) {
    const { width, height } = await this.driver.getWindowSize();
    
    for (let i = 0; i < count; i++) {
      let startX, startY, endX, endY;
      
      switch (direction) {
        case 'down':
          startX = width / 2;
          startY = height * 0.8;
          endX = width / 2;
          endY = height * 0.2;
          break;
        case 'up':
          startX = width / 2;
          startY = height * 0.2;
          endX = width / 2;
          endY = height * 0.8;
          break;
        case 'left':
          startX = width * 0.8;
          startY = height / 2;
          endX = width * 0.2;
          endY = height / 2;
          break;
        case 'right':
          startX = width * 0.2;
          startY = height / 2;
          endX = width * 0.8;
          endY = height / 2;
          break;
      }
      
      // Utiliser W3C Actions API (compatible Appium 3.x)
      await this.driver.performActions([{
        type: 'pointer',
        id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
          { type: 'pointerMove', duration: 0, x: Math.round(startX), y: Math.round(startY) },
          { type: 'pointerDown', button: 0 },
          { type: 'pause', duration: 500 },
          { type: 'pointerMove', duration: 1000, x: Math.round(endX), y: Math.round(endY) },
          { type: 'pointerUp', button: 0 }
        ]
      }]);
      
      await this.driver.releaseActions();
      await this.driver.pause(500);
    }
  }

  /**
   * Effectue un swipe
   */
  async performSwipe(direction) {
    await this.performScroll(direction, 1);
  }

  /**
   * Vérifie la présence d'un élément
   */
  async verifyElement(selector, expected) {
    try {
      const element = await this.findElement(selector);
      const exists = await element.isDisplayed();
      
      if (expected && expected.text) {
        const text = await element.getText();
        return text.includes(expected.text);
      }
      
      return exists;
    } catch (error) {
      return false;
    }
  }

  /**
   * Prend une capture d'écran
   */
  async takeScreenshot(name) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${name}_${timestamp}.png`;
      const filepath = path.join(__dirname, 'screenshots', filename);
      
      // Créer le dossier si nécessaire
      const dir = path.dirname(filepath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      const screenshot = await this.driver.saveScreenshot(filepath);
      console.log(`  📸 Screenshot: ${filename}`);
      
      return {
        name,
        filename,
        filepath,
        timestamp
      };
    } catch (error) {
      console.error(`  ✗ Erreur screenshot:`, error.message);
      return null;
    }
  }

  /**
   * Remplace les variables dans le texte
   */
  replaceVariables(text, variables) {
    let result = text;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(`{{${key}}}`, value);
    }
    return result;
  }

  /**
   * Convertit une touche en keycode Android
   */
  getKeyCode(key) {
    const keyCodes = {
      'ENTER': 66,
      'BACK': 4,
      'HOME': 3,
      'MENU': 82,
      'SEARCH': 84,
      'DELETE': 67,
      'TAB': 61
    };
    return keyCodes[key] || 0;
  }

  /**
   * Sauvegarde les résultats du test
   */
  async saveResults(results) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `test_results_${this.appConfig.name}_${timestamp}.json`;
    const filepath = path.join(__dirname, 'results', filename);
    
    // Créer le dossier si nécessaire
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filepath, JSON.stringify(results, null, 2));
    console.log(`\n💾 Résultats sauvegardés: ${filename}`);
  }

  /**
   * Ferme la session Appium
   */
  async cleanup() {
    if (this.driver) {
      await this.driver.deleteSession();
      console.log(`\n🧹 Session Appium fermée`);
    }
  }
}

module.exports = AppiumTestRunner;
