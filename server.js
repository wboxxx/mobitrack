const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Store tracking data in memory (for demo purposes)
let trackingData = [];
let sessions = [];
let filteredEvents = {
  system: [],
  promotion: [],
  generic: []
};

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'leclerc.html'));
});

app.get('/leclerc', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'leclerc.html'));
});

app.get('/leclerc-mobile', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'leclerc-mobile.html'));
});

app.get('/comparison', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'mobile-web-comparison.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Système de filtrage intelligent côté serveur
class ServerEventFilter {
  constructor() {
    this.recentEvents = new Map(); // Stockage des événements récents par type
    this.consolidationWindow = 3000; // 3 secondes
    this.minIntervalBetweenSameType = 2000; // 2 secondes minimum pour panier
    this.cartEventBuffer = new Map(); // Buffer pour consolider les événements panier
    this.cartConsolidationDelay = 1500; // 1.5 secondes pour consolider
  }

  shouldProcessEvent(event) {
    const currentTime = Date.now();
    
    // Différencier clairement navigation vs vrais ajouts au panier
    const productName = event.data?.productInfo?.productName || event.data?.element?.text || '';
    const isNavigationElement = this.isNavigationElement(productName);
    
    if (event.eventType === 'ADD_TO_CART') {
      if (isNavigationElement) {
        // Convertir les faux ADD_TO_CART en VIEW_CLICKED pour la navigation
        event.eventType = 'VIEW_CLICKED';
        console.log(`🔄 Navigation détectée: ${productName.substring(0, 50)} - Converti en VIEW_CLICKED`);
      } else {
        // Vrai ajout au panier avec prix
        const hasPrice = this.hasRealPrice(event);
        if (hasPrice) {
          console.log(`🛒 VRAI ajout panier détecté: ${productName.substring(0, 50)}`);
        } else {
          console.log(`⚠️ ADD_TO_CART sans prix: ${productName.substring(0, 50)}`);
        }
      }
    }
    
    // DEBUG: Logger tous les événements avec leur type final
    console.log(`🔍 ${event.eventType} - ${productName.substring(0, 50)}`);
    
    // Traitement spécial pour les événements panier
    if (this.isCartEvent(event)) {
      return this.handleCartEvent(event, currentTime);
    }
    
    // Pour les événements non-panier, accepter tous les types d'événements mobiles
    if (event.eventType && ['VIEW_CLICKED', 'CONTENT_CHANGED', 'SCROLL', 'SEARCH', 'SESSION_START'].includes(event.eventType)) {
      return true;
    }
    
    const eventKey = this.generateEventKey(event);
    
    // Vérifier si un événement similaire a été traité récemment
    const lastEventTime = this.recentEvents.get(eventKey) || 0;
    if (currentTime - lastEventTime < this.minIntervalBetweenSameType) {
      console.log(`🚫 Événement ${event.eventType} filtré - trop récent (${currentTime - lastEventTime}ms)`);
      return false;
    }

    // Calculer le score de qualité
    const qualityScore = this.calculateQualityScore(event);
    if (qualityScore < 0) {
      console.log(`🚫 Événement ${event.eventType} filtré - score négatif (${qualityScore})`);
      return false;
    }

    // Mettre à jour le timestamp du dernier événement
    this.recentEvents.set(eventKey, currentTime);
    
    // Nettoyer les anciens événements
    this.cleanupOldEvents(currentTime);
    
    console.log(`✅ Événement ${event.eventType} accepté - score: ${qualityScore}`);
    return true;
  }

  isNavigationElement(productName) {
    const navigationPatterns = [
      'accueil', 'panier', 'rechercher', 'ouvre la page', 'mes promos',
      'voir tout', 'filtrer & trier', 'magasin', 'fruits et légumes',
      'pommes, poires et raisins', 'pommes (', 'graines (', 'bio',
      'veuillez rentrer', 'predicted app', 'notification',
      'viandes et poissons', 'boucherie', 'poissonnerie', 'volaille et rôtisserie',
      'traiteur de la mer', 'sauces d\'accompagnement', 'c\'est la saison',
      'barbecue', 'surgelés', 'crémerie et produits laitiers', 
      'charcuterie et traiteur', 'bébé', 'mon marché frais', 'foire aux vins', 'coupons',
      'glaces et sorbets', 'apéritifs', 'entrées et snacking', 'frites et pommes de terre',
      'poissons et fruits de mer', 'pains', 'pâtisseries et viennoiseries',
      'mon boucher', 'saucisses et merguez', 'colis du boucher', 'boeuf', 'viandes hachées'
    ];
    
    const lowerName = productName.toLowerCase();
    return navigationPatterns.some(pattern => lowerName.includes(pattern));
  }

  hasRealPrice(event) {
    const productName = event.data?.productInfo?.productName || '';
    const allTexts = event.data?.productInfo?.allTexts || [];
    const price = event.data?.productInfo?.price || '';
    const cartAction = event.data?.productInfo?.cartAction || '';
    
    // Chercher des patterns de prix réels (pas 0,00€)
    const pricePattern = /(\d+[,.]?\d*)\s*€/;
    const allContent = [productName, ...allTexts, price, cartAction].join(' ');
    const priceMatch = allContent.match(pricePattern);
    
    if (priceMatch) {
      const priceValue = parseFloat(priceMatch[1].replace(',', '.'));
      return priceValue > 0; // Prix réel > 0
    }
    
    return false;
  }

  isCartEvent(event) {
    const productName = event.data?.productInfo?.productName || event.data?.element?.text || '';
    return productName.toLowerCase().includes('ajout panier mobile') || 
           productName.toLowerCase().includes('🛒') ||
           event.eventType === 'ADD_TO_CART';
  }

  handleCartEvent(event, currentTime) {
    const productName = event.data?.productInfo?.productName || event.data?.element?.text || '';
    
    // Filtrage préliminaire pour événements système Android
    if (productName.toLowerCase().includes('com.android.systemui') ||
        productName.toLowerCase().includes('t-mobile') ||
        productName.match(/\d+:\d+\s*(am|pm)/i)) {
      this.storeFilteredEvent(event, 'system');
      console.log(`🚫 Événement système Android filtré: ${productName.substring(0, 50)}...`);
      return false;
    }
    
    // Vérifier si c'est un événement promotion
    if (productName.toLowerCase().includes('promotion') ||
        productName.toLowerCase().includes('cagnottés') ||
        productName.toLowerCase().includes('club -') ||
        productName.toLowerCase().includes('mardi pass')) {
      this.storeFilteredEvent(event, 'promotion');
      console.log(`🚫 Événement promotion filtré: ${productName.substring(0, 50)}...`);
      return false;
    }
    
    // Extraire le nom du produit réel (sans les métadonnées)
    const realProductName = this.extractRealProductName(productName);
    
    // Si c'est un événement générique sans valeur, le filtrer
    if (!realProductName || this.calculateQualityScore(event) < 0) {
      this.storeFilteredEvent(event, 'generic');
      console.log(`🚫 Événement panier filtré - produit générique: ${productName.substring(0, 50)}...`);
      return false;
    }
    
    // Créer une clé unique pour ce produit
    const cartKey = `cart_${realProductName}`;
    
    // Vérifier si on a déjà un événement pour ce produit récemment
    const lastCartTime = this.recentEvents.get(cartKey) || 0;
    if (currentTime - lastCartTime < this.minIntervalBetweenSameType) {
      console.log(`🚫 Événement panier filtré - produit déjà ajouté récemment: ${realProductName}`);
      return false;
    }
    
    // Marquer ce produit comme traité
    this.recentEvents.set(cartKey, currentTime);
    
    console.log(`✅ Événement panier accepté: ${realProductName}`);
    return true;
  }

  storeFilteredEvent(event, category) {
    const filteredEvent = {
      ...event,
      filteredAt: new Date().toISOString(),
      filterCategory: category
    };
    
    if (filteredEvents[category]) {
      filteredEvents[category].push(filteredEvent);
      // Limiter à 100 événements par catégorie
      if (filteredEvents[category].length > 100) {
        filteredEvents[category] = filteredEvents[category].slice(-100);
      }
    }
  }

  extractRealProductName(fullText) {
    // Nettoyer le texte pour extraire le vrai nom du produit
    let cleaned = fullText.replace(/🛒\s*Ajout Panier Mobile\s*🛒\s*/gi, '');
    cleaned = cleaned.replace(/Carrefour\s*-\s*/gi, '');
    cleaned = cleaned.replace(/com\.android\.systemui\s*-\s*/gi, '');
    cleaned = cleaned.replace(/Prix N\/A/gi, '');
    cleaned = cleaned.replace(/\d+,\d+€.*$/gi, ''); // Enlever prix à la fin
    cleaned = cleaned.replace(/\(\d+:\d+\s*(AM|PM)\)/gi, ''); // Enlever heures
    cleaned = cleaned.replace(/T-Mobile.*bars\./gi, ''); // Enlever info réseau
    cleaned = cleaned.trim();
    
    // Si le texte nettoyé est trop court ou générique, le rejeter
    if (cleaned.length < 5 || 
        cleaned.toLowerCase().includes('produit') ||
        cleaned.toLowerCase().includes('promotion') ||
        cleaned.toLowerCase().includes('cagnottés') ||
        cleaned.toLowerCase().includes('pm') ||
        cleaned.toLowerCase().includes('am') ||
        cleaned.match(/^\d+:\d+/)) {
      return null;
    }
    
    return cleaned;
  }

  generateEventKey(event) {
    const productName = event.data?.productInfo?.productName || event.data?.element?.text || '';
    return `${event.eventType}_${productName.substring(0, 10)}`;
  }

  calculateQualityScore(event) {
    let score = 0;
    const data = event.data || {};
    
    // Analyser le nom du produit
    const productName = data.productInfo?.productName || data.element?.text || '';
    if (productName) {
      const lowerName = productName.toLowerCase();
      
      // Blacklist étendue pour événements panier (ATTENTION: ne pas bloquer 'panier' car c'est dans tous les événements légitimes)
      const blacklist = [
        'logo', 'version', 'supprimer', 'retirer',
        'bouton', 'valider', 'afficher', 'facilitez', 'faites des économies',
        'découvrez nos meilleurs', 'new notifications',
        'ajouter un produit', 'retirer un produit', 'déjà ajoutés au panier',
        'alternatives pour remplacer', 'produits indisponibles', 'centimes',
        'contenu modifié', 'élément: panier', 'produit inconnu',
        'com.android.systemui', 't-mobile', 'bars', 'pm', 'am', 'notifications'
      ];
      
      if (blacklist.some(term => lowerName.includes(term))) {
        return -100; // Éliminer complètement
      }
      
      // Filtrer les événements génériques de panier
      if (lowerName.includes('ajout panier mobile') && 
          (lowerName.includes('prix n/a') || lowerName.includes('0,00€'))) {
        return -100;
      }
      
      // Bonus pour vrais produits avec prix spécifique
      if (productName.match(/\d+[,.]?\d*\s*€/) && 
          !productName.includes('0,00€') && 
          !productName.includes('Prix N/A')) {
        score += 60;
      }
      
      // Bonus pour produits alimentaires spécifiques
      const foodKeywords = ['saucisses', 'emmental', 'samon', 'bananes', 'œufs', 'fruits'];
      if (foodKeywords.some(food => lowerName.includes(food))) {
        score += 40;
      }
      
      // Bonus pour noms longs et spécifiques (vrais produits)
      if (productName.length > 15 && 
          !productName.toLowerCase().includes('button') &&
          !productName.toLowerCase().includes('promotion')) {
        score += 30;
      }
    }
    
    // Analyser l'action du panier
    const cartAction = data.productInfo?.cartAction || '';
    if (cartAction) {
      const lowerAction = cartAction.toLowerCase();
      
      const actionBlacklist = [
        'ajouter un produit dans le panier',
        'retirer un produit du panier',
        'déjà ajoutés au panier'
      ];
      
      if (actionBlacklist.some(term => lowerAction.includes(term))) {
        return -100;
      }
      
      // Bonus pour actions avec prix spécifique
      if (lowerAction.match(/\d+.*€/) && lowerAction.length > 5) {
        score += 30;
      }
    }
    
    return score;
  }

  cleanupOldEvents(currentTime) {
    const cutoffTime = currentTime - (this.minIntervalBetweenSameType * 2);
    for (const [key, timestamp] of this.recentEvents.entries()) {
      if (timestamp < cutoffTime) {
        this.recentEvents.delete(key);
      }
    }
  }
}

const eventFilter = new ServerEventFilter();

// API endpoints
app.post('/api/track', (req, res) => {
  const rawEvent = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    ...req.body
  };
  
  // Appliquer le filtrage intelligent côté serveur
  if (eventFilter.shouldProcessEvent(rawEvent)) {
    trackingData.push(rawEvent);
    
    // Mettre à jour le lecteur de dashboard
    dashboardReader.updateDisplayedEvents(trackingData);
    
    // Emit to dashboard in real-time
    io.emit('newTrackingEvent', rawEvent);
    io.emit('dashboardContentUpdate', dashboardReader.getCurrentContent());
    
    console.log(`📊 Événement traité: ${rawEvent.eventType} - ${rawEvent.data?.app || 'Unknown'}`);
  } else {
    console.log(`🗑️ Événement filtré: ${rawEvent.eventType} - ${rawEvent.data?.app || 'Unknown'}`);
  }
  
  res.json({ success: true, eventId: rawEvent.id });
});

