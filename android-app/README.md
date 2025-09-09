# Leclerc Tracking Android App

Application Android native pour tester le tracking mobile vs web du système Bascule.

## 🎯 Fonctionnalités

- **WebView intégrée** : Charge le site Leclerc mobile local
- **Tracking natif Android** : Capture les événements tactiles natifs
- **Bridge JavaScript** : Synchronise le tracking web et Android
- **Interface de debug** : Affichage en temps réel des événements
- **Export de données** : Sauvegarde des données de tracking

## 🚀 Installation et Build

### Prérequis
- Android Studio Arctic Fox ou plus récent
- SDK Android 24+ (Android 7.0)
- Gradle 8.2+
- Kotlin 1.9+

### Étapes d'installation

1. **Ouvrir dans Android Studio**
   ```bash
   # Ouvrir le dossier android-app dans Android Studio
   File > Open > Sélectionner le dossier android-app
   ```

2. **Synchroniser Gradle**
   - Android Studio va automatiquement détecter le projet
   - Cliquer sur "Sync Now" si demandé

3. **Configurer l'émulateur ou appareil**
   - **Émulateur** : Créer un AVD avec API 24+
   - **Appareil physique** : Activer le mode développeur et débogage USB

4. **Modifier l'URL du serveur**
   - Dans `MainActivity.kt`, ligne 120 :
   ```kotlin
   // Pour émulateur Android
   val localUrl = "http://10.0.2.2:3001/leclerc-mobile"
   
   // Pour appareil physique (remplacer par votre IP)
   val localUrl = "http://192.168.1.XXX:3001/leclerc-mobile"
   ```

5. **Build et Run**
   ```bash
   # Via Android Studio
   Run > Run 'app'
   
   # Via ligne de commande
   ./gradlew assembleDebug
   ```

## 📱 Utilisation

1. **Lancer le serveur web** (dans le dossier parent)
   ```bash
   node server.js
   ```

2. **Installer l'APK** sur l'émulateur/appareil

3. **Tester le tracking** :
   - L'app charge automatiquement le site Leclerc mobile
   - Les interactions tactiles sont trackées nativement
   - Les événements web sont bridgés vers Android
   - Utiliser le menu pour exporter les données

## 🔧 Architecture

```
MainActivity.kt              # Activité principale avec WebView
├── AndroidTrackingManager   # Gestionnaire de tracking natif
├── TrackingViewModel       # ViewModel pour les données
├── JavaScriptInterface    # Bridge web-Android
└── Models/
    ├── TrackingEvent      # Modèle d'événement
    └── TrackingSession    # Modèle de session
```

## 📊 Comparaison Mobile vs Web

L'app permet de comparer :
- **Événements natifs** : Touch, swipe, orientation
- **Événements web** : Click, scroll, navigation
- **Performance** : Temps de réponse, fluidité
- **Comportement utilisateur** : Patterns d'interaction

## 🛠️ Debug

- **Logs Android** : `adb logcat | grep "AndroidTracking"`
- **Logs WebView** : `adb logcat | grep "WebViewJS"`
- **Export JSON** : Menu > Exporter (logs dans Logcat)

## 🔗 Intégration

L'app s'intègre avec :
- Serveur web local (port 3001)
- Dashboard de comparaison (`/comparison`)
- API Bascule existante (configuration requise)
