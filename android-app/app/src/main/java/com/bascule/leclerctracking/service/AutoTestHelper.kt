package com.bascule.leclerctracking.service

import android.accessibilityservice.AccessibilityService
import android.util.Log

/**
 * Helper pour les tests automatiques via le service d'accessibilité
 */
object AutoTestHelper {
    
    private var serviceInstance: OptimizedCarrefourTrackingService? = null
    
    fun setServiceInstance(service: OptimizedCarrefourTrackingService?) {
        serviceInstance = service
    }
    
    /**
     * Trouve et clique sur un élément contenant le texte spécifié
     */
    fun clickElementContainingText(text: String): Boolean {
        // Note: Cette méthode nécessite d'être appelée depuis le service lui-même
        // car rootInActiveWindow et dispatchGesture ne sont pas accessibles de l'extérieur
        Log.d("AutoTestHelper", "🔍 Recherche d'élément contenant: $text")
        return false
    }
    
    /**
     * Fait défiler la page vers le bas
     */
    fun scrollPage(): Boolean {
        // Note: Cette méthode nécessite d'être appelée depuis le service lui-même
        Log.d("AutoTestHelper", "📜 Défilement de la page")
        return false
    }
    
    /**
     * Clique sur le bouton d'ajout au panier près d'un produit
     */
    fun clickAddToCartNearProduct(productName: String): Boolean {
        // Note: Cette méthode nécessite d'être appelée depuis le service lui-même
        Log.d("AutoTestHelper", "🛒 Recherche bouton ajout panier pour: $productName")
        return false
    }
}