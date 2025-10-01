package com.bascule.leclerctracking.service

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Intent
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
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
        Log.d("CrossAppTracking", "Service de tracking cross-app démarré")
    }
    
    override fun onServiceConnected() {
        super.onServiceConnected()
        
        Log.d("CrossAppTracking", "🚀 Accessibility Service connecté !")
        
        val info = AccessibilityServiceInfo().apply {
            eventTypes = AccessibilityEvent.TYPES_ALL_MASK
            feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
            flags = AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS or
                    AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS
            notificationTimeout = 100
        }
        
        serviceInfo = info
        
        Log.d("CrossAppTracking", "Service d'accessibilité configuré pour TOUTES les apps")
        Log.d("CrossAppTracking", "📋 Event types: ${info.eventTypes}")
        Log.d("CrossAppTracking", "📋 Flags: ${info.flags}")
    }
    
    private fun isTargetApp(packageName: String): Boolean {
        // Pour l'instant, surveiller toutes les apps pour collecter des données
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
            }
            AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED -> {
                // Carrefour envoie ce type d'événement lors des clics
                trackContentChange(event, packageName)
            }
            AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED -> {
                trackTextInput(event, packageName)
            }
        }
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
        
        // Blacklist TRÈS stricte basée sur les logs - exclure TOUT ce qui n'est pas un vrai ajout
        val strictBlacklist = listOf(
            "vider", "supprimer", "annuler", "panier", "cart", "êtes vous sûr", 
            "déjà ajoutés", "produits déjà", "votre panier", "panier est vide",
            "mes promos", "cagnotté", "inconnu", "accueil", "rechercher", 
            "drive", "livraison", "compte", "notification", "ferme", "ouvert",
            "voir tout", "menu", "navigation", "retour", "back"
        )
        
        // Vérifier si c'est dans la blacklist (à exclure absolument)
        val isBlacklisted = strictBlacklist.any { blacklisted ->
            text.contains(blacklisted) || desc.contains(blacklisted)
        }
        
        if (isBlacklisted) return false
        
        // SEULS les patterns très spécifiques d'ajout au panier sont acceptés
        val exactCartPatterns = listOf(
            "ajouter au panier", "add to cart"
        )
        
        // Vérifier EXACTEMENT ces patterns
        val hasExactCartText = exactCartPatterns.any { pattern ->
            text.contains(pattern) || desc.contains(pattern)
        }
        
        // IDs de ressource TRÈS spécifiques
        val hasExactCartResourceId = resourceId.contains("add_to_cart") || 
                                    resourceId.contains("btn_add_cart") ||
                                    resourceId.contains("cart_add_button")
        
        // Accepter SEULEMENT si:
        // 1. Texte exact "ajouter au panier" OU ID très spécifique
        // 2. ET contexte prix valide
        // 3. ET pas dans la blacklist
        return (hasExactCartText || hasExactCartResourceId) && hasProductPriceContext(nodeInfo)
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
