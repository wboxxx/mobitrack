package com.bascule.leclerctracking.auscultation

import android.graphics.Rect

/**
 * Data class pour l'enregistrement brut des événements d'accessibilité
 * Basé sur le prompt d'auscultation d'app via Accessibility
 */
data class A11yEventRaw(
    val ts: Long,
    val packageName: String?,
    val type: String,
    val className: String?,
    val text: List<CharSequence>?,
    val contentDescription: CharSequence?,
    val viewIdResourceName: String?,
    val scrollX: Int?, 
    val scrollY: Int?,
    val scrollDeltaX: Int?, 
    val scrollDeltaY: Int?,
    val fromIndex: Int?, 
    val toIndex: Int?,
    val checked: Boolean?, 
    val selected: Boolean?, 
    val password: Boolean?,
    val bounds: Rect?, // boundsInScreen
    val activity: String? // from WINDOW_STATE_CHANGED or heuristic
)
