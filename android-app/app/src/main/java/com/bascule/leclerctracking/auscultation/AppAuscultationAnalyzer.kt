package com.bascule.leclerctracking.auscultation

import android.util.Log
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.*
import kotlin.math.abs

/**
 * Analyseur d'auscultation d'apps Android basé sur des événements Accessibility
 * Implémentation du prompt "Auscultation d'app via Accessibility"
 */
class AppAuscultationAnalyzer {
    
    companion object {
        private const val TAG = "AppAuscultationAnalyzer"
        
        // Patterns de détection e-commerce
        private val ADD_TO_CART_PATTERNS = listOf(
            "add", "ajouter", "cart", "panier", "commander", "ajout", "add to cart"
        )
        
        private val CHECKOUT_PATTERNS = listOf(
            "checkout", "commander", "valider", "proceed", "payer", "finaliser"
        )
        
        private val SEARCH_PATTERNS = listOf(
            "search", "recherche", "chercher", "find", "trouver"
        )
        
        private val CART_PATTERNS = listOf(
            "cart", "panier", "basket", "commande"
        )
        
        private val LOGIN_PATTERNS = listOf(
            "login", "connexion", "sign in", "se connecter", "email", "password"
        )
        
        private val PRICE_PATTERNS = listOf(
            "€", "$", "price", "prix", "total", "montant"
        )
    }
    
    // Profil de l'app analysée
    private var appProfile: AppProfile? = null
    private val sessionEvents = mutableListOf<A11yEventRaw>()
    private val sessionStartTime = System.currentTimeMillis()
    
    /**
     * Analyse un événement d'accessibilité brut
     */
    fun analyzeEvent(event: A11yEventRaw): AuscultationResult {
        // Ajouter à la session
        sessionEvents.add(event)
        
        // Détecter/mettre à jour le profil de l'app
        updateAppProfile(event)
        
        // Normaliser l'événement
        val normalizedEvent = normalizeEvent(event)
        
        // Catégoriser avec prisme e-commerce
        val categorizedEvent = categorizeEvent(normalizedEvent)
        
        // Inférer les actions métier
        val inferences = inferBusinessActions(categorizedEvent)
        
        // Calculer la confiance
        val confidence = calculateConfidence(categorizedEvent, inferences)
        
        return AuscultationResult(
            appProfile = appProfile,
            normalizedEvent = normalizedEvent,
            categorizedEvent = categorizedEvent,
            inferences = inferences,
            confidence = confidence,
            sessionTimeline = buildSessionTimeline(),
            capabilityMap = buildCapabilityMap()
        )
    }
    
    /**
     * Détecte et met à jour le profil de l'app
     */
    private fun updateAppProfile(event: A11yEventRaw) {
        if (appProfile == null) {
            appProfile = AppProfile(
                packageName = event.packageName ?: "unknown",
                likelyBrand = detectBrand(event.packageName),
                firstSeen = sessionStartTime,
                capabilityMap = CapabilityMap()
            )
        }
        
        // Mettre à jour les capacités
        appProfile?.capabilityMap?.let { capabilities ->
            capabilities.emitsClicks = capabilities.emitsClicks || event.type.contains("CLICKED")
            capabilities.emitsScrolls = capabilities.emitsScrolls || event.type.contains("SCROLLED")
            capabilities.exposesIds = capabilities.exposesIds || !event.viewIdResourceName.isNullOrEmpty()
            capabilities.textRichness = calculateTextRichness(event)
        }
    }
    
    /**
     * Normalise un événement brut
     */
    private fun normalizeEvent(event: A11yEventRaw): NormalizedEvent {
        val bounds = event.bounds
        val centerX = bounds?.let { (it.left + it.right) / 2 } ?: 0
        val centerY = bounds?.let { (it.top + it.bottom) / 2 } ?: 0
        
        return NormalizedEvent(
            ts = event.ts,
            packageName = event.packageName ?: "unknown",
            activity = event.activity ?: "unknown",
            rawType = event.type,
            widget = WidgetInfo(
                className = event.className ?: "unknown",
                id = event.viewIdResourceName,
                text = event.text?.joinToString(" ") ?: "",
                desc = event.contentDescription?.toString()
            ),
            bounds = bounds?.let { Bounds(it.left, it.top, it.right, it.bottom) },
            approxXy = ApproxXY(centerX, centerY),
            context = buildContext(event),
            confidence = 1.0 // Sera recalculé
        )
    }
    
