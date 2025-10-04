/**
 * Module d'Auscultation d'Accessibilité
 * 
 * Ce module gère la réception, le traitement et l'analyse des événements
 * d'accessibilité provenant des applications Android.
 */

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

class AccessibilityAuscultation {
    constructor() {
        this.accessibilityEvents = [];
        this.auscultationReports = [];
        this.deviceStats = new Map();
        this.sessionStats = new Map();
        
        // Configuration
        this.maxEvents = 10000; // Limite d'événements en mémoire
        this.reportRetentionDays = 30; // Rétention des rapports
    }

    /**
     * Ajoute un événement d'accessibilité
     */
    addAccessibilityEvent(eventData) {
        try {
            // Valider les données
            if (!eventData || !eventData.events || !Array.isArray(eventData.events)) {
                throw new Error('Format d\'événement invalide');
            }

            const timestamp = Date.now();
            const deviceId = eventData.deviceId || 'unknown-device';
            const sessionId = eventData.sessionId || 'unknown-session';

            // Traiter chaque événement
            eventData.events.forEach(event => {
                const processedEvent = {
                    id: this.generateEventId(),
                    timestamp: event.timestamp || timestamp,
                    deviceId: deviceId,
                    sessionId: sessionId,
                    eventType: event.eventType,
                    data: event.data || {}
                };

                // Ajouter à la liste
                this.accessibilityEvents.unshift(processedEvent);

                // Maintenir la limite
                if (this.accessibilityEvents.length > this.maxEvents) {
                    this.accessibilityEvents = this.accessibilityEvents.slice(0, this.maxEvents);
                }

                // Mettre à jour les statistiques
                this.updateDeviceStats(deviceId, processedEvent);
                this.updateSessionStats(sessionId, processedEvent);
            });

            console.log(`📱 ${eventData.events.length} événement(s) d'accessibilité reçus de ${deviceId}`);
            return { success: true, processed: eventData.events.length };

        } catch (error) {
            console.error('❌ Erreur lors de l\'ajout d\'événement d\'accessibilité:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Génère un ID unique pour un événement
     */
    generateEventId() {
        return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Met à jour les statistiques par appareil
     */
    updateDeviceStats(deviceId, event) {
        if (!this.deviceStats.has(deviceId)) {
            this.deviceStats.set(deviceId, {
                totalEvents: 0,
                eventTypes: new Set(),
                apps: new Set(),
                lastActivity: null,
                firstActivity: null
            });
        }

        const stats = this.deviceStats.get(deviceId);
        stats.totalEvents++;
        stats.eventTypes.add(event.eventType);
        stats.apps.add(event.data.packageName || 'unknown');
        stats.lastActivity = event.timestamp;
        if (!stats.firstActivity) {
            stats.firstActivity = event.timestamp;
        }
    }

    /**
     * Met à jour les statistiques par session
     */
    updateSessionStats(sessionId, event) {
        if (!this.sessionStats.has(sessionId)) {
            this.sessionStats.set(sessionId, {
                totalEvents: 0,
                eventTypes: new Set(),
                apps: new Set(),
                startTime: event.timestamp,
                endTime: event.timestamp
            });
        }

        const stats = this.sessionStats.get(sessionId);
        stats.totalEvents++;
        stats.eventTypes.add(event.eventType);
        stats.apps.add(event.data.packageName || 'unknown');
        stats.endTime = event.timestamp;
    }

    /**
     * Génère un rapport d'auscultation
     */
    generateAuscultationReport(deviceId = null, sessionId = null) {
        try {
            const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const timestamp = Date.now();

            // Filtrer les événements selon les critères
            let filteredEvents = this.accessibilityEvents;
            if (deviceId) {
                filteredEvents = filteredEvents.filter(e => e.deviceId === deviceId);
            }
            if (sessionId) {
                filteredEvents = filteredEvents.filter(e => e.sessionId === sessionId);
            }

            // Analyser les événements
            const analysis = this.analyzeEvents(filteredEvents);

            // Créer le rapport
            const report = {
                id: reportId,
                timestamp: timestamp,
                deviceId: deviceId,
                sessionId: sessionId,
                totalEvents: filteredEvents.length,
                analysis: analysis,
                summary: this.generateReportSummary(analysis),
                recommendations: this.generateRecommendations(analysis)
            };

            // Sauvegarder le rapport
            this.auscultationReports.unshift(report);

            // Nettoyer les anciens rapports
            this.cleanupOldReports();

            console.log(`📊 Rapport d'auscultation généré: ${reportId}`);
            return { success: true, report: report };

        } catch (error) {
            console.error('❌ Erreur lors de la génération du rapport:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Analyse les événements pour extraire des insights
     */
    analyzeEvents(events) {
        const analysis = {
            eventTypeDistribution: {},
            appDistribution: {},
            timeDistribution: {},
            userBehavior: {},
            performance: {},
            accessibility: {}
        };

        // Distribution par type d'événement
        events.forEach(event => {
            const eventType = event.eventType;
            analysis.eventTypeDistribution[eventType] = (analysis.eventTypeDistribution[eventType] || 0) + 1;
        });

        // Distribution par application
        events.forEach(event => {
            const app = event.data.packageName || 'unknown';
            analysis.appDistribution[app] = (analysis.appDistribution[app] || 0) + 1;
        });

        // Distribution temporelle (par heure)
        events.forEach(event => {
            const hour = new Date(event.timestamp).getHours();
            analysis.timeDistribution[hour] = (analysis.timeDistribution[hour] || 0) + 1;
        });

        // Comportement utilisateur
        analysis.userBehavior = {
            totalSessions: new Set(events.map(e => e.sessionId)).size,
            averageEventsPerSession: events.length / new Set(events.map(e => e.sessionId)).size,
            mostActiveApp: this.getMostFrequent(analysis.appDistribution),
            mostCommonEventType: this.getMostFrequent(analysis.eventTypeDistribution)
        };

        // Performance
        analysis.performance = {
            eventsPerMinute: this.calculateEventsPerMinute(events),
            peakActivityHour: this.getPeakHour(analysis.timeDistribution),
            averageEventInterval: this.calculateAverageEventInterval(events)
        };

        // Accessibilité
        analysis.accessibility = {
            totalApps: Object.keys(analysis.appDistribution).length,
            eventTypes: Object.keys(analysis.eventTypeDistribution).length,
            coverage: this.calculateAccessibilityCoverage(events)
        };

        return analysis;
    }

    /**
     * Génère un résumé du rapport
     */
    generateReportSummary(analysis) {
        return {
            totalEvents: analysis.userBehavior.totalSessions,
            mostActiveApp: analysis.userBehavior.mostActiveApp,
            mostCommonAction: analysis.userBehavior.mostCommonEventType,
            peakActivity: analysis.performance.peakActivityHour,
            accessibilityScore: analysis.accessibility.coverage
        };
    }

    /**
     * Génère des recommandations basées sur l'analyse
     */
    generateRecommendations(analysis) {
        const recommendations = [];

        // Recommandations basées sur la performance
        if (analysis.performance.eventsPerMinute > 100) {
            recommendations.push({
                type: 'performance',
                message: 'Activité élevée détectée - considérer l\'optimisation des événements',
                priority: 'medium'
            });
        }

        // Recommandations basées sur l'accessibilité
        if (analysis.accessibility.coverage < 0.5) {
            recommendations.push({
                type: 'accessibility',
                message: 'Couverture d\'accessibilité faible - vérifier la configuration',
                priority: 'high'
            });
        }

        // Recommandations basées sur les applications
        const appCount = Object.keys(analysis.appDistribution).length;
        if (appCount > 10) {
            recommendations.push({
                type: 'scope',
                message: 'Surveillance de nombreuses applications - considérer le filtrage',
                priority: 'low'
            });
        }

        return recommendations;
    }

    /**
     * Utilitaires d'analyse
     */
    getMostFrequent(distribution) {
        return Object.entries(distribution)
            .sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';
    }

    calculateEventsPerMinute(events) {
        if (events.length === 0) return 0;
        const timeSpan = Math.max(...events.map(e => e.timestamp)) - Math.min(...events.map(e => e.timestamp));
        const minutes = timeSpan / (1000 * 60);
        return minutes > 0 ? Math.round(events.length / minutes) : 0;
    }

    getPeakHour(timeDistribution) {
        return Object.entries(timeDistribution)
            .sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';
    }

    calculateAverageEventInterval(events) {
        if (events.length < 2) return 0;
        const sortedEvents = events.sort((a, b) => a.timestamp - b.timestamp);
        let totalInterval = 0;
        for (let i = 1; i < sortedEvents.length; i++) {
            totalInterval += sortedEvents[i].timestamp - sortedEvents[i-1].timestamp;
        }
        return Math.round(totalInterval / (sortedEvents.length - 1));
    }

    calculateAccessibilityCoverage(events) {
        const uniqueApps = new Set(events.map(e => e.data.packageName)).size;
        const uniqueEventTypes = new Set(events.map(e => e.eventType)).size;
        return Math.min(uniqueApps / 10, uniqueEventTypes / 10); // Score normalisé
    }

    /**
     * Nettoie les anciens rapports
     */
    cleanupOldReports() {
        const cutoffTime = Date.now() - (this.reportRetentionDays * 24 * 60 * 60 * 1000);
        this.auscultationReports = this.auscultationReports.filter(r => r.timestamp > cutoffTime);
    }

    /**
     * Obtient les statistiques globales
     */
    getGlobalStats() {
        return {
            totalEvents: this.accessibilityEvents.length,
            totalDevices: this.deviceStats.size,
            totalSessions: this.sessionStats.size,
            totalReports: this.auscultationReports.length,
            lastActivity: this.accessibilityEvents[0]?.timestamp || null
        };
    }

    /**
     * Obtient les événements récents
     */
    getRecentEvents(limit = 50) {
        return this.accessibilityEvents.slice(0, limit);
    }

    /**
     * Obtient tous les rapports
     */
    getAllReports() {
        return this.auscultationReports;
    }

    /**
     * Obtient un rapport spécifique
     */
    getReport(reportId) {
        return this.auscultationReports.find(r => r.id === reportId);
    }

    /**
     * Efface les événements d'un appareil ou d'une session
     */
    clearEvents(deviceId = null, sessionId = null) {
        if (deviceId) {
            this.accessibilityEvents = this.accessibilityEvents.filter(e => e.deviceId !== deviceId);
            this.deviceStats.delete(deviceId);
        }
        if (sessionId) {
            this.accessibilityEvents = this.accessibilityEvents.filter(e => e.sessionId !== sessionId);
            this.sessionStats.delete(sessionId);
        }
        if (!deviceId && !sessionId) {
            this.accessibilityEvents = [];
            this.deviceStats.clear();
            this.sessionStats.clear();
        }
    }
}

module.exports = AccessibilityAuscultation;
