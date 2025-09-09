// Mobile app functionality for Leclerc Drive
class LeclercMobileApp {
    constructor() {
        this.products = [
            {
                id: 'pates_barilla_1',
                name: 'Pâtes Barilla Spaghetti 500g',
                price: '1.89',
                category: 'epicerie',
                brand: 'Barilla',
                image: '🍝'
            },
            {
                id: 'riz_uncle_bens_1',
                name: 'Riz Uncle Ben\'s Basmati 1kg',
                price: '3.45',
                category: 'epicerie',
                brand: 'Uncle Ben\'s',
                image: '🍚'
            },
            {
                id: 'pates_panzani_1',
                name: 'Pâtes Panzani Fusilli 500g',
                price: '1.65',
                category: 'epicerie',
                brand: 'Panzani',
                image: '🍝'
            },
            {
                id: 'riz_lustucru_1',
                name: 'Riz Lustucru Express 2min',
                price: '2.89',
                category: 'epicerie',
                brand: 'Lustucru',
                image: '🍚'
            },
            {
                id: 'pommes_1',
                name: 'Pommes Golden 1kg',
                price: '2.99',
                category: 'fruits-legumes',
                brand: 'Tous',
                image: '🍎'
            },
            {
                id: 'bananes_1',
                name: 'Bananes Bio 1kg',
                price: '2.49',
                category: 'fruits-legumes',
                brand: 'Tous',
                image: '🍌'
            },
            {
                id: 'steaks_1',
                name: 'Steaks hachés 15% MG x4',
                price: '5.99',
                category: 'boucherie',
                brand: 'Tous',
                image: '🥩'
            },
            {
                id: 'poulet_1',
                name: 'Blanc de poulet x2',
                price: '4.89',
                category: 'boucherie',
                brand: 'Tous',
                image: '🐔'
            },
            {
                id: 'yaourt_1',
                name: 'Yaourts nature x12',
                price: '3.29',
                category: 'produits-laitiers',
                brand: 'Tous',
                image: '🥛'
            },
            {
                id: 'fromage_1',
                name: 'Emmental râpé 200g',
                price: '2.79',
                category: 'produits-laitiers',
                brand: 'Tous',
                image: '🧀'
            }
        ];
        
        this.currentCategory = 'fruits-legumes';
        this.currentBrand = 'Tous';
        
        this.init();
    }
    
    init() {
        this.renderProducts();
        this.setupCategoryTabs();
        this.setupBrandFilters();
    }
    
    renderProducts() {
        const container = document.querySelector('.products-grid-mobile');
        if (!container) return;
        
        const filteredProducts = this.products.filter(product => {
            const categoryMatch = this.currentCategory === 'all' || product.category === this.currentCategory;
            const brandMatch = this.currentBrand === 'Tous' || product.brand === this.currentBrand;
            return categoryMatch && brandMatch;
        });
        
        container.innerHTML = filteredProducts.map(product => `
            <div class="liWCRS310_Product touchable" data-product-id="${product.id}">
                <div style="font-size: 60px; text-align: center; margin-bottom: 10px;">${product.image}</div>
                <div class="pWCRS310_Desc">
                    <a href="#" class="aWCRS310_Product">${product.name}</a>
                </div>
                <div class="divWCRS310_PrixUnitaire">
                    <p class="pWCRS319_Prix">${product.price} €</p>
                </div>
                <button class="add-to-cart-btn touchable" data-product-id="${product.id}">
                    Ajouter au panier
                </button>
            </div>
        `).join('');
    }
    
    setupCategoryTabs() {
        const tabs = document.querySelectorAll('.nav-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active from all tabs
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Update current category
                this.currentCategory = tab.dataset.category || 'all';
                
                // Re-render products
                this.renderProducts();
                
                // Update breadcrumb
                this.updateBreadcrumb();
            });
        });
    }
    
    setupBrandFilters() {
        const filters = document.querySelectorAll('.filter-chip');
        filters.forEach(filter => {
            filter.addEventListener('click', () => {
                // Remove active from all filters
                filters.forEach(f => f.classList.remove('active'));
                filter.classList.add('active');
                
                // Update current brand
                this.currentBrand = filter.textContent.trim();
                
                // Re-render products
                this.renderProducts();
            });
        });
    }
    
    updateBreadcrumb() {
        const breadcrumb = document.querySelector('.mobile-breadcrumb');
        if (!breadcrumb) return;
        
        const categoryNames = {
            'fruits-legumes': 'Fruits & Légumes',
            'boucherie': 'Boucherie',
            'epicerie': 'Épicerie',
            'produits-laitiers': 'Produits Laitiers'
        };
        
        const categoryName = categoryNames[this.currentCategory] || 'Tous les produits';
        breadcrumb.innerHTML = `Accueil > ${categoryName} > <span class="Termes">Produits</span>`;
    }
    
    getProductById(productId) {
        return this.products.find(p => p.id === productId);
    }
}

// Mobile-specific utility functions
function toggleMobileCart() {
    const cart = document.getElementById('ulWCRS319_Produits');
    cart.classList.toggle('open');
    
    // Track cart toggle
    if (window.leclercMobileTracker) {
        window.leclercMobileTracker.trackEvent('cart_toggle_mobile', {
            isOpen: cart.classList.contains('open'),
            interface: 'mobile_fab'
        });
    }
}

// Initialize mobile app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.leclercMobileApp = new LeclercMobileApp();
    
    // Mobile-specific interactions
    
    // Prevent zoom on double tap for buttons
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function (event) {
        const now = (new Date()).getTime();
        if (now - lastTouchEnd <= 300) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    }, false);
    
    // Handle mobile cart swipe to close
    let startY = 0;
    const cart = document.getElementById('ulWCRS319_Produits');
    
    if (cart) {
        cart.addEventListener('touchstart', (e) => {
            startY = e.touches[0].clientY;
        });
        
        cart.addEventListener('touchmove', (e) => {
            const currentY = e.touches[0].clientY;
            const diffY = currentY - startY;
            
            // If swiping down and at top of cart, allow closing
            if (diffY > 50 && cart.scrollTop === 0) {
                cart.style.transform = `translateY(${Math.min(diffY - 50, 100)}px)`;
            }
        });
        
        cart.addEventListener('touchend', (e) => {
            const currentY = e.changedTouches[0].clientY;
            const diffY = currentY - startY;
            
            if (diffY > 100) {
                // Close cart
                cart.classList.remove('open');
                if (window.leclercMobileTracker) {
                    window.leclercMobileTracker.trackEvent('cart_swipe_close_mobile', {
                        swipeDistance: diffY,
                        interface: 'mobile_swipe'
                    });
                }
            }
            
            // Reset transform
            cart.style.transform = '';
        });
    }
    
    console.log('📱 Leclerc Mobile app initialized');
});
