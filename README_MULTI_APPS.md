# 🛒 Multi-Apps E-commerce Tracking & Test Automation

Système de tracking cross-app et d'automatisation de tests pour applications e-commerce mobile Android.

[![Version](https://img.shields.io/badge/version-2.0-blue.svg)](https://github.com)
[![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](https://nodejs.org)
[![Appium](https://img.shields.io/badge/appium-2.11.0-purple.svg)](https://appium.io)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

---

## 🎯 Fonctionnalités

### 📱 Multi-Apps Support
- ✅ **5 apps pré-configurées** : Carrefour, Amazon, Fnac, Auchan, E.Leclerc
- ✅ **Détection automatique** de l'app depuis le package name
- ✅ **Patterns spécifiques** : boutons, prix, navigation adaptés par app
- ✅ **Extensible** : Ajouter une nouvelle app en 2 minutes

### 🤖 Test Automation
- ✅ **Flows reproductibles** avec Appium
- ✅ **8 actions** : launch, click, input, scroll, swipe, wait, pressKey, verify
- ✅ **Variables dynamiques** pour flexibilité
- ✅ **Screenshots automatiques** à chaque étape
- ✅ **Résultats JSON** détaillés

### 📊 Dashboards
- ✅ **Dashboard tracking** : Événements temps réel (clics, ajouts panier, scrolls)
- ✅ **Dashboard tests** : Interface web pour lancer tests
- ✅ **WebSocket** : Mise à jour en temps réel
- ✅ **Filtrage intelligent** : Navigation vs vrais ajouts

### 🔌 API REST
- ✅ **10 endpoints** pour intégration
- ✅ **Gestion apps** : Liste, config, flows
- ✅ **Lancement tests** : POST avec variables
- ✅ **Tracking data** : Événements et sessions

---

## 🚀 Quick Start

### Installation

```bash
# Cloner le projet
git clone <repo>
cd web-tracking-system

# Installer les dépendances
npm install

# Installer Appium (pour tests)
npm install -g appium
appium driver install uiautomator2
```

### Démarrage

```bash
# Lancer le serveur
node server.js

# Ouvrir les dashboards
# Tracking : http://localhost:3001/dashboard
# Tests : http://localhost:3001/test-dashboard
```

### Premier test

```bash
# Terminal 1 : Lancer Appium
cd test-automation
appium --base-path /wd/hub

# Terminal 2 : Lancer un test
node run-test.js carrefour addToCart
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| **[QUICK_START.md](QUICK_START.md)** | Démarrage en 5 minutes |
| **[GUIDE_MULTI_APPS.md](GUIDE_MULTI_APPS.md)** | Guide complet (500+ lignes) |
| **[test-automation/README.md](test-automation/README.md)** | Documentation Appium |
| **[SNAPSHOT_MULTI_APPS_2025-09-30.md](SNAPSHOT_MULTI_APPS_2025-09-30.md)** | État du système |

---

## 🏗️ Architecture

```
┌─────────────────┐
│  App Mobile     │  Carrefour, Amazon, Fnac, etc.
└────────┬────────┘
         │ Événements
         ▼
┌─────────────────┐
│  APK Tracking   │  Accessibility Service Android
└────────┬────────┘
         │ HTTP POST
         ▼
┌─────────────────────────────┐
│  Server.js                  │
│  + AppConfigManager         │  Détection auto + filtrage
└────────┬────────────────────┘
         │ WebSocket
         ▼
┌─────────────────┐
│  Dashboards     │  Tracking + Tests
└─────────────────┘

┌─────────────────────────────┐
│  Test Automation (Appium)   │
│  + AppiumTestRunner         │  Flows reproductibles
└────────┬────────────────────┘
         │ WebDriver
         ▼
┌─────────────────┐
│  Émulateur      │  Android
└─────────────────┘
```

---

## 📱 Apps supportées

| App | Package | Flows | Status |
|-----|---------|-------|--------|
| **Carrefour** | `com.carrefour.fid.android` | 3 | ✅ Testé |
| **Amazon** | `com.amazon.mShop.android.shopping` | 1 | ✅ Configuré |
| **Fnac** | `com.fnac.android` | 1 | ✅ Configuré |
| **Auchan** | `fr.auchan.mobile.android` | 1 | ✅ Configuré |
| **E.Leclerc** | `com.eleclerc.mobile` | 1 | ✅ Configuré |

---

## 🔧 Utilisation

### Lancer un test

**Via dashboard web :**
```
http://localhost:3001/test-dashboard
→ Sélectionner app
→ Sélectionner flow
→ Cliquer "Lancer le test"
```

**Via CLI :**
```bash
# Test simple
node run-test.js carrefour addToCart

# Avec variables
node run-test.js carrefour searchProduct '{"productName":"banane"}'

# Lister apps/flows
node run-test.js --list
```

**Via npm scripts :**
```bash
npm run test:carrefour
npm run test:amazon
npm run test:fnac
```

### API REST

```bash
# Lister les apps
curl http://localhost:3001/api/apps

# Obtenir config d'une app
curl http://localhost:3001/api/apps/carrefour

# Lancer un test
curl -X POST http://localhost:3001/api/run-test \
  -H "Content-Type: application/json" \
  -d '{"app":"carrefour","flow":"addToCart"}'
```

---

## ➕ Ajouter une app

### 1. Éditer `app-configs.json`

```json
{
  "apps": {
    "monapp": {
      "name": "Mon App",
      "packageName": "com.example.monapp",
      "buttonPatterns": {
        "addToCart": ["ajouter", "+"]
      },
      "pricePatterns": ["\\d+[,.]\\d{2}\\s*€"],
      "navigationCategories": ["accueil", "panier"],
      "testFlows": {
        "addToCart": {
          "name": "Ajout produit",
          "steps": [
            {"action": "launch", "target": "com.example.monapp"},
            {"action": "wait", "duration": 3000},
            {"action": "click", "selector": {"text": "Rechercher"}},
            {"action": "input", "selector": {"id": "search"}, "text": "produit"},
            {"action": "click", "selector": {"index": 0}},
            {"action": "click", "selector": {"text": "Ajouter"}}
          ]
        }
      }
    }
  }
}
```

### 2. Recharger et tester

```bash
# Recharger la config
curl -X POST http://localhost:3001/api/reload-config

# Tester
node test-automation/run-test.js monapp addToCart
```

---

## 🎓 Exemples de flows

### Recherche produit
```json
{
  "searchProduct": {
    "name": "Recherche produit",
    "steps": [
      {"action": "launch", "target": "com.carrefour.fid.android"},
      {"action": "wait", "duration": 3000},
      {"action": "click", "selector": {"text": "Rechercher"}},
      {"action": "input", "selector": {"id": "search_input"}, "text": "{{productName}}"},
      {"action": "wait", "duration": 2000},
      {"action": "scroll", "direction": "down", "count": 3}
    ]
  }
}
```

### Navigation catégorie
```json
{
  "browseCategory": {
    "name": "Navigation catégorie",
    "steps": [
      {"action": "launch", "target": "com.carrefour.fid.android"},
      {"action": "wait", "duration": 3000},
      {"action": "click", "selector": {"text": "Fruits et Légumes"}},
      {"action": "wait", "duration": 2000},
      {"action": "scroll", "direction": "down", "count": 5}
    ]
  }
}
```

---

## 🔌 API Endpoints

### Apps

```
GET  /api/apps                      # Lister toutes les apps
GET  /api/apps/:appKey              # Config d'une app
GET  /api/apps/:appKey/flows        # Flows d'une app
GET  /api/apps/:appKey/flows/:flow  # Flow spécifique
POST /api/reload-config             # Recharger config
```

### Tests

```
POST /api/run-test                  # Lancer un test
Body: {
  "app": "carrefour",
  "flow": "addToCart",
  "variables": {"productName": "banane"}
}
```

### Tracking

```
GET  /api/tracking-data             # Événements en temps réel
GET  /api/sessions                  # Historique sessions
GET  /api/cart-analysis             # Analyse du panier
```

---

## 🐛 Troubleshooting

### Appium ne démarre pas
```bash
npm install -g appium
appium driver install uiautomator2
appium --version
```

### Émulateur non détecté
```bash
adb devices
adb kill-server && adb start-server
```

### Élément non trouvé
```bash
# Utiliser Appium Inspector
# https://github.com/appium/appium-inspector

# Ou uiautomatorviewer (Android SDK)
uiautomatorviewer
```

### Logs détaillés
```bash
# Serveur
DEBUG=* node server.js

# Appium
appium --base-path /wd/hub --log-level debug

# APK
adb logcat | grep -i "CrossAppTracking"
```

---

## 📊 Statistiques

- **5 apps** pré-configurées
- **7 flows de test** créés
- **8 actions** disponibles
- **10 endpoints API**
- **2 dashboards** interactifs
- **~4500 lignes** de code
- **~1500 lignes** de documentation

---

## 🎯 Cas d'usage

### 1. Tracking multi-apps
Suivre les interactions utilisateur sur plusieurs apps e-commerce simultanément avec détection automatique et filtrage intelligent.

### 2. Tests automatisés
Reproduire des parcours utilisateur standards (ajout panier, recherche, checkout) de manière automatique et reproductible.

### 3. Comparaison apps
Comparer les comportements et performances entre différentes applications e-commerce.

### 4. CI/CD Integration
Intégrer les tests dans un pipeline d'intégration continue pour valider les apps avant release.

### 5. Analyse comportementale
Analyser les patterns d'interaction utilisateur pour optimiser l'UX.

---

## 🚀 Prochaines étapes

- [ ] Support iOS avec XCUITest
- [ ] Intégration CI/CD (GitHub Actions)
- [ ] Dashboard de comparaison entre apps
- [ ] Export CSV/JSON des résultats
- [ ] Tests de performance
- [ ] ML/AI pour détection automatique des patterns

---

## 📝 License

MIT

---

## 👥 Contribution

Les contributions sont les bienvenues ! Pour ajouter une nouvelle app :

1. Éditer `app-configs.json`
2. Ajouter les patterns spécifiques
3. Créer au moins un flow de test
4. Tester localement
5. Documenter les spécificités

---

## 📞 Support

- **Documentation** : Voir les fichiers `.md` du projet
- **Issues** : Ouvrir une issue sur GitHub
- **Logs** : Activer les logs détaillés pour debugging

---

## 🎉 Remerciements

Système créé avec :
- [Node.js](https://nodejs.org/)
- [Express](https://expressjs.com/)
- [Socket.io](https://socket.io/)
- [Appium](https://appium.io/)
- [WebdriverIO](https://webdriver.io/)

---

**Version 2.0 - Multi-Apps & Test Automation**  
*Créé le 30/09/2025*

🚀 **Prêt à tracker et tester !**
