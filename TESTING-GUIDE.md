# 🧪 Guide de Test Automatisé

Ce guide explique comment utiliser les scripts de test automatisés pour valider la détection d'ajouts au panier.

## 📋 Prérequis

1. **Appium** doit être lancé avec les bonnes options :
   ```powershell
   # Option 1 : Utiliser le script fourni (recommandé)
   .\start-appium.ps1
   
   # Option 2 : Lancer manuellement
   appium --allow-insecure adb_shell
   ```

2. **Émulateur Android** doit être démarré et connecté :
   ```bash
   adb devices
   # Doit afficher: emulator-5554
   ```

3. **Carrefour** doit être installé sur l'émulateur

## 🚀 Scripts Disponibles

### 1. `rebuild-and-restart.ps1` - Recompilation automatique

**Usage :**
```powershell
.\rebuild-and-restart.ps1
```

**Ce qu'il fait :**
- ✅ Compile et installe l'APK
- ✅ Redémarre le service d'accessibilité (SANS intervention manuelle)
- ✅ Lance l'app de tracking
- ✅ Lance Carrefour
- ✅ Prêt pour les tests

**Options :**
```powershell
.\rebuild-and-restart.ps1 -SkipBuild  # Ignore la compilation
```

---

### 2. `test-banana-flow.ps1` - Test automatisé complet

**Usage :**
```powershell
.\test-banana-flow.ps1
```

**Ce qu'il fait :**
- ✅ Vérifie qu'Appium tourne
- ✅ Rebuild et restart (si demandé)
- ✅ Démarre le monitoring des logs
- ✅ Lance le test Appium (ajout banane au panier)
- ✅ Capture les logs pendant 10 secondes
- ✅ Analyse les événements ADD_TO_CART

**Options :**
```powershell
.\test-banana-flow.ps1 -SkipBuild              # Ignore la compilation
.\test-banana-flow.ps1 -MonitorDuration 20     # Capture 20 secondes de logs
```

---

### 3. Test Appium seul (sans rebuild)

**Usage (recherche complète) :**
```powershell
cd test-automation
npm run test:carrefour-banana
```

**Ce qu'il fait :**
- ✅ Ouvre Carrefour
- ✅ Recherche "banane"
- ✅ Sélectionne le premier résultat
- ✅ Ajoute au panier

**Usage (depuis le panier - PLUS RAPIDE) :**
```powershell
cd test-automation
npm run test:carrefour-banana-cart
```

**Ce qu'il fait :**
- ✅ Ouvre Carrefour
- ✅ Va directement au panier
- ✅ Trouve les bananes déjà dans le panier
- ✅ Clique sur le bouton "+" pour ajouter une banane supplémentaire
- ⚡ **Beaucoup plus rapide** (pas de recherche)

---

## 🔄 Workflow Recommandé

### Premier test (avec recompilation)
```powershell
# 1. Lance Appium dans un terminal
.\start-appium.ps1

# 2. Dans un autre terminal, lance le test complet
.\test-banana-flow.ps1
```

### Tests suivants (sans recompilation)
```powershell
.\test-banana-flow.ps1 -SkipBuild
```

### Juste recompiler et redémarrer
```powershell
.\rebuild-and-restart.ps1
```

---

## 📊 Analyse des Résultats

### Logs en temps réel
```powershell
adb logcat -c
adb logcat -s CrossAppTracking:D AndroidTracking:D
```

### Analyser un fichier de log
```powershell
.\analyze-logs.ps1 -LogFile monitoring-logs-20251001-080000.txt
```

---

## 🐛 Dépannage

### Appium n'est pas lancé
```
❌ Appium n'est pas lancé!
```
**Solution :** Lance `appium` dans un terminal séparé

### Service d'accessibilité non actif
```
⚠️ Aucun événement ADD_TO_CART détecté!
```
**Solution :** Vérifie manuellement dans les paramètres Android que "Bascule Cross-App Tracking" est activé

### Émulateur non connecté
```
error: no devices/emulators found
```
**Solution :** Démarre l'émulateur Android

### Build échoué
```
❌ Build échoué!
```
**Solution :** Vérifie que `JAVA_HOME` est bien configuré dans `android-app/build-and-install.ps1`

---

## 🎯 Objectif des Tests

Le but est de valider que le service d'accessibilité détecte correctement :
- ✅ L'ajout de banane au panier (événement valide)
- ❌ Pas de faux positifs (bouton "-", horloge, etc.)

### Résultat attendu
```
🔍 Événements ADD_TO_CART détectés:
   ADD_TO_CART detected: productName=Banane, prix=1,99€
   
✅ Total: 1 événement(s) ADD_TO_CART
```

---

## 📝 Notes

- Le test automatisé utilise **Appium** pour simuler les interactions utilisateur
- Le monitoring capture les logs **en temps réel** pendant le test
- Les logs sont sauvegardés dans `monitoring-logs-YYYYMMDD-HHmmss.txt`
- Le script `restart-accessibility.js` automatise le toggle du service (plus besoin de le faire manuellement)

---

## 🔗 Fichiers Importants

- `rebuild-and-restart.ps1` - Script de recompilation automatique
- `test-banana-flow.ps1` - Test end-to-end complet
- `test-automation/test-carrefour-banana.js` - Script Appium pour l'ajout de banane
- `test-automation/restart-accessibility.js` - Redémarrage automatique du service
- `analyze-logs.ps1` - Analyse des logs capturés
