# 🏗️ Architecture Multi-Apps - Diagrammes

Documentation visuelle de l'architecture du système de tracking et test automation multi-apps.

---

## 📊 Vue d'ensemble

```mermaid
graph TB
    subgraph "Apps Mobiles"
        A1[Carrefour]
        A2[Amazon]
        A3[Fnac]
        A4[Auchan]
        A5[E.Leclerc]
    end
    
    subgraph "Tracking Layer"
        APK[APK Tracking<br/>Accessibility Service]
    end
    
    subgraph "Backend"
        SERVER[Server.js<br/>Express + Socket.io]
        ACM[AppConfigManager<br/>Détection + Filtrage]
        CONFIG[app-configs.json<br/>Configuration]
    end
    
    subgraph "Frontend"
        D1[Dashboard Tracking<br/>Temps réel]
        D2[Dashboard Tests<br/>Automation]
    end
    
    subgraph "Test Automation"
        APPIUM[Appium Server<br/>WebDriver]
        RUNNER[AppiumTestRunner<br/>Exécution flows]
    end
    
    A1 & A2 & A3 & A4 & A5 --> APK
    APK -->|HTTP POST| SERVER
    SERVER --> ACM
    ACM --> CONFIG
    SERVER -->|WebSocket| D1
    SERVER -->|API REST| D2
    D2 -->|Lancer test| RUNNER
    RUNNER -->|WebDriver| APPIUM
    APPIUM -->|Contrôle| A1 & A2 & A3 & A4 & A5
```

---

## 🔄 Flux de tracking

```mermaid
sequenceDiagram
    participant App as App Mobile
    participant APK as APK Tracking
    participant Server as Server.js
    participant ACM as AppConfigManager
    participant Dashboard as Dashboard
    
    App->>APK: Événement UI<br/>(clic, scroll, etc.)
    APK->>APK: Capture événement<br/>Accessibility
    APK->>Server: POST /api/track<br/>Événement JSON
    Server->>ACM: detectAppFromPackage()
    ACM->>ACM: Charger config app
    Server->>ACM: analyzeEvent()
    ACM->>ACM: Vérifier patterns<br/>(boutons, prix, navigation)
    ACM-->>Server: Résultat analyse
    Server->>Server: shouldProcessEvent()
    alt Événement valide
        Server->>Dashboard: WebSocket emit<br/>Événement filtré
        Dashboard->>Dashboard: Affichage temps réel
    else Événement filtré
        Server->>Server: Log + ignore
    end
```

---

## 🤖 Flux de test automation

```mermaid
sequenceDiagram
    participant User as Utilisateur
    participant Dashboard as Dashboard Tests
    participant Server as Server.js
    participant Runner as AppiumTestRunner
    participant Appium as Appium Server
    participant Device as Émulateur Android
    
    User->>Dashboard: Sélectionne app + flow
    User->>Dashboard: Clic "Lancer test"
    Dashboard->>Server: POST /api/run-test
    Server->>Runner: runTestFlow(app, flow)
    Runner->>Appium: Connexion WebDriver
    Appium->>Device: Initialisation session
    
    loop Pour chaque étape
        Runner->>Runner: executeStep(step)
        alt Action: launch
            Runner->>Appium: activateApp(package)
            Appium->>Device: Lance l'app
        else Action: click
            Runner->>Appium: findElement(selector)
            Appium->>Device: Recherche élément
            Device-->>Appium: Élément trouvé
            Runner->>Appium: click()
            Appium->>Device: Clic sur élément
        else Action: input
            Runner->>Appium: setValue(text)
            Appium->>Device: Saisit texte
        else Action: scroll
            Runner->>Appium: touchAction(swipe)
            Appium->>Device: Scroll écran
        end
        Runner->>Runner: takeScreenshot()
        Runner->>Dashboard: Mise à jour progression
    end
    
    Runner->>Server: Résultats JSON
    Server->>Dashboard: Affichage résultats
    Dashboard->>User: Succès/Échec + logs
```

---

## 📦 Structure des données

### Configuration App