app.get('/api/tracking-data', (req, res) => {
  res.json(trackingData);
});

app.post('/api/session', (req, res) => {
  const session = {
    id: Date.now(),
    startTime: new Date().toISOString(),
    ...req.body
  };
  
  sessions.push(session);
  res.json({ success: true, sessionId: session.id });
});

app.get('/api/sessions', (req, res) => {
  res.json(sessions);
});

// Endpoint pour vider les données et créer un nouveau fichier
app.post('/api/clear-data', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  try {
    // Exporter les données actuelles avant de les vider (si il y en a)
    if (trackingData.length > 0 || sessions.length > 0) {
      const exportData = {
        events: trackingData,
        sessions: sessions,
        stats: {
          totalEvents: trackingData.length,
          activeSessions: sessions.length,
          productClicks: trackingData.filter(e => e.eventType === 'VIEW_CLICKED').length,
          conversions: trackingData.filter(e => e.eventType === 'ADD_TO_CART').length
        },
        exportedAt: new Date().toISOString(),
        exportedBy: 'auto-clear'
      };
      
      // Créer le dossier s'il n'existe pas
      const exportDir = path.join(__dirname, 'tracking-data-exports');
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }
      
      // Nom de fichier avec timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `tracking-backup-before-clear-${timestamp}.json`;
      const filepath = path.join(exportDir, filename);
      
      fs.writeFileSync(filepath, JSON.stringify(exportData, null, 2));
      console.log(`📁 Sauvegarde automatique avant vidage: ${filepath}`);
    }
    
    // Vider toutes les données du serveur
    trackingData = [];
    sessions = [];
    
    // Nettoyer le cache du filtre d'événements
    eventFilter.recentEvents.clear();
    
    console.log('🗑️ Toutes les données du serveur ont été vidées');
    
    // Notifier tous les clients connectés que les données ont été vidées
    io.emit('dataCleared');
    
    res.json({ 
      success: true, 
      message: 'Données vidées avec succès. Un nouveau fichier de tracking a été initialisé.'
    });
  } catch (error) {
    console.error('Erreur lors du vidage:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erreur lors du vidage des données' 
    });
  }
});

