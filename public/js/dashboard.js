// Dashboard JavaScript for real-time tracking visualization
class TrackingDashboard {
    constructor() {
        this.socket = io();
        this.events = [];
        this.sessions = [];
        this.currentFilter = 'all';
        this.stats = {
            totalEvents: 0,
            activeSessions: 0,
            productClicks: 0,
            conversions: 0
        };
        
        this.init();
    }

    init() {
        this.setupSocketListeners();
        this.setupEventFilters();
        this.loadInitialData();
        this.updateConnectionStatus(true);
    }

    setupSocketListeners() {
        this.socket.on('connect', () => {
            console.log('Connected to tracking server');
            this.updateConnectionStatus(true);
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from tracking server');
            this.updateConnectionStatus(false);
        });

        this.socket.on('newTrackingEvent', (event) => {
            this.addEvent(event);
            this.updateStats();
            this.updateLastUpdate();
        });
    }

    setupEventFilters() {
        const filterButtons = document.querySelectorAll('.filter-btn');
        
        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                filterButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentFilter = btn.dataset.filter;
                this.renderEvents();
            });
        });
    }

    async loadInitialData() {
        try {
            // Load existing events
            const eventsResponse = await fetch('/api/tracking-data');
            const events = await eventsResponse.json();
            this.events = events;

            // Load existing sessions
            const sessionsResponse = await fetch('/api/sessions');
            const sessions = await sessionsResponse.json();
            this.sessions = sessions;

            this.renderEvents();
            this.renderSessions();
            this.renderProducts();
            this.updateStats();
            this.updateLastUpdate();
        } catch (error) {
            console.error('Failed to load initial data:', error);
        }
    }

    addEvent(event) {
        this.events.unshift(event); // Add to beginning for newest first
        
        // Keep only last 100 events for performance
        if (this.events.length > 100) {
            this.events = this.events.slice(0, 100);
        }
        
        this.renderEvents();
        this.renderProducts();
    }

    renderEvents() {
        const eventsPanel = document.getElementById('eventsPanel');
        const filteredEvents = this.getFilteredEvents();
        
        if (filteredEvents.length === 0) {
            eventsPanel.innerHTML = `
                <p style="color: #666; text-align: center; padding: 2rem;">
                    ${this.currentFilter === 'all' ? 'En attente d\'événements...' : 'Aucun événement de ce type'}
                </p>
            `;
            return;
        }

        eventsPanel.innerHTML = filteredEvents.map(event => `
            <div class="event-item">
                <div class="event-type">${this.getEventTypeLabel(event.eventType)}</div>
                <div class="event-data">${this.formatEventData(event)}</div>
                <div class="event-timestamp">${this.formatTimestamp(event.timestamp)}</div>
            </div>
        `).join('');
    }

    renderSessions() {
        const sessionsPanel = document.getElementById('sessionsPanel');
        
        if (this.sessions.length === 0) {
            sessionsPanel.innerHTML = `
                <p style="color: #666; text-align: center; padding: 2rem;">
                    Aucune session active
                </p>
            `;
            return;
        }

        sessionsPanel.innerHTML = this.sessions.map(session => `
            <div class="session-item">
                <div class="session-id">Session: ${session.sessionId}</div>
                <div style="margin-top: 0.5rem; font-size: 0.9rem; color: #666;">
                    Démarré: ${this.formatTimestamp(session.startTime)}<br>
                    URL: ${session.url}<br>
                    User Agent: ${session.userAgent ? session.userAgent.substring(0, 50) + '...' : 'N/A'}
                </div>
            </div>
        `).join('');
    }

    renderProducts() {
        const productsPanel = document.getElementById('productsPanel');
        const productEvents = this.events.filter(event => 
            (event.eventType === 'ADD_TO_CART' || event.eventType === 'add_to_cart') &&
            event.data && event.data.productInfo
        );
        
        if (productEvents.length === 0) {
            productsPanel.innerHTML = `
                <p style="color: #666; text-align: center; padding: 2rem;">
                    Aucun produit détecté
                </p>
            `;
            return;
        }

        productsPanel.innerHTML = productEvents.map(event => {
            const productInfo = event.data.productInfo || {};
            const productName = productInfo.productName || 'Produit inconnu';
            const price = productInfo.price || 'Prix N/A';
            const cartAction = productInfo.cartAction || '';
            const app = event.data.app || 'App inconnue';
            const allTexts = productInfo.allTexts || [];
            
            return `
                <div class="event-item" style="border-left-color: #28a745;">
                    <div class="event-type">🛒 ${app}</div>
                    <div class="event-data">
                        <strong style="color: #28a745; font-size: 1.1em;">${productName}</strong><br>
                        <span style="color: #667eea; font-weight: bold;">${price}</span>
                        ${cartAction ? `<span style="color: #666;"> - ${cartAction}</span>` : ''}
                        ${allTexts.length > 0 ? `<br><small style="color: #999;">Textes détectés: ${allTexts.slice(0, 3).join(', ')}${allTexts.length > 3 ? '...' : ''}</small>` : ''}
                    </div>
                    <div class="event-timestamp">${this.formatTimestamp(event.timestamp)}</div>
                </div>
            `;
        }).join('');
    }

    getFilteredEvents() {
        if (this.currentFilter === 'all') {
            return this.events;
        }
        
        // Gestion des filtres groupés pour les événements similaires
        const filterMappings = {
            'product_click': ['product_click', 'VIEW_CLICKED'],
            'VIEW_CLICKED': ['VIEW_CLICKED'],
            'search': ['search', 'SEARCH'],
            'SEARCH': ['SEARCH'],
            'add_to_cart': ['add_to_cart', 'ADD_TO_CART'],
            'ADD_TO_CART': ['ADD_TO_CART'],
            'navigation': ['navigation'],
            'CONTENT_CHANGED': ['CONTENT_CHANGED'],
            'scroll': ['scroll', 'SCROLL'],
            'SCROLL': ['SCROLL']
        };
        
        const allowedTypes = filterMappings[this.currentFilter] || [this.currentFilter];
        return this.events.filter(event => allowedTypes.includes(event.eventType));
    }

    getEventTypeLabel(eventType) {
        const labels = {
            'navigation': '🧭 Navigation',
            'product_click': '🛍️ Clic Produit',
            'search': '🔍 Recherche',
            'filter_click': '🏷️ Filtre',
            'add_to_cart': '🛒 Ajout Panier',
            'scroll': '📜 Défilement',
            'visibility_change': '👁️ Visibilité',
            'mouse_move': '🖱️ Souris',
            // Nouveaux types Android
            'SESSION_START': '🚀 Session Démarrée',
            'VIEW_CLICKED': '👆 Clic Mobile',
            'CONTENT_CHANGED': '🔄 Contenu Modifié',
            'SCROLL': '📱 Défilement Mobile',
            'ADD_TO_CART': '🛒 Ajout Panier Mobile',
            'SEARCH': '🔍 Recherche Mobile'
        };
        return labels[eventType] || `📊 ${eventType}`;
    }

    formatEventData(event) {
        const data = event.data || {};
        
        switch (event.eventType) {
            case 'navigation':
                return `Section: ${data.section || 'N/A'}`;
            
            case 'product_click':
                return `Produit: ${data.title || 'N/A'} - Prix: ${data.price || 'N/A'}`;
            
            case 'search':
                return `Requête: "${data.query || 'N/A'}" (${data.length || 0} caractères)`;
            
            case 'filter_click':
                return `Filtre: ${data.filter || 'N/A'}`;
            
            case 'add_to_cart':
                return `🎉 Conversion! Produit: ${data.title || 'N/A'} - ${data.price || 'N/A'}`;
            
            case 'scroll':
                return `Position: ${data.scrollY || 0}px (${data.scrollPercent || 0}%)`;
            
            case 'visibility_change':
                return `Page ${data.hidden ? 'cachée' : 'visible'}`;
            
            case 'mouse_move':
                return `Position: (${data.x || 0}, ${data.y || 0})`;
            
            // Nouveaux événements Android
            case 'SESSION_START':
                const deviceInfo = data.deviceInfo || {};
                return `📱 ${data.app || 'App'} - ${deviceInfo.manufacturer || 'N/A'} ${deviceInfo.model || 'N/A'}`;
            
            case 'VIEW_CLICKED':
                return `👆 ${data.app || 'App'} - Élément: ${data.element?.text || data.element?.contentDescription || 'N/A'}`;
            
            case 'CONTENT_CHANGED':
                return `🔄 ${data.app || 'App'} - Contenu modifié`;
            
            case 'SCROLL':
                return `📱 ${data.app || 'App'} - Défilement (${data.scrollX || 0}, ${data.scrollY || 0})`;
            
            case 'ADD_TO_CART':
                const productInfo = data.productInfo || {};
                const productName = productInfo.productName || 'Produit inconnu';
                const price = productInfo.price || 'Prix N/A';
                const cartAction = productInfo.cartAction || '';
                return `🛒 ${data.app || 'App'} - <strong>${productName}</strong> - ${price} ${cartAction ? `(${cartAction})` : ''}`;
            
            case 'SEARCH':
                return `🔍 ${data.app || 'App'} - Recherche (${data.searchLength || 0} caractères)`;
            
            default:
                return JSON.stringify(data).substring(0, 100);
        }
    }

    formatTimestamp(timestamp) {
        return new Date(timestamp).toLocaleString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    updateStats() {
        this.stats.totalEvents = this.events.length;
        this.stats.activeSessions = this.sessions.length;
        // Compter les clics produits (web et mobile)
        this.stats.productClicks = this.events.filter(e => 
            e.eventType === 'product_click' || e.eventType === 'VIEW_CLICKED'
        ).length;
        // Compter les conversions (web et mobile)
        this.stats.conversions = this.events.filter(e => 
            e.eventType === 'add_to_cart' || e.eventType === 'ADD_TO_CART'
        ).length;

        document.getElementById('totalEvents').textContent = this.stats.totalEvents;
        document.getElementById('activeSessions').textContent = this.stats.activeSessions;
        document.getElementById('productClicks').textContent = this.stats.productClicks;
        document.getElementById('conversions').textContent = this.stats.conversions;
    }

    updateConnectionStatus(connected) {
        const statusElement = document.getElementById('connectionStatus');
        if (connected) {
            statusElement.textContent = '🟢 Connecté';
            statusElement.className = 'status-indicator status-connected';
        } else {
            statusElement.textContent = '🔴 Déconnecté';
            statusElement.className = 'status-indicator status-disconnected';
        }
    }

    updateLastUpdate() {
        document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString('fr-FR');
    }
}

