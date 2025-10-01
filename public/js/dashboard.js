// Dashboard JavaScript for real-time tracking visualization
class TrackingDashboard {
    constructor() {
        this.socket = io();
        this.events = [];
        this.sessions = [];
        this.currentFilter = 'all';
        this.productSearchAll = '';
        this.productSearchFiltered = '';
        this.stats = {
            totalEvents: 0,
            activeSessions: 0,
            productClicks: 0,
            conversions: 0,
            filteredSystem: 0,
            filteredPromotion: 0,
            filteredGeneric: 0
        };
        this.filteredEvents = {
            system: [],
            promotion: [],
            generic: []
        };
        
        this.init();
    }

    init() {
        this.setupSocketListeners();
        this.setupEventFilters();
        this.setupProductSearch();
        this.loadInitialData();
        this.loadCartAnalysis();
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
            this.loadCartAnalysis(); // Recharger l'analyse du panier
        });

        this.socket.on('dataCleared', () => {
            console.log('Server data cleared - refreshing dashboard');
            this.events = [];
            this.sessions = [];
            this.stats = {
                totalEvents: 0,
                activeSessions: 0,
                productClicks: 0,
                conversions: 0
            };
            this.renderEvents();
            this.renderSessions();
            // this.renderProducts(); // Désactivé - pas de productsPanel
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

    setupProductSearch() {
        const searchInputAll = document.getElementById('productSearchAll');
        const searchInputFiltered = document.getElementById('productSearchFiltered');
        
        if (searchInputAll) {
            searchInputAll.addEventListener('input', (e) => {
                this.productSearchAll = e.target.value.toLowerCase();
                this.renderEvents();
            });
        }
        
        if (searchInputFiltered) {
            searchInputFiltered.addEventListener('input', (e) => {
                this.productSearchFiltered = e.target.value.toLowerCase();
                this.renderEvents();
            });
        }
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

            // Load filtered events
            const filteredResponse = await fetch('/api/filtered-events');
            const filteredData = await filteredResponse.json();
            this.filteredEvents = filteredData.all || { system: [], promotion: [], generic: [] };
            
            this.renderEvents();
            this.renderSessions();
            // this.renderProducts(); // Désactivé - pas de productsPanel dans le nouveau dashboard
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
        // this.renderProducts(); // Désactivé - pas de productsPanel
    }

    renderEvents() {
        this.renderAllEvents();
        this.renderFilteredEvents();
    }

    renderAllEvents() {
        const allEventsPanel = document.getElementById('allEventsPanel');
        if (!allEventsPanel) return;

        let filteredEvents = this.events;
        
        // Apply basic filters for all events panel
        if (this.currentFilter !== 'all') {
            filteredEvents = this.events.filter(event => {
                switch (this.currentFilter) {
                    case 'VIEW_CLICKED':
                        return event.eventType === 'VIEW_CLICKED';
                    case 'ADD_TO_CART':
                        return event.eventType === 'ADD_TO_CART';
                    case 'SCROLL':
                        return event.eventType === 'SCROLL';
                    case 'CONTENT_CHANGED':
                        return event.eventType === 'CONTENT_CHANGED';
                    default:
                        return true;
                }
            });
        }

        // Apply product search filter
        if (this.productSearchAll) {
            filteredEvents = filteredEvents.filter(event => {
                const productName = event.data?.productInfo?.productName || '';
                const cartAction = event.data?.productInfo?.cartAction || '';
                const searchText = (productName + ' ' + cartAction).toLowerCase();
                return searchText.includes(this.productSearchAll);
            });
        }

        if (filteredEvents.length === 0) {
            allEventsPanel.innerHTML = '<p style="color: #666; text-align: center; padding: 2rem;">Aucun événement trouvé</p>';
            return;
        }

        // Sort by timestamp (newest first)
        filteredEvents.sort((a, b) => b.timestamp - a.timestamp);

        allEventsPanel.innerHTML = filteredEvents.slice(0, 50).map(event => {
            const timestamp = new Date(event.timestamp).toLocaleTimeString('fr-FR');
            const eventIcon = this.getEventIcon(event.eventType);
            const eventColor = this.getEventColor(event.eventType);
            
            return `
                <div class="event-item" style="border-left-color: ${eventColor};">
                    <div class="event-type">${eventIcon} ${event.eventType}</div>
                    <div class="event-data">${this.formatEventData(event)}</div>
                    <div class="event-timestamp">${timestamp}</div>
                </div>
            `;
        }).join('');
    }

    renderFilteredEvents() {
        const filteredEventsPanel = document.getElementById('filteredEventsPanel');
        if (!filteredEventsPanel) return;

        // Filter only relevant events (real cart additions, product clicks, etc.)
        let relevantEvents = this.events.filter(event => {
            // Only show Carrefour events with real data
            if (event.data && event.data.packageName === 'com.carrefour.fid.android') {
                if (event.eventType === 'ADD_TO_CART') {
                    const cartAction = event.data.productInfo?.cartAction || '';
                    const productName = event.data.productInfo?.productName || '';
                    const allTexts = event.data.productInfo?.allTexts || [];
                    
                    // ❌ Ignorer les événements de RÉSULTAT (mises à jour UI)
                    const resultPatterns = [
                        'produits déjà ajoutés',  // Compteur
                        'retirer un produit',      // Bouton -
                        'valider mon panier',      // Bouton validation
                        'euros et',                // Prix seul
                        'centimes'                 // Prix seul
                    ];
                    
                    const isResult = resultPatterns.some(pattern => 
                        productName.toLowerCase().includes(pattern) ||
                        cartAction.toLowerCase().includes(pattern)
                    );
                    
                    if (isResult) {
                        return false; // Ignorer les résultats
                    }
                    
                    // ✅ Ne garder QUE les vraies ACTIONS d'ajout
                    const isAddAction = cartAction.toLowerCase().includes('ajouter un produit dans le panier');
                    
                    // ✅ Vérifier qu'il y a un vrai nom de produit dans allTexts
                    const hasRealProduct = allTexts.some(text => {
                        const t = text.toLowerCase();
                        // Un vrai produit = pas un prix, pas un bouton, pas un compteur
                        return t.length > 3 && 
                               !t.match(/^\d+[,.]?\d*\s*€?$/) &&  // Pas juste un prix
                               !t.includes('ajouter') && 
                               !t.includes('retirer') &&
                               !t.includes('euros') &&
                               !t.includes('centimes') &&
                               !t.match(/^\d+$/);  // Pas juste un chiffre
                    });
                    
                    return isAddAction && hasRealProduct;
                }
                
                if (event.eventType === 'VIEW_CLICKED') {
                    // Only clicks on product elements
                    const element = event.data.element;
                    const clickTarget = element?.clickTarget || '';
                    const isProductClick = clickTarget && !['accueil', 'rechercher', 'menu', 'navigation'].some(term => 
                        clickTarget.toLowerCase().includes(term)
                    );
                    return isProductClick;
                }
                
                if (event.eventType === 'SCROLL') {
                    // Only scrolls in product contexts
                    const scrollInfo = event.data.scrollInfo;
                    return scrollInfo && scrollInfo.context && scrollInfo.context.includes('product');
                }
            }
            
            return false;
        });

        // Apply product search filter
        if (this.productSearchFiltered) {
            relevantEvents = relevantEvents.filter(event => {
                const productName = event.data?.productInfo?.productName || '';
                const cartAction = event.data?.productInfo?.cartAction || '';
                const searchText = (productName + ' ' + cartAction).toLowerCase();
                return searchText.includes(this.productSearchFiltered);
            });
        }

        if (relevantEvents.length === 0) {
            filteredEventsPanel.innerHTML = '<p style="color: #666; text-align: center; padding: 2rem;">Aucun événement pertinent détecté</p>';
            return;
        }

        // Sort by timestamp (newest first)
        relevantEvents.sort((a, b) => b.timestamp - a.timestamp);

        filteredEventsPanel.innerHTML = relevantEvents.slice(0, 30).map(event => {
            const timestamp = new Date(event.timestamp).toLocaleTimeString('fr-FR');
            const eventIcon = this.getEventIcon(event.eventType);
            const eventColor = this.getEventColor(event.eventType);
            
            return `
                <div class="event-item" style="border-left-color: ${eventColor}; background: #f0fff0;">
                    <div class="event-type">${eventIcon} ${event.eventType} ⭐</div>
                    <div class="event-data">${this.formatEventData(event)}</div>
                    <div class="event-timestamp">${timestamp}</div>
                </div>
            `;
        }).join('');
    }

    getEventIcon(eventType) {
        const icons = {
            'VIEW_CLICKED': '👆',
            'ADD_TO_CART': '🛒',
            'SCROLL': '📜',
            'CONTENT_CHANGED': '🔄',
            'SESSION_START': '🚀',
            'product_click': '🖱️',
            'add_to_cart': '🛒',
            'navigation': '🧭',
            'search': '🔍'
        };
        return icons[eventType] || '📌';
    }

    getEventColor(eventType) {
        const colors = {
            'VIEW_CLICKED': '#3498db',
            'ADD_TO_CART': '#27ae60',
            'SCROLL': '#9b59b6',
            'CONTENT_CHANGED': '#f39c12',
            'SESSION_START': '#e74c3c',
            'product_click': '#3498db',
            'add_to_cart': '#27ae60'
        };
        return colors[eventType] || '#667eea';
    }

    getAppDisplayName(appIdentifier) {
        const appNames = {
            'com.carrefour.fid.android': 'Carrefour',
            'com.leclerc.drive': 'E.Leclerc',
            'com.auchan.drive': 'Auchan',
            'com.android.systemui': 'Système Android',
            'Carrefour': 'Carrefour',
            'E.Leclerc': 'E.Leclerc'
        };
        return appNames[appIdentifier] || appIdentifier;
    }

    formatEventData(event) {
        const productInfo = event.data?.productInfo || {};
        const element = event.data?.element || {};
        const productName = productInfo.productName || element.text || 'N/A';
        const price = productInfo.price || 'N/A';
        const app = this.getAppDisplayName(event.data?.app || event.data?.packageName || 'Unknown');
        
        return `
            <strong>App:</strong> ${app}<br>
            <strong>Produit:</strong> ${productName}<br>
            <strong>Prix:</strong> ${price}
        `;
    }

    formatTimestamp(timestamp) {
        if (!timestamp) return 'N/A';
        const date = new Date(timestamp);
        return date.toLocaleString('fr-FR');
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
            const eventType = event.eventType || 'UNKNOWN';
            const app = this.getAppDisplayName(event.data?.app || event.data?.packageName || 'Unknown');
            const productInfo = event.data?.productInfo || {};
            const element = event.data?.element || {};
            const scrollInfo = event.data?.scrollInfo || {};
            const productName = productInfo.productName || element.text || 'Élément inconnu';
            const allTexts = productInfo.allTexts || [];
            
            if (eventType === 'SCROLL') {
                const direction = scrollInfo.direction || 'unknown';
                const context = scrollInfo.context || 'general';
                const distance = scrollInfo.distance || 0;
                const scrollDeltaX = scrollInfo.scrollDeltaX || 0;
                const scrollDeltaY = scrollInfo.scrollDeltaY || 0;
                
                const directionIcon = {
                    'up': '⬆️',
                    'down': '⬇️', 
                    'left': '⬅️',
                    'right': '➡️',
                    'unknown': '📜'
                }[direction] || '📜';
                
                const contextDisplay = {
                    'products': 'Produits',
                    'categories': 'Catégories', 
                    'cart': 'Panier',
                    'search': 'Recherche',
                    'home': 'Accueil',
                    'list': 'Liste',
                    'general': 'Navigation'
                }[context] || 'Navigation';
                
                return `
                    <div class="event-item" style="border-left-color: #6f42c1;">
                        <div class="event-type">${directionIcon} Scroll ${app}</div>
                        <div class="event-data">
                            <strong style="color: #6f42c1; font-size: 1.1em;">Direction: ${direction.toUpperCase()}</strong>
                            <br><span style="color: #6c757d;">Distance: ${distance}px (Δx:${scrollDeltaX}, Δy:${scrollDeltaY})</span>
                            <br><span style="color: #6c757d;">Section: ${contextDisplay}</span>
                        </div>
                        <div class="event-timestamp">${this.formatTimestamp(event.timestamp)}</div>
                    </div>
                `;
            } else if (eventType === 'VIEW_CLICKED') {
                // Messages parasites à filtrer
                const parasiteMessages = [
                    'veuillez rentrer une ville',
                    'facilitez vos courses',
                    'faites des économies',
                    'logo',
                    'version',
                    'new notifications'
                ];
                
                const lowerName = productName.toLowerCase();
                const isParasite = parasiteMessages.some(msg => lowerName.includes(msg));
                
                if (isParasite || !productName.trim()) {
                    return ''; // Ne pas afficher
                }
                
                return `
                    <div class="event-item" style="border-left-color: #17a2b8;">
                        <div class="event-type">👆 Click ${app}</div>
                        <div class="event-data">
                            <strong style="color: #17a2b8; font-size: 1.1em;">${productName}</strong>
                        </div>
                        <div class="event-timestamp">${this.formatTimestamp(event.timestamp)}</div>
                    </div>
                `;
            } else {
                // Filtrer les faux ajouts au panier qui sont en réalité de la navigation
                const navigationCategories = [
                    'viandes et poissons', 'boucherie', 'poissonnerie', 'volaille et rôtisserie',
                    'traiteur de la mer', 'sauces d\'accompagnement', 'c\'est la saison',
                    'barbecue', 'voir tout', 'fruits et légumes', 'bio', 'promotions',
                    'surgelés', 'crémerie et produits laitiers', 'charcuterie et traiteur',
                    'bébé', 'mon marché frais', 'foire aux vins', 'coupons',
                    'glaces et sorbets', 'apéritifs', 'entrées et snacking', 'frites et pommes de terre',
                    'poissons et fruits de mer', 'pains', 'pâtisseries et viennoiseries',
                    'mon boucher', 'saucisses et merguez', 'colis du boucher', 'boeuf', 'viandes hachées'
                ];
                
                const lowerName = productName.toLowerCase();
                const isNavigationCategory = navigationCategories.some(cat => lowerName.includes(cat));
                
                if (isNavigationCategory) {
                    return `
                        <div class="event-item" style="border-left-color: #17a2b8;">
                            <div class="event-type">📂 Catégorie ${app}</div>
                            <div class="event-data">
                                <strong style="color: #17a2b8; font-size: 1.1em;">${productName}</strong>
                            </div>
                            <div class="event-timestamp">${this.formatTimestamp(event.timestamp)}</div>
                        </div>
                    `;
                }
                
                // Vrai ajout au panier - chercher le prix réel
                const price = productInfo.price || '';
                const cartAction = productInfo.cartAction || '';
                const allContent = [productName, ...allTexts, price, cartAction].join(' ');
                const priceMatch = allContent.match(/(\d+[,.]?\d*)\s*€/);
                const realPrice = priceMatch ? `${priceMatch[1]}€` : '';
                
                // Ne montrer que s'il y a un vrai prix
                if (!realPrice) {
                    return ''; // Ne pas afficher les ajouts sans prix
                }
                
                return `
                    <div class="event-item" style="border-left-color: #28a745;">
                        <div class="event-type">🛒 Ajout Panier ${app}</div>
                        <div class="event-data">
                            <strong style="color: #28a745; font-size: 1.1em;">${productName}</strong>
                            <br><span style="color: #667eea; font-weight: bold;">Prix: ${realPrice}</span>
                        </div>
                        <div class="event-timestamp">${this.formatTimestamp(event.timestamp)}</div>
                    </div>
                `;
            }
        }).join('');
    }

    getFilteredEvents() {
        if (this.currentFilter === 'all') {
            return this.events;
        }
        
        // Gestion des événements filtrés
        if (this.currentFilter.startsWith('filtered-')) {
            const category = this.currentFilter.replace('filtered-', '');
            return this.filteredEvents[category] || [];
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
        
        // Affichage spécial pour les événements filtrés
        if (event.filterCategory) {
            const productName = data.productInfo?.productName || data.element?.text || '';
            const categoryEmoji = {
                'system': '🤖',
                'promotion': '🎯', 
                'generic': '📦'
            };
            return `${categoryEmoji[event.filterCategory] || '🚫'} <span style="color: #dc3545;">[FILTRÉ]</span> ${productName.substring(0, 80)}${productName.length > 80 ? '...' : ''}`;
        }
        
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
                const elementText = data.element?.text || data.element?.contentDescription || data.productInfo?.productName || '';
                
                // Filtrer les messages parasites
                const parasiteMessages = [
                    'veuillez rentrer une ville', 'veuillez entrer', 'code postal',
                    'new notifications', 'notification', 'ouvre la page précédente',
                    'scanner de code', 'predicted app'
                ];
                
                const lowerText = elementText.toLowerCase();
                const isParasite = parasiteMessages.some(msg => lowerText.includes(msg));
                
                if (isParasite || !elementText.trim()) {
                    return null; // Ne pas afficher
                }
                
                return `📂 Navigation ${data.app || 'App'} - ${elementText}`;
            
            case 'CONTENT_CHANGED':
                return `🔄 ${data.app || 'App'} - Contenu modifié`;
            
            case 'SCROLL':
                return `📱 ${data.app || 'App'} - Défilement (${data.scrollX || 0}, ${data.scrollY || 0})`;
            
            case 'ADD_TO_CART':
                const productInfo = data.productInfo || {};
                const productName = productInfo.productName || 'Produit inconnu';
                const allTexts = productInfo.allTexts || [];
                const priceField = productInfo.price || '';
                const cartAction = productInfo.cartAction || '';
                
                // Chercher prix réel dans tous les champs
                const allContent = [productName, ...allTexts, priceField, cartAction].join(' ');
                const priceMatch = allContent.match(/(\d+[,.]?\d*)\s*€/);
                const realPrice = priceMatch ? `${priceMatch[1]}€` : '';
                
                return `🛒 ${data.app || 'App'} - ${productName}${realPrice ? ` - Prix: ${realPrice}` : ''}`;
            
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
        
        // Compter les événements filtrés
        this.stats.filteredSystem = this.filteredEvents.system.length;
        this.stats.filteredPromotion = this.filteredEvents.promotion.length;
        this.stats.filteredGeneric = this.filteredEvents.generic.length;

        document.getElementById('totalEvents').textContent = this.stats.totalEvents;
        document.getElementById('activeSessions').textContent = this.stats.activeSessions;
        document.getElementById('productClicks').textContent = this.stats.productClicks;
        document.getElementById('conversions').textContent = this.stats.conversions;
        document.getElementById('filteredSystem').textContent = this.stats.filteredSystem;
        document.getElementById('filteredPromotion').textContent = this.stats.filteredPromotion;
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

    async loadCartAnalysis() {
        try {
            const response = await fetch('/api/cart-analysis');
            const data = await response.json();
            
            if (data.success) {
                this.renderCartAnalysis(data.cartAnalysis);
            }
        } catch (error) {
            console.error('Failed to load cart analysis:', error);
        }
    }

    renderCartAnalysis(cartData) {
        // Render products (filtrer les produits à 0€ qui sont du bruit)
        const productsContainer = document.getElementById('cartProducts');
        const validProducts = cartData.products.filter(p => p.price > 0 && p.name.trim() !== '');
        if (validProducts.length === 0) {
            productsContainer.innerHTML = '<p style="color: #666; text-align: center; padding: 1rem;">Aucun produit détecté</p>';
        } else {
            productsContainer.innerHTML = validProducts.map(product => `
                <div class="product-item">
                    <div class="product-name">${product.name}</div>
                    <div class="product-details">
                        Quantité: ${product.quantity} | 
                        <span class="product-price">${product.price.toFixed(2)}€</span>
                    </div>
                </div>
            `).join('');
        }

        // Render replacements
        const replacementsContainer = document.getElementById('cartReplacements');
        if (cartData.replacements.length === 0) {
            replacementsContainer.innerHTML = '<p style="color: #666; text-align: center; padding: 1rem;">Aucun produit à remplacer</p>';
        } else {
            replacementsContainer.innerHTML = cartData.replacements.map(replacement => `
                <div class="product-item replacement-item">
                    <div class="product-name">🔄 ${replacement.count} produit(s) à remplacer</div>
                    <div class="product-details">${replacement.description.substring(0, 100)}...</div>
                </div>
            `).join('');
        }

        // Render promotions
        const promotionsContainer = document.getElementById('cartPromotions');
        if (cartData.promotions.length === 0) {
            promotionsContainer.innerHTML = '<p style="color: #666; text-align: center; padding: 1rem;">Aucune promotion</p>';
        } else {
            promotionsContainer.innerHTML = cartData.promotions.map(promotion => `
                <div class="product-item promotion-item">
                    <div class="product-name">🎯 ${promotion.name.substring(0, 50)}</div>
                    <div class="product-details">
                        Cagnotte: <span class="product-price">${promotion.cagnotte.toFixed(2)}€</span>
                    </div>
                </div>
            `).join('');
        }

        // Render suggestions
        const suggestionsContainer = document.getElementById('cartSuggestions');
        if (cartData.suggestions.length === 0) {
            suggestionsContainer.innerHTML = '<p style="color: #666; text-align: center; padding: 1rem;">Aucune suggestion</p>';
        } else {
            suggestionsContainer.innerHTML = cartData.suggestions.map(suggestion => `
                <div class="product-item suggestion-item">
                    <div class="product-name">💡 ${suggestion.name}</div>
                    <div class="product-details">
                        Prix suggéré: <span class="product-price">${suggestion.price.toFixed(2)}€</span>
                    </div>
                </div>
            `).join('');
        }

        // Update totals
        document.getElementById('cartSubtotal').textContent = `${cartData.totals.subtotal.toFixed(2)}€`;
        document.getElementById('cartCagnotte').textContent = `${cartData.totals.cagnotte.toFixed(2)}€`;
        document.getElementById('cartFinalTotal').textContent = `${cartData.totals.finalTotal.toFixed(2)}€`;
    }
}

// Global functions for dashboard controls
function refreshData() {
    window.dashboard.loadInitialData();
}

async function clearData() {
    if (confirm('Êtes-vous sûr de vouloir effacer toutes les données de tracking ?\n\nLes données actuelles seront automatiquement sauvegardées avant le vidage.')) {
        try {
            // Appeler l'endpoint serveur pour vider les données
            const response = await fetch('/api/clear-data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Les données côté client seront automatiquement mises à jour
                // via l'événement Socket.io 'dataCleared'
                alert('✅ ' + result.message);
                console.log('🗑️ Données vidées avec succès côté serveur');
            } else {
                alert('❌ Erreur lors du vidage: ' + result.error);
            }
        } catch (error) {
            console.error('Failed to clear data:', error);
            alert('❌ Erreur lors de la communication avec le serveur');
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

async function refreshCartAnalysis() {
    window.dashboard.loadCartAnalysis();
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new TrackingDashboard();
    
    console.log('📊 Dashboard initialized');
    console.log('🔄 Real-time updates enabled');
});
