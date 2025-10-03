package com.bascule.leclerctracking.ui

import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.widget.Button
import android.widget.ScrollView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.bascule.leclerctracking.R
import com.bascule.leclerctracking.service.AutoTestHelper

class AutoTestActivity : AppCompatActivity() {
    
    private lateinit var logTextView: TextView
    private lateinit var scrollView: ScrollView
    private val logBuilder = StringBuilder()
    private val handler = Handler(Looper.getMainLooper())
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_auto_test)
        
        logTextView = findViewById(R.id.logTextView)
        scrollView = findViewById(R.id.scrollView)
        val startTestButton = findViewById<Button>(R.id.startTestButton)
        
        startTestButton.setOnClickListener {
            startCarrefourTest()
        }
    }
    
    private fun addLog(message: String) {
        handler.post {
            logBuilder.append("${getCurrentTime()} $message\n")
            logTextView.text = logBuilder.toString()
            scrollView.post {
                scrollView.fullScroll(ScrollView.FOCUS_DOWN)
            }
        }
        Log.d("AutoTest", message)
    }
    
    private fun getCurrentTime(): String {
        val calendar = java.util.Calendar.getInstance()
        return String.format("%02d:%02d:%02d", 
            calendar.get(java.util.Calendar.HOUR_OF_DAY),
            calendar.get(java.util.Calendar.MINUTE),
            calendar.get(java.util.Calendar.SECOND))
    }
    
    private fun startCarrefourTest() {
        addLog("🚀 Démarrage du test automatique Carrefour")
        addLog("📱 Lancement de Carrefour...")
        
        // Lancer Carrefour
        val intent = Intent().apply {
            setClassName(
                "com.carrefour.fid.android",
                "com.carrefour.fid.android.presentation.ui.splash.SplashActivity"
            )
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        
        try {
            startActivity(intent)
            addLog("✅ Carrefour lancé")
            
            // Attendre que Carrefour se charge
            handler.postDelayed({
                addLog("⏳ Attente du chargement de Carrefour (5s)...")
                handler.postDelayed({
                    performCarrefourActions()
                }, 5000)
            }, 1000)
            
        } catch (e: Exception) {
            addLog("❌ Erreur lors du lancement de Carrefour: ${e.message}")
        }
    }
    
    private fun performCarrefourActions() {
        addLog("🔍 Recherche du panier...")
        addLog("💡 Utilisation du service d'accessibilité")
        
        // Étape 1 : Cliquer sur "Panier"
        handler.postDelayed({
            addLog("🛒 Tentative de clic sur le panier...")
            val panierClicked = AutoTestHelper.clickElementContainingText("Panier")
            
            if (panierClicked) {
                addLog("✅ Panier ouvert")
                
                // Étape 2 : Attendre le chargement
                handler.postDelayed({
                    addLog("📜 Scroll vers les bananes...")
                    AutoTestHelper.scrollPage()
                    
                    // Étape 3 : Chercher et cliquer sur le bouton + des bananes
                    handler.postDelayed({
                        addLog("🍌 Recherche des bananes...")
                        val bananaClicked = AutoTestHelper.clickAddToCartNearProduct("Bananes")
                        
                        if (bananaClicked) {
                            addLog("✅ BANANE AJOUTÉE AU PANIER! 🍌")
                            addLog("💡 Le service d'accessibilité a détecté l'action")
                        } else {
                            addLog("⚠️ Bouton + des bananes non trouvé")
                            addLog("💡 Assure-toi que des bananes sont dans ton panier")
                        }
                        
                        // Attendre pour observer les événements
                        handler.postDelayed({
                            addLog("⏳ Attente de 10 secondes pour observer les événements...")
                            handler.postDelayed({
                                addLog("✅ Test terminé")
                                addLog("📊 Vérifie les logs du service pour voir les événements capturés")
                                addLog("")
                                addLog("Pour revenir à l'app de tracking, appuie sur le bouton Retour")
                            }, 10000)
                        }, 1000)
                        
                    }, 2000)
                }, 3000)
            } else {
                addLog("❌ Impossible d'ouvrir le panier")
                addLog("💡 Assure-toi que Carrefour est bien chargé")
            }
        }, 5000)
    }
}
