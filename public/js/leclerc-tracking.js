// Leclerc-specific tracking system using real selectors from Bascule extension
class LeclercTracker {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.eventCount = 0;
        this.trackingData = [];
        this.currentUrl = window.location.href;
        this.cartItems = [];
        
        // Leclerc selectors from the original Bascule extension
        this.selectors = {
            siteName: 'leclerc',
            siteURL: 'leclercdrive.fr/',
            img: 'img',
            main: '#sectionWCRS001_MainContent',
            filArianeSearch: '.ulWCAD307_FilAriane li h1 .Termes',
            filAriane: '.ulWCAD307_FilAriane li',
            productList: '#divContenuCentre .liWCRS310_Product',
            price: '.pWCRS319_Prix',
            cardPrice: '.divWCRS310_PrixUnitaire',
            name: '.pWCRS310_Desc .aWCRS310_Product',
            title: '.pWCRS310_Desc',
            cityStore: '#aWCSD333_PL',
            buyButton: '#ctl00_main_ctl01_rptOngletPaiement_ctl01_ctl00_lkbContinuerPaiement',
            item: 'li',
            cartContainer: '#ulWCRS319_Produits',
            cart: '#ulWCRS319_Produits',
            quantity: '.spanWCRS319_count',
            searchBar: '#WRSL301_FormRecherche',
            searchButton: '#inputWRSL301_rechercheBouton',
            searchInput: '#inputWRSL301_rechercheTexte',
            menuLateral: '#ctl00_ctl00_mainMutiUnivers_main_divContenuGauche',
            menuItem: '.liValeurFiltre',
            promotion: '.estPromotions.estActif',
            urlFavorite: 'detail-liste',
            urlFrequentlyBought: 'TBD',
            parentNavigationMenu: '.drive',
            navigationItemN1: '.rayon-droite-titre',
            navigationItemN2: '.famille-lien',
            promotionButton: '.estPromotions',
            favoriteButton: '.bandeau-lien.estCoursesPlusVite'
        };
        