// Endpoint pour exporter les données vers le dossier du projet
app.post('/api/export-data', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  const exportData = {
    events: trackingData,
    sessions: sessions,
    stats: {
      totalEvents: trackingData.length,
      activeSessions: sessions.length,
      productClicks: trackingData.filter(e => e.eventType === 'VIEW_CLICKED').length,
      conversions: trackingData.filter(e => e.eventType === 'ADD_TO_CART').length
    },
    exportedAt: new Date().toISOString(),
    exportedBy: 'dashboard'
  };
  
  // Créer le dossier s'il n'existe pas
  const exportDir = path.join(__dirname, 'tracking-data-exports');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }
  
  // Nom de fichier avec timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `tracking-export-${timestamp}.json`;
  const filepath = path.join(exportDir, filename);
  
  try {
    fs.writeFileSync(filepath, JSON.stringify(exportData, null, 2));
    console.log(`📁 Données exportées vers: ${filepath}`);
    
    res.json({ 
      success: true, 
      message: `Données exportées vers ${filename}`,
      filepath: filepath,
      filename: filename,
      eventsCount: trackingData.length
    });
  } catch (error) {
    console.error('Erreur lors de l\'export:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erreur lors de l\'export des données' 
    });
  }
});

// Système de lecture en temps réel du dashboard
class DashboardContentReader {
  constructor() {
    this.currentDisplayedEvents = [];
    this.eventHistory = [];
    this.maxHistorySize = 100;
    this.cartAnalysis = {
      products: [],
      replacements: [],
      promotions: [],
      suggestions: [],
      totals: {
        subtotal: 0,
        cagnotte: 0,
        finalTotal: 0
      }
    };
  }

