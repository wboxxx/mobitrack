package com.bascule.leclerctracking.ui

import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.bascule.leclerctracking.databinding.ActivityConsentBinding
import com.bascule.leclerctracking.service.CrossAppTrackingService
import com.bascule.leclerctracking.utils.AccessibilityUtils

class ConsentActivity : AppCompatActivity() {
    
    private lateinit var binding: ActivityConsentBinding
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityConsentBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        setupUI()
        checkPermissions()
    }
    
    private fun setupUI() {
        binding.apply {
            // Titre et description
            titleText.text = "Bascule Cross-App Tracking"
            descriptionText.text = """
                Cette application peut analyser vos interactions sur les apps e-commerce 
                pour améliorer votre expérience d'achat.
                
                Apps supportées:
                • E.Leclerc Drive
                • Carrefour
                • Auchan Drive  
                • Casino Drive
                • Amazon Shopping
                • Cdiscount
                • Monoprix
                
                Vos données restent privées et anonymes.
            """.trimIndent()
            
            // Boutons d'action
            acceptButton.setOnClickListener {
                requestAccessibilityPermission()
            }
            
            declineButton.setOnClickListener {
                showDeclineDialog()
            }
            
            settingsButton.setOnClickListener {
                openAccessibilitySettings()
            }
            
            // Informations sur les permissions
            permissionInfoText.text = """
                Permissions requises:
                
                🔍 Service d'Accessibilité
                Permet de détecter les interactions dans les autres apps
                
                🔒 Confidentialité Garantie
                • Aucune donnée personnelle collectée
                • Pas d'accès aux mots de passe
                • Tracking anonyme uniquement
                • Données stockées localement
            """.trimIndent()
        }
    }
    
    private fun checkPermissions() {
        val isAccessibilityEnabled = AccessibilityUtils.isAccessibilityServiceEnabled(
            this, 
            CrossAppTrackingService::class.java
        )
        
        binding.apply {
            if (isAccessibilityEnabled) {
                statusText.text = "✅ Service activé - Tracking cross-app fonctionnel"
                statusText.setTextColor(ContextCompat.getColor(this@ConsentActivity, android.R.color.holo_green_dark))
                acceptButton.text = "Désactiver le Service"
                acceptButton.setOnClickListener { openAccessibilitySettings() }
            } else {
                statusText.text = "⚠️ Service désactivé - Activation requise"
                statusText.setTextColor(ContextCompat.getColor(this@ConsentActivity, android.R.color.holo_orange_dark))
                acceptButton.text = "Activer le Service"
            }
        }
    }
    
    private fun requestAccessibilityPermission() {
        val isEnabled = AccessibilityUtils.isAccessibilityServiceEnabled(
            this, 
            CrossAppTrackingService::class.java
        )
        
        if (!isEnabled) {
            showPermissionExplanation()
        } else {
            Toast.makeText(this, "Service déjà activé!", Toast.LENGTH_SHORT).show()
        }
    }
    
    private fun showPermissionExplanation() {
        androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("Activation du Service d'Accessibilité")
            .setMessage("""
                Pour fonctionner, Bascule a besoin d'accéder au service d'accessibilité Android.
                
                Étapes:
                1. Ouvrir les Paramètres d'Accessibilité
                2. Trouver "Bascule Cross-App Tracking"
                3. Activer le service
                4. Confirmer les permissions
                
                Ce service permet de détecter vos interactions dans les apps e-commerce 
                pour améliorer l'analyse comportementale.
            """.trimIndent())
            .setPositiveButton("Ouvrir Paramètres") { _, _ ->
                openAccessibilitySettings()
            }
            .setNegativeButton("Annuler", null)
            .show()
    }
    
    private fun openAccessibilitySettings() {
        try {
            val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
            startActivity(intent)
            
            Toast.makeText(
                this, 
                "Cherchez 'Bascule Cross-App Tracking' dans la liste", 
                Toast.LENGTH_LONG
            ).show()
        } catch (e: Exception) {
            Toast.makeText(
                this, 
                "Impossible d'ouvrir les paramètres d'accessibilité", 
                Toast.LENGTH_SHORT
            ).show()
        }
    }
    
    private fun showDeclineDialog() {
        androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("Refus du Consentement")
            .setMessage("""
                Sans le service d'accessibilité, Bascule ne peut pas analyser 
                vos interactions dans les autres apps.
                
                Vous pouvez:
                • Utiliser uniquement le tracking intra-app
                • Activer le service plus tard
                • Fermer l'application
            """.trimIndent())
            .setPositiveButton("Mode Intra-App Seulement") { _, _ ->
                startIntraAppMode()
            }
            .setNegativeButton("Fermer l'App") { _, _ ->
                finish()
            }
            .setNeutralButton("Reconsidérer", null)
            .show()
    }
    
    private fun startIntraAppMode() {
        // Navigate to main tracking activity
        val intent = Intent(this, com.bascule.leclerctracking.MainActivity::class.java).apply {
            putExtra("mode", "intra_app_only")
            flags = Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        startActivity(intent)
        finish()
    }
    
    override fun onResume() {
        super.onResume()
        // Vérifier les permissions à chaque retour sur l'activité
        checkPermissions()
    }
}
