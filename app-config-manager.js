/**
 * Gestionnaire de configuration multi-apps
 * Permet de charger et utiliser les configurations spécifiques à chaque app
 */

const fs = require('fs');
const path = require('path');

class AppConfigManager {
  constructor(configPath = './app-configs.json') {
    this.configPath = configPath;
    this.config = null;
    this.currentApp = null;
    this.loadConfig();
  }

  /**
   * Charge la configuration depuis le fichier JSON
   */
  loadConfig() {
    try {
      const configFile = fs.readFileSync(this.configPath, 'utf8');
      this.config = JSON.parse(configFile);
      console.log(`✅ Configuration chargée: ${Object.keys(this.config.apps).length} apps disponibles`);
    } catch (error) {
      console.error('❌ Erreur lors du chargement de la configuration:', error);
      this.config = { apps: {}, defaultConfig: {} };
    }
  }

  /**
   * Recharge la configuration (utile pour hot-reload)
   */
  reloadConfig() {
    this.loadConfig();
  }

  /**
   * Définit l'app courante
   */
  setCurrentApp(appKey) {
    if (this.config.apps[appKey]) {
      this.currentApp = appKey;
      console.log(`📱 App active: ${this.config.apps[appKey].name}`);
      return true;
    }
    console.error(`❌ App "${appKey}" introuvable`);
    return false;
  }

  /**
   * Récupère la configuration de l'app courante
   */
  getCurrentAppConfig() {
    if (!this.currentApp) {
      return null;
    }
    return this.config.apps[this.currentApp];
  }

  /**
   * Récupère la configuration d'une app spécifique
   */
  getAppConfig(appKey) {
    return this.config.apps[appKey] || null;
  }

  /**
   * Détecte automatiquement l'app depuis le package name
   */
  detectAppFromPackage(packageName) {
    for (const [key, app] of Object.entries(this.config.apps)) {
      if (app.packageName === packageName) {
        this.setCurrentApp(key);
        return key;
      }
    }
    return null;
  }

  /**
   * Liste toutes les apps disponibles
   */
  listApps() {
    return Object.entries(this.config.apps).map(([key, app]) => ({
      key,
      name: app.name,
      packageName: app.packageName
    }));
  }

  /**
   * Vérifie si un texte correspond à un bouton d'ajout au panier
   */
  isAddToCartButton(text, appKey = null) {
    const app = appKey ? this.getAppConfig(appKey) : this.getCurrentAppConfig();
    if (!app || !text) return false;

    const patterns = app.buttonPatterns?.addToCart || [];
    const lowerText = text.toLowerCase();
    
    return patterns.some(pattern => lowerText.includes(pattern.toLowerCase()));
  }

  /**
   * Vérifie si un texte correspond à un bouton de suppression
   */
  isRemoveFromCartButton(text, appKey = null) {
    const app = appKey ? this.getAppConfig(appKey) : this.getCurrentAppConfig();
    if (!app || !text) return false;

    const patterns = app.buttonPatterns?.removeFromCart || [];
    const lowerText = text.toLowerCase();
    
    return patterns.some(pattern => lowerText.includes(pattern.toLowerCase()));
  }

  /**
   * Vérifie si un texte correspond à un élément de navigation
   */
  isNavigationElement(text, appKey = null) {
    const app = appKey ? this.getAppConfig(appKey) : this.getCurrentAppConfig();
    if (!app || !text) return false;

    const categories = app.navigationCategories || [];
    const lowerText = text.toLowerCase();
    
    return categories.some(category => lowerText.includes(category.toLowerCase()));
  }

  /**
   * Extrait le prix depuis un texte avec les patterns de l'app
   */
  extractPrice(text, appKey = null) {
    const app = appKey ? this.getAppConfig(appKey) : this.getCurrentAppConfig();
    if (!app || !text) return null;

    const patterns = app.pricePatterns || [];
    
    for (const pattern of patterns) {
      const regex = new RegExp(pattern);
      const match = text.match(regex);
      if (match) {
        return match[0];
      }
    }
    
    return null;
  }