  updateDisplayedEvents(events) {
    this.currentDisplayedEvents = events.slice(-20); // Garder les 20 derniers
    this.eventHistory.push({
      timestamp: new Date().toISOString(),
      eventsCount: events.length,
      displayedEvents: this.currentDisplayedEvents.map(e => ({
        type: e.eventType,
        product: this.extractProductSummary(e),
        time: e.timestamp
      }))
    });

    // Analyser le panier à partir des événements
    this.analyzeCartFromEvents(events);

    // Limiter l'historique
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
    }
  }

  analyzeCartFromEvents(events) {
    // Vérifier d'abord s'il y a un événement de vidage de panier
    const clearCartEvent = events.find(e => 
      e.data?.productInfo?.cartAction === "Vider tout le panier" ||
      e.data?.productInfo?.productName === "Vider tout le panier" ||
      e.data?.productInfo?.cartAction === "Votre panier est vide ..." ||
      e.data?.productInfo?.productName === "Votre panier est vide ..."
    );
    
    // Si on trouve un événement de vidage, ne considérer que les événements après
    let relevantEvents = events;
    if (clearCartEvent) {
      const clearTime = clearCartEvent.timestamp;
      relevantEvents = events.filter(e => e.timestamp > clearTime);
      console.log(`🗑️ Panier vidé détecté à ${new Date(clearTime).toLocaleTimeString()}, analyse des événements suivants uniquement`);
    }

    // Réinitialiser l'analyse
    this.cartAnalysis = {
      products: [],
      replacements: [],
      promotions: [],
      suggestions: [],
      totals: {
        subtotal: 0,
        cagnotte: 0,
        finalTotal: 0
      }
    };

    // Analyser tous les événements panier - inclure aussi les événements avec texte dans element
    const cartEvents = relevantEvents.filter(e => 
      (e.eventType === 'ADD_TO_CART' && e.data?.productInfo?.productName) ||
      (e.data?.element?.text && e.data.element.text.toLowerCase().includes('panier'))
    );

    cartEvents.forEach(event => {
      const productName = event.data?.productInfo?.productName || event.data?.element?.text || '';
      const lowerName = productName.toLowerCase();

      // Chercher le vrai produit dans allTexts si disponible
      let realProductFromTexts = '';
      if (event.data?.productInfo?.allTexts) {
        // Chercher dans allTexts le vrai nom de produit (souvent le premier élément significatif)
        for (const text of event.data.productInfo.allTexts) {
          const cleaned = this.extractRealProductName(text);
          if (cleaned && cleaned.length > 3 && !cleaned.toLowerCase().includes('€')) {
            realProductFromTexts = cleaned;
            break;
          }
        }
      }

      // Utiliser le produit trouvé dans allTexts ou le productName
      const finalProductName = realProductFromTexts || productName;
      const finalLowerName = finalProductName.toLowerCase();

      // Extraire les prix et quantités - chercher dans plusieurs sources
      let priceMatch = finalProductName.match(/(\d+[,.]?\d*)\s*€/);
      
      // Si pas de prix dans productName, chercher dans allTexts
      if (!priceMatch && event.data?.productInfo?.allTexts) {
        const allTextsString = event.data.productInfo.allTexts.join(' ');
        priceMatch = allTextsString.match(/(\d+[,.]?\d*)\s*€/);
      }
      
      // Si pas de prix trouvé, chercher dans price et cartAction
      if (!priceMatch) {
        const priceField = event.data?.productInfo?.price || '';
        const cartAction = event.data?.productInfo?.cartAction || '';
        priceMatch = priceField.match(/(\d+[,.]?\d*)\s*€/) || cartAction.match(/(\d+[,.]?\d*)\s*€/);
      }
      
      const price = priceMatch ? parseFloat(priceMatch[1].replace(',', '.')) : 0;

      // Détecter les produits à remplacer
      if (finalLowerName.includes('produits à remplacer') || finalLowerName.includes('alternatives')) {
        const countMatch = finalProductName.match(/(\d+)\s*produits?\s*à\s*remplacer/i);
        const count = countMatch ? parseInt(countMatch[1]) : 1;
        this.cartAnalysis.replacements.push({
          count: count,
          description: finalProductName,
          timestamp: event.timestamp
        });
      }
      // Détecter les promotions et extraire les vrais produits concernés
      else if (finalLowerName.includes('promotion') || finalLowerName.includes('club') || 
               finalLowerName.includes('cagnottés') || finalLowerName.includes('%')) {
        const cagnotteMatch = productName.match(/(\d+[,.]?\d*)\s*€\s*cagnottés/);
        const cagnotte = cagnotteMatch ? parseFloat(cagnotteMatch[1].replace(',', '.')) : 0;
        
        // Extraire les produits concernés par la promotion
        const concernedProductsMatch = productName.match(/produits concernés:\s*([^.]+)/i);
        if (concernedProductsMatch) {
          const concernedProducts = concernedProductsMatch[1].split(',').map(p => p.trim());
          concernedProducts.forEach(product => {
            if (product && product.length > 3) {
              // Ajouter le produit concerné par la promotion au panier
              this.cartAnalysis.products.push({
                name: product,
                price: 0, // Prix sera mis à jour si on trouve l'événement correspondant
                quantity: 1,
                fullDescription: `${product} (via promotion)`,
                timestamp: event.timestamp,
                fromPromotion: true
              });
            }
          });
        }
        
        this.cartAnalysis.promotions.push({
          name: this.extractRealProductName(productName),
          cagnotte: cagnotte,
          description: productName,
          concernedProducts: concernedProductsMatch ? concernedProductsMatch[1] : '',
          timestamp: event.timestamp
        });
        
        this.cartAnalysis.totals.cagnotte += cagnotte;
      }
      // Détecter les suggestions (produits sponsorisés)
      else if (lowerName.includes('sponsorisé') || lowerName.includes('rien oublié') || 
               lowerName.includes('glace') || lowerName.includes('côte d\'or')) {
        this.cartAnalysis.suggestions.push({
          name: this.extractRealProductName(productName),
          price: price,
          description: productName,
          timestamp: event.timestamp
        });
      }
      // Vrais produits du panier
      else {
        const realName = this.extractRealProductName(finalProductName);
        if (realName && realName.length > 3) {
          // Détecter la quantité
          const qtyMatch = finalProductName.match(/(\d+)\s*(MAX|x)/i) || 
                          finalProductName.match(/la\s*(barquette|bouteille|boite|paquet)\s*de\s*(\d+)/i);
          const quantity = qtyMatch ? parseInt(qtyMatch[1] || qtyMatch[2]) : 1;

          // Vérifier si ce produit n'est pas déjà dans le panier (éviter les doublons)
          const existingProduct = this.cartAnalysis.products.find(p => 
            p.name.toLowerCase() === realName.toLowerCase() && !p.fromPromotion
          );
          
          if (existingProduct) {
            // Mettre à jour la quantité et le prix si nécessaire
            existingProduct.quantity = Math.max(existingProduct.quantity, quantity);
            if (price > 0) existingProduct.price = price;
            existingProduct.timestamp = event.timestamp; // Mettre à jour le timestamp
          } else {
            this.cartAnalysis.products.push({
              name: realName,
              price: price,
              quantity: quantity,
              fullDescription: finalProductName,
              timestamp: event.timestamp
            });
          }

          this.cartAnalysis.totals.subtotal += price;
        }
      }
    });

    // Calculer le total final
    this.cartAnalysis.totals.finalTotal = this.cartAnalysis.totals.subtotal - this.cartAnalysis.totals.cagnotte;
  }

  extractRealProductName(fullText) {
    // Nettoyer le texte pour extraire le vrai nom du produit
    let cleaned = fullText.replace(/🛒\s*Ajout Panier Mobile\s*🛒\s*/gi, '');
    cleaned = cleaned.replace(/Carrefour\s*-\s*/gi, '');
    cleaned = cleaned.replace(/Prix N\/A/gi, '');
    cleaned = cleaned.replace(/\d+[,.]?\d*\s*€.*$/gi, ''); // Enlever prix à la fin
    cleaned = cleaned.replace(/\(\d+[,.]?\d*\s*€.*?\)/gi, ''); // Enlever prix entre parenthèses
    
    // Filtrer les textes génériques qui ne sont pas des vrais produits
    const genericTexts = [
      'ajouter au panier', 'voir tout', 'information', 'accueil', 'rechercher',
      'panier', 'notification', 'vinaigre d\'alcool', 'simpl', 'ouvre la page',
      'quantité:', 'filtrer & trier', 'acheter', 'veuillez rentrer'
    ];
    
    const lowerCleaned = cleaned.toLowerCase();
    if (genericTexts.some(generic => lowerCleaned.includes(generic))) {
      return ''; // Retourner vide pour les textes génériques
    }
    
    cleaned = cleaned.trim();
    return cleaned;
  }

  extractProductSummary(event) {
    const productName = event.data?.productInfo?.productName || event.data?.element?.text || '';
    if (productName.includes('🛒')) {
      return eventFilter.extractRealProductName(productName) || 'Produit générique';
    }
    return productName.substring(0, 50);
  }

  getCurrentContent() {
    return {
      displayedEvents: this.currentDisplayedEvents,
      cartAnalysis: this.cartAnalysis,
      summary: {
        totalEvents: this.currentDisplayedEvents.length,
        cartEvents: this.currentDisplayedEvents.filter(e => 
          (e.data?.productInfo?.productName || '').includes('🛒')).length,
        clickEvents: this.currentDisplayedEvents.filter(e => 
          e.eventType === 'VIEW_CLICKED').length,
        lastUpdate: new Date().toISOString()
      }
    };
  }
}