    /**
     * Catégorise un événement avec prisme e-commerce
     */
    private fun categorizeEvent(event: NormalizedEvent): CategorizedEvent {
        val category = when {
            isAddToCart(event) -> EventCategory.ADD_TO_CART
            isProductDetail(event) -> EventCategory.PRODUCT_DETAIL
            isProductList(event) -> EventCategory.PRODUCT_LIST
            isCartView(event) -> EventCategory.CART_VIEW
            isCheckoutStart(event) -> EventCategory.CHECKOUT_START
            isPayment(event) -> EventCategory.PAYMENT
            isOrderConfirmation(event) -> EventCategory.ORDER_CONFIRMATION
            isLogin(event) -> EventCategory.LOGIN_REGISTER
            isSearch(event) -> EventCategory.SEARCH
            isNavigation(event) -> EventCategory.NAVIGATION
            isScroll(event) -> EventCategory.SCROLL
            isClick(event) -> EventCategory.CLICK
            isFilterSort(event) -> EventCategory.FILTER_SORT
            isFormEntry(event) -> EventCategory.FORM_ENTRY
            else -> EventCategory.UNKNOWN
        }
        
        return CategorizedEvent(
            event = event,
            category = category,
            productGuess = extractProductInfo(event),
            evidence = buildEvidence(event, category)
        )
    }
    
    /**
     * Infère les actions métier
     */
    private fun inferBusinessActions(categorizedEvent: CategorizedEvent): List<BusinessInference> {
        val inferences = mutableListOf<BusinessInference>()
        
        when (categorizedEvent.category) {
            EventCategory.ADD_TO_CART -> {
                if (categorizedEvent.productGuess != null) {
                    inferences.add(BusinessInference(
                        hypothesis = "ADD_TO_CART",
                        because = listOf("Click on add to cart button", "Product context detected"),
                        confidence = 0.8,
                        evidence = categorizedEvent.evidence
                    ))
                }
            }
            EventCategory.PRODUCT_DETAIL -> {
                inferences.add(BusinessInference(
                    hypothesis = "PRODUCT_DETAIL_VIEW",
                    because = listOf("Product title and price visible", "Add to cart button present"),
                    confidence = 0.7,
                    evidence = categorizedEvent.evidence
                ))
            }
            EventCategory.CART_VIEW -> {
                inferences.add(BusinessInference(
                    hypothesis = "CART_OPENED",
                    because = listOf("Cart screen detected", "Cart-related UI elements"),
                    confidence = 0.6,
                    evidence = categorizedEvent.evidence
                ))
            }
            else -> {
                // Inférences génériques basées sur le contexte
                if (categorizedEvent.event.widget.text.contains("€") || 
                    categorizedEvent.event.widget.text.contains("$")) {
                    inferences.add(BusinessInference(
                        hypothesis = "PRICE_DISPLAYED",
                        because = listOf("Price text detected"),
                        confidence = 0.9,
                        evidence = listOf("price_text")
                    ))
                }
            }
        }
        
        return inferences
    }
    
    /**
     * Calcule le score de confiance
     */
    private fun calculateConfidence(categorizedEvent: CategorizedEvent, inferences: List<BusinessInference>): Double {
        var confidence = 0.5 // Base
        
        // +0.30 si type brut explicite
        if (categorizedEvent.event.rawType.contains("CLICKED")) confidence += 0.30
        
        // +0.25 si ID correspond à une liste blanche
        if (categorizedEvent.event.widget.id?.let { isKnownId(it) } == true) confidence += 0.25
        
        // +0.20 si texte/desc correspond à un pattern fort
        if (categorizedEvent.evidence.any { it.contains("text_match") }) confidence += 0.20
        
        // +0.15 si contexte d'écran cohérent
        if (categorizedEvent.event.context.screenGuess != null) confidence += 0.15
        
        // -0.20 si source == null (déduit)
        if (categorizedEvent.event.widget.id == null) confidence -= 0.20
        
        // -0.15 si WebView/vue personnalisée
        if (categorizedEvent.event.widget.className.contains("WebView")) confidence -= 0.15
        
        return confidence.coerceIn(0.0, 1.0)
    }
    
