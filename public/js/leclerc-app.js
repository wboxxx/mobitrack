// Leclerc-specific application logic
class LeclercApp {
    constructor() {
        this.products = this.generateLeclercProducts();
        this.init();
    }

    generateLeclercProducts() {
        const products = [
            // Pâtes & Riz (current category)
            { id: 1, name: 'Pâtes Barilla Spaghetti 500g', price: '1,89 €', category: 'pates', brand: 'Barilla', image: '🍝', inStock: true },
            { id: 2, name: 'Riz Uncle Ben\'s Basmati 1kg', price: '3,45 €', category: 'riz', brand: 'Uncle Ben\'s', image: '🍚', inStock: true },
            { id: 3, name: 'Pâtes Panzani Fusilli 500g', price: '1,65 €', category: 'pates', brand: 'Panzani', image: '🍝', inStock: true },
            { id: 4, name: 'Riz Taureau Ailé Long Grain 1kg', price: '2,89 €', category: 'riz', brand: 'Marque Repère', image: '🍚', inStock: false },
            { id: 5, name: 'Pâtes Lustucru Tagliatelles 250g', price: '2,15 €', category: 'pates', brand: 'Lustucru', image: '🍝', inStock: true },
            { id: 6, name: 'Riz Basmati Bio Carrefour 500g', price: '2,99 €', category: 'riz', brand: 'Marque Repère', image: '🍚', inStock: true },
            { id: 7, name: 'Pâtes Barilla Penne Rigate 500g', price: '1,89 €', category: 'pates', brand: 'Barilla', image: '🍝', inStock: true },
            { id: 8, name: 'Semoule Couscous Ferrero 500g', price: '1,45 €', category: 'semoule', brand: 'Ferrero', image: '🥣', inStock: true },
            { id: 9, name: 'Pâtes Fraîches Raviolis 4 Fromages 300g', price: '3,25 €', category: 'pates-fraiches', brand: 'Marque Repère', image: '🥟', inStock: true },
            { id: 10, name: 'Riz Rond Bomba Paella 500g', price: '4,15 €', category: 'riz', brand: 'Lustucru', image: '🥘', inStock: true },
            { id: 11, name: 'Pâtes Sans Gluten Barilla 400g', price: '2,89 €', category: 'pates', brand: 'Barilla', image: '🍝', inStock: true },
            { id: 12, name: 'Riz Complet Bio Uncle Ben\'s 500g', price: '3,89 €', category: 'riz', brand: 'Uncle Ben\'s', image: '🍚', inStock: true }
        ];

        return products.map(product => ({
            ...product,
            rating: (Math.random() * 2 + 3).toFixed(1),
            reviews: Math.floor(Math.random() * 200) + 10,
            promotion: Math.random() > 0.7
        }));
    }

    init() {
        this.renderProducts();
        this.setupNavigation();
        this.setupSearch();
        this.setupFilters();
    }

    renderProducts() {
        const productsGrid = document.querySelector('.products-grid');
        
        productsGrid.innerHTML = this.products.map(product => `
            <div class="liWCRS310_Product" data-product-id="${product.id}" data-category="${product.category}">
                <img src="data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'><rect width='200' height='200' fill='#f8f9fa'/><text x='100' y='120' font-size='60' text-anchor='middle' fill='#666'>${product.image}</text></svg>`)}" alt="${product.name}">
                
                <div class="pWCRS310_Desc">
                    <a href="#" class="aWCRS310_Product">${product.name}</a>
                </div>
                
                <div class="divWCRS310_PrixUnitaire">
                    <span class="pWCRS319_Prix">${product.price}</span>
                    ${product.promotion ? '<span style="background: #ff6b35; color: white; padding: 2px 6px; border-radius: 3px; font-size: 12px; margin-left: 5px;">PROMO</span>' : ''}
                </div>
                
                <div style="margin-bottom: 10px; font-size: 12px; color: #666;">
                    ⭐ ${product.rating} (${product.reviews} avis)<br>
                    ${product.inStock ? '✅ En stock' : '❌ Rupture de stock'}
                </div>
                
