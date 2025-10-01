package com.bascule.leclerctracking.service

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.graphics.Path
import android.graphics.Rect
import android.os.Build
import android.util.Log
import android.view.accessibility.AccessibilityNodeInfo

/**
 * Helper pour les tests automatiques via le service d'accessibilité
 */
object AutoTestHelper {
    
    private var serviceInstance: CrossAppTrackingService? = null
    
    fun setServiceInstance(service: CrossAppTrackingService?) {
        serviceInstance = service
    }
    
    /**
     * Trouve et clique sur un élément contenant le texte spécifié
     */
    fun clickElementContainingText(text: String): Boolean {
        val service = serviceInstance ?: return false
        val rootNode = service.rootInActiveWindow ?: return false
        
        Log.d("AutoTestHelper", "🔍 Recherche d'élément contenant: $text")
        
        val targetNode = findNodeContainingText(rootNode, text)
        if (targetNode != null) {
            Log.d("AutoTestHelper", "✅ Élément trouvé, tentative de clic...")
            
            // Si l'élément n'est pas cliquable, chercher le parent cliquable
            var clickableNode = targetNode
            if (!targetNode.isClickable) {
                Log.d("AutoTestHelper", "⚠️ Élément non cliquable, recherche du parent...")
                clickableNode = findClickableParent(targetNode)
                if (clickableNode == null) {
                    Log.d("AutoTestHelper", "❌ Aucun parent cliquable trouvé")
                    targetNode.recycle()
                    rootNode.recycle()
                    return false
                }
                Log.d("AutoTestHelper", "✅ Parent cliquable trouvé")
            }
            
            var clicked = clickableNode.performAction(AccessibilityNodeInfo.ACTION_CLICK)
            
            // Si ACTION_CLICK échoue, essayer avec un geste tactile
            if (!clicked && Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                Log.d("AutoTestHelper", "⚠️ ACTION_CLICK échoué, tentative avec geste tactile...")
                clicked = clickNodeWithGesture(clickableNode)
            }
            
            if (clickableNode != targetNode) {
                clickableNode.recycle()
            }
            targetNode.recycle()
            
            if (clicked) {
                Log.d("AutoTestHelper", "✅ Clic réussi sur: $text")
            } else {
                Log.d("AutoTestHelper", "❌ Échec du clic sur: $text")
            }
            rootNode.recycle()
            return clicked
        } else {
            Log.d("AutoTestHelper", "❌ Élément non trouvé: $text")
        }
        
        rootNode.recycle()
        return false
    }
    
    private fun findClickableParent(node: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        var current = node.parent
        var depth = 0
        
        while (current != null && depth < 10) {  // Augmenté à 10 niveaux
            if (current.isClickable) {
                return current
            }
            val parent = current.parent
            current = parent
            depth++
        }
        
        return null
    }
    
    /**
     * Trouve et clique sur un bouton "Ajouter au panier" proche d'un produit
     */
    fun clickAddToCartNearProduct(productName: String): Boolean {
        val service = serviceInstance ?: return false
        val rootNode = service.rootInActiveWindow ?: return false
        
        Log.d("AutoTestHelper", "🔍 Recherche du bouton + pour: $productName")
        
        // Trouver le produit
        val productNode = findNodeContainingText(rootNode, productName)
        if (productNode == null) {
            Log.d("AutoTestHelper", "❌ Produit non trouvé: $productName")
            rootNode.recycle()
            return false
        }
        
        Log.d("AutoTestHelper", "✅ Produit trouvé: $productName")
        
        // Chercher le bouton "Ajouter" dans le même parent ou les parents proches
        val addButton = findAddButtonNearNode(productNode)
        productNode.recycle()
        
        if (addButton != null) {
            Log.d("AutoTestHelper", "✅ Bouton + trouvé, tentative de clic...")
            val clicked = addButton.performAction(AccessibilityNodeInfo.ACTION_CLICK)
            addButton.recycle()
            
            if (clicked) {
                Log.d("AutoTestHelper", "✅ Clic réussi sur le bouton +")
            } else {
                Log.d("AutoTestHelper", "❌ Échec du clic")
            }
            return clicked
        } else {
            Log.d("AutoTestHelper", "❌ Bouton + non trouvé")
        }
        
        rootNode.recycle()
        return false
    }
    
