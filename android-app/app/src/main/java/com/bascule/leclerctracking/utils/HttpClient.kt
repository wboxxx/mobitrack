package com.bascule.leclerctracking.utils

import android.content.Context
import android.provider.Settings
import android.util.Log
import com.google.gson.Gson
import com.google.gson.JsonObject
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import java.util.concurrent.TimeUnit

/**
 * Client HTTP pour communiquer avec le serveur Node.js
 */
class HttpClient(private val context: Context? = null) {
    
    companion object {
        private const val TAG = "HttpClient"
        private const val EMULATOR_SERVER_URL = "http://10.0.2.2:3001" // Adresse émulateur vers localhost
        private const val PHONE_SERVER_URL = "http://192.168.1.43:3001" // Adresse téléphone vers PC
        private const val TIMEOUT_SECONDS = 5L
    }
    
    private val client = OkHttpClient.Builder()
        .connectTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
        .readTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
        .writeTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
        .build()
    
    private val gson = Gson()
    
    /**
     * Récupère l'ID unique du device
     */
    private fun getDeviceId(): String {
        return try {
            context?.let {
                Settings.Secure.getString(it.contentResolver, Settings.Secure.ANDROID_ID)
            } ?: "unknown-device"
        } catch (e: Exception) {
            Log.w(TAG, "Impossible de récupérer l'ID du device", e)
            "unknown-device"
        }
    }
    
    /**
     * Détermine si on est sur un émulateur et retourne la bonne URL serveur
     */
    private fun getServerUrl(): String {
        return try {
            context?.let {
                val isEmulator = isEmulator(it)
                val serverUrl = if (isEmulator) EMULATOR_SERVER_URL else PHONE_SERVER_URL
                Log.d(TAG, "Device détecté: ${if (isEmulator) "Émulateur" else "Téléphone"} -> URL: $serverUrl")
                serverUrl
            } ?: EMULATOR_SERVER_URL
        } catch (e: Exception) {
            Log.w(TAG, "Erreur détection device, utilisation émulateur par défaut", e)
            EMULATOR_SERVER_URL
        }
    }
    
    /**
     * Détecte si on est sur un émulateur
     */
    private fun isEmulator(context: Context): Boolean {
        return try {
            val buildModel = android.os.Build.MODEL
            val buildProduct = android.os.Build.PRODUCT
            val buildFingerprint = android.os.Build.FINGERPRINT
            val buildBrand = android.os.Build.BRAND
            val buildDevice = android.os.Build.DEVICE
            
            // Patterns d'émulateur Android
            val emulatorPatterns = listOf(
                "google_sdk", "Emulator", "Android SDK", "sdk", "sdk_gphone",
                "sdk_gphone64", "sdk_gphone64_arm64", "sdk_gphone_x86",
                "sdk_gphone_x86_64", "vbox86p", "vbox86tp", "generic"
            )
            
            val isEmulator = emulatorPatterns.any { pattern ->
                buildModel.contains(pattern, ignoreCase = true) ||
                buildProduct.contains(pattern, ignoreCase = true) ||
                buildFingerprint.contains(pattern, ignoreCase = true) ||
                buildBrand.contains(pattern, ignoreCase = true) ||
                buildDevice.contains(pattern, ignoreCase = true)
            }
            
            Log.d(TAG, "Détection émulateur: Model=$buildModel, Product=$buildProduct, Brand=$buildBrand, Device=$buildDevice -> IsEmulator=$isEmulator")
            isEmulator
        } catch (e: Exception) {
            Log.w(TAG, "Erreur détection émulateur", e)
            false // Par défaut, considérer comme téléphone
        }
    }
    
    /**
     * Envoie une page Carrefour au serveur Node.js
     */
    suspend fun sendCarrefourPage(
        markdownContent: String,
        serverUrl: String? = null
    ): Boolean = withContext(Dispatchers.IO) {
        try {
            val finalServerUrl = serverUrl ?: getServerUrl()
            Log.d(TAG, "Envoi de la page Carrefour au serveur: $finalServerUrl")
            
            val json = JsonObject().apply {
                addProperty("content", markdownContent)
                addProperty("timestamp", System.currentTimeMillis())
                addProperty("source", "OptimizedCarrefourTrackingService")
                addProperty("deviceId", getDeviceId())
            }
            
            val mediaType = "application/json; charset=utf-8".toMediaType()
            val requestBody = gson.toJson(json).toRequestBody(mediaType)
            
            val request = Request.Builder()
                .url("$finalServerUrl/api/carrefour-page")
                .post(requestBody)
                .addHeader("Content-Type", "application/json")
                .build()
            
            client.newCall(request).execute().use { response ->
                if (response.isSuccessful) {
                    Log.d(TAG, "Page envoyée avec succès: ${response.code}")
                    true
                } else {
                    Log.w(TAG, "Erreur lors de l'envoi: ${response.code} - ${response.message}")
                    false
                }
            }
        } catch (e: IOException) {
            Log.e(TAG, "Erreur de connexion au serveur", e)
            false
        } catch (e: Exception) {
            Log.e(TAG, "Erreur lors de l'envoi de la page", e)
            false
        }
    }
    
    /**
     * Envoie une page Carrefour HTML (reconstruction visuelle) au serveur Node.js
     */
    suspend fun sendCarrefourVisual(
        htmlContent: String,
        serverUrl: String? = null
    ): Boolean = withContext(Dispatchers.IO) {
        try {
            val finalServerUrl = serverUrl ?: getServerUrl()
            Log.d(TAG, "Envoi de la page Carrefour HTML au serveur: $finalServerUrl")
            
            val json = JsonObject().apply {
                addProperty("html", htmlContent)
                addProperty("timestamp", System.currentTimeMillis())
                addProperty("source", "OptimizedCarrefourTrackingService")
                addProperty("type", "visual")
                addProperty("deviceId", getDeviceId())
            }
            
            val mediaType = "application/json; charset=utf-8".toMediaType()
            val requestBody = gson.toJson(json).toRequestBody(mediaType)
            
            val request = Request.Builder()
                .url("$finalServerUrl/api/carrefour-visual")
                .post(requestBody)
                .addHeader("Content-Type", "application/json")
                .build()
            
            client.newCall(request).execute().use { response ->
                if (response.isSuccessful) {
                    Log.d(TAG, "Page HTML envoyée avec succès: ${response.code}")
                    true
                } else {
                    Log.w(TAG, "Erreur lors de l'envoi HTML: ${response.code} - ${response.message}")
                    false
                }
            }
        } catch (e: IOException) {
            Log.e(TAG, "Erreur de connexion au serveur pour HTML", e)
            false
        } catch (e: Exception) {
            Log.e(TAG, "Erreur lors de l'envoi de la page HTML", e)
            false
        }
    }
    
    /**
     * Teste la connexion au serveur
     */
    suspend fun testConnection(serverUrl: String? = null): Boolean = withContext(Dispatchers.IO) {
        try {
            val finalServerUrl = serverUrl ?: getServerUrl()
            val request = Request.Builder()
                .url("$finalServerUrl/api/carrefour-pages")
                .get()
                .build()
            
            client.newCall(request).execute().use { response ->
                response.isSuccessful
            }
        } catch (e: Exception) {
            Log.e(TAG, "Test de connexion échoué", e)
            false
        }
    }
}
