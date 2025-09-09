// Mobile-specific tracking system for Leclerc Drive
class LeclercMobileTracker {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.eventCount = 0;
        this.trackingData = [];
        this.currentUrl = window.location.href;
        this.cartItems = [];
        this.touchStartTime = 0;
        this.touchStartPosition = { x: 0, y: 0 };
        
        // Mobile-specific selectors (same as desktop but with mobile context)
        this.selectors = {
            siteName: 'leclerc_mobile',
            siteURL: 'leclercdrive.fr/',
            img: 'img',
            main: '#sectionWCRS001_MainContent',
            filArianeSearch: '.ulWCAD307_FilAriane .Termes',
            filAriane: '.ulWCAD307_FilAriane',
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
            menuLateral: '.mobile-filters',
            menuItem: '.liValeurFiltre',
            promotion: '.filter-chip.promo',
            parentNavigationMenu: '.mobile-nav-tabs',
            navigationItemN1: '.rayon-droite-titre',
            navigationItemN2: '.nav-submenu',
            promotionButton: '.promo-tab',
            favoriteButton: '.favorite-tab'
        };
        
        this.initSession();
        this.setupMobileEventListeners();
        this.updateUI();
    }

    generateSessionId() {
        return 'leclerc_mobile_session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
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
                    site: 'leclerc_mobile',
                    deviceType: 'mobile',
                    screenSize: {
                        width: window.screen.width,
                        height: window.screen.height
                    },
                    viewport: {
                        width: window.innerWidth,
                        height: window.innerHeight
                    }
                })
            });
            
            if (response.ok) {
                console.log('Leclerc Mobile session initialized:', this.sessionId);
            }
        } catch (error) {
            console.error('Failed to initialize mobile session:', error);
        }
    }

    async trackEvent(eventType, data) {
        const event = {
            sessionId: this.sessionId,
            eventType,
            url: this.currentUrl,
            timestamp: new Date().toISOString(),
            site: 'leclerc_mobile',
            deviceType: 'mobile',
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
                console.log('Mobile event tracked:', eventType, data);
            }
        } catch (error) {
            console.error('Failed to track mobile event:', error);
        }
    }

    setupMobileEventListeners() {
        // Touch events for mobile-specific tracking
        document.addEventListener('touchstart', (e) => {
            this.touchStartTime = Date.now();
            this.touchStartPosition = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY
            };
        });

        document.addEventListener('touchend', (e) => {
            const touchDuration = Date.now() - this.touchStartTime;
            const touchEndPosition = {
                x: e.changedTouches[0].clientX,
                y: e.changedTouches[0].clientY
            };
            
            const distance = Math.sqrt(
                Math.pow(touchEndPosition.x - this.touchStartPosition.x, 2) +
                Math.pow(touchEndPosition.y - this.touchStartPosition.y, 2)
            );

            // Distinguish between tap, long press, and swipe
            if (distance < 10) { // Tap
                if (touchDuration > 500) {
                    this.trackEvent('long_press', {
                        duration: touchDuration,
                        position: touchEndPosition,
                        target: e.target.tagName
                    });
                } else {
                    this.trackEvent('tap', {
                        duration: touchDuration,
                        position: touchEndPosition,
                        target: e.target.tagName,
                        targetClass: e.target.className
                    });
                }
            } else { // Swipe
                this.trackEvent('swipe', {
                    startPosition: this.touchStartPosition,
                    endPosition: touchEndPosition,
                    distance: distance,
                    duration: touchDuration
                });
            }
        });

        // Click events (for both touch and mouse)
        document.addEventListener('click', (e) => {
            // Track navigation tabs (N1 level)
            const navTab = e.target.closest(this.selectors.navigationItemN1);
            if (navTab) {
                // Remove active from all tabs
                document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
                navTab.classList.add('active');
                
                this.trackEvent('navigation_n1_mobile', {
                    category: navTab.dataset.category || navTab.textContent.trim(),
                    level: 'n1',
                    interface: 'mobile_tabs',
                    position: this.getElementPosition(navTab)
                });
            }

            // Track filter chips
            const filterChip = e.target.closest(this.selectors.menuItem);
            if (filterChip) {
                // Toggle active state
                document.querySelectorAll('.filter-chip').forEach(chip => chip.classList.remove('active'));
                filterChip.classList.add('active');
                
                this.trackEvent('filter_click_mobile', {
                    filter: filterChip.textContent.trim(),
                    interface: 'mobile_chips'
                });
            }

            // Track product clicks
            const productCard = e.target.closest(this.selectors.productList);
            if (productCard) {
                const productData = this.extractProductData(productCard);
                this.trackEvent('product_click_mobile', {
                    ...productData,
                    position: this.getElementPosition(productCard),
                    interface: 'mobile_grid'
                });
            }

            // Track add to cart (mobile)
            if (e.target.classList.contains('add-to-cart-btn') && !e.target.disabled) {
                e.preventDefault();
                e.stopPropagation();
                
                const productCard = e.target.closest(this.selectors.productList);
                if (productCard) {
                    const productData = this.extractProductData(productCard);
                    
                    this.addToCart(productData);
                    this.trackEvent('add_to_cart_mobile', {
                        ...productData,
                        converted: true,
                        cartSize: this.cartItems.length,
                        interface: 'mobile_button'
                    });
                    
                    // Mobile haptic feedback simulation
                    if (navigator.vibrate) {
                        navigator.vibrate(50);
                    }
                }
            }

            // Track mobile cart FAB
            if (e.target.closest('.mobile-cart-fab')) {
                this.trackEvent('cart_open_mobile', {
                    cartSize: this.cartItems.length,
                    interface: 'mobile_fab'
                });
            }

            // Track checkout button
            const checkoutBtn = e.target.closest(this.selectors.buyButton);
            if (checkoutBtn) {
                this.trackEvent('checkout_click_mobile', {
                    cartSize: this.cartItems.length,
                    totalValue: this.calculateCartTotal(),
                    converted: true,
                    interface: 'mobile_checkout'
                });
            }
        });

        // Mobile search
        const searchInput = document.querySelector(this.selectors.searchInput);
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    if (e.target.value.length > 2) {
                        this.trackEvent('search_mobile', {
                            query: e.target.value,
                            length: e.target.value.length,
                            interface: 'mobile_search'
                        });
                    }
                }, 500);
            });
        }

        // Mobile search form
        const searchForm = document.querySelector(this.selectors.searchBar);
        if (searchForm) {
            searchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const query = searchInput.value.trim();
                if (query) {
                    this.trackEvent('search_submit_mobile', {
                        query: query,
                        length: query.length,
                        interface: 'mobile_form'
                    });
                }
            });
        }

        // Mobile scroll tracking
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                this.trackEvent('scroll_mobile', {
                    scrollY: window.scrollY,
                    scrollPercent: Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100),
                    interface: 'mobile_scroll'
                });
            }, 1000);
        });

        // Mobile orientation change
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.trackEvent('orientation_change_mobile', {
                    orientation: window.orientation,
                    newViewport: {
                        width: window.innerWidth,
                        height: window.innerHeight
                    }
                });
            }, 100);
        });

        // Mobile visibility change
        document.addEventListener('visibilitychange', () => {
            this.trackEvent('visibility_change_mobile', {
                hidden: document.hidden,
                visibilityState: document.visibilityState
            });
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
        
        this.updateMobileCartUI();
        this.showMobileCartNotification();
    }

    updateMobileCartUI() {
        const cartItemsContainer = document.getElementById('cart-items-mobile');
        const cartBadge = document.getElementById('cart-badge');
        
        // Update cart badge
        const totalItems = this.cartItems.reduce((sum, item) => sum + item.quantity, 0);
        if (totalItems > 0) {
            cartBadge.textContent = totalItems;
            cartBadge.style.display = 'block';
        } else {
            cartBadge.style.display = 'none';
        }
        
        if (this.cartItems.length === 0) {
            cartItemsContainer.innerHTML = '<p style="padding: 40px 20px; text-align: center; color: #666;">Votre panier est vide</p>';
        } else {
            cartItemsContainer.innerHTML = this.cartItems.map((item, index) => `
                <div class="cart-item-mobile">
                    <div class="cart-item-image">${item.image || '📦'}</div>
                    <div class="cart-item-details">
                        <div class="cart-item-name">${item.name}</div>
                        <div class="cart-item-price">${item.price}</div>
                    </div>
                    <div class="quantity-controls">
                        <button class="quantity-btn" onclick="window.leclercMobileTracker.changeQuantity(${index}, -1)">-</button>
                        <span class="spanWCRS319_count">${item.quantity}</span>
                        <button class="quantity-btn" onclick="window.leclercMobileTracker.changeQuantity(${index}, 1)">+</button>
                    </div>
                </div>
            `).join('');
            
            // Add total
            const total = this.calculateCartTotal();
            cartItemsContainer.innerHTML += `
                <div style="padding: 20px; text-align: center; font-weight: bold; border-top: 1px solid #eee;">
                    Total: ${total.toFixed(2)} €
                </div>
            `;
        }
    }

    changeQuantity(index, delta) {
        if (this.cartItems[index]) {
            this.cartItems[index].quantity += delta;
            if (this.cartItems[index].quantity <= 0) {
                this.cartItems.splice(index, 1);
                this.trackEvent('remove_from_cart_mobile', {
                    cartSize: this.cartItems.length,
                    interface: 'mobile_quantity'
                });
            } else {
                this.trackEvent('quantity_change_mobile', {
                    newQuantity: this.cartItems[index].quantity,
                    delta: delta,
                    interface: 'mobile_controls'
                });
            }
            this.updateMobileCartUI();
        }
    }

    calculateCartTotal() {
        return this.cartItems.reduce((total, item) => {
            const price = parseFloat(item.price.replace(/[^0-9.,]/g, '').replace(',', '.')) || 0;
            return total + (price * item.quantity);
        }, 0);
    }

    showMobileCartNotification() {
        // Auto-open cart briefly on mobile
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

    getTrackingData() {
        return this.trackingData;
    }
}

// Initialize mobile tracker when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.leclercMobileTracker = new LeclercMobileTracker();
    
    // Make tracker available globally for debugging
    window.getTrackingData = () => window.leclercMobileTracker.getTrackingData();
    
    console.log('📱 Leclerc Mobile tracking system initialized');
    console.log('📊 Mobile-specific events: tap, swipe, long_press, orientation_change');
});
