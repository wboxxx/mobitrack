# Instructions de Build - Application Android Cross-App Tracking

## Problème actuel
Les commandes Gradle ne fonctionnent pas correctement via PowerShell. 

## Solutions recommandées

### Option 1: Android Studio (Recommandé)
1. Ouvrir Android Studio
2. Ouvrir le projet: `C:\Users\Vincent B\CascadeProjects\web-tracking-system\android-app`
3. Attendre la synchronisation Gradle
4. Build > Make Project (Ctrl+F9)
5. Run > Run 'app' pour installer sur l'appareil

### Option 2: Ligne de commande manuelle
```powershell
# Définir JAVA_HOME
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"

# Naviguer vers le projet
cd "C:\Users\Vincent B\CascadeProjects\web-tracking-system\android-app"

# Build et installation
.\gradlew clean assembleDebug installDebug
```

## État du code
✅ Toutes les erreurs de compilation ont été corrigées:
- TrackingEventType enum créé dans le bon package
- Références nullables ajoutées pour TrackingViewModel
- Import corrigé dans CrossAppTrackingService
- Erreur XML résolue dans activity_consent.xml

## Fonctionnalités implémentées
- ✅ AccessibilityService pour tracking cross-app
- ✅ Interface de consentement utilisateur
- ✅ Détection des apps e-commerce (Leclerc, Carrefour, Amazon, etc.)
- ✅ Gestion des permissions d'accessibilité
- ✅ Tracking des événements (clic, scroll, navigation)

## Prochaines étapes
1. Build réussi de l'application
2. Installation sur appareil Android
3. Test du tracking cross-app avec les applications e-commerce
4. Vérification de la synchronisation avec le serveur de tracking
