# 🔍 Intégration d'Auscultation d'Accessibilité

## Vue d'ensemble

Ce guide documente l'intégration complète du système d'auscultation d'accessibilité dans le projet de tracking web. Le système permet de surveiller et analyser les événements d'accessibilité Android en temps réel.

## 🏗️ Architecture

### Composants principaux

1. **OptimizedCarrefourTrackingService.kt** - Service d'accessibilité Android optimisé
2. **AccessibilityHttpClient.kt** - Client HTTP pour envoyer les événements
3. **accessibility-auscultation.js** - Module Node.js de traitement des événements
4. **accessibility-dashboard.html** - Interface web de visualisation
5. **server.js** - Serveur Express avec endpoints d'API

### Flux de données

```
Android App → OptimizedCarrefourTrackingService → AccessibilityHttpClient → 
Server API → accessibility-auscultation.js → WebSocket → Dashboard
```

## 📁 Fichiers créés/modifiés

### Nouveaux fichiers

- `android-app/app/src/main/java/com/bascule/leclerctracking/utils/AccessibilityHttpClient.kt`
- `public/accessibility-dashboard.html`
- `accessibility-auscultation.js`
- `test-accessibility-integration.js`
- `test-accessibility-integration.ps1`
- `build-accessibility-apk.ps1`

### Fichiers modifiés

- `android-app/app/src/main/java/com/bascule/leclerctracking/service/OptimizedCarrefourTrackingService.kt`
- `server.js`

## 🚀 Installation et Configuration

### 1. Prérequis

- Node.js (v14+)
- Android SDK
- Gradle
- ADB (Android Debug Bridge)

### 2. Installation des dépendances

```bash
npm install
```

### 3. Build de l'APK

```powershell
.\build-accessibility-apk.ps1
```

### 4. Démarrage du serveur

```bash
node server.js
```

### 5. Test d'intégration

```powershell
.\test-accessibility-integration.ps1
```

## 🔧 Configuration

### URLs de serveur

Dans `AccessibilityHttpClient.kt`, configurez l'URL du serveur :

```kotlin
private const val SERVER_URL = "http://10.0.2.2:3001" // Pour l'émulateur
// private const val SERVER_URL = "http://192.168.1.100:3001" // Pour un appareil physique
```

### Permissions Android

Assurez-vous que l'application a les permissions nécessaires dans `AndroidManifest.xml` :

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

## 📊 API Endpoints

### Événements d'accessibilité

- `POST /api/accessibility-events` - Recevoir des événements
- `GET /api/accessibility-stats` - Statistiques globales
- `POST /api/accessibility-events-clear` - Effacer les événements

### Rapports d'auscultation

- `POST /api/auscultation-report` - Générer un rapport
- `GET /api/auscultation-reports` - Lister tous les rapports
- `GET /api/auscultation-reports/:reportId` - Récupérer un rapport

### Dashboard

- `GET /accessibility-dashboard` - Interface de visualisation

## 🎯 Utilisation

### 1. Démarrage du système

```bash
# Terminal 1: Serveur
node server.js

# Terminal 2: Test
.\test-accessibility-integration.ps1
```

### 2. Accès au dashboard

Ouvrez http://localhost:3001/accessibility-dashboard dans votre navigateur.

### 3. Activation du service Android

1. Installez l'APK sur l'appareil
2. Allez dans Paramètres > Accessibilité
3. Activez "CrossAppTracking" ou "OptimizedCarrefourTracking"
4. Lancez l'application Carrefour

### 4. Surveillance en temps réel

Le dashboard affiche :
- Événements d'accessibilité en temps réel
- Statistiques par type d'événement
- Distribution par application
- Rapports d'auscultation générés

## 🔍 Fonctionnalités

### Extraction d'informations produit

Le système extrait automatiquement :
- Noms de produits
- Prix
- Actions d'ajout au panier
- Informations de navigation
- Données de scroll

### Analyse comportementale

- Détection des patterns d'utilisation
- Identification des applications les plus utilisées
- Analyse des performances
- Recommandations d'optimisation

### Rapports d'auscultation

- Génération automatique de rapports
- Analyse des tendances
- Métriques de performance
- Recommandations personnalisées

## 🐛 Dépannage

### Problèmes courants

1. **Serveur non accessible**
   - Vérifiez que le port 3001 est libre
   - Redémarrez le serveur

2. **Événements non reçus**
   - Vérifiez la configuration réseau
   - Assurez-vous que le service d'accessibilité est activé

3. **APK ne se compile pas**
   - Vérifiez que tous les fichiers sont présents
   - Nettoyez le build avec `./gradlew clean`

### Logs utiles

```bash
# Logs Android
adb logcat | grep "OptimizedCarrefour"

# Logs serveur
# Vérifiez la console du serveur Node.js
```

## 📈 Métriques et KPIs

### Événements surveillés

- Clics sur des boutons
- Scroll dans les listes
- Changements de fenêtre
- Modifications de contenu
- Actions de navigation

### Métriques calculées

- Événements par minute
- Applications les plus actives
- Types d'événements les plus fréquents
- Temps de session moyen
- Score d'accessibilité

## 🔮 Évolutions futures

### Améliorations prévues

1. **Machine Learning**
   - Détection automatique de patterns
   - Prédiction des actions utilisateur
   - Classification intelligente des événements

2. **Analytics avancées**
   - Heatmaps d'utilisation
   - Funnels de conversion
   - A/B testing intégré

3. **Intégrations**
   - Export vers Google Analytics
   - Intégration avec des outils de monitoring
   - API REST complète

## 📚 Ressources

### Documentation technique

- [Android Accessibility Service](https://developer.android.com/guide/topics/ui/accessibility/service)
- [Node.js WebSocket](https://socket.io/docs/v4/)
- [Express.js API](https://expressjs.com/en/api.html)

### Fichiers de configuration

- `app-configs.json` - Configuration des applications
- `package.json` - Dépendances Node.js
- `build.gradle` - Configuration Android

---

**Note** : Ce système est conçu pour fonctionner avec la branche `feature/diff-detection-with-docs` qui contient `OptimizedCarrefourTrackingService` au lieu de l'ancien `CrossAppTrackingService`.