```mermaid
classDiagram
    class AppConfig {
        +String name
        +String packageName
        +String appName
        +ButtonPatterns buttonPatterns
        +String[] pricePatterns
        +String[] navigationCategories
        +String[] scrollContainers
        +TestFlows testFlows
    }
    
    class ButtonPatterns {
        +String[] addToCart
        +String[] removeFromCart
        +String[] search
        +String[] cart
    }
    
    class TestFlows {
        +TestFlow addToCart
        +TestFlow searchProduct
        +TestFlow browseCategory
    }
    
    class TestFlow {
        +String name
        +Step[] steps
    }
    
    class Step {
        +String action
        +Object selector
        +String text
        +int duration
        +String direction
    }
    
    AppConfig --> ButtonPatterns
    AppConfig --> TestFlows
    TestFlows --> TestFlow
    TestFlow --> Step
```

### Événement de tracking

```mermaid
classDiagram
    class TrackingEvent {
        +String eventType
        +String packageName
        +long timestamp
        +EventData data
    }
    
    class EventData {
        +ElementInfo element
        +ProductInfo productInfo
        +ScrollInfo scrollInfo
    }
    
    class ElementInfo {
        +String text
        +String className
        +int x
        +int y
        +int width
        +int height
    }
    
    class ProductInfo {
        +String productName
        +String price
        +String cartAction
        +String[] allTexts
    }
    
    class ScrollInfo {
        +String direction
        +String context
        +int distance
    }
    
    TrackingEvent --> EventData
    EventData --> ElementInfo
    EventData --> ProductInfo
    EventData --> ScrollInfo
```

---

## 🔍 Détection et filtrage

```mermaid
flowchart TD
    START([Événement reçu]) --> DETECT{Détecter app}
    DETECT -->|Package name| LOAD[Charger config app]
    LOAD --> ANALYZE[Analyser événement]
    
    ANALYZE --> CHECK_TYPE{Type événement?}
    
    CHECK_TYPE -->|ADD_TO_CART| CHECK_NAV{Navigation?}
    CHECK_NAV -->|Oui| CONVERT[Convertir en VIEW_CLICKED]
    CHECK_NAV -->|Non| CHECK_PRICE{Prix réel?}
    CHECK_PRICE -->|Oui| ACCEPT[✅ Accepter événement]
    CHECK_PRICE -->|Non| REJECT[❌ Rejeter événement]
    
    CHECK_TYPE -->|VIEW_CLICKED| ACCEPT
    
    CHECK_TYPE -->|SCROLL| CHECK_SPAM{Spam scroll?}
    CHECK_SPAM -->|Oui| REJECT
    CHECK_SPAM -->|Non| ACCEPT
    
    CONVERT --> ACCEPT
    ACCEPT --> EMIT[Émettre WebSocket]
    EMIT --> DASHBOARD[Afficher dashboard]
    REJECT --> LOG[Logger + ignorer]
    
    style ACCEPT fill:#90EE90
    style REJECT fill:#FFB6C1
    style CONVERT fill:#87CEEB
```

---

## 🎯 Exécution d'un flow de test

```mermaid
flowchart TD
    START([Démarrer flow]) --> INIT[Initialiser Appium]
    INIT --> CONNECT[Connexion émulateur]
    CONNECT --> LOOP{Plus d'étapes?}
    
    LOOP -->|Oui| GET_STEP[Récupérer étape]
    GET_STEP --> EXEC{Type action?}
    
    EXEC -->|launch| ACTION_LAUNCH[Lancer app]
    EXEC -->|wait| ACTION_WAIT[Attendre]
    EXEC -->|click| ACTION_CLICK[Trouver + cliquer]
    EXEC -->|input| ACTION_INPUT[Saisir texte]
    EXEC -->|scroll| ACTION_SCROLL[Scroll écran]
    EXEC -->|verify| ACTION_VERIFY[Vérifier élément]
    
    ACTION_LAUNCH --> SCREENSHOT[Capture d'écran]
    ACTION_WAIT --> SCREENSHOT
    ACTION_CLICK --> SCREENSHOT
    ACTION_INPUT --> SCREENSHOT
    ACTION_SCROLL --> SCREENSHOT
    ACTION_VERIFY --> SCREENSHOT
    
    SCREENSHOT --> CHECK{Succès?}
    CHECK -->|Oui| LOOP
    CHECK -->|Non| ERROR[Capture erreur]
    ERROR --> SAVE_ERROR[Sauvegarder résultats]
    SAVE_ERROR --> END_ERROR([Fin - Échec])
    
    LOOP -->|Non| SAVE[Sauvegarder résultats]
    SAVE --> CLEANUP[Nettoyer session]
    CLEANUP --> END_SUCCESS([Fin - Succès])
    
    style END_SUCCESS fill:#90EE90
    style END_ERROR fill:#FFB6C1
```