  /**
   * Vérifie si un conteneur est un conteneur de scroll
   */
  isScrollContainer(className, appKey = null) {
    const app = appKey ? this.getAppConfig(appKey) : this.getCurrentAppConfig();
    if (!app || !className) return false;

    const containers = app.scrollContainers || [];
    const lowerClassName = className.toLowerCase();
    
    return containers.some(container => lowerClassName.includes(container.toLowerCase()));
  }

  /**
   * Récupère les flows de test d'une app
   */
  getTestFlows(appKey = null) {
    const app = appKey ? this.getAppConfig(appKey) : this.getCurrentAppConfig();
    return app?.testFlows || {};
  }

  /**
   * Récupère un flow de test spécifique
   */
  getTestFlow(flowKey, appKey = null) {
    const flows = this.getTestFlows(appKey);
    return flows[flowKey] || null;
  }

  /**
   * Analyse un événement avec la configuration de l'app
   */
  analyzeEvent(event) {
    const packageName = event.packageName || event.data?.packageName;
    const appKey = this.detectAppFromPackage(packageName);
    
    if (!appKey) {
      return {
        recognized: false,
        appKey: null,
        analysis: null
      };
    }

    const text = event.data?.element?.text || event.data?.productInfo?.productName || '';
    const className = event.data?.element?.className || '';
    
    const analysis = {
      isAddToCart: this.isAddToCartButton(text, appKey),
      isRemoveFromCart: this.isRemoveFromCartButton(text, appKey),
      isNavigation: this.isNavigationElement(text, appKey),
      isScrollContainer: this.isScrollContainer(className, appKey),
      extractedPrice: this.extractPrice(text, appKey),
      appName: this.config.apps[appKey].name
    };

    return {
      recognized: true,
      appKey,
      analysis
    };
  }

  /**
   * Filtre intelligent d'événement basé sur la config de l'app
   */
  shouldProcessEvent(event) {
    const { recognized, appKey, analysis } = this.analyzeEvent(event);
    
    if (!recognized) {
      // App non reconnue, traitement par défaut
      return { process: true, reason: 'app_unknown' };
    }

    // Événement de navigation
    if (analysis.isNavigation) {
      return { 
        process: true, 
        reason: 'navigation',
        convertTo: 'VIEW_CLICKED',
        appKey,
        analysis
      };
    }

    // Bouton de suppression
    if (analysis.isRemoveFromCart) {
      return { 
        process: false, 
        reason: 'remove_button',
        appKey,
        analysis
      };
    }

    // Vrai ajout au panier
    if (analysis.isAddToCart && analysis.extractedPrice) {
      return { 
        process: true, 
        reason: 'add_to_cart_with_price',
        appKey,
        analysis
      };
    }

    // Ajout au panier sans prix (suspect)
    if (analysis.isAddToCart && !analysis.extractedPrice) {
      return { 
        process: false, 
        reason: 'add_to_cart_no_price',
        appKey,
        analysis
      };
    }

    // Événement scroll
    if (event.eventType === 'SCROLL' && analysis.isScrollContainer) {
      return { 
        process: true, 
        reason: 'scroll_in_container',
        appKey,
        analysis
      };
    }

    // Par défaut, traiter l'événement
    return { 
      process: true, 
      reason: 'default',
      appKey,
      analysis
    };
  }

  /**
   * Génère des statistiques sur les apps
   */
  getStats() {
    const apps = this.listApps();
    const stats = {
      totalApps: apps.length,
      apps: apps.map(app => {
        const config = this.getAppConfig(app.key);
        return {
          ...app,
          flowsCount: Object.keys(config.testFlows || {}).length,
          buttonPatternsCount: Object.keys(config.buttonPatterns || {}).length,
          pricePatternCount: (config.pricePatterns || []).length
        };
      })
    };
    return stats;
  }
}

module.exports = AppConfigManager;
