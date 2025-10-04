# 🔍 Auscultation d'Accessibilité - Guide d'Intégration

## Vue d'ensemble

Le module d'auscultation d'accessibilité permet d'analyser intelligemment les événements d'accessibilité Android pour comprendre le comportement des utilisateurs dans les applications e-commerce.

## 🚀 Fonctionnalités

### ✅ Analyse Intelligente
- **Classification automatique** des actions (ADD_TO_CART, CART_VIEW, SEARCH, etc.)
- **Détection de patterns** spécifiques (ajouter au panier, recherche, etc.)
- **Calcul de confiance** pour chaque classification
- **Support multi-langues** (français et anglais)

### 📊 Rapports Détaillés
- **Timeline des événements** avec horodatage
- **Carte des capacités** de l'application
- **Rapport de confiance** avec signaux forts/faibles
- **Suggestions d'amélioration**

### 🎯 Intégration Complète
- **API REST** pour recevoir et analyser les événements
- **Dashboard web** pour visualiser les rapports
- **WebSocket** pour les mises à jour en temps réel
- **Support multi-périphériques**

## 📁 Structure des Fichiers

```
├── accessibility-auscultation.js          # Module principal d'analyse
├── public/accessibility-dashboard.html    # Interface web
├── test-accessibility-auscultation.js     # Script de test
├── test-accessibility-auscultation.ps1    # Script PowerShell
└── server.js                              # Serveur avec endpoints intégrés
```

## 🔧 Installation et Configuration

### 1. Dépendances
```bash
npm install axios
```

### 2. Démarrage du serveur
```bash
node server.js
```

### 3. Accès au dashboard
Ouvrez http://localhost:3001/accessibility-dashboard

## 📡 API Endpoints

### Recevoir des événements d'accessibilité
```http
POST /api/accessibility-events
Content-Type: application/json

{
  "events": [
    {
      "eventType": "VIEW_CLICKED",
      "timestamp": "2025-10-04T10:00:00.000Z",
      "data": {
        "packageName": "com.carrefour.mobile",
        "element": {
          "className": "android.widget.Button",
          "text": "Ajouter au panier",
          "bounds": { "left": 100, "top": 500, "right": 300, "bottom": 550 }
        },
        "productInfo": {
          "productName": "Bananes bio",
          "price": "2.99€"
        }
      }
    }
  ],
  "deviceId": "device-001",
  "sessionId": "session-123"
}
```

### Générer un rapport d'auscultation
```http
POST /api/auscultation-report
Content-Type: application/json

{
  "deviceId": "device-001",
  "sessionId": "session-123",
  "timeRange": {
    "start": "2025-10-04T10:00:00.000Z",
    "end": "2025-10-04T11:00:00.000Z"
  }
}
```

### Récupérer les rapports
```http
GET /api/auscultation-reports?deviceId=device-001&limit=10
```

### Obtenir les statistiques
```http
GET /api/accessibility-stats?deviceId=device-001
```

## 🧪 Test de la Fonctionnalité

### Test automatique
```bash
# Test complet
node test-accessibility-auscultation.js

# Nettoyage des données
node test-accessibility-auscultation.js --cleanup

# Test avec PowerShell
.\test-accessibility-auscultation.ps1
```

### Test manuel
1. Ouvrez http://localhost:3001/accessibility-dashboard
2. Utilisez l'interface pour générer des rapports
3. Consultez les statistiques en temps réel

## 📱 Intégration Android

### Exemple d'envoi d'événements depuis Android
```kotlin
// Dans votre service Android
private fun sendAccessibilityEvent(event: AccessibilityEvent) {
    val eventData = mapOf(
        "eventType" to event.eventType.toString(),
        "timestamp" to System.currentTimeMillis().toString(),
        "data" to mapOf(
            "packageName" to event.packageName?.toString(),
            "element" to mapOf(
                "className" to event.className?.toString(),
                "text" to event.text?.toString(),
                "contentDescription" to event.contentDescription?.toString(),
                "bounds" to mapOf(
                    "left" to event.source?.boundsInScreen?.left,
                    "top" to event.source?.boundsInScreen?.top,
                    "right" to event.source?.boundsInScreen?.right,
                    "bottom" to event.source?.boundsInScreen?.bottom
                )
            )
        )
    )
    
    // Envoyer via HTTP POST vers /api/accessibility-events
    httpClient.post("/api/accessibility-events", eventData)
}
```