    /**
     * Construit le contexte de l'événement
     */
    private fun buildContext(event: A11yEventRaw): EventContext {
        val screenGuess = when {
            event.text?.any { it.contains("€") || it.contains("$") } == true -> "PRODUCT_DETAIL"
            event.text?.any { it.contains("panier") || it.contains("cart") } == true -> "CART_VIEW"
            event.text?.any { it.contains("recherche") || it.contains("search") } == true -> "SEARCH"
            else -> null
        }
        
        val productGuess = extractProductFromText(event.text?.joinToString(" ") ?: "")
        
        return EventContext(
            screenGuess = screenGuess,
            productGuess = productGuess,
            container = event.className
        )
    }
    
    /**
     * Extrait les informations produit du texte
     */
    private fun extractProductFromText(text: String): ProductInfo? {
        val priceMatch = Regex("\\d+[.,]\\d{2}\\s*[€$]").find(text)
        val price = priceMatch?.value
        
        // Chercher un titre de produit (texte long sans prix)
        val cleanText = text.replace(Regex("\\d+[.,]\\d{2}\\s*[€$]"), "").trim()
        val title = if (cleanText.length > 5) cleanText else null
        
        return if (price != null || title != null) {
            ProductInfo(title = title, price = price)
        } else null
    }
    
    /**
     * Construit la timeline de session
     */
    private fun buildSessionTimeline(): List<SessionEvent> {
        return sessionEvents.map { event ->
            val category = categorizeEvent(normalizeEvent(event)).category
            SessionEvent(
                ts = event.ts,
                category = category.name,
                label = buildEventLabel(event, category)
            )
        }
    }
    
    /**
     * Construit la carte des capacités
     */
    private fun buildCapabilityMap(): CapabilityMap {
        val events = sessionEvents
        return CapabilityMap(
            emitsClicks = events.any { it.type.contains("CLICKED") },
            emitsScrolls = events.any { it.type.contains("SCROLLED") },
            exposesIds = events.any { !it.viewIdResourceName.isNullOrEmpty() },
            textRichness = calculateOverallTextRichness(),
            structure = buildStructureInfo(),
            knownPatterns = buildKnownPatterns()
        )
    }
    
    // Méthodes de détection de catégories
    private fun isAddToCart(event: NormalizedEvent): Boolean {
        val text = event.widget.text.lowercase()
        val desc = event.widget.desc?.lowercase() ?: ""
        return ADD_TO_CART_PATTERNS.any { pattern -> 
            text.contains(pattern) || desc.contains(pattern) 
        }
    }
    
    private fun isProductDetail(event: NormalizedEvent): Boolean {
        val text = event.widget.text
        return text.contains("€") || text.contains("$") || 
               (text.length > 10 && !text.contains("panier"))
    }
    
    private fun isProductList(event: NormalizedEvent): Boolean {
        return event.widget.className.contains("RecyclerView") && 
               event.rawType.contains("SCROLLED")
    }
    
    private fun isCartView(event: NormalizedEvent): Boolean {
        val text = event.widget.text.lowercase()
        return CART_PATTERNS.any { text.contains(it) }
    }
    
    private fun isCheckoutStart(event: NormalizedEvent): Boolean {
        val text = event.widget.text.lowercase()
        return CHECKOUT_PATTERNS.any { text.contains(it) }
    }
    
    private fun isPayment(event: NormalizedEvent): Boolean {
        val text = event.widget.text
        return text.contains("carte") || text.contains("card") || 
               text.contains("****") || text.contains("••••")
    }
    
    private fun isOrderConfirmation(event: NormalizedEvent): Boolean {
        val text = event.widget.text.lowercase()
        return text.contains("merci") || text.contains("confirmé") || 
               text.contains("commande") || text.contains("order")
    }
    
