// Application logic for the demo e-commerce site
class ECommerceApp {
    constructor() {
        this.products = this.generateProducts();
        this.currentFilter = 'tous';
        this.init();
    }

    generateProducts() {
        const categories = ['electronique', 'vetements', 'maison', 'sport'];
        const products = [];
        
        const productTemplates = [
            { name: 'Smartphone Galaxy', category: 'electronique', price: 599, emoji: '📱' },
            { name: 'Laptop Pro', category: 'electronique', price: 1299, emoji: '💻' },
            { name: 'Écouteurs Bluetooth', category: 'electronique', price: 89, emoji: '🎧' },
            { name: 'T-shirt Premium', category: 'vetements', price: 29, emoji: '👕' },
            { name: 'Jeans Slim', category: 'vetements', price: 79, emoji: '👖' },
            { name: 'Sneakers Sport', category: 'vetements', price: 129, emoji: '👟' },
            { name: 'Canapé Moderne', category: 'maison', price: 899, emoji: '🛋️' },
            { name: 'Table Basse', category: 'maison', price: 199, emoji: '🪑' },
            { name: 'Lampe Design', category: 'maison', price: 149, emoji: '💡' },
            { name: 'Vélo VTT', category: 'sport', price: 599, emoji: '🚴' },
            { name: 'Raquette Tennis', category: 'sport', price: 89, emoji: '🎾' },
            { name: 'Ballon Football', category: 'sport', price: 25, emoji: '⚽' }
        ];

        productTemplates.forEach((template, index) => {
            products.push({
                id: index + 1,
                ...template,
                inStock: Math.random() > 0.1,
                rating: (Math.random() * 2 + 3).toFixed(1),
                reviews: Math.floor(Math.random() * 500) + 10
            });
        });

        return products;
    }

    init() {
        this.renderProducts();
        this.setupFilters();
        this.setupSearch();
    }

    renderProducts(productsToRender = null) {
        const productGrid = document.getElementById('productGrid');
        const products = productsToRender || this.getFilteredProducts();
        
        productGrid.innerHTML = products.map(product => `
            <div class="product-card" data-product-id="${product.id}" data-category="${product.category}">
                <div class="product-image">${product.emoji}</div>
                <div class="product-title">${product.name}</div>
                <div class="product-price">${product.price}€</div>
                <div style="margin-bottom: 1rem; color: #666; font-size: 0.9rem;">
                    ⭐ ${product.rating} (${product.reviews} avis)
                    ${product.inStock ? '✅ En stock' : '❌ Rupture'}
                </div>
                <button class="btn ${!product.inStock ? 'btn-disabled' : ''}" 
                        ${!product.inStock ? 'disabled' : ''}>
                    ${product.inStock ? '🛒 Ajouter au panier' : 'Indisponible'}
                </button>
            </div>
        `).join('');
    }

    getFilteredProducts() {
        if (this.currentFilter === 'tous') {
            return this.products;
        }
        return this.products.filter(product => product.category === this.currentFilter);
    }

    setupFilters() {
        const filterButtons = document.querySelectorAll('.filter-btn');
        
        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove active class from all buttons
                filterButtons.forEach(b => b.classList.remove('active'));
                
                // Add active class to clicked button
                btn.classList.add('active');
                
                // Update current filter
                this.currentFilter = btn.dataset.filter;
                
                // Re-render products
                this.renderProducts();
            });
        });

        // Set initial active filter
        document.querySelector('[data-filter="tous"]').classList.add('active');
    }

    setupSearch() {
        const searchInput = document.getElementById('searchInput');
        
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            
            if (query === '') {
                this.renderProducts();
                return;
            }

            const filteredProducts = this.products.filter(product => 
                product.name.toLowerCase().includes(query) ||
                product.category.toLowerCase().includes(query)
            );

            this.renderProducts(filteredProducts);
        });
    }

    // Method to simulate adding products (for testing)
    addProduct(productData) {
        const newProduct = {
            id: this.products.length + 1,
            inStock: true,
            rating: '4.0',
            reviews: 0,
            ...productData
        };
        
        this.products.push(newProduct);
        this.renderProducts();
        return newProduct;
    }

    // Method to get product by ID
    getProduct(id) {
        return this.products.find(p => p.id === parseInt(id));
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.ecommerceApp = new ECommerceApp();
    
    // Add some demo interactions after a delay
    setTimeout(() => {
        console.log('🚀 Demo site loaded! Try clicking on products, filters, and navigation items.');
        console.log('📊 Check the dashboard at /dashboard to see tracking data in real-time.');
        console.log('🔍 Use getTrackingData() in console to see tracked events.');
    }, 1000);
});
