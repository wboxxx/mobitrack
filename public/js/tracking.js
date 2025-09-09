// Web Tracking System - Inspired by the existing Bascule extension
class WebTracker {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.eventCount = 0;
        this.trackingData = [];
        this.currentUrl = window.location.href;
        
        this.initSession();
        this.setupEventListeners();
        this.updateUI();
    }

    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
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
                    timestamp: new Date().toISOString()
                })
            });
            
            if (response.ok) {
                console.log('Session initialized:', this.sessionId);
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
                console.log('Event tracked:', eventType, data);
            }
        } catch (error) {
            console.error('Failed to track event:', error);
        }
    }

    setupEventListeners() {
        // Track navigation clicks
        document.addEventListener('click', (e) => {
            const navLink = e.target.closest('[data-nav]');
            if (navLink) {
                this.trackEvent('navigation', {
                    section: navLink.dataset.nav,
                    text: navLink.textContent.trim(),
                    position: this.getElementPosition(navLink)
                });
            }

            // Track product clicks
            const productCard = e.target.closest('.product-card');
            if (productCard) {
                const productData = this.extractProductData(productCard);
                this.trackEvent('product_click', {
                    ...productData,
                    position: this.getElementPosition(productCard)
                });
            }

            // Track filter clicks
            const filterBtn = e.target.closest('[data-filter]');
            if (filterBtn) {
                this.trackEvent('filter_click', {
                    filter: filterBtn.dataset.filter,
                    text: filterBtn.textContent.trim()
                });
            }

            // Track buy button clicks
            if (e.target.classList.contains('btn') && e.target.textContent.includes('Ajouter')) {
                const productCard = e.target.closest('.product-card');
                const productData = this.extractProductData(productCard);
                this.trackEvent('add_to_cart', {
                    ...productData,
                    converted: true
                });
            }
        });

        // Track search input
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    if (e.target.value.length > 2) {
                        this.trackEvent('search', {
                            query: e.target.value,
                            length: e.target.value.length
                        });
                    }
                }, 500);
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

        // Track mouse movements (sampled)
        let mouseMoveTimeout;
        document.addEventListener('mousemove', (e) => {
            clearTimeout(mouseMoveTimeout);
            mouseMoveTimeout = setTimeout(() => {
                this.trackEvent('mouse_move', {
                    x: e.clientX,
                    y: e.clientY,
                    target: e.target.tagName
                });
            }, 2000);
        });
    }

    extractProductData(productCard) {
        const title = productCard.querySelector('.product-title')?.textContent.trim();
        const price = productCard.querySelector('.product-price')?.textContent.trim();
        const image = productCard.querySelector('.product-image')?.textContent.trim();
        
        return {
            title,
            price,
            image,
            cardId: productCard.dataset.productId || 'unknown'
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

// Initialize tracker when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.webTracker = new WebTracker();
    
    // Make tracker available globally for debugging
    window.getTrackingData = () => window.webTracker.getTrackingData();
});