    private fun isLogin(event: NormalizedEvent): Boolean {
        val text = event.widget.text.lowercase()
        val desc = event.widget.desc?.lowercase() ?: ""
        return LOGIN_PATTERNS.any { pattern -> 
            text.contains(pattern) || desc.contains(pattern) 
        }
    }
    
    private fun isSearch(event: NormalizedEvent): Boolean {
        val text = event.widget.text.lowercase()
        val desc = event.widget.desc?.lowercase() ?: ""
        return SEARCH_PATTERNS.any { pattern -> 
            text.contains(pattern) || desc.contains(pattern) 
        }
    }
    
    private fun isNavigation(event: NormalizedEvent): Boolean {
        return event.rawType.contains("WINDOW_STATE_CHANGED") || 
               event.rawType.contains("WINDOW_CONTENT_CHANGED")
    }
    
    private fun isScroll(event: NormalizedEvent): Boolean {
        return event.rawType.contains("SCROLLED")
    }
    
    private fun isClick(event: NormalizedEvent): Boolean {
        return event.rawType.contains("CLICKED")
    }
    
    private fun isFilterSort(event: NormalizedEvent): Boolean {
        val text = event.widget.text.lowercase()
        return text.contains("filtrer") || text.contains("trier") || 
               text.contains("filter") || text.contains("sort")
    }
    
    private fun isFormEntry(event: NormalizedEvent): Boolean {
        return event.widget.className.contains("EditText") || 
               event.widget.className.contains("TextInput")
    }
    
    // Méthodes utilitaires
    private fun detectBrand(packageName: String?): String {
        return when {
            packageName?.contains("carrefour") == true -> "Carrefour"
            packageName?.contains("amazon") == true -> "Amazon"
            packageName?.contains("leclerc") == true -> "Leclerc"
            else -> "Unknown"
        }
    }
    
    private fun calculateTextRichness(event: A11yEventRaw): TextRichness {
        val textLength = event.text?.joinToString(" ")?.length ?: 0
        val hasPrice = event.text?.any { it.contains("€") || it.contains("$") } == true
        val hasId = !event.viewIdResourceName.isNullOrEmpty()
        
        return when {
            textLength > 50 && hasPrice && hasId -> TextRichness.HIGH
            textLength > 20 && (hasPrice || hasId) -> TextRichness.MEDIUM
            else -> TextRichness.LOW
        }
    }
    
    private fun calculateOverallTextRichness(): TextRichness {
        val richEvents = sessionEvents.count { 
            calculateTextRichness(it) == TextRichness.HIGH 
        }
        val totalEvents = sessionEvents.size
        
        return when {
            totalEvents == 0 -> TextRichness.LOW
            richEvents.toDouble() / totalEvents > 0.3 -> TextRichness.HIGH
            richEvents.toDouble() / totalEvents > 0.1 -> TextRichness.MEDIUM
            else -> TextRichness.LOW
        }
    }
    
    private fun buildStructureInfo(): StructureInfo {
        val events = sessionEvents
        return StructureInfo(
            recyclerView = events.any { it.className?.contains("RecyclerView") == true },
            tabs = events.any { it.className?.contains("TabLayout") == true },
            bottomNav = events.any { it.className?.contains("BottomNavigation") == true },
            webViewRatio = events.count { it.className?.contains("WebView") == true }.toDouble() / events.size
        )
    }
    
    private fun buildKnownPatterns(): Map<String, List<String>> {
        val patterns = mutableMapOf<String, MutableList<String>>()
        
        sessionEvents.forEach { event ->
            event.viewIdResourceName?.let { id ->
                patterns.getOrPut("ids") { mutableListOf() }.add(id)
            }
            event.text?.forEach { text ->
                if (text.length > 3) {
                    patterns.getOrPut("texts") { mutableListOf() }.add(text.toString())
                }
            }
        }
        
        return patterns
    }
    
    private fun buildEvidence(event: NormalizedEvent, category: EventCategory): List<String> {
        val evidence = mutableListOf<String>()
        
        evidence.add("raw_event:${event.rawType}")
        
        if (event.widget.id != null) {
            evidence.add("id_present:${event.widget.id}")
        }
        
        if (event.widget.text.isNotEmpty()) {
            evidence.add("text_present:${event.widget.text}")
        }
        
        if (event.context.screenGuess != null) {
            evidence.add("screen_context:${event.context.screenGuess}")
        }
        
        if (event.widget.text.contains("€") || event.widget.text.contains("$")) {
            evidence.add("price_on_screen")
        }
        
        return evidence
    }
    
