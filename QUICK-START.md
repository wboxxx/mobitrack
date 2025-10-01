# 🚀 Quick Start - Test Automatisé

## ⚡ Démarrage rapide (2 étapes)

### 1️⃣ Lance Appium (Terminal 1)
```powershell
.\start-appium.ps1
```

### 2️⃣ Lance le test (Terminal 2)
```powershell
# Test rapide depuis le panier (recommandé)
cd test-automation
npm run test:carrefour-banana-cart

# OU test complet avec recherche
npm run test:carrefour-banana
```

---

## 🔄 Flow complet automatisé

```powershell
# Build + Install + Restart + Test + Analyse
.\test-banana-flow.ps1
```

---

## 📝 Notes importantes

- ✅ **Appium DOIT être lancé avec `--allow-insecure adb_shell`** (le script `start-appium.ps1` le fait automatiquement)
- ✅ L'émulateur doit être démarré (`emulator-5554`)
- ✅ Carrefour doit être installé
- ✅ Pour le test depuis le panier, des bananes doivent déjà être dans le panier

---

## 🐛 Dépannage rapide

**Erreur : `adb_shell has not been enabled`**
→ Lance Appium avec : `.\start-appium.ps1`

**Erreur : `no devices/emulators found`**
→ Démarre l'émulateur Android

**Aucun événement ADD_TO_CART détecté**
→ Vérifie que le service d'accessibilité est actif dans les paramètres Android