---

## 🗂️ Organisation des fichiers

```
web-tracking-system/
│
├── 📄 Configuration
│   ├── app-configs.json              # Config multi-apps
│   ├── package.json                  # Dépendances npm
│   └── server.js                     # Serveur Express
│
├── 🧠 Core Logic
│   └── app-config-manager.js         # Gestionnaire config
│
├── 🌐 Frontend
│   └── public/
│       ├── dashboard.html            # Dashboard tracking
│       └── test-dashboard.html       # Dashboard tests
│
├── 🤖 Test Automation
│   └── test-automation/
│       ├── appium-test-runner.js     # Runner Appium
│       ├── run-test.js               # CLI runner
│       ├── package.json              # Dépendances Appium
│       └── README.md                 # Doc Appium
│
├── 📊 Résultats
│   └── test-automation/
│       ├── results/                  # Résultats JSON
│       └── screenshots/              # Captures d'écran
│
└── 📚 Documentation
    ├── README_MULTI_APPS.md          # README principal
    ├── QUICK_START.md                # Démarrage rapide
    ├── GUIDE_MULTI_APPS.md           # Guide complet
    ├── ARCHITECTURE.md               # Ce fichier
    └── SNAPSHOT_MULTI_APPS_2025-09-30.md
```

---

## 🔌 Architecture API

```mermaid
graph LR
    subgraph "Client"
        CLI[CLI Runner]
        WEB[Dashboard Web]
        CURL[cURL/Postman]
    end
    
    subgraph "Server API"
        APPS[/api/apps]
        APP[/api/apps/:key]
        FLOWS[/api/apps/:key/flows]
        FLOW[/api/apps/:key/flows/:flow]
        TEST[/api/run-test]
        RELOAD[/api/reload-config]
        TRACK[/api/tracking-data]
    end
    
    subgraph "Backend"
        ACM[AppConfigManager]
        FILTER[ServerEventFilter]
        SOCKET[Socket.io]
    end
    
    CLI --> TEST
    WEB --> APPS
    WEB --> FLOWS
    WEB --> TEST
    CURL --> APP
    CURL --> FLOW
    
    APPS --> ACM
    APP --> ACM
    FLOWS --> ACM
    FLOW --> ACM
    TEST --> ACM
    RELOAD --> ACM
    TRACK --> FILTER
    
    FILTER --> SOCKET
    SOCKET --> WEB
```

---

## 🎨 Patterns de détection

```mermaid
mindmap
  root((AppConfig))
    Boutons
      addToCart
        "ajouter au panier"
        "add to cart"
        "+"
        "plus"
      removeFromCart
        "supprimer"
        "retirer"
        "-"
      search
        "rechercher"
        "search"
      cart
        "panier"
        "cart"
    Prix
      Format EUR
        \d+[,.]?\d+\s*€
        €\s*\d+[,.]?\d+
      Format USD
        \$\d+\.\d{2}
      Prix au kilo
        \d+[,.]?\d+€/KG
    Navigation
      Catégories
        accueil
        panier
        rechercher
        compte
      Menus
        catégories
        filtrer
        trier
    Scroll
      Conteneurs
        recyclerview
        scrollview
        listview
        viewpager
```

---

## 🔄 Cycle de vie d'un test

```mermaid
stateDiagram-v2
    [*] --> Idle: Système prêt
    Idle --> Initializing: Lancer test
    Initializing --> Connected: Appium OK
    Connected --> Running: Démarrer flow
    
    Running --> ExecutingStep: Prochaine étape
    ExecutingStep --> TakingScreenshot: Action OK
    TakingScreenshot --> Running: Screenshot OK
    
    ExecutingStep --> Error: Action échouée
    Error --> Cleanup: Capturer erreur
    
    Running --> Completed: Toutes étapes OK
    Completed --> Cleanup: Sauvegarder résultats
    
    Cleanup --> Idle: Prêt pour nouveau test
    
    note right of Running
        Boucle sur toutes
        les étapes du flow
    end note
    
    note right of Error
        Screenshot d'erreur
        + logs détaillés
    end note
```