    private fun buildEventLabel(event: A11yEventRaw, category: EventCategory): String {
        return when (category) {
            EventCategory.ADD_TO_CART -> "Add to cart clicked"
            EventCategory.PRODUCT_DETAIL -> "Product detail viewed"
            EventCategory.PRODUCT_LIST -> "Product list scrolled"
            EventCategory.CART_VIEW -> "Cart opened"
            EventCategory.CHECKOUT_START -> "Checkout started"
            EventCategory.PAYMENT -> "Payment form"
            EventCategory.ORDER_CONFIRMATION -> "Order confirmed"
            EventCategory.LOGIN_REGISTER -> "Login/Register"
            EventCategory.SEARCH -> "Search performed"
            EventCategory.NAVIGATION -> "Navigation"
            EventCategory.SCROLL -> "Scroll"
            EventCategory.CLICK -> "Click"
            EventCategory.FILTER_SORT -> "Filter/Sort"
            EventCategory.FORM_ENTRY -> "Form entry"
            EventCategory.UNKNOWN -> "Unknown action"
        }
    }
    
    private fun isKnownId(id: String): Boolean {
        val knownIds = listOf(
            "btn_add_to_cart", "add_to_cart", "cart_button",
            "search", "recherche", "checkout", "commander"
        )
        return knownIds.any { id.contains(it) }
    }
    
    private fun extractProductInfo(event: NormalizedEvent): ProductInfo? {
        return extractProductFromText(event.widget.text)
    }
    
    /**
     * Génère un rapport complet d'auscultation
     */
    fun generateAuscultationReport(): AuscultationReport {
        val timeline = buildSessionTimeline()
        val inferences = sessionEvents.mapNotNull { event ->
            val categorized = categorizeEvent(normalizeEvent(event))
            inferBusinessActions(categorized)
        }.flatten()
        
        val confidenceReport = buildConfidenceReport()
        val summary = generateSummary()
        
        return AuscultationReport(
            appProfile = appProfile,
            capabilityMap = buildCapabilityMap(),
            sessionTimeline = timeline,
            categorizedEvents = sessionEvents.map { categorizeEvent(normalizeEvent(it)) },
            inferences = inferences,
            confidenceReport = confidenceReport,
            openQuestions = generateOpenQuestions(),
            summaryMd = summary
        )
    }
    
    private fun buildConfidenceReport(): ConfidenceReport {
        val strong = mutableListOf<String>()
        val medium = mutableListOf<String>()
        val weak = mutableListOf<String>()
        val missing = mutableListOf<String>()
        
        sessionEvents.forEach { event ->
            val normalized = normalizeEvent(event)
            val categorized = categorizeEvent(normalized)
            
            when {
                categorized.evidence.contains("id_present") -> strong.add("Click with ID: ${normalized.widget.id}")
                categorized.evidence.contains("text_match") -> medium.add("Text match: ${normalized.widget.text}")
                categorized.evidence.contains("price_on_screen") -> strong.add("Price visible: ${normalized.widget.text}")
                else -> weak.add("Inferred: ${categorized.category}")
            }
        }
        
        return ConfidenceReport(strong, medium, weak, missing)
    }
    
