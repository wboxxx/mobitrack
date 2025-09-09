package com.bascule.leclerctracking.utils

import android.accessibilityservice.AccessibilityService
import android.content.Context
import android.provider.Settings
import android.text.TextUtils

object AccessibilityUtils {
    
    /**
     * Vérifie si un service d'accessibilité spécifique est activé
     */
    fun isAccessibilityServiceEnabled(context: Context, serviceClass: Class<out AccessibilityService>): Boolean {
        val expectedComponentName = "${context.packageName}/${serviceClass.name}"
        
        val enabledServicesSetting = Settings.Secure.getString(
            context.contentResolver,
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        ) ?: return false
        
        val colonSplitter = TextUtils.SimpleStringSplitter(':')
        colonSplitter.setString(enabledServicesSetting)
        
        while (colonSplitter.hasNext()) {
            val componentName = colonSplitter.next()
            if (componentName.equals(expectedComponentName, ignoreCase = true)) {
                return true
            }
        }
        
        return false
    }
    
    /**
     * Vérifie si les services d'accessibilité sont globalement activés
     */
    fun isAccessibilityEnabled(context: Context): Boolean {
        val accessibilityEnabled = Settings.Secure.getInt(
            context.contentResolver,
            Settings.Secure.ACCESSIBILITY_ENABLED,
            0
        )
        return accessibilityEnabled == 1
    }
    
    /**
     * Obtient la liste des services d'accessibilité activés
     */
    fun getEnabledAccessibilityServices(context: Context): List<String> {
        val enabledServicesSetting = Settings.Secure.getString(
            context.contentResolver,
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        ) ?: return emptyList()
        
        return enabledServicesSetting.split(':').filter { it.isNotEmpty() }
    }
}
