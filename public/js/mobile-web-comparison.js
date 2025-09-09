// Mobile vs Web Comparison Dashboard
class MobileWebComparison {
    constructor() {
        this.socket = io();
        this.trackingData = [];
        this.sessions = new Map();
        this.currentTab = 'overview';
        
        this.init();
    }
    
    init() {
        this.setupSocketListeners();
        this.setupTabNavigation();
        this.loadInitialData();
        this.startPeriodicRefresh();
    }
    
    setupSocketListeners() {
        this.socket.on('trackingEvent', (data) => {
            this.trackingData.push(data);
            this.updateSessionData(data);
            this.refreshCurrentView();
        });
        
        this.socket.on('sessionCreated', (data) => {
            this.sessions.set(data.sessionId, data);
            this.updateSessionFilter();
        });
    }
    
    setupTabNavigation() {
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active from all tabs
                document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Hide all tab contents
                document.querySelectorAll('.tab-content').forEach(content => {
                    content.style.display = 'none';
                });
                
                // Show selected tab content
                const tabId = tab.dataset.tab + '-tab';
                const tabContent = document.getElementById(tabId);
                if (tabContent) {
                    tabContent.style.display = 'block';
                    this.currentTab = tab.dataset.tab;
                    this.refreshCurrentView();
                }
            });
        });
    }
    
    async loadInitialData() {
        try {
            const response = await fetch('/api/tracking-data');
            if (response.ok) {
                const data = await response.json();
                this.trackingData = data.events || [];
                
                // Process sessions
                this.trackingData.forEach(event => {
                    this.updateSessionData(event);
                });
                
                this.updateSessionFilter();
                this.refreshCurrentView();
            }
        } catch (error) {
            console.error('Failed to load initial data:', error);
        }
    }
    
    updateSessionData(event) {
        if (!this.sessions.has(event.sessionId)) {
            this.sessions.set(event.sessionId, {
                sessionId: event.sessionId,
                deviceType: event.deviceType || (event.site && event.site.includes('mobile') ? 'mobile' : 'web'),
                site: event.site || 'unknown',
                startTime: event.timestamp,
                lastActivity: event.timestamp,
                eventCount: 0,
                events: []
            });
        }
        
        const session = this.sessions.get(event.sessionId);
        session.eventCount++;
        session.lastActivity = event.timestamp;
        session.events.push(event);
    }
    
    updateSessionFilter() {
        const sessionFilter = document.getElementById('sessionFilter');
        if (!sessionFilter) return;
        
        // Keep the "all" option and add sessions
        const currentValue = sessionFilter.value;
        sessionFilter.innerHTML = '<option value="all">Toutes les sessions</option>';
        
        Array.from(this.sessions.values())
            .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
            .forEach(session => {
                const option = document.createElement('option');
                option.value = session.sessionId;
                const deviceIcon = session.deviceType === 'mobile' ? '📱' : '🖥️';
                const shortId = session.sessionId.substr(-8);
                option.textContent = `${deviceIcon} ${shortId} (${session.eventCount} events)`;
                sessionFilter.appendChild(option);
            });
        
        sessionFilter.value = currentValue;
    }
    
    refreshCurrentView() {
        switch (this.currentTab) {
            case 'overview':
                this.updateOverviewTab();
                break;
            case 'events':
                this.updateEventsTab();
                break;
            case 'conversion':
                this.updateConversionTab();
                break;
            case 'behavior':
                this.updateBehaviorTab();
                break;
        }
    }
    
    getFilteredData() {
        const timeFilter = document.getElementById('timeFilter')?.value || '24h';
        const sessionFilter = document.getElementById('sessionFilter')?.value || 'all';
        
        let filteredData = [...this.trackingData];
        
        // Time filter
        const now = new Date();
        const timeThresholds = {
            '1h': 60 * 60 * 1000,
            '24h': 24 * 60 * 60 * 1000,
            '7d': 7 * 24 * 60 * 60 * 1000
        };
        
        const threshold = timeThresholds[timeFilter];
        if (threshold) {
            const cutoff = new Date(now.getTime() - threshold);
            filteredData = filteredData.filter(event => new Date(event.timestamp) >= cutoff);
        }
        
        // Session filter
        if (sessionFilter !== 'all') {
            filteredData = filteredData.filter(event => event.sessionId === sessionFilter);
        }
        
        return filteredData;
    }
    
    updateOverviewTab() {
        const data = this.getFilteredData();
        
        // Separate mobile and web data
        const mobileData = data.filter(event => 
            event.deviceType === 'mobile' || 
            (event.site && event.site.includes('mobile'))
        );
        const webData = data.filter(event => 
            event.deviceType === 'web' || 
            (event.site && !event.site.includes('mobile'))
        );
        
        // Get unique sessions
        const mobileSessions = new Set(mobileData.map(e => e.sessionId)).size;
        const webSessions = new Set(webData.map(e => e.sessionId)).size;
        
        // Count specific event types
        const mobileClicks = mobileData.filter(e => 
            e.eventType.includes('click') || e.eventType.includes('tap')
        ).length;
        const webClicks = webData.filter(e => 
            e.eventType.includes('click')
        ).length;
        
        const mobileCartAdds = mobileData.filter(e => 
            e.eventType.includes('add_to_cart')
        ).length;
        const webCartAdds = webData.filter(e => 
            e.eventType.includes('add_to_cart')
        ).length;
        
        // Update mobile metrics
        this.updateElement('mobileSessions', mobileSessions);
        this.updateElement('mobileEvents', mobileData.length);
        this.updateElement('mobileClicks', mobileClicks);
        this.updateElement('mobileCart', mobileCartAdds);
        
        // Update web metrics
        this.updateElement('webSessions', webSessions);
        this.updateElement('webEvents', webData.length);
        this.updateElement('webClicks', webClicks);
        this.updateElement('webCart', webCartAdds);
        
        // Update summary stats
        this.updateElement('totalSessions', mobileSessions + webSessions);
        this.updateElement('totalEvents', data.length);
        
        // Calculate conversion rates
        const mobileConversion = mobileSessions > 0 ? ((mobileCartAdds / mobileSessions) * 100).toFixed(1) : 0;
        const webConversion = webSessions > 0 ? ((webCartAdds / webSessions) * 100).toFixed(1) : 0;
        const avgConversion = ((parseFloat(mobileConversion) + parseFloat(webConversion)) / 2).toFixed(1);
        
        this.updateElement('conversionRate', avgConversion + '%');
        
        // Update comparisons
        this.updateComparison('sessionsComparison', mobileSessions, webSessions, 'sessions');
        this.updateComparison('eventsComparison', mobileData.length, webData.length, 'événements');
        this.updateComparison('conversionComparison', mobileConversion, webConversion, '%');
        
        // Calculate average session time
        const mobileAvgTime = this.calculateAverageSessionTime(mobileData);
        const webAvgTime = this.calculateAverageSessionTime(webData);
        const overallAvgTime = Math.round((mobileAvgTime + webAvgTime) / 2);
        
        this.updateElement('avgTime', overallAvgTime + 's');
        this.updateComparison('timeComparison', mobileAvgTime, webAvgTime, 's');
    }
    
    updateEventsTab() {
        const data = this.getFilteredData();
        const timeline = document.getElementById('eventTimeline');
        if (!timeline) return;
        
        // Sort events by timestamp (most recent first)
        const sortedEvents = data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        timeline.innerHTML = sortedEvents.slice(0, 100).map(event => {
            const time = new Date(event.timestamp).toLocaleTimeString();
            const platform = event.deviceType === 'mobile' || (event.site && event.site.includes('mobile')) ? 'mobile' : 'web';
            const platformIcon = platform === 'mobile' ? '📱' : '🖥️';
            
            let details = '';
            if (event.data) {
                if (event.data.name) details += `Produit: ${event.data.name}`;
                if (event.data.category) details += `Catégorie: ${event.data.category}`;
                if (event.data.query) details += `Recherche: "${event.data.query}"`;
                if (event.data.filter) details += `Filtre: ${event.data.filter}`;
            }
            
            return `
                <div class="event-item ${platform}">
                    <span class="event-time">${time}</span>
                    <span class="event-type">${platformIcon} ${event.eventType}</span>
                    <span class="event-details">${details}</span>
                </div>
            `;
        }).join('');
    }
    
    updateConversionTab() {
        const data = this.getFilteredData();
        const table = document.getElementById('conversionTable');
        if (!table) return;
        
        // Calculate funnel metrics
        const mobileData = data.filter(event => 
            event.deviceType === 'mobile' || (event.site && event.site.includes('mobile'))
        );
        const webData = data.filter(event => 
            event.deviceType === 'web' || (event.site && !event.site.includes('mobile'))
        );
        
        const funnelSteps = [
            {
                name: 'Sessions',
                mobile: new Set(mobileData.map(e => e.sessionId)).size,
                web: new Set(webData.map(e => e.sessionId)).size
            },
            {
                name: 'Navigation',
                mobile: mobileData.filter(e => e.eventType.includes('navigation')).length,
                web: webData.filter(e => e.eventType.includes('navigation')).length
            },
            {
                name: 'Clics Produits',
                mobile: mobileData.filter(e => e.eventType.includes('product_click')).length,
                web: webData.filter(e => e.eventType.includes('product_click')).length
            },
            {
                name: 'Ajouts Panier',
                mobile: mobileData.filter(e => e.eventType.includes('add_to_cart')).length,
                web: webData.filter(e => e.eventType.includes('add_to_cart')).length
            },
            {
                name: 'Checkout',
                mobile: mobileData.filter(e => e.eventType.includes('checkout')).length,
                web: webData.filter(e => e.eventType.includes('checkout')).length
            }
        ];
        
        table.innerHTML = funnelSteps.map(step => {
            const difference = step.mobile - step.web;
            const diffClass = difference > 0 ? 'positive' : difference < 0 ? 'negative' : '';
            const diffText = difference > 0 ? `+${difference}` : difference.toString();
            
            return `
                <tr>
                    <td>${step.name}</td>
                    <td>📱 ${step.mobile}</td>
                    <td>🖥️ ${step.web}</td>
                    <td class="${diffClass}">${diffText}</td>
                </tr>
            `;
        }).join('');
    }
    
    updateBehaviorTab() {
        const data = this.getFilteredData();
        const table = document.getElementById('behaviorTable');
        if (!table) return;
        
        const mobileData = data.filter(event => 
            event.deviceType === 'mobile' || (event.site && event.site.includes('mobile'))
        );
        const webData = data.filter(event => 
            event.deviceType === 'web' || (event.site && !event.site.includes('mobile'))
        );
        
        const behaviorTypes = [
            {
                name: 'Clics/Taps',
                mobile: mobileData.filter(e => e.eventType.includes('tap') || e.eventType.includes('click')).length,
                web: webData.filter(e => e.eventType.includes('click')).length,
                specificity: 'Mobile: taps tactiles, Web: clics souris'
            },
            {
                name: 'Défilement',
                mobile: mobileData.filter(e => e.eventType.includes('scroll')).length,
                web: webData.filter(e => e.eventType.includes('scroll')).length,
                specificity: 'Mobile: défilement tactile, Web: molette/trackpad'
            },
            {
                name: 'Recherche',
                mobile: mobileData.filter(e => e.eventType.includes('search')).length,
                web: webData.filter(e => e.eventType.includes('search')).length,
                specificity: 'Mobile: clavier virtuel, Web: clavier physique'
            },
            {
                name: 'Navigation',
                mobile: mobileData.filter(e => e.eventType.includes('navigation')).length,
                web: webData.filter(e => e.eventType.includes('navigation')).length,
                specificity: 'Mobile: onglets horizontaux, Web: menu vertical'
            },
            {
                name: 'Gestes Spécifiques',
                mobile: mobileData.filter(e => e.eventType.includes('swipe') || e.eventType.includes('long_press')).length,
                web: 0,
                specificity: 'Mobile uniquement: swipe, long press'
            }
        ];
        
        table.innerHTML = behaviorTypes.map(behavior => `
            <tr>
                <td>${behavior.name}</td>
                <td>📱 ${behavior.mobile}</td>
                <td>🖥️ ${behavior.web}</td>
                <td>${behavior.specificity}</td>
            </tr>
        `).join('');
    }
    
    calculateAverageSessionTime(events) {
        const sessions = {};
        
        events.forEach(event => {
            if (!sessions[event.sessionId]) {
                sessions[event.sessionId] = {
                    start: new Date(event.timestamp),
                    end: new Date(event.timestamp)
                };
            } else {
                const eventTime = new Date(event.timestamp);
                if (eventTime < sessions[event.sessionId].start) {
                    sessions[event.sessionId].start = eventTime;
                }
                if (eventTime > sessions[event.sessionId].end) {
                    sessions[event.sessionId].end = eventTime;
                }
            }
        });
        
        const durations = Object.values(sessions).map(session => 
            (session.end - session.start) / 1000
        );
        
        return durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
    }
    
    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }
    
    updateComparison(id, mobileValue, webValue, unit = '') {
        const element = document.getElementById(id);
        if (!element) return;
        
        const mobile = parseFloat(mobileValue) || 0;
        const web = parseFloat(webValue) || 0;
        
        if (mobile === 0 && web === 0) {
            element.textContent = 'Aucune donnée';
            element.className = 'comparison';
            return;
        }
        
        const difference = mobile - web;
        const percentage = web > 0 ? ((difference / web) * 100).toFixed(1) : 0;
        
        if (difference > 0) {
            element.textContent = `Mobile +${Math.abs(difference)}${unit} (+${percentage}%)`;
            element.className = 'comparison positive';
        } else if (difference < 0) {
            element.textContent = `Web +${Math.abs(difference)}${unit} (+${Math.abs(percentage)}%)`;
            element.className = 'comparison negative';
        } else {
            element.textContent = `Égalité (${mobile}${unit})`;
            element.className = 'comparison';
        }
    }
    
    startPeriodicRefresh() {
        setInterval(() => {
            this.refreshCurrentView();
        }, 5000); // Refresh every 5 seconds
    }
}

// Global functions
function refreshData() {
    if (window.comparisonDashboard) {
        window.comparisonDashboard.loadInitialData();
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.comparisonDashboard = new MobileWebComparison();
    
    // Setup filter change listeners
    document.getElementById('timeFilter')?.addEventListener('change', () => {
        window.comparisonDashboard.refreshCurrentView();
    });
    
    document.getElementById('sessionFilter')?.addEventListener('change', () => {
        window.comparisonDashboard.refreshCurrentView();
    });
    
    console.log('📊 Mobile vs Web Comparison Dashboard initialized');
});
