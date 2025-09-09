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
    this.minIntervalBetweenSameType = 5000; // 5 secondes minimum
  }

  shouldProcessEvent(event) {
    const currentTime = Date.now();
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
      
      // Blacklist étendue
      const blacklist = [
        'logo', 'version', 'panier', 'supprimer', 'retirer',
        'bouton', 'valider', 'afficher', 'facilitez', 'faites des économies',
        'découvrez nos meilleurs', 'produit à remplacer', 'new notifications',
        'ajouter un produit', 'retirer un produit', 'déjà ajoutés au panier',
        'alternatives pour remplacer', 'produits indisponibles', 'centimes'
      ];
      
      if (blacklist.some(term => lowerName.includes(term))) {
        return -100; // Éliminer complètement
      }
      
      // Bonus pour vrais produits
      if (productName.match(/\d+[,.]?\d*\s*€/) || // Prix
          productName.includes('le sachet') ||
          productName.includes('la boite') ||
          productName.includes('le paquet')) {
        score += 50;
      }
      
      // Bonus pour noms longs et spécifiques
      if (productName.length > 10 && !productName.toLowerCase().includes('button')) {
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
    
    // Emit to dashboard in real-time
    io.emit('newTrackingEvent', rawEvent);
    
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

// Socket.io for real-time updates
io.on('connection', (socket) => {
  console.log('Client connected to dashboard');
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

server.listen(PORT, () => {
  console.log(`Web tracking system running on http://localhost:${PORT}`);
  console.log(`Dashboard available at http://localhost:${PORT}/dashboard`);
});