        this.initSession();
        this.setupEventListeners();
        this.updateUI();
    }

    generateSessionId() {
        return 'leclerc_session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    async initSession() {
        try {
            const response = await fetch('/api/session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sessionId: this.sessionId,
                    userAgent: navigator.userAgent,
                    url: this.currentUrl,
                    timestamp: new Date().toISOString(),
                    site: 'leclerc'
                })
            });
            
            if (response.ok) {
                console.log('Leclerc session initialized:', this.sessionId);
            }
        } catch (error) {
            console.error('Failed to initialize session:', error);
        }
    }

    async trackEvent(eventType, data) {
        const event = {
            sessionId: this.sessionId,
            eventType,
            url: this.currentUrl,
            timestamp: new Date().toISOString(),
            site: 'leclerc',
            data: data || {}
        };

        this.trackingData.push(event);
        this.eventCount++;
        this.updateUI();

        try {
            const response = await fetch('/api/track', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(event)
            });

            if (response.ok) {
                console.log('Leclerc event tracked:', eventType, data);
            }
        } catch (error) {
            console.error('Failed to track event:', error);
        }
    }

    setupEventListeners() {
        // Track navigation clicks (N1 level - main categories)
        document.addEventListener('click', (e) => {
            const navN1 = e.target.closest(this.selectors.navigationItemN1);
            if (navN1) {
                this.trackEvent('navigation_n1', {
                    category: navN1.dataset.category || navN1.textContent.trim(),
                    level: 'n1',
                    position: this.getElementPosition(navN1)
                });
                
                // Show subcategories
                const subMenu = navN1.querySelector(this.selectors.navigationItemN2);
                if (subMenu) {
                    document.querySelectorAll('.famille-lien').forEach(menu => menu.classList.remove('active'));
                    subMenu.classList.add('active');
                }
            }

            // Track navigation clicks (N2 level - subcategories)
            const navN2 = e.target.closest('.famille-lien-libelle');
            if (navN2) {
                const parentN1 = navN2.closest('.rayon-droite-titre');
                this.trackEvent('navigation_n2', {
                    category: navN2.textContent.trim(),
                    parent: parentN1 ? parentN1.textContent.trim() : 'unknown',
                    level: 'n2',
                    position: this.getElementPosition(navN2)
                });
            }

            // Track navigation clicks (N3 level - filters)
            const navN3 = e.target.closest('.divWCRS001_BlocFiltre.divWCRS315_Filtres.divWCRS315_FiltresNavigation li');
            if (navN3) {
                const filArianeSpan = document.querySelectorAll('.ulWCAD307_FilAriane li span');
                const parent = filArianeSpan[filArianeSpan.length - 1]?.textContent?.trim();
                this.trackEvent('navigation_n3', {
                    category: navN3.textContent.trim(),
                    parent: parent || 'unknown',
                    level: 'n3',
                    position: this.getElementPosition(navN3)
                });
            }

            // Track product clicks
            const productCard = e.target.closest(this.selectors.productList);
            if (productCard) {
                const productData = this.extractProductData(productCard);
                this.trackEvent('product_click', {
                    ...productData,
                    position: this.getElementPosition(productCard),
                    breadcrumb: this.getBreadcrumbCategories()
                });
            }

            // Track filter clicks
            const filterItem = e.target.closest(this.selectors.menuItem);
            if (filterItem) {
                this.trackEvent('filter_click', {
                    filter: filterItem.textContent.trim(),
                    filterType: 'brand_or_category'
                });
            }

            // Track promotion button
            const promoBtn = e.target.closest(this.selectors.promotionButton);
            if (promoBtn) {
                this.trackEvent('navigation_n1', {
                    category: 'Promotions',
                    level: 'n1',
                    special: 'promotion'
                });
            }

            // Track favorite button
            const favoriteBtn = e.target.closest(this.selectors.favoriteButton);
            if (favoriteBtn) {
                this.trackEvent('navigation_n1', {
                    category: 'Favorites',
                    level: 'n1',
                    special: 'favorite'
                });
            }

            // Track add to cart
            if (e.target.classList.contains('add-to-cart-btn') && !e.target.disabled) {
                e.preventDefault();
                e.stopPropagation();
                
                const productCard = e.target.closest(this.selectors.productList);
                if (productCard) {
                    const productData = this.extractProductData(productCard);
                    
                    this.addToCart(productData);
                    this.trackEvent('add_to_cart', {
                        ...productData,
                        converted: true,
                        cartSize: this.cartItems.length
                    });
                    
                    console.log('Product added to cart:', productData.name);
                }
            }

            // Track buy button (checkout)
            const buyButton = e.target.closest(this.selectors.buyButton);
            if (buyButton) {
                this.trackEvent('checkout_click', {
                    cartSize: this.cartItems.length,
                    totalValue: this.calculateCartTotal(),
                    converted: true
                });
            }

            // Track city store click
            const cityStore = e.target.closest(this.selectors.cityStore);
            if (cityStore) {
                this.trackEvent('store_selection', {
                    store: cityStore.textContent.trim()
                });
            }
        });

        // Track search input
        const searchInput = document.querySelector(this.selectors.searchInput);
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    if (e.target.value.length > 2) {
                        this.trackEvent('search', {
                            query: e.target.value,
                            length: e.target.value.length,
                            breadcrumb: this.getBreadcrumbCategories()
                        });
                    }
                }, 500);
            });
        }

        // Track search form submission
        const searchForm = document.querySelector(this.selectors.searchBar);
        if (searchForm) {
            searchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const query = searchInput.value.trim();
                if (query) {
                    this.trackEvent('search_submit', {
                        query: query,
                        length: query.length
                    });
                }
            });
        }

        // Track scroll behavior
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                this.trackEvent('scroll', {
                    scrollY: window.scrollY,
                    scrollPercent: Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100)
                });
            }, 1000);
        });

        // Track page visibility changes
        document.addEventListener('visibilitychange', () => {
            this.trackEvent('visibility_change', {
                hidden: document.hidden,
                visibilityState: document.visibilityState
            });
        });

        // Setup mutation observer for dynamic content (like real Leclerc site)
        this.setupMutationObserver();
    }

    setupMutationObserver() {
        const mainContent = document.querySelector(this.selectors.main);
        if (mainContent) {
            const observer = new MutationObserver(() => {
                this.onMutation();
            });

            observer.observe(mainContent, {
                childList: true,
                subtree: true,
                attributes: true,
                characterData: true
            });
        }
    }

    onMutation() {
        // Re-attach event listeners to new products
        const products = document.querySelectorAll(this.selectors.productList);
        products.forEach((product, index) => {
            if (!product.dataset.tracked) {
                product.dataset.tracked = 'true';
                // Product is now being tracked
            }
        });
    }

    extractProductData(productCard) {
        const nameElement = productCard.querySelector(this.selectors.name);
        const priceElement = productCard.querySelector(this.selectors.price);
        const imageElement = productCard.querySelector(this.selectors.img);
        
        return {
            name: nameElement ? nameElement.textContent.trim() : 'Unknown Product',
            price: priceElement ? priceElement.textContent.trim() : 'Price not available',
            image: imageElement ? imageElement.src : '',
            productId: productCard.dataset.productId || 'unknown',
            tracked: true
        };
    }

    getBreadcrumbCategories() {
        const breadcrumbItems = document.querySelectorAll(this.selectors.filAriane);
        const categories = {};
        
        breadcrumbItems.forEach((item, index) => {
            const text = item.textContent.trim();
            if (text && text !== '>') {
                if (index === 1) categories.firstCateg = text;
                if (index === 2) categories.secCateg = text;
                if (index === 3) categories.thirdCateg = text;
                if (index === 4) categories.fourthCateg = text;
            }
        });
        
        return categories;
    }

    getElementPosition(element) {
        const rect = element.getBoundingClientRect();
        return {
            x: rect.left,
            y: rect.top,
            width: rect.width,
            height: rect.height
        };
    }

    addToCart(productData) {
        // Check if product already exists in cart
        const existingItem = this.cartItems.find(item => item.productId === productData.productId);
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            this.cartItems.push({
                ...productData,
                quantity: 1,
                addedAt: new Date().toISOString()
            });
        }
        
        this.updateCartUI();
        this.showCartNotification();
    }

    updateCartUI() {
        const cartItemsContainer = document.getElementById('cart-items');
        const cartToggle = document.querySelector('.cart-toggle');
        
        // Update cart button with item count
        if (cartToggle) {
            const totalItems = this.cartItems.reduce((sum, item) => sum + item.quantity, 0);
            cartToggle.innerHTML = totalItems > 0 ? `🛒 (${totalItems})` : '🛒';
        }
        
        if (this.cartItems.length === 0) {
            cartItemsContainer.innerHTML = '<p style="padding: 20px; text-align: center; color: #666;">Votre panier est vide</p>';
        } else {
            cartItemsContainer.innerHTML = this.cartItems.map((item, index) => `
                <div class="cart-item">
                    <div style="font-weight: bold; margin-bottom: 5px;">${item.name}</div>
                    <div style="color: #0066cc; font-weight: bold;">${item.price}</div>
                    <div style="margin-top: 5px; display: flex; justify-content: space-between; align-items: center;">
                        <span>Quantité: <span class="spanWCRS319_count">${item.quantity}</span></span>
                        <button onclick="window.leclercTracker.removeFromCart(${index})" style="background: #dc3545; color: white; border: none; padding: 5px 8px; border-radius: 3px; cursor: pointer; font-size: 12px;">✕</button>
                    </div>
                </div>
            `).join('');
            
            // Add total
            const total = this.calculateCartTotal();
            cartItemsContainer.innerHTML += `
                <div style="padding: 15px; border-top: 2px solid #0066cc; margin-top: 10px; font-weight: bold; text-align: center;">
                    Total: ${total.toFixed(2)} €
                </div>
            `;
        }
    }

    calculateCartTotal() {
        return this.cartItems.reduce((total, item) => {
            const price = parseFloat(item.price.replace(/[^0-9.,]/g, '').replace(',', '.')) || 0;
            return total + (price * item.quantity);
        }, 0);
    }

    removeFromCart(index) {
        this.cartItems.splice(index, 1);
        this.updateCartUI();
        this.trackEvent('remove_from_cart', {
            cartSize: this.cartItems.length
        });
    }

    showCartNotification() {
        // Auto-open cart briefly to show item was added
        const cart = document.getElementById('ulWCRS319_Produits');
        cart.classList.add('open');
        
        // Auto-close after 2 seconds
        setTimeout(() => {
            cart.classList.remove('open');
        }, 2000);
    }

    updateUI() {
        const sessionIdElement = document.getElementById('sessionId');
        const eventCountElement = document.getElementById('eventCount');
        
        if (sessionIdElement) {
            sessionIdElement.textContent = this.sessionId.substr(-8);
        }
        
        if (eventCountElement) {
            eventCountElement.textContent = this.eventCount;
        }
    }

    // Method to get tracking data (for debugging)
    getTrackingData() {
        return this.trackingData;
    }
}

// Global functions - removed duplicate, now in HTML

// Initialize tracker when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.leclercTracker = new LeclercTracker();
    
    // Make tracker available globally for debugging
    window.getTrackingData = () => window.leclercTracker.getTrackingData();
    
    console.log('🛒 Leclerc tracking system initialized');
    console.log('📊 Using real Bascule selectors for authentic tracking');
});