## 🎯 Types d'Événements Supportés

### Événements Android
- `VIEW_CLICKED` - Clic sur un élément
- `SCROLL` - Défilement
- `VIEW_SCROLLED` - Élément défilé
- `CONTENT_CHANGED` - Contenu modifié
- `VIEW_TEXT_CHANGED` - Texte modifié
- `WINDOW_STATE_CHANGED` - Changement de fenêtre

### Catégories Détectées
- `ADD_TO_CART` - Ajout au panier
- `CART_VIEW` - Visualisation du panier
- `SEARCH` - Recherche
- `NAVIGATION` - Navigation
- `PRODUCT_LIST` - Liste de produits
- `PRODUCT_DETAIL` - Détail produit
- `CHECKOUT_START` - Début de commande
- `PAYMENT` - Paiement
- `LOGIN/REGISTER` - Connexion/Inscription
- `FILTER/SORT` - Filtrage/Tri
- `FORM_ENTRY` - Saisie de formulaire
- `CLICK` - Clic générique
- `SCROLL` - Défilement
- `UNKNOWN` - Non catégorisé

## 📊 Exemple de Rapport

```json
{
  "app_profile": {
    "package": "com.carrefour.mobile",
    "likely_brand": "Carrefour",
    "event_count": 6,
    "first_seen": "2025-10-04T10:00:00.000Z",
    "last_seen": "2025-10-04T10:00:25.000Z"
  },
  "capability_map": {
    "emits_clicks": true,
    "emits_scrolls": true,
    "exposes_ids": true,
    "text_richness": "low",
    "structure": {
      "recyclerView": true,
      "tabs": false,
      "bottom_nav": false,
      "webview_ratio": "low"
    }
  },
  "session_timeline": [
    {
      "ts": "2025-10-04T10:00:00.000Z",
      "category": "ADD_TO_CART",
      "label": "Ajouter au panier",
      "confidence": 0.65
    }
  ],
  "categorized_events": [
    {
      "category": "ADD_TO_CART",
      "count": 1,
      "examples": ["Ajouter au panier"]
    }
  ],
  "summary_md": "- **App détectée** : Carrefour (com.carrefour.mobile).\n- **Événements** : 6 bruts, 4 catégorisés.\n- **Add-to-cart détectés** : 1 (confiance élevée)."
}
```

## 🔧 Configuration Avancée

### Personnalisation des patterns
Modifiez `accessibility-auscultation.js` pour ajouter des patterns spécifiques :

```javascript
// Ajouter des patterns personnalisés
if (/(mon_pattern)/i.test(text)) {
  capabilities.known_patterns.custom.add(text.trim());
}
```

### Intégration avec app-configs.json
Le module utilise automatiquement les configurations d'applications définies dans `app-configs.json` pour améliorer la détection.

## 🚨 Dépannage

### Problèmes courants

1. **Serveur non accessible**
   - Vérifiez que le serveur est démarré : `node server.js`
   - Vérifiez le port : http://localhost:3001

2. **Événements non reçus**
   - Vérifiez la structure JSON des événements
   - Vérifiez les logs du serveur

3. **Rapports vides**
   - Vérifiez que des événements ont été envoyés
   - Vérifiez les filtres (deviceId, sessionId, timeRange)

### Logs utiles
```bash
# Logs du serveur
node server.js

# Test avec logs détaillés
DEBUG=* node test-accessibility-auscultation.js
```

## 📈 Métriques et Performance

### Métriques surveillées
- Nombre d'événements reçus par seconde
- Temps de génération des rapports
- Taux de classification correcte
- Utilisation mémoire

### Optimisations
- Les événements sont stockés en mémoire (pour la démo)
- Pour la production, considérez une base de données
- Limitez le nombre d'événements stockés

## 🔮 Prochaines Améliorations

- [ ] Support de base de données persistante
- [ ] Machine Learning pour améliorer la classification
- [ ] Export des rapports en PDF
- [ ] Intégration avec des outils d'analytics
- [ ] Support d'autres plateformes (iOS)

## 📞 Support

Pour toute question ou problème :
1. Consultez les logs du serveur
2. Vérifiez la structure des événements
3. Testez avec le script de test fourni
4. Consultez la documentation de l'API

---

**Note** : Ce module est conçu pour fonctionner avec le système de tracking existant et peut être étendu selon vos besoins spécifiques.
