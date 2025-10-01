package com.bascule.leclerctracking.service

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import androidx.core.app.NotificationCompat
import com.bascule.leclerctracking.R
import com.bascule.leclerctracking.tracking.AndroidTrackingManager
import com.bascule.leclerctracking.models.TrackingEventType
import java.security.MessageDigest

data class EventSignature(
    val eventType: String,
    val productName: String?,
    val cartAction: String?,
    val contentHash: String,
    val timestamp: Long
)

class SimpleEventBuffer {
    private val eventBuffer = mutableListOf<Pair<EventSignature, () -> Unit>>()
    private val bufferDelay = 500L // Juste 500ms pour éviter les doublons immédiats
    
    fun bufferEvent(newEvent: EventSignature, sendAction: () -> Unit) {
        // Ajouter l'événement au buffer
        eventBuffer.add(Pair(newEvent, sendAction))
        
        // Programmer l'envoi après un court délai
        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
            processBuffer()
        }, bufferDelay)
    }
    
    private fun processBuffer() {
        val currentTime = System.currentTimeMillis()
        val eventsToSend = eventBuffer.filter { 
            currentTime - it.first.timestamp >= bufferDelay 
        }
        
        // Envoyer tous les événements (le serveur fera le filtrage)
        eventsToSend.forEach { it.second.invoke() }
        
        // Nettoyer le buffer
        eventBuffer.removeAll(eventsToSend)
        
        // Limiter la taille du buffer
        if (eventBuffer.size > 50) {
            eventBuffer.removeAll(eventBuffer.take(eventBuffer.size - 50))
        }
    }
}

class CrossAppTrackingService : AccessibilityService() {
    
    private lateinit var trackingManager: AndroidTrackingManager
    private val eventBuffer = SimpleEventBuffer()
    
    private val targetApps = listOf(
        "com.leclerc.drive",
        "com.carrefour.fid.android",
        "com.auchan.drive",
        "com.casino.drive",
        "com.amazon.mShop.android.shopping",
        "com.cdiscount.mobile",
        "com.monoprix.monoprixmobile"
    )
    
    override fun onCreate() {
        super.onCreate()
        trackingManager = AndroidTrackingManager(this, null)
        
        // Version du service pour identifier les builds
        val buildTimestamp = "2025-10-01 17:47 - Snapshot v3.3 Depth2"
        Log.d("CrossAppTracking", "========================================")
        Log.d("CrossAppTracking", "Service de tracking cross-app démarré")
        Log.d("CrossAppTracking", "📦 Build: $buildTimestamp")
        Log.d("CrossAppTracking", "========================================")
    }
    
    override fun onServiceConnected() {
        super.onServiceConnected()
        
        // Afficher le fingerprint de build
        val buildFingerprint = "BUILD_${System.currentTimeMillis() / 1000}" // Timestamp de compilation
        val hasSnapshot = try {
            this::class.java.getDeclaredMethod("captureCartSnapshot", AccessibilityNodeInfo::class.java, String::class.java)
            true
        } catch (e: Exception) {
            false
        }
        
        Log.d("CrossAppTracking", "========================================")
        Log.d("CrossAppTracking", "✅ Service d'accessibilité connecté")
        Log.d("CrossAppTracking", "🔖 Build: $buildFingerprint")
        Log.d("CrossAppTracking", "📸 Snapshot feature: ${if (hasSnapshot) "ENABLED ✅" else "DISABLED ❌"}")
        Log.d("CrossAppTracking", "========================================")
        
        // Configuration du service
        val info = AccessibilityServiceInfo()
        info.eventTypes = AccessibilityEvent.TYPE_VIEW_CLICKED or
                         AccessibilityEvent.TYPE_VIEW_SCROLLED or
                         AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED or
                         AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED or
                         AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED
        
        info.feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
        info.notificationTimeout = 100
        
        this.serviceInfo = info
        
        // Démarrer le foreground service
        startForegroundService()
        
        Log.d("CrossAppTracking", "🎯 Service configuré et prêt à tracker")
    }
    
    private fun startForegroundService() {
        val channelId = "cross_app_tracking_channel"
        
        // Créer le canal de notification (Android 8+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "Cross-App Tracking Service",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Service de tracking des ajouts au panier"
            }
            
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
        
