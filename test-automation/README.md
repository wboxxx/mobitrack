# 🤖 Test Automation - E-commerce Apps

Système d'automatisation des tests pour applications e-commerce Android avec Appium.

## 📋 Table des matières

- [Prérequis](#prérequis)
- [Installation](#installation)
- [Configuration](#configuration)
- [Utilisation](#utilisation)
- [Apps supportées](#apps-supportées)
- [Flows de test](#flows-de-test)
- [Personnalisation](#personnalisation)

---

## 🔧 Prérequis

### 1. Appium Server

```bash
# Installation globale d'Appium
npm install -g appium

# Installation du driver UiAutomator2 pour Android
appium driver install uiautomator2

# Vérifier l'installation
appium driver list
```

### 2. Android SDK

- Android Studio installé
- Android SDK configuré (API 29+)
- Variable d'environnement `ANDROID_HOME` configurée

### 3. Émulateur Android

```bash
# Lister les émulateurs disponibles
emulator -list-avds

# Lancer un émulateur
emulator -avd <nom_emulateur>

# Ou créer un nouvel émulateur dans Android Studio
```

### 4. Node.js

- Node.js 16+ installé
- npm ou yarn

---

## 📦 Installation

```bash
# Se placer dans le dossier test-automation
cd test-automation

# Installer les dépendances
npm install

# Vérifier l'installation
npm run help
```

---

## ⚙️ Configuration

### Lancer Appium Server

Dans un terminal séparé :

```bash
appium --base-path /wd/hub
```

Le serveur démarre sur `http://localhost:4723`

### Vérifier l'émulateur

```bash
# Lister les devices connectés
adb devices

# Devrait afficher quelque chose comme:
# emulator-5554   device
```

---

## 🚀 Utilisation

### Commandes de base

```bash
# Afficher l'aide
npm run help

# Lister les apps et flows disponibles
npm run list

# Lancer un test
node run-test.js <app> <flow> [variables]
```

### Exemples concrets

```bash
# Test Carrefour - Ajout au panier
npm run test:carrefour

# Test Amazon - Ajout au panier
npm run test:amazon

# Test Fnac - Ajout au panier
npm run test:fnac

# Test avec variables personnalisées
node run-test.js carrefour searchProduct '{"productName":"banane"}'

# Test navigation catégorie
node run-test.js carrefour browseCategory
```

---

## 📱 Apps supportées

| App | Package Name | Flows disponibles |
|-----|--------------|-------------------|
| **Carrefour** | `com.carrefour.fid.android` | addToCart, searchProduct, browseCategory |
| **Amazon** | `com.amazon.mShop.android.shopping` | addToCart |
| **Fnac** | `com.fnac.android` | addToCart |
| **Auchan** | `fr.auchan.mobile.android` | addToCart |
| **E.Leclerc** | `com.eleclerc.mobile` | addToCart |

---

## 🔄 Flows de test

### 1. addToCart (Ajout au panier)

Flow standard pour ajouter un produit au panier :

1. Lance l'application
2. Recherche un produit
3. Sélectionne le premier résultat
4. Clique sur "Ajouter au panier"
5. Vérifie le panier

**Variables supportées :**
- `productName` : Nom du produit à rechercher
- `quantity` : Quantité à ajouter (si supporté)

**Exemple :**
```bash
node run-test.js carrefour addToCart '{"productName":"lait"}'
```

### 2. searchProduct (Recherche produit)

Flow pour tester la recherche :

1. Lance l'application
2. Ouvre la recherche
3. Saisit le terme de recherche
4. Affiche les résultats
5. Scroll dans les résultats

**Variables supportées :**
- `productName` : Terme de recherche

**Exemple :**
```bash
node run-test.js carrefour searchProduct '{"productName":"pomme"}'
```

### 3. browseCategory (Navigation catégorie)

Flow pour tester la navigation :

1. Lance l'application
2. Sélectionne une catégorie
3. Scroll dans la liste
4. Explore les sous-catégories

**Exemple :**
```bash
node run-test.js carrefour browseCategory
```

---

## 🎨 Personnalisation

### Ajouter une nouvelle app

Éditer `../app-configs.json` :

```json
{
  "apps": {
    "monapp": {
      "name": "Mon App",
      "packageName": "com.example.monapp",
      "appName": "Mon App",
      "buttonPatterns": {
        "addToCart": ["ajouter", "add"],
        "search": ["rechercher", "search"]
      },
      "pricePatterns": [
        "\\d+[,.]\\d{2}\\s*€"
      ],
      "testFlows": {
        "addToCart": {
          "name": "Ajout produit",
          "steps": [
            {"action": "launch", "target": "com.example.monapp"},
            {"action": "wait", "duration": 3000},
            // ... autres étapes
          ]
        }
      }
    }
  }
}
```

### Créer un nouveau flow

Ajouter un flow dans `testFlows` :

```json
"customFlow": {
  "name": "Mon flow personnalisé",
  "steps": [
    {"action": "launch", "target": "com.example.app"},
    {"action": "wait", "duration": 2000},
    {"action": "click", "selector": {"text": "Bouton"}},
    {"action": "input", "selector": {"id": "input_field"}, "text": "{{variable}}"},
    {"action": "scroll", "direction": "down", "count": 3},
    {"action": "verify", "selector": {"text": "Résultat"}, "expected": {"text": "OK"}}
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

### Sélecteurs disponibles

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

---

## 📊 Résultats des tests

Les résultats sont sauvegardés dans `test-automation/results/` :

```json
{
  "flowName": "Ajout produit au panier",
  "appName": "Carrefour",
  "startTime": "2025-09-30T10:00:00.000Z",
  "duration": 15234,
  "success": true,
  "steps": [
    {
      "action": "launch",
      "success": true,
      "timestamp": "2025-09-30T10:00:00.000Z"
    }
  ],
  "screenshots": [
    {
      "name": "step_1_launch",
      "filepath": "screenshots/step_1_launch_2025-09-30.png"
    }
  ]
}
```

Les screenshots sont dans `test-automation/screenshots/`

---

## 🐛 Debugging

### Problèmes courants

**1. Appium ne se connecte pas**
```bash
# Vérifier qu'Appium tourne
curl http://localhost:4723/wd/hub/status

# Relancer Appium
appium --base-path /wd/hub
```

**2. Émulateur non détecté**
```bash
# Vérifier les devices
adb devices

# Redémarrer ADB
adb kill-server
adb start-server
```

**3. App non installée**
```bash
# Installer l'APK manuellement
adb install path/to/app.apk

# Vérifier l'installation
adb shell pm list packages | grep carrefour
```

**4. Élément non trouvé**
- Augmenter les temps d'attente dans le flow
- Vérifier les sélecteurs avec Appium Inspector
- Utiliser `uiautomatorviewer` pour analyser la hiérarchie

### Logs détaillés

```bash
# Lancer avec logs Appium verbeux
appium --base-path /wd/hub --log-level debug

# Voir les logs ADB en temps réel
adb logcat | grep -i carrefour
```

---

## 🔗 Intégration avec le système de tracking

Les tests automatisés fonctionnent en parallèle avec le système de tracking APK :

1. **Lancer le serveur de tracking** (terminal 1)
   ```bash
   cd web-tracking-system
   node server.js
   ```

2. **Lancer Appium** (terminal 2)
   ```bash
   appium --base-path /wd/hub
   ```

3. **Lancer le test** (terminal 3)
   ```bash
   cd test-automation
   node run-test.js carrefour addToCart
   ```

4. **Observer le dashboard** : http://localhost:3001/dashboard

Les événements générés par le test automatisé apparaîtront en temps réel dans le dashboard !

---

## 📚 Ressources

- [Documentation Appium](https://appium.io/docs/en/latest/)
- [WebdriverIO](https://webdriver.io/)
- [UiAutomator2 Driver](https://github.com/appium/appium-uiautomator2-driver)
- [Android Debug Bridge (ADB)](https://developer.android.com/studio/command-line/adb)

---

## 🎯 Prochaines étapes

- [ ] Ajouter plus de flows de test (checkout, wishlist, etc.)
- [ ] Implémenter la détection automatique des boutons panier
- [ ] Créer un dashboard de visualisation des tests
- [ ] Ajouter support iOS avec XCUITest
- [ ] Intégration CI/CD (GitHub Actions)
- [ ] Tests de performance et de charge

---

## 📝 License

MIT
