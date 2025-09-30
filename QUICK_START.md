# ⚡ Quick Start - Multi-Apps Tracking & Test Automation

Guide de démarrage rapide en 5 minutes pour utiliser le système multi-apps.

---

## 🚀 Démarrage en 3 étapes

### 1️⃣ Lancer le serveur

```bash
cd web-tracking-system
node server.js
```

✅ Serveur actif sur **http://localhost:3001**

### 2️⃣ Ouvrir le dashboard

**Dashboard tracking temps réel :**
```
http://localhost:3001/dashboard
```

**Dashboard test automation :**
```
http://localhost:3001/test-dashboard
```

### 3️⃣ Lancer un test automatisé

**Option A - Via le dashboard web :**
1. Ouvrir http://localhost:3001/test-dashboard
2. Cliquer sur une app (ex: Carrefour)
3. Cliquer sur un flow (ex: addToCart)
4. Cliquer sur "Lancer le test"

**Option B - Via la ligne de commande :**

```bash
# Terminal 1 : Lancer Appium
cd test-automation
appium --base-path /wd/hub

# Terminal 2 : Lancer le test
node run-test.js carrefour addToCart
```

---

## 📱 Apps disponibles

| App | Commande rapide |
|-----|-----------------|
| **Carrefour** | `npm run test:carrefour` |
| **Amazon** | `npm run test:amazon` |
| **Fnac** | `npm run test:fnac` |
| **Auchan** | `npm run test:auchan` |
| **E.Leclerc** | `npm run test:leclerc` |

---

## 🔧 Commandes utiles

```bash
# Lister toutes les apps et flows
node run-test.js --list

# Aide complète
node run-test.js --help

# Test avec variables
node run-test.js carrefour searchProduct '{"productName":"banane"}'

# Recharger la configuration
curl -X POST http://localhost:3001/api/reload-config
```

---

## ➕ Ajouter une nouvelle app (2 minutes)

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

### 2. Tester

```bash
# Recharger la config
curl -X POST http://localhost:3001/api/reload-config

# Lancer le test
node test-automation/run-test.js monapp addToCart
```

---

## 🐛 Problèmes courants

### Appium ne démarre pas
```bash
# Installer Appium
npm install -g appium
appium driver install uiautomator2

# Vérifier
appium --version
```

### Émulateur non détecté
```bash
# Vérifier les devices
adb devices

# Redémarrer ADB
adb kill-server && adb start-server
```

### App ne détecte pas les événements
```bash
# Vérifier les logs serveur
# Chercher les lignes :
🔍 ADD_TO_CART - Produit XYZ
🛒 VRAI ajout panier détecté: ...
🔄 Navigation détectée: ...
```

---

## 📊 Endpoints API

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

## 📚 Documentation complète

Pour plus de détails, voir :
- **GUIDE_MULTI_APPS.md** - Guide complet
- **test-automation/README.md** - Documentation Appium détaillée

---

## 🎯 Exemples de flows

### Recherche produit
```bash
node run-test.js carrefour searchProduct '{"productName":"banane"}'
```

### Navigation catégorie
```bash
node run-test.js carrefour browseCategory
```

### Ajout au panier
```bash
node run-test.js amazon addToCart
```

---

## ✅ Checklist de démarrage

- [ ] Node.js 16+ installé
- [ ] Appium installé (`npm install -g appium`)
- [ ] Driver UiAutomator2 installé (`appium driver install uiautomator2`)
- [ ] Android SDK configuré (ANDROID_HOME)
- [ ] Émulateur Android démarré
- [ ] Serveur lancé (`node server.js`)
- [ ] Dashboard accessible (http://localhost:3001/dashboard)
- [ ] Premier test réussi ✨

---

**Prêt à tracker ! 🚀**

Pour toute question, consulter **GUIDE_MULTI_APPS.md**