    private fun findNodeContainingText(node: AccessibilityNodeInfo?, text: String): AccessibilityNodeInfo? {
        if (node == null) return null
        
        val nodeText = node.text?.toString()?.lowercase() ?: ""
        val nodeDesc = node.contentDescription?.toString()?.lowercase() ?: ""
        
        if (nodeText.contains(text.lowercase()) || nodeDesc.contains(text.lowercase())) {
            return node
        }
        
        for (i in 0 until node.childCount) {
            val child = node.getChild(i)
            val result = findNodeContainingText(child, text)
            if (result != null) {
                return result
            }
            child?.recycle()
        }
        
        return null
    }
    
    private fun findAddButtonNearNode(productNode: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        // Chercher dans le parent
        var currentNode: AccessibilityNodeInfo? = productNode
        var depth = 0
        
        while (currentNode != null && depth < 5) {
            val parent = currentNode.parent
            if (parent != null) {
                // Chercher un bouton "Ajouter" dans les enfants du parent
                for (i in 0 until parent.childCount) {
                    val sibling = parent.getChild(i)
                    if (sibling != null) {
                        val button = findAddButtonInNode(sibling)
                        if (button != null) {
                            return button
                        }
                        sibling.recycle()
                    }
                }
                currentNode = parent
                depth++
            } else {
                break
            }
        }
        
        return null
    }
    
    private fun findAddButtonInNode(node: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        val desc = node.contentDescription?.toString()?.lowercase() ?: ""
        val text = node.text?.toString()?.lowercase() ?: ""
        
        // Chercher "Ajouter" dans la description
        if (desc.contains("ajouter") && desc.contains("panier")) {
            if (node.isClickable) {
                return node
            }
            // Si pas cliquable, chercher le parent cliquable
            var parent = node.parent
            var depth = 0
            while (parent != null && depth < 3) {
                if (parent.isClickable) {
                    return parent
                }
                parent = parent.parent
                depth++
            }
        }
        
        // Chercher dans les enfants
        for (i in 0 until node.childCount) {
            val child = node.getChild(i)
            if (child != null) {
                val result = findAddButtonInNode(child)
                if (result != null) {
                    return result
                }
                child.recycle()
            }
        }
        
        return null
    }
    
    /**
     * Scroll vers le bas
     */
    fun scrollDown(): Boolean {
        val service = serviceInstance ?: return false
        val rootNode = service.rootInActiveWindow ?: return false
        
        val scrolled = rootNode.performAction(AccessibilityNodeInfo.ACTION_SCROLL_FORWARD)
        rootNode.recycle()
        
        Log.d("AutoTestHelper", if (scrolled) "✅ Scroll effectué" else "❌ Échec du scroll")
        return scrolled
    }
    
    /**
     * Clique sur un nœud en utilisant un geste tactile aux coordonnées du nœud
     */
    private fun clickNodeWithGesture(node: AccessibilityNodeInfo): Boolean {
        val service = serviceInstance ?: return false
        
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N) {
            return false
        }
        
        val rect = Rect()
        node.getBoundsInScreen(rect)
        
        val x = (rect.left + rect.right) / 2f
        val y = (rect.top + rect.bottom) / 2f
        
        Log.d("AutoTestHelper", "📍 Clic tactile aux coordonnées: ($x, $y)")
        
        val path = Path()
        path.moveTo(x, y)
        
        val gesture = GestureDescription.Builder()
            .addStroke(GestureDescription.StrokeDescription(path, 0, 100))
            .build()
        
        return service.dispatchGesture(gesture, null, null)
    }
}