        // Créer la notification
        val notification = NotificationCompat.Builder(this, channelId)
            .setContentTitle("Tracking actif")
            .setContentText("Surveillance des ajouts au panier en cours...")
            .setSmallIcon(android.R.drawable.ic_menu_info_details)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .build()
        
        // Démarrer en foreground avec le type specialUse (Android 14+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(1, notification, android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
        } else {
            startForeground(1, notification)
        }
        Log.d("CrossAppTracking", "✅ Service démarré en foreground (ne sera pas gelé)")
    }
    
    private fun isTargetApp(packageName: String): Boolean {
        // Blacklist : Ignorer les apps système qui génèrent des faux positifs
        val systemBlacklist = listOf(
            "com.android.systemui"  // Horloge, notifications, barre de statut
        )
        
        if (systemBlacklist.contains(packageName)) {
            return false
        }
        
        // Pour l'instant, surveiller toutes les apps e-commerce
        // Plus tard on pourra filtrer sur targetApps seulement
        return true // targetApps.contains(packageName)
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        event?.let {
            val packageName = it.packageName?.toString() ?: return
            
            Log.d("CrossAppTracking", "📱 Événement reçu: ${it.eventType} - $packageName")
            
            // Filtrer les événements pour les apps e-commerce ciblées
            if (isTargetApp(packageName)) {
                Log.d("CrossAppTracking", "✅ App ciblée détectée: $packageName")
                handleECommerceEvent(it, packageName)
            } else {
                Log.d("CrossAppTracking", "❌ App non ciblée: $packageName")
            }
        }
    }
    
    private var lastCartSnapshotTime = 0L
    private val CART_SNAPSHOT_COOLDOWN = 10000L // 10 secondes entre snapshots
    
    private fun handleECommerceEvent(event: AccessibilityEvent, packageName: String) {
        when (event.eventType) {
            AccessibilityEvent.TYPE_VIEW_CLICKED -> {
                trackClickEvent(event, packageName)
            }
            AccessibilityEvent.TYPE_VIEW_SCROLLED -> {
                trackScrollEvent(event, packageName)
            }
            AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED -> {
                trackContentChange(event, packageName)
                // Détecter si on est sur la page panier et capturer un snapshot
                detectAndCaptureCartSnapshot(event, packageName)
            }
            AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED -> {
                // Carrefour envoie ce type d'événement lors des clics
                trackContentChange(event, packageName)
                // Aussi vérifier pour snapshot lors des changements d'état
                detectAndCaptureCartSnapshot(event, packageName)
            }
            AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED -> {
                trackTextInput(event, packageName)
            }
        }
    }
    
    private fun detectAndCaptureCartSnapshot(event: AccessibilityEvent, packageName: String) {
        val currentTime = System.currentTimeMillis()
        
        // Éviter de capturer trop souvent
        if (currentTime - lastCartSnapshotTime < CART_SNAPSHOT_COOLDOWN) {
            return
        }
        
        val nodeInfo = event.source ?: rootInActiveWindow ?: return
        
        // Détecter si on est sur la page panier (chercher "Panier" dans le titre ou les textes)
        val allText = getAllTextsFromNode(nodeInfo).joinToString(" ").lowercase()
        val isCartPage = allText.contains("panier") || allText.contains("valider mon panier")
        
        if (isCartPage) {
            Log.d("CrossAppTracking", "📸 Page panier détectée, attente du chargement des produits...")
            
            // Attendre 3 secondes pour que les produits se chargent
            android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                val freshNodeInfo = rootInActiveWindow
                if (freshNodeInfo != null) {
                    Log.d("CrossAppTracking", "📸 Capture du snapshot après chargement...")
                    captureCartSnapshot(freshNodeInfo, packageName)
                }
            }, 3000)
            
            lastCartSnapshotTime = currentTime
        }
    }
    
    private fun captureCartSnapshot(nodeInfo: AccessibilityNodeInfo, packageName: String) {
        val products = mutableListOf<Map<String, Any>>()
        
        // Scanner tous les produits visibles dans le panier
        Log.d("CrossAppTracking", "📸 Début du scan des produits...")
        scanNodeForProducts(nodeInfo, products)
        Log.d("CrossAppTracking", "📸 Fin du scan: ${products.size} produits trouvés")
        
        if (products.isNotEmpty()) {
            Log.d("CrossAppTracking", "📸 Snapshot capturé: ${products.size} produits trouvés")
            
            trackingManager.trackEvent(TrackingEventType.ADD_TO_CART, mapOf(
                "app" to getAppName(packageName),
                "packageName" to packageName,
                "eventType" to "cart_snapshot",
                "products" to products,
                "snapshotTime" to System.currentTimeMillis()
            ))
        } else {
            Log.d("CrossAppTracking", "⚠️ Snapshot vide: aucun produit trouvé dans le panier")
            // Logger tous les textes pour debug
            val allTexts = getAllTextsFromNode(nodeInfo)
            Log.d("CrossAppTracking", "📝 Textes trouvés (${allTexts.size}): ${allTexts.take(20).joinToString(", ")}")
        }
    }
    
    private fun scanNodeForProducts(node: AccessibilityNodeInfo?, products: MutableList<Map<String, Any>>) {
        if (node == null) return
        
        // Chercher des patterns de produits (nom + prix + quantité)
        // NE PAS chercher récursivement pour éviter de mélanger les produits
        val texts = getDirectTextsFromNode(node)
        val bounds = android.graphics.Rect()
        node.getBoundsInScreen(bounds)
        
        // Chercher un prix (format X,XX avec ou sans €)
        val priceText = texts.find { it.matches(Regex("\\d+[,.]\\d+€?")) }
        
        // Si on trouve un prix, c'est probablement un vrai produit du panier
        if (priceText != null) {
            // Vérifier la position X : les vrais produits commencent à X < 100
            // Les produits à remplacer commencent à X > 100
            if (bounds.left > 100) {
                Log.d("CrossAppTracking", "⚠️ Produit ignoré (X=${bounds.left} > 100, probablement à remplacer)")
                // Scanner quand même les enfants
                for (i in 0 until node.childCount) {
                    scanNodeForProducts(node.getChild(i), products)
                }
                return
            }
            
            // Extraire le prix sans € (si présent)
            val price = priceText.replace("€", "")
            
            // Chercher le nom du produit (texte long, pas un prix, pas un bouton)
            val productName = texts.find { text ->
                val t = text.lowercase()
                t.length > 8 && 
                !t.contains("€") &&
                !t.matches(Regex("\\d+[,.]?\\d*")) &&
                !t.contains("à remplacer") && // Pas "2 produits à remplacer"
                !t.contains("euros") &&
                !t.contains("centimes") &&
                !t.contains("club") &&
                !t.contains("promotion") &&
                !t.contains("cagnott") &&
                !t.contains("acheter") &&
                !t.contains("supprimer") &&
                !t.contains("vider") &&
                !t.contains("valider") &&
                !t.contains("sponsorisé") &&
                !t.contains("découvrez") &&
                !t.contains("alternatives") &&
                !t.contains("indisponibles") &&
                !t.contains("rien oublié") &&
                !t.contains("voir tout") &&
                !t.contains("détail commande") &&
                !t.contains("total panier") &&
                !t.contains("provision")
            }
            
            if (productName != null) {
                // Vérifier que ce n'est pas un doublon
                val isDuplicate = products.any { it["name"] == productName && it["price"] == price }
                
                if (!isDuplicate) {
                    products.add(mapOf(
                        "name" to productName,
                        "price" to price,
                        "quantity" to "1"
                    ))
                    Log.d("CrossAppTracking", "✅ Produit ajouté au snapshot: $productName - $price")
                }
            }
        }
        
        // Scanner récursivement les enfants
        for (i in 0 until node.childCount) {
            scanNodeForProducts(node.getChild(i), products)
        }
    }
    
    private fun getDirectTextsFromNode(node: AccessibilityNodeInfo?): List<String> {
        if (node == null) return emptyList()
        
        val texts = mutableListOf<String>()
        
        // Texte du nœud lui-même
        node.text?.toString()?.let { if (it.isNotEmpty()) texts.add(it) }
        node.contentDescription?.toString()?.let { if (it.isNotEmpty()) texts.add(it) }
        
        // Textes des enfants directs ET petits-enfants (profondeur 2 max)
        for (i in 0 until node.childCount) {
            val child = node.getChild(i)
            child?.text?.toString()?.let { if (it.isNotEmpty()) texts.add(it) }
            child?.contentDescription?.toString()?.let { if (it.isNotEmpty()) texts.add(it) }
            
            // Ajouter aussi les petits-enfants (profondeur 2)
            if (child != null) {
                for (j in 0 until child.childCount) {
                    val grandchild = child.getChild(j)
                    grandchild?.text?.toString()?.let { if (it.isNotEmpty()) texts.add(it) }
                    grandchild?.contentDescription?.toString()?.let { if (it.isNotEmpty()) texts.add(it) }
                }
            }
        }
        
        return texts
    }
    
    private fun getAllTextsFromNode(node: AccessibilityNodeInfo?): List<String> {
        if (node == null) return emptyList()
        
        val texts = mutableListOf<String>()
        node.text?.toString()?.let { if (it.isNotEmpty()) texts.add(it) }
        node.contentDescription?.toString()?.let { if (it.isNotEmpty()) texts.add(it) }
        
        for (i in 0 until node.childCount) {
            texts.addAll(getAllTextsFromNode(node.getChild(i)))
        }
        
        return texts
    }
    
    private fun trackClickEvent(event: AccessibilityEvent, packageName: String) {
        val nodeInfo = event.source
        val elementInfo = extractElementInfo(nodeInfo, packageName)
        val currentTime = System.currentTimeMillis()
        val contentHash = generateContentHash(elementInfo)
        
        // Détecter spécifiquement les clics sur boutons d'ajout au panier
        val isCartButton = isCartAddButton(nodeInfo)
        
        if (isCartButton) {
            // Traiter comme un ajout au panier
            val productInfo = extractProductInfoFromClick(nodeInfo)
            val eventSignature = EventSignature(
                eventType = "ADD_TO_CART",
                productName = productInfo["productName"] as? String,
                cartAction = productInfo["cartAction"] as? String,
                contentHash = contentHash,
                timestamp = currentTime
            )
            
            eventBuffer.bufferEvent(eventSignature) {
                trackingManager.trackEvent(TrackingEventType.ADD_TO_CART, mapOf(
                    "app" to getAppName(packageName),
                    "packageName" to packageName,
                    "productInfo" to productInfo,
                    "eventType" to "cross_app_cart_update"
                ))
                
                Log.d("CrossAppTracking", "🛒 Bouton panier cliqué: ${productInfo["productName"] ?: "Inconnu"} - Prix: ${productInfo["price"] ?: "N/A"}")
            }
        } else {
            // Traiter comme un clic normal
            val eventSignature = EventSignature(
                eventType = "VIEW_CLICKED",
                productName = elementInfo["text"] as? String,
                cartAction = null,
                contentHash = contentHash,
                timestamp = currentTime
            )
            
            eventBuffer.bufferEvent(eventSignature) {
                trackingManager.trackEvent(TrackingEventType.VIEW_CLICKED, mapOf(
                    "app" to getAppName(packageName),
                    "packageName" to packageName,
                    "element" to elementInfo,
                    "eventType" to "cross_app_click",
                    "timestamp" to currentTime
                ))
                
                Log.d("CrossAppTracking", "Click envoyé dans ${getAppName(packageName)}: $elementInfo")
            }
        }
    }
    
    private fun trackScrollEvent(event: AccessibilityEvent, packageName: String) {
        trackingManager.trackEvent(TrackingEventType.SCROLL, mapOf(
            "app" to getAppName(packageName),
            "packageName" to packageName,
            "scrollX" to event.scrollX,
            "scrollY" to event.scrollY,
            "eventType" to "cross_app_scroll"
        ))
    }
    
    private fun trackContentChange(event: AccessibilityEvent, packageName: String) {
        // Détecter les changements de contenu (ajout panier, navigation, etc.)
        val nodeInfo = event.source
        
        // Vérifier spécifiquement les éléments de panier avec filtrage intelligent
        if (nodeInfo != null) {
            val cartElements = findCartElements(nodeInfo)
            if (cartElements.isNotEmpty()) {
                val currentTime = System.currentTimeMillis()
                val contentHash = generateContentHash(cartElements)
                
                val productInfo = extractProductInfo(nodeInfo)
                val eventSignature = EventSignature(
                    eventType = "ADD_TO_CART",
                    productName = productInfo["productName"] as? String,
                    cartAction = productInfo["cartAction"] as? String,
                    contentHash = contentHash,
                    timestamp = currentTime
                )
                
                // Utiliser le buffer simple (le serveur fera le filtrage)
                eventBuffer.bufferEvent(eventSignature) {
                    trackingManager.trackEvent(TrackingEventType.ADD_TO_CART, mapOf(
                        "app" to getAppName(packageName),
                        "packageName" to packageName,
                        "productInfo" to productInfo,
                        "eventType" to "cross_app_cart_update"
                    ))
                    
                    Log.d("CrossAppTracking", "🛒 Produit envoyé: ${productInfo["productName"] ?: "Inconnu"} - Prix: ${productInfo["price"] ?: "N/A"}")
                }
            } else {
                // Enregistrer les changements de contenu non-panier seulement si significatifs
                val currentTime = System.currentTimeMillis()
                val contentHash = generateContentHash(mapOf("generic" to "content_change"))
                
                val eventSignature = EventSignature(
                    eventType = "CONTENT_CHANGED",
                    productName = null,
                    cartAction = null,
                    contentHash = contentHash,
                    timestamp = currentTime
                )
                
                eventBuffer.bufferEvent(eventSignature) {
                    trackingManager.trackEvent(TrackingEventType.CONTENT_CHANGED, mapOf(
                        "app" to getAppName(packageName),
                        "packageName" to packageName,
                        "eventType" to "cross_app_content_change",
                        "timestamp" to currentTime
                    ))
                }
            }
        }
    }
    
    private fun trackTextInput(event: AccessibilityEvent, packageName: String) {
        // Tracking des recherches (sans contenu sensible)
        if (event.text?.isNotEmpty() == true) {
            trackingManager.trackEvent(TrackingEventType.SEARCH, mapOf(
                "app" to getAppName(packageName),
                "packageName" to packageName,
                "searchLength" to event.text.toString().length,
                "eventType" to "cross_app_search"
            ))
        }
    }
    
    private fun extractElementInfo(nodeInfo: AccessibilityNodeInfo?, packageName: String): Map<String, Any> {
        if (nodeInfo == null) return emptyMap()
        
        return mapOf(
            "className" to (nodeInfo.className?.toString() ?: "unknown"),
            "contentDescription" to (nodeInfo.contentDescription?.toString() ?: ""),
            "text" to (nodeInfo.text?.toString() ?: ""),
            "resourceId" to (nodeInfo.viewIdResourceName ?: ""),
            "clickable" to nodeInfo.isClickable,
            "bounds" to getBounds(nodeInfo)
        )
    }
    
    private fun findCartElements(nodeInfo: AccessibilityNodeInfo): List<Map<String, Any>> {
        val cartElements = mutableListOf<Map<String, Any>>()
        
        fun traverseNode(node: AccessibilityNodeInfo?) {
            node?.let {
                val text = it.text?.toString()
                val contentDescription = it.contentDescription?.toString()
                val className = it.className?.toString()
                
                if (!text.isNullOrEmpty() || !contentDescription.isNullOrEmpty()) {
                    val elementInfo = mutableMapOf<String, Any>()
                    
                    text?.let { t -> 
                        // Filtrer les éléments UI parasites dès l'extraction
                        val lowerText = t.lowercase()
                        val uiNoisePatterns = listOf(
                            "logo", "version", "v\\d+\\.\\d+", "new notifications",
                            "afficher", "facilitez", "faites des économies"
                        )
                        
                        if (!uiNoisePatterns.any { pattern -> 
                            lowerText.contains(Regex(pattern)) 
                        }) {
                            elementInfo["text"] = t
                        }
                    }
                    
                    contentDescription?.let { cd -> 
                        val lowerDesc = cd.lowercase()
                        if (!lowerDesc.contains("logo") && !lowerDesc.contains("version")) {
                            elementInfo["contentDescription"] = cd
                        }
                    }
                    
                    className?.let { cn -> elementInfo["className"] = cn }
                    
                    // N'ajouter que si on a du contenu utile
                    if (elementInfo.containsKey("text") || elementInfo.containsKey("contentDescription")) {
                        cartElements.add(elementInfo)
                    }
                }
                
                for (i in 0 until it.childCount) {
                    traverseNode(it.getChild(i))
                }
            }
        }
        
        traverseNode(nodeInfo)
        return cartElements
    }
    
    private fun extractProductInfo(nodeInfo: AccessibilityNodeInfo): Map<String, Any> {
        val productInfo = mutableMapOf<String, Any>()
        val allTexts = mutableListOf<String>()
        val cartKeywords = listOf("ajouter", "retirer", "panier", "+", "-", "€")
        
        fun searchNode(node: AccessibilityNodeInfo?) {
            node?.let {
                val text = it.text?.toString() ?: ""
                val desc = it.contentDescription?.toString() ?: ""
                
                if (text.isNotEmpty()) allTexts.add(text)
                if (desc.isNotEmpty()) allTexts.add(desc)
                
                // Détecter les prix
                if (text.matches(Regex(".*\\d+[,.]\\d+.*€.*")) || desc.matches(Regex(".*\\d+[,.]\\d+.*€.*"))) {
                    productInfo["price"] = text.ifEmpty { desc }
                }
                
                // Détecter les quantités (boutons + et -)
                if (cartKeywords.any { keyword -> text.contains(keyword) || desc.contains(keyword) }) {
                    productInfo["cartAction"] = text.ifEmpty { desc }
                }
                
                for (i in 0 until it.childCount) {
                    searchNode(it.getChild(i))
                }
            }
        }
        
        searchNode(nodeInfo)
        
        // Si pas de nom de produit trouvé, utiliser le texte le plus long
        if (!productInfo.containsKey("productName") && allTexts.isNotEmpty()) {
            val longestText = allTexts.filter { it.length > 3 && !it.contains("€") }
                .maxByOrNull { it.length }
            if (longestText != null) {
                productInfo["productName"] = longestText
            }
        }
        
        productInfo["allTexts"] = allTexts.take(10) // Limiter pour éviter trop de données
        return productInfo
    }
    
    private fun getBounds(nodeInfo: AccessibilityNodeInfo): Map<String, Int> {
        val bounds = android.graphics.Rect()
        nodeInfo.getBoundsInScreen(bounds)
        return mapOf(
            "left" to bounds.left,
            "top" to bounds.top,
            "right" to bounds.right,
            "bottom" to bounds.bottom
        )
    }
    
    private fun generateContentHash(data: Any): String {
        val content = when (data) {
            is Map<*, *> -> data.values.joinToString("|")
            is List<*> -> data.joinToString("|")
            else -> data.toString()
        }
        return try {
            val digest = MessageDigest.getInstance("MD5")
            val hashBytes = digest.digest(content.toByteArray())
            hashBytes.joinToString("") { "%02x".format(it) }
        } catch (e: Exception) {
            content.hashCode().toString()
        }
    }
    
    private fun isCartAddButton(nodeInfo: AccessibilityNodeInfo?): Boolean {
        if (nodeInfo == null) return false
        
        val text = nodeInfo.text?.toString()?.lowercase() ?: ""
        val desc = nodeInfo.contentDescription?.toString()?.lowercase() ?: ""
        val resourceId = nodeInfo.viewIdResourceName?.lowercase() ?: ""
        
        // Blacklist améliorée avec nouveaux patterns détectés
        val strictBlacklist = listOf(
            "vider", "supprimer", "annuler", "panier", "cart", "êtes vous sûr", 
            "déjà ajoutés", "produits déjà", "votre panier", "panier est vide",
            "mes promos", "cagnotté", "inconnu", "accueil", "rechercher", 
            "drive", "livraison", "compte", "notification", "ferme", "ouvert",
            "voir tout", "menu", "navigation", "retour", "back",
            "retirer", "euros et", "centimes", "avis", "bouton de substitution",
            "rien oublié", "valider mon panier"
        )
        
        val isBlacklisted = strictBlacklist.any { blacklisted ->
            text.contains(blacklisted) || desc.contains(blacklisted)
        }
        
        if (isBlacklisted) return false
        
        // Patterns d'ajout au panier
        val exactCartPatterns = listOf(
            "ajouter au panier", "add to cart", "ajouter un produit"
        )
        
        val hasExactCartText = exactCartPatterns.any { pattern ->
            text.contains(pattern) || desc.contains(pattern)
        }
        
        val hasExactCartResourceId = resourceId.contains("add_to_cart") || 
                                    resourceId.contains("btn_add_cart") ||
                                    resourceId.contains("cart_add_button")
        
        if (hasExactCartText || hasExactCartResourceId) {
            return true
        }
        
        // Cas spécial Carrefour : Bouton vide avec sibling contenant "ajouter" dans desc
        // Structure : <View clickable><View content-desc="Ajouter un produit dans le panier"/><Button text=""/></View>
        if (text.isEmpty() && desc.isEmpty()) {
            val parent = nodeInfo.parent
            if (parent != null) {
                for (i in 0 until parent.childCount) {
                    val sibling = parent.getChild(i)
                    val siblingDesc = sibling?.contentDescription?.toString()?.lowercase() ?: ""
                    if (siblingDesc.contains("ajouter") && siblingDesc.contains("panier")) {
                        return true
                    }
                }
            }
        }
        
        return false
    }
    
    private fun hasProductPriceContext(nodeInfo: AccessibilityNodeInfo): Boolean {
        // Chercher des indices de prix dans un rayon de 5 niveaux
        fun searchForPriceContext(node: AccessibilityNodeInfo?, maxDepth: Int = 5): Boolean {
            if (node == null || maxDepth <= 0) return false
            
            val text = node.text?.toString() ?: ""
            val desc = node.contentDescription?.toString() ?: ""
            
            // Patterns de prix très spécifiques
            val pricePatterns = listOf(
                "€", "EUR", "€/KG", "€/kg", 
                Regex("\\d+[,.]\\d+\\s*€"),
                Regex("\\d+[,.]\\d+€/KG", RegexOption.IGNORE_CASE)
            )
            
            // Vérifier si ce noeud contient un prix
            val hasPrice = pricePatterns.any { pattern ->
                when (pattern) {
                    is Regex -> pattern.containsMatchIn(text) || pattern.containsMatchIn(desc)
                    is String -> text.contains(pattern) || desc.contains(pattern)
                    else -> false
                }
            }
            
            if (hasPrice) return true
            
            // Chercher dans les parents
            if (searchForPriceContext(node.parent, maxDepth - 1)) return true
            
            // Chercher dans les enfants
            for (i in 0 until (node.childCount ?: 0)) {
                if (searchForPriceContext(node.getChild(i), maxDepth - 1)) return true
            }
            
            return false
        }
        
        return searchForPriceContext(nodeInfo)
    }
    
    private fun isNearCartContext(nodeInfo: AccessibilityNodeInfo): Boolean {
        // Chercher dans les éléments parents/enfants pour contexte panier
        var parent = nodeInfo.parent
        var depth = 0
        
        while (parent != null && depth < 3) {
            val parentText = parent.text?.toString()?.lowercase() ?: ""
            val parentDesc = parent.contentDescription?.toString()?.lowercase() ?: ""
            
            if (parentText.contains("panier") || parentText.contains("cart") ||
                parentDesc.contains("panier") || parentDesc.contains("cart") ||
                parentText.contains("€") || parentText.contains("prix")) {
                return true
            }
            
            parent = parent.parent
            depth++
        }
        
        return false
    }
    
    private fun extractProductInfoFromClick(nodeInfo: AccessibilityNodeInfo?): Map<String, Any> {
        val productInfo = mutableMapOf<String, Any>()
        val allTexts = mutableListOf<String>()
        val allPrices = mutableListOf<String>()
        
        // Chercher dans un rayon plus large pour trouver les infos produit
        fun searchProductContext(node: AccessibilityNodeInfo?, maxDepth: Int = 8) {
            if (node == null || maxDepth <= 0) return
            
            val text = node.text?.toString() ?: ""
            val desc = node.contentDescription?.toString() ?: ""
            val resourceId = node.viewIdResourceName ?: ""
            
            if (text.isNotEmpty()) allTexts.add(text)
            if (desc.isNotEmpty()) allTexts.add(desc)
            
            // Patterns de prix étendus pour Carrefour
            val pricePatterns = listOf(
                Regex("(\\d+[,.]\\d+)\\s*€"),
                Regex("(\\d+[,.]\\d+)€/KG"),
                Regex("(\\d+[,.]\\d+)€/L"),
                Regex("Prix:\\s*(\\d+[,.]\\d+)\\s*€"),
                Regex("(\\d+[,.]\\d+)\\s*EUR"),
                Regex("€\\s*(\\d+[,.]\\d+)"),
                Regex("(\\d+)€(\\d+)"), // Format 3€99
                Regex("(\\d{1,3}[,.]\\d{2})"), // Prix sans €
                Regex("\\b(\\d+[,.]\\d+)\\b.*€") // Prix suivi de €
            )
            
            // Chercher prix dans text, desc et resourceId
            listOf(text, desc, resourceId).forEach { content ->
                pricePatterns.forEach { pattern ->
                    pattern.findAll(content).forEach { match ->
                        val priceValue = match.value
                        if (priceValue.isNotEmpty() && !allPrices.contains(priceValue)) {
                            allPrices.add(priceValue)
                        }
                    }
                }
            }
            
            // Recherche spéciale pour éléments avec IDs prix
            if (resourceId.contains("price", ignoreCase = true) || 
                resourceId.contains("cost", ignoreCase = true) ||
                resourceId.contains("amount", ignoreCase = true)) {
                if (text.isNotEmpty()) allPrices.add(text)
            }
            
            // Chercher dans les siblings (éléments frères)
            node.parent?.let { parent ->
                for (i in 0 until parent.childCount) {
                    val sibling = parent.getChild(i)
                    if (sibling != node && maxDepth > 1) {
                        searchProductContext(sibling, 2) // Recherche limitée dans siblings
                    }
                }
            }
            
            // Chercher dans les parents et enfants
            if (maxDepth > 2) {
                searchProductContext(node.parent, maxDepth - 1)
            }
            for (i in 0 until node.childCount) {
                searchProductContext(node.getChild(i), maxDepth - 1)
            }
        }
        
        searchProductContext(nodeInfo)
        
        // Sélectionner le meilleur prix trouvé
        if (allPrices.isNotEmpty()) {
            val bestPrice = allPrices
                .filter { it.matches(Regex(".*\\d+[,.]\\d+.*")) }
                .maxByOrNull { price ->
                    // Préférer les prix avec € explicite
                    when {
                        price.contains("€") -> 3
                        price.matches(Regex("\\d+[,.]\\d+")) -> 2
                        else -> 1
                    }
                }
            
            if (bestPrice != null) {
                productInfo["price"] = bestPrice
            }
        }
        
        // Extraire le nom du produit (texte le plus long qui n'est pas un prix)
        val productName = allTexts
            .filter { it.length > 5 && !it.matches(Regex(".*\\d+[,.]\\d+.*€.*")) }
            .filter { !it.lowercase().contains("ajouter") && !it.lowercase().contains("button") }
            .filter { !it.lowercase().contains("scanner") && !it.lowercase().contains("code") }
            .filter { !it.lowercase().contains("ce produit est noté") }
            .filter { !it.lowercase().contains("par les utilisateur") }
            .filter { !it.lowercase().contains("retirer un produit") }
            .filter { !it.lowercase().contains("ajouter un produit") }
            .maxByOrNull { it.length }
        
        if (productName != null) {
            productInfo["productName"] = productName
        }
        
        productInfo["cartAction"] = "Ajout au panier via clic"
        productInfo["allTexts"] = allTexts.take(15)
        productInfo["foundPrices"] = allPrices.take(5) // Debug: voir tous les prix trouvés
        
        return productInfo
    }
    
    private fun getAppName(packageName: String): String {
        return when (packageName) {
            "com.leclerc.drive" -> "E.Leclerc"
            "com.carrefour.fid.android" -> "Carrefour"
            "com.auchan.drive" -> "Auchan"
            "com.casino.drive" -> "Casino"
            "com.amazon.mShop.android.shopping" -> "Amazon"
            "com.cdiscount.mobile" -> "Cdiscount"
            "com.monoprix.monoprixmobile" -> "Monoprix"
            else -> packageName
        }
    }

    override fun onInterrupt() {
        Log.d("CrossAppTracking", "Service de tracking interrompu")
    }
}