const dashboardReader = new DashboardContentReader();

// Endpoint pour lire le contenu actuel du dashboard
app.get('/api/dashboard-content', (req, res) => {
  const content = dashboardReader.getCurrentContent();
  res.json(content);
});

// Endpoint pour obtenir l'historique des événements affichés
app.get('/api/dashboard-history', (req, res) => {
  res.json({
    history: dashboardReader.eventHistory,
    currentContent: dashboardReader.getCurrentContent()
  });
});

// Endpoint pour obtenir les événements filtrés par catégorie
app.get('/api/filtered-events', (req, res) => {
  const { category } = req.query;
  
  if (category && filteredEvents[category]) {
    res.json({
      category: category,
      events: filteredEvents[category],
      count: filteredEvents[category].length
    });
  } else {
    res.json({
      all: filteredEvents,
      stats: {
        system: filteredEvents.system.length,
        promotion: filteredEvents.promotion.length,
        generic: filteredEvents.generic.length,
        total: filteredEvents.system.length + filteredEvents.promotion.length + filteredEvents.generic.length
      }
    });
  }
});

// Endpoint pour obtenir l'analyse du panier utilisateur
app.get('/api/cart-analysis', (req, res) => {
  const cartData = dashboardReader.getCurrentContent().cartAnalysis;
  res.json({
    success: true,
    cartAnalysis: cartData,
    timestamp: new Date().toISOString()
  });
});

// Socket.io for real-time updates
io.on('connection', (socket) => {
  console.log('Client connected to dashboard');
  
  // Envoyer le contenu actuel au nouveau client
  socket.emit('dashboardContent', dashboardReader.getCurrentContent());
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

server.listen(PORT, () => {
  console.log(`Web tracking system running on http://localhost:${PORT}`);
  console.log(`Dashboard available at http://localhost:${PORT}/dashboard`);
});
