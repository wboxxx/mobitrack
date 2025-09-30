# 🚀 Guide Multi-Apps & Test Automation

Guide complet pour étendre le système de tracking à d'autres applications e-commerce et automatiser les tests.

---

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture du système](#architecture-du-système)
3. [Installation](#installation)
4. [Utilisation](#utilisation)
5. [Ajouter une nouvelle app](#ajouter-une-nouvelle-app)
6. [Créer des flows de test](#créer-des-flows-de-test)
7. [Debugging](#debugging)

---

## 🎯 Vue d'ensemble

Le système de tracking a été étendu pour supporter **plusieurs applications e-commerce** avec :

- ✅ **Configuration centralisée** : Fichier JSON unique pour toutes les apps
- ✅ **Détection automatique** : Reconnaissance automatique de l'app depuis le package name
- ✅ **Patterns spécifiques** : Boutons, prix, navigation adaptés à chaque app
- ✅ **Tests automatisés** : Flows de test reproductibles avec Appium
- ✅ **Dashboard interactif** : Sélection d'app et lancement de tests depuis l'interface

### Apps supportées

| App | Package | Status |
|-----|---------|--------|
| **Carrefour** | `com.carrefour.fid.android` | ✅ Opérationnel |
| **Amazon** | `com.amazon.mShop.android.shopping` | ✅ Configuré |
| **Fnac** | `com.fnac.android` | ✅ Configuré |
| **Auchan** | `fr.auchan.mobile.android` | ✅ Configuré |
| **E.Leclerc** | `com.eleclerc.mobile` | ✅ Configuré |

---

## 🏗️ Architecture du système

```
web-tracking-system/
├── app-configs.json              # Configuration multi-apps
├── app-config-manager.js         # Gestionnaire de configuration
├── server.js                     # Serveur avec endpoints API
├── public/
│   ├── dashboard.html            # Dashboard tracking temps réel
│   └── test-dashboard.html       # Dashboard test automation
└── test-automation/
    ├── appium-test-runner.js     # Runner de tests Appium
    ├── run-test.js               # Script CLI pour lancer tests
    ├── package.json              # Dépendances Appium
    └── README.md                 # Documentation détaillée
```

### Flux de données

```
┌─────────────────┐
│  App Mobile     │
│  (Carrefour,    │
│   Amazon, etc.) │
└────────┬────────┘
         │ Événements
         ▼
┌─────────────────┐
│  APK Tracking   │
│  (Accessibility │
│   Service)      │
└────────┬────────┘
         │ HTTP POST
         ▼
┌─────────────────┐
│  Server.js      │
│  + AppConfig    │
│    Manager      │
└────────┬────────┘
         │ WebSocket
         ▼
┌─────────────────┐
│  Dashboard      │
│  (Temps réel)   │
└─────────────────┘
```

---

## 📦 Installation

### 1. Prérequis

```bash
# Node.js 16+
node --version

# Appium (pour tests automatisés)
npm install -g appium
appium driver install uiautomator2

# Android SDK
# Configurer ANDROID_HOME dans les variables d'environnement
```

### 2. Installation des dépendances

```bash
# Dépendances serveur (déjà installées)
cd web-tracking-system
npm install

# Dépendances test automation
cd test-automation
npm install
```

### 3. Vérification

```bash
# Vérifier que tout est OK
node -e "console.log('Node.js OK')"
appium --version
adb devices
```

---

## 🎮 Utilisation

### Démarrage du serveur

```bash
cd web-tracking-system
node server.js
```

Le serveur démarre sur **http://localhost:3001** avec :
- Dashboard tracking : http://localhost:3001/dashboard
- Dashboard tests : http://localhost:3001/test-dashboard

### Lancer un test automatisé

#### Option 1 : Via le dashboard web

1. Ouvrir http://localhost:3001/test-dashboard
2. Sélectionner une application (ex: Carrefour)
3. Sélectionner un flow de test (ex: addToCart)
4. Ajouter des variables si nécessaire
5. Cliquer sur "Lancer le test"

#### Option 2 : Via la ligne de commande

```bash
cd test-automation

# Démarrer Appium dans un terminal séparé
appium --base-path /wd/hub

# Lancer un test
node run-test.js carrefour addToCart

# Avec variables
node run-test.js carrefour searchProduct '{"productName":"banane"}'

# Lister les apps et flows disponibles
node run-test.js --list

# Aide
node run-test.js --help
```

### Scripts npm disponibles

```bash
# Tests rapides
npm run test:carrefour
npm run test:amazon
npm run test:fnac
npm run test:auchan
npm run test:leclerc

# Lister les apps
npm run list

# Aide
npm run help
```

---

## ➕ Ajouter une nouvelle app

### Étape 1 : Éditer `app-configs.json`

```json
{
  "apps": {
    "monapp": {
      "name": "Mon App E-commerce",
      "packageName": "com.example.monapp",
      "appName": "Mon App",
      "buttonPatterns": {
        "addToCart": ["ajouter au panier", "add to cart", "+"],
        "removeFromCart": ["supprimer", "retirer", "-"],
        "search": ["rechercher", "search"],
        "cart": ["panier", "cart"]
      },
      "pricePatterns": [
        "\\d+[,.]\\d{2}\\s*€",
        "€\\s*\\d+[,.]\\d{2}",
        "\\$\\d+\\.\\d{2}"
      ],
      "navigationCategories": [
        "accueil", "home", "catégories", "compte",
        "rechercher", "panier", "menu"
      ],
      "scrollContainers": [
        "recyclerview", "scrollview", "listview"
      ],
      "testFlows": {
        "addToCart": {
          "name": "Ajout produit au panier",
          "steps": [
            {"action": "launch", "target": "com.example.monapp"},
            {"action": "wait", "duration": 3000},
            {"action": "click", "selector": {"text": "Rechercher"}},
            {"action": "input", "selector": {"id": "search_field"}, "text": "produit"},
            {"action": "wait", "duration": 2000},
            {"action": "click", "selector": {"index": 0}},
            {"action": "wait", "duration": 1000},
            {"action": "click", "selector": {"text": "Ajouter au panier"}},
            {"action": "wait", "duration": 2000}
          ]
        }
      }
    }
  }
}
```

### Étape 2 : Tester la configuration

```bash
# Recharger la configuration
curl -X POST http://localhost:3001/api/reload-config

# Vérifier que l'app apparaît
curl http://localhost:3001/api/apps

# Tester le flow
node test-automation/run-test.js monapp addToCart
```

### Étape 3 : Affiner les patterns

1. **Analyser les logs** du serveur pendant l'utilisation de l'app
2. **Identifier les patterns** de boutons, prix, navigation spécifiques
3. **Ajuster** `buttonPatterns`, `pricePatterns`, `navigationCategories`
4. **Retester** jusqu'à obtenir une détection précise

---

## 🔄 Créer des flows de test

### Structure d'un flow

```json
{
  "name": "Nom descriptif du flow",
  "steps": [
    {"action": "launch", "target": "package.name"},
    {"action": "wait", "duration": 3000},
    {"action": "click", "selector": {"text": "Bouton"}},
    {"action": "input", "selector": {"id": "field_id"}, "text": "valeur"},
    {"action": "scroll", "direction": "down", "count": 3},
    {"action": "verify", "selector": {"text": "Résultat"}}
  ]
}
```

### Actions disponibles

| Action | Description | Paramètres |
|--------|-------------|------------|
| `launch` | Lance l'app | `target`: package name |
| `wait` | Attend | `duration`: millisecondes |
| `click` | Clique sur élément | `selector`: objet sélecteur |
| `input` | Saisit du texte | `selector`, `text` |
| `scroll` | Scroll écran | `direction`, `count` |
| `swipe` | Swipe | `direction` |
| `pressKey` | Presse touche | `key`: ENTER, BACK, etc. |
| `verify` | Vérifie élément | `selector`, `expected` |

### Sélecteurs

```javascript
// Par texte
{"text": "Ajouter au panier"}

// Par ID
{"id": "button_add_to_cart"}

// Par classe et index
{"class": "Button", "index": 0}

// Par XPath
{"xpath": "//android.widget.Button[@text='OK']"}

// Par index simple
{"index": 0}
```

### Variables dynamiques

```json
{
  "action": "input",
  "selector": {"id": "search_field"},
  "text": "{{productName}}"
}
```

Utilisation :
```bash
node run-test.js monapp searchProduct '{"productName":"laptop"}'
```

### Exemple de flow complet

```json
{
  "checkout": {
    "name": "Processus de checkout complet",
    "steps": [
      {"action": "launch", "target": "com.example.shop"},
      {"action": "wait", "duration": 3000},
      
      // Recherche produit
      {"action": "click", "selector": {"id": "search_button"}},
      {"action": "input", "selector": {"id": "search_field"}, "text": "{{productName}}"},
      {"action": "pressKey", "key": "ENTER"},
      {"action": "wait", "duration": 2000},
      
      // Sélection produit
      {"action": "click", "selector": {"index": 0}},
      {"action": "wait", "duration": 2000},
      {"action": "scroll", "direction": "down", "count": 2},
      
      // Ajout au panier
      {"action": "click", "selector": {"text": "Ajouter au panier"}},
      {"action": "wait", "duration": 2000},
      
      // Vérification
      {"action": "verify", "selector": {"text": "Produit ajouté"}, "expected": {"text": "ajouté"}},
      
      // Aller au panier
      {"action": "click", "selector": {"id": "cart_button"}},
      {"action": "wait", "duration": 2000},
      
      // Checkout
      {"action": "click", "selector": {"text": "Commander"}},
      {"action": "wait", "duration": 3000}
    ]
  }
}
```

---

## 🐛 Debugging

### Problèmes courants

#### 1. Appium ne se connecte pas

```bash
# Vérifier qu'Appium tourne
curl http://localhost:4723/wd/hub/status

# Relancer Appium
appium --base-path /wd/hub --log-level debug
```

#### 2. Émulateur non détecté

```bash
# Lister les devices
adb devices

# Redémarrer ADB
adb kill-server
adb start-server
```

#### 3. Élément non trouvé

```bash
# Utiliser Appium Inspector pour analyser la hiérarchie
# Télécharger : https://github.com/appium/appium-inspector

# Ou utiliser uiautomatorviewer (Android SDK)
uiautomatorviewer
```

#### 4. App ne détecte pas les événements

**Vérifier les logs serveur :**
```bash
# Les logs montrent les événements reçus
🔍 ADD_TO_CART - Produit XYZ
🔄 Navigation détectée: Accueil - Converti en VIEW_CLICKED
🛒 VRAI ajout panier détecté: Banane
```

**Analyser la configuration :**
```bash
# Vérifier les patterns de l'app
curl http://localhost:3001/api/apps/carrefour | json_pp
```

**Ajuster les patterns :**
- Si trop de faux positifs → Rendre `buttonPatterns` plus restrictifs
- Si vrais ajouts manqués → Ajouter plus de patterns alternatifs
- Si navigation mal détectée → Enrichir `navigationCategories`

### Logs détaillés

#### Logs serveur
```bash
# Démarrer avec logs verbeux
DEBUG=* node server.js
```

#### Logs Appium
```bash
# Logs détaillés
appium --base-path /wd/hub --log-level debug

# Sauvegarder les logs
appium --base-path /wd/hub --log appium.log
```

#### Logs APK
```bash
# Voir les logs de l'APK de tracking
adb logcat | grep -i "CrossAppTracking"
```

### Outils utiles

```bash
# Capturer l'écran
adb shell screencap /sdcard/screen.png
adb pull /sdcard/screen.png

# Enregistrer une vidéo
adb shell screenrecord /sdcard/test.mp4
# Arrêter avec Ctrl+C
adb pull /sdcard/test.mp4

# Inspecter la hiérarchie UI en temps réel
adb shell uiautomator dump
adb pull /sdcard/window_dump.xml
```

---

## 📊 API Endpoints

Le serveur expose plusieurs endpoints pour interagir avec le système :

### Apps

```bash
# Lister toutes les apps
GET /api/apps

# Obtenir config d'une app
GET /api/apps/:appKey

# Obtenir flows d'une app
GET /api/apps/:appKey/flows

# Obtenir un flow spécifique
GET /api/apps/:appKey/flows/:flowKey
```

### Tests

```bash
# Lancer un test
POST /api/run-test
Body: {
  "app": "carrefour",
  "flow": "addToCart",
  "variables": {"productName": "banane"}
}

# Recharger la configuration
POST /api/reload-config
```

### Tracking

```bash
# Événements en temps réel
GET /api/tracking-data

# Historique des sessions
GET /api/sessions

# Analyse du panier
GET /api/cart-analysis
```

---

## 🎯 Bonnes pratiques

### Configuration des apps

1. **Commencer simple** : Ajouter d'abord les patterns de base
2. **Tester progressivement** : Valider chaque pattern individuellement
3. **Analyser les logs** : Observer les événements réels de l'app
4. **Itérer** : Affiner les patterns basés sur les résultats

### Création de flows

1. **Flows courts** : Préférer plusieurs flows courts qu'un long
2. **Attentes généreuses** : Laisser le temps à l'app de charger
3. **Vérifications** : Ajouter des `verify` pour valider les étapes
4. **Variables** : Utiliser des variables pour la flexibilité

### Tests automatisés

1. **Émulateur stable** : Utiliser un émulateur dédié aux tests
2. **État propre** : Réinitialiser l'app entre les tests
3. **Screenshots** : Activer les captures d'écran pour debugging
4. **Logs détaillés** : Conserver les logs pour analyse

---

## 🚀 Prochaines étapes

### Améliorations possibles

- [ ] **Support iOS** : Ajouter support XCUITest pour apps iOS
- [ ] **CI/CD** : Intégration GitHub Actions pour tests automatiques
- [ ] **Dashboard avancé** : Graphiques et statistiques temps réel
- [ ] **Export données** : Export CSV/JSON des événements
- [ ] **Alertes** : Notifications en cas d'échec de test
- [ ] **Comparaison apps** : Comparer comportements entre apps
- [ ] **ML/AI** : Détection automatique des patterns de boutons

### Contribuer

Pour ajouter une nouvelle app ou améliorer un flow existant :

1. Éditer `app-configs.json`
2. Tester localement
3. Documenter les patterns spécifiques
4. Partager la configuration

---

## 📚 Ressources

- [Documentation Appium](https://appium.io/docs/en/latest/)
- [WebdriverIO](https://webdriver.io/)
- [UiAutomator2](https://github.com/appium/appium-uiautomator2-driver)
- [Android Accessibility](https://developer.android.com/guide/topics/ui/accessibility)

---

**Système créé le 30/09/2025**  
**Version 2.0 - Multi-Apps & Test Automation**