    private fun generateSummary(): String {
        val appName = appProfile?.likelyBrand ?: "Unknown App"
        val duration = (System.currentTimeMillis() - sessionStartTime) / 1000
        val eventCount = sessionEvents.size
        
        val keyActions = sessionEvents.mapNotNull { event ->
            val categorized = categorizeEvent(normalizeEvent(event))
            when (categorized.category) {
                EventCategory.ADD_TO_CART -> "add to cart"
                EventCategory.PRODUCT_DETAIL -> "product detail"
                EventCategory.CART_VIEW -> "cart view"
                EventCategory.SEARCH -> "search"
                else -> null
            }
        }.distinct()
        
        return "Detected $appName app. Session (${duration}s): ${keyActions.joinToString(" → ")}. " +
               "Event count: $eventCount. Capabilities: ${buildCapabilityMap().let { 
                   listOfNotNull(
                       if (it.emitsClicks) "clicks" else null,
                       if (it.emitsScrolls) "scrolls" else null,
                       if (it.exposesIds) "IDs" else null
                   ).joinToString(", ")
               }}."
    }
    
    private fun generateOpenQuestions(): List<String> {
        val questions = mutableListOf<String>()
        
        if (sessionEvents.none { it.className?.contains("WebView") == true }) {
            questions.add("Test WebView flows for payment/checkout")
        }
        
        if (sessionEvents.none { it.type.contains("WINDOW_STATE_CHANGED") }) {
            questions.add("Test navigation between screens")
        }
        
        if (sessionEvents.none { it.text?.any { text -> text.contains("€") || text.contains("$") } == true }) {
            questions.add("Test product detail screens with prices")
        }
        
        return questions
    }
}

// Enums et data classes
enum class EventCategory {
    NAVIGATION, CLICK, SCROLL, SEARCH, PRODUCT_LIST, PRODUCT_DETAIL,
    ADD_TO_CART, CART_VIEW, CHECKOUT_START, PAYMENT, ORDER_CONFIRMATION,
    LOGIN_REGISTER, FILTER_SORT, FORM_ENTRY, UNKNOWN
}

enum class TextRichness { LOW, MEDIUM, HIGH }

data class AppProfile(
    val packageName: String,
    val likelyBrand: String,
    val firstSeen: Long,
    val capabilityMap: CapabilityMap
)

data class CapabilityMap(
    var emitsClicks: Boolean = false,
    var emitsScrolls: Boolean = false,
    var exposesIds: Boolean = false,
    var textRichness: TextRichness = TextRichness.LOW,
    var structure: StructureInfo = StructureInfo(),
    var knownPatterns: Map<String, List<String>> = emptyMap()
)

data class StructureInfo(
    val recyclerView: Boolean = false,
    val tabs: Boolean = false,
    val bottomNav: Boolean = false,
    val webViewRatio: Double = 0.0
)

data class NormalizedEvent(
    val ts: Long,
    val packageName: String,
    val activity: String,
    val rawType: String,
    val widget: WidgetInfo,
    val bounds: Bounds?,
    val approxXy: ApproxXY,
    val context: EventContext,
    val confidence: Double
)

data class WidgetInfo(
    val className: String,
    val id: String?,
    val text: String,
    val desc: String?
)

data class Bounds(val l: Int, val t: Int, val r: Int, val b: Int)
data class ApproxXY(val cx: Int, val cy: Int)

data class EventContext(
    val screenGuess: String?,
    val productGuess: ProductInfo?,
    val container: String?
)

data class ProductInfo(
    val title: String?,
    val price: String?
)

data class CategorizedEvent(
    val event: NormalizedEvent,
    val category: EventCategory,
    val productGuess: ProductInfo?,
    val evidence: List<String>
)

data class BusinessInference(
    val hypothesis: String,
    val because: List<String>,
    val confidence: Double,
    val evidence: List<String>
)

data class SessionEvent(
    val ts: Long,
    val category: String,
    val label: String
)

data class ConfidenceReport(
    val strong: List<String>,
    val medium: List<String>,
    val weak: List<String>,
    val missing: List<String>
)

data class AuscultationResult(
    val appProfile: AppProfile?,
    val normalizedEvent: NormalizedEvent,
    val categorizedEvent: CategorizedEvent,
    val inferences: List<BusinessInference>,
    val confidence: Double,
    val sessionTimeline: List<SessionEvent>,
    val capabilityMap: CapabilityMap
)

data class AuscultationReport(
    val appProfile: AppProfile?,
    val capabilityMap: CapabilityMap,
    val sessionTimeline: List<SessionEvent>,
    val categorizedEvents: List<CategorizedEvent>,
    val inferences: List<BusinessInference>,
    val confidenceReport: ConfidenceReport,
    val openQuestions: List<String>,
    val summaryMd: String
)
