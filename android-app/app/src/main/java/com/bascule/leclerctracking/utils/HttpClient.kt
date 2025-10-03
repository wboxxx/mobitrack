package com.bascule.leclerctracking.utils

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
class HttpClient {
    
    companion object {
        private const val TAG = "HttpClient"
        private const val DEFAULT_SERVER_URL = "http://10.0.2.2:3001" // Adresse émulateur vers localhost
        private const val TIMEOUT_SECONDS = 5L
    }
    
    private val client = OkHttpClient.Builder()
        .connectTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
        .readTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
        .writeTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
        .build()
    
    private val gson = Gson()
    
    /**
     * Envoie une page Carrefour au serveur Node.js
     */
    suspend fun sendCarrefourPage(
        markdownContent: String,
        serverUrl: String = DEFAULT_SERVER_URL
    ): Boolean = withContext(Dispatchers.IO) {
        try {
            Log.d(TAG, "Envoi de la page Carrefour au serveur: $serverUrl")
            
            val json = JsonObject().apply {
                addProperty("content", markdownContent)
                addProperty("timestamp", System.currentTimeMillis())
                addProperty("source", "OptimizedCarrefourTrackingService")
            }
            
            val mediaType = "application/json; charset=utf-8".toMediaType()
            val requestBody = gson.toJson(json).toRequestBody(mediaType)
            
            val request = Request.Builder()
                .url("$serverUrl/api/carrefour-page")
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
     * Teste la connexion au serveur
     */
    suspend fun testConnection(serverUrl: String = DEFAULT_SERVER_URL): Boolean = withContext(Dispatchers.IO) {
        try {
            val request = Request.Builder()
                .url("$serverUrl/api/carrefour-pages")
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