                <button class="add-to-cart-btn" ${!product.inStock ? 'disabled style="background: #ccc; cursor: not-allowed;"' : ''}>
                    ${product.inStock ? '🛒 Ajouter au panier' : 'Indisponible'}
                </button>
            </div>
        `).join('');
    }

    setupNavigation() {
        // Handle main category navigation
        document.querySelectorAll('.rayon-droite-titre').forEach(category => {
            category.addEventListener('mouseenter', () => {
                // Hide all submenus
                document.querySelectorAll('.famille-lien').forEach(menu => {
                    menu.classList.remove('active');
                });
                
                // Show current submenu
                const submenu = category.querySelector('.famille-lien');
                if (submenu) {
                    submenu.classList.add('active');
                }
            });

            category.addEventListener('mouseleave', () => {
                setTimeout(() => {
                    const submenu = category.querySelector('.famille-lien');
                    if (submenu && !submenu.matches(':hover')) {
                        submenu.classList.remove('active');
                    }
                }, 200);
            });
        });

        // Handle submenu hover
        document.querySelectorAll('.famille-lien').forEach(submenu => {
            submenu.addEventListener('mouseleave', () => {
                submenu.classList.remove('active');
            });
        });
    }

    setupSearch() {
        const searchForm = document.getElementById('WRSL301_FormRecherche');
        const searchInput = document.getElementById('inputWRSL301_rechercheTexte');
        
        if (searchForm && searchInput) {
            searchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const query = searchInput.value.toLowerCase().trim();
                this.filterProducts(query);
            });

            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase().trim();
                if (query.length > 2) {
                    this.filterProducts(query);
                } else if (query.length === 0) {
                    this.renderProducts();
                }
            });
        }
    }

    setupFilters() {
        // Brand/category filters in sidebar
        document.querySelectorAll('.liValeurFiltre').forEach(filter => {
            filter.addEventListener('click', () => {
                filter.classList.toggle('active');
                const filterText = filter.textContent.toLowerCase();
                
                // Simple filter logic
                const filteredProducts = this.products.filter(product => {
                    return product.brand.toLowerCase().includes(filterText.split('(')[0].trim().toLowerCase());
                });
                
                this.renderFilteredProducts(filteredProducts);
            });
        });

        // Category filters
        document.querySelectorAll('.divWCRS001_BlocFiltre.divWCRS315_Filtres.divWCRS315_FiltresNavigation li').forEach(filter => {
            filter.addEventListener('click', () => {
                const filterText = filter.textContent.toLowerCase();
                let categoryFilter = '';
                
                if (filterText.includes('pâtes fraîches')) categoryFilter = 'pates-fraiches';
                else if (filterText.includes('pâtes')) categoryFilter = 'pates';
                else if (filterText.includes('riz')) categoryFilter = 'riz';
                else if (filterText.includes('semoule')) categoryFilter = 'semoule';
                
                if (categoryFilter) {
                    const filteredProducts = this.products.filter(product => 
                        product.category === categoryFilter
                    );
                    this.renderFilteredProducts(filteredProducts);
                }
            });
        });
    }

    filterProducts(query) {
        const filteredProducts = this.products.filter(product =>
            product.name.toLowerCase().includes(query) ||
            product.brand.toLowerCase().includes(query) ||
            product.category.toLowerCase().includes(query)
        );
        
        this.renderFilteredProducts(filteredProducts);
    }

    renderFilteredProducts(products) {
        const productsGrid = document.querySelector('.products-grid');
        
        if (products.length === 0) {
            productsGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #666;">
                    <h3>Aucun produit trouvé</h3>
                    <p>Essayez de modifier vos critères de recherche</p>
                </div>
            `;
            return;
        }

        productsGrid.innerHTML = products.map(product => `
            <div class="liWCRS310_Product" data-product-id="${product.id}" data-category="${product.category}">
                <img src="data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'><rect width='200' height='200' fill='#f8f9fa'/><text x='100' y='120' font-size='60' text-anchor='middle' fill='#666'>${product.image}</text></svg>`)}" alt="${product.name}">
                
                <div class="pWCRS310_Desc">
                    <a href="#" class="aWCRS310_Product">${product.name}</a>
                </div>
                
                <div class="divWCRS310_PrixUnitaire">
                    <span class="pWCRS319_Prix">${product.price}</span>
                    ${product.promotion ? '<span style="background: #ff6b35; color: white; padding: 2px 6px; border-radius: 3px; font-size: 12px; margin-left: 5px;">PROMO</span>' : ''}
                </div>
                
                <div style="margin-bottom: 10px; font-size: 12px; color: #666;">
                    ⭐ ${product.rating} (${product.reviews} avis)<br>
                    ${product.inStock ? '✅ En stock' : '❌ Rupture de stock'}
                </div>
                
                <button class="add-to-cart-btn" ${!product.inStock ? 'disabled style="background: #ccc; cursor: not-allowed;"' : ''}>
                    ${product.inStock ? '🛒 Ajouter au panier' : 'Indisponible'}
                </button>
            </div>
        `).join('');
    }

    getProduct(id) {
        return this.products.find(p => p.id === parseInt(id));
    }
}

// Initialize the Leclerc app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.leclercApp = new LeclercApp();
    
    // Add some demo interactions after a delay
    setTimeout(() => {
        console.log('🛒 Site Leclerc Drive chargé !');
        console.log('📊 Système de tracking Bascule actif avec vrais sélecteurs');
        console.log('🔍 Testez la navigation, recherche, et ajout au panier');
        console.log('📈 Consultez le dashboard pour voir les données en temps réel');
    }, 1000);
});