// Global functions for dashboard controls
function refreshData() {
    window.dashboard.loadInitialData();
}

async function clearData() {
    if (confirm('Êtes-vous sûr de vouloir effacer toutes les données de tracking ?')) {
        try {
            // Vider toutes les données du dashboard
            window.dashboard.events = [];
            window.dashboard.sessions = [];
            
            // Réinitialiser les stats
            window.dashboard.stats = {
                totalEvents: 0,
                activeSessions: 0,
                productClicks: 0,
                conversions: 0
            };
            
            // Nettoyer tous les panneaux
            window.dashboard.renderEvents();
            window.dashboard.renderSessions();
            window.dashboard.renderProducts();
            window.dashboard.updateStats();
            
            // Vider complètement le contenu des panneaux
            document.getElementById('eventsPanel').innerHTML = `
                <p style="color: #666; text-align: center; padding: 2rem;">
                    En attente d'événements...
                </p>
            `;
            
            document.getElementById('sessionsPanel').innerHTML = `
                <p style="color: #666; text-align: center; padding: 2rem;">
                    Aucune session active
                </p>
            `;
            
            document.getElementById('productsPanel').innerHTML = `
                <p style="color: #666; text-align: center; padding: 2rem;">
                    Aucun produit détecté
                </p>
            `;
            
            // Réinitialiser les compteurs à zéro
            document.getElementById('totalEvents').textContent = '0';
            document.getElementById('activeSessions').textContent = '0';
            document.getElementById('productClicks').textContent = '0';
            document.getElementById('conversions').textContent = '0';
            
            // Mettre à jour l'heure de dernière mise à jour
            window.dashboard.updateLastUpdate();
            
            alert('✅ Toutes les données du dashboard ont été effacées !');
        } catch (error) {
            console.error('Failed to clear data:', error);
            alert('Erreur lors de l\'effacement des données');
        }
    }
}

async function exportData() {
    try {
        const response = await fetch('/api/export-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert(`✅ ${result.message}\n📁 Fichier sauvegardé dans le projet : tracking-data-exports/${result.filename}\n📊 ${result.eventsCount} événements exportés`);
            console.log('📁 Export réussi:', result.filepath);
        } else {
            alert('❌ Erreur lors de l\'export: ' + result.error);
        }
    } catch (error) {
        console.error('Erreur lors de l\'export:', error);
        alert('❌ Erreur lors de l\'export des données');
    }
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new TrackingDashboard();
    
    console.log('📊 Dashboard initialized');
    console.log('🔄 Real-time updates enabled');
});