---

## 🌐 Communication temps réel

```mermaid
sequenceDiagram
    participant APK as APK Mobile
    participant Server as Server
    participant Socket as Socket.io
    participant Client1 as Dashboard 1
    participant Client2 as Dashboard 2
    
    Client1->>Socket: connect()
    Socket->>Client1: connection established
    Client2->>Socket: connect()
    Socket->>Client2: connection established
    
    APK->>Server: POST /api/track<br/>Événement
    Server->>Server: Filtrage + analyse
    Server->>Socket: emit('event', data)
    Socket->>Client1: Événement temps réel
    Socket->>Client2: Événement temps réel
    Client1->>Client1: Mise à jour UI
    Client2->>Client2: Mise à jour UI
    
    Note over Socket,Client2: Tous les clients connectés<br/>reçoivent les événements<br/>en temps réel
```

---

## 🎯 Matrice de compatibilité

| App | Tracking | Tests Auto | Flows | Status |
|-----|----------|------------|-------|--------|
| **Carrefour** | ✅ | ✅ | 3 | Production |
| **Amazon** | ✅ | ✅ | 1 | Configuré |
| **Fnac** | ✅ | ✅ | 1 | Configuré |
| **Auchan** | ✅ | ✅ | 1 | Configuré |
| **E.Leclerc** | ✅ | ✅ | 1 | Configuré |

### Légende
- ✅ **Production** : Testé et validé en conditions réelles
- ✅ **Configuré** : Configuration complète, tests à valider
- 🔄 **En cours** : Configuration partielle
- ❌ **Non supporté** : Pas encore implémenté

---

## 🚀 Performance

### Temps de réponse

```mermaid
graph LR
    A[Événement APK] -->|< 50ms| B[Serveur]
    B -->|< 10ms| C[Filtrage]
    C -->|< 5ms| D[WebSocket]
    D -->|< 20ms| E[Dashboard]
    
    style A fill:#FFE4B5
    style B fill:#87CEEB
    style C fill:#90EE90
    style D fill:#DDA0DD
    style E fill:#FFB6C1
```

### Capacité

- **Événements/seconde** : ~100 (avec filtrage)
- **Clients simultanés** : Illimité (WebSocket)
- **Apps trackées** : Illimité (configuration)
- **Tests parallèles** : Limité par émulateurs disponibles

---

## 🔐 Sécurité

```mermaid
flowchart TD
    START([Requête entrante]) --> AUTH{Authentification?}
    AUTH -->|Non requise| VALIDATE[Validation données]
    AUTH -->|Requise| CHECK_TOKEN{Token valide?}
    CHECK_TOKEN -->|Non| REJECT[❌ 401 Unauthorized]
    CHECK_TOKEN -->|Oui| VALIDATE
    
    VALIDATE --> SANITIZE[Sanitization]
    SANITIZE --> RATE{Rate limit?}
    RATE -->|Dépassé| THROTTLE[❌ 429 Too Many]
    RATE -->|OK| PROCESS[Traiter requête]
    
    PROCESS --> RESPONSE[✅ Réponse]
    
    style REJECT fill:#FFB6C1
    style THROTTLE fill:#FFB6C1
    style RESPONSE fill:#90EE90
```

**Note** : Actuellement en développement, authentification à implémenter pour production.

---

## 📈 Évolution future

```mermaid
timeline
    title Roadmap Multi-Apps
    section Phase 1 (Actuel)
        Support 5 apps : Carrefour, Amazon, Fnac, Auchan, Leclerc
        Test automation Appium : Flows reproductibles
        Dashboards interactifs : Tracking + Tests
    section Phase 2 (Court terme)
        Plus d'apps : Intermarché, Monoprix, etc.
        Plus de flows : Checkout, Wishlist, etc.
        Export données : CSV, JSON
    section Phase 3 (Moyen terme)
        Support iOS : XCUITest
        CI/CD : GitHub Actions
        Comparaison apps : Dashboard analytics
    section Phase 4 (Long terme)
        ML/AI : Détection auto patterns
        Performance : Tests de charge
        Analytics : Comportement multi-apps
```

---

**Architecture Multi-Apps v2.0**  
*Créé le 30/09/2025*
