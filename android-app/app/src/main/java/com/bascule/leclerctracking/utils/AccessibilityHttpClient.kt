package com.bascule.leclerctracking.utils

import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

class AccessibilityHttpClient {
    
    companion object {
        private const val TAG = "AccessibilityHttpClient"
        private const val SERVER_URL = "http://10.0.2.2:3001" // Pour l'émulateur
        // private const val SERVER_URL = "http://192.168.1.100:3001" // Pour un appareil physique
        
        private var deviceId: String = "android-device-${System.currentTimeMillis()}"
        private var sessionId: String = "session-${System.currentTimeMillis()}"
    }
    
    /**
     * Envoie un événement d'accessibilité au serveur
     */
    fun sendAccessibilityEvent(event: Any, productInfo: Map<String, Any> = emptyMap()) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val eventData = buildEventData(event, productInfo)
                sendToServer(eventData)
            } catch (e: Exception) {
                Log.e(TAG, "Erreur lors de l'envoi de l'événement", e)
            }
        }
    }
    
    /**
     * Envoie plusieurs événements d'accessibilité en batch
     */
    fun sendAccessibilityEventsBatch(events: List<Any>, productInfoList: List<Map<String, Any>> = emptyList()) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val eventDataList = events.mapIndexed { index, event ->
                    val productInfo = if (index < productInfoList.size) productInfoList[index] else emptyMap()
                    buildEventData(event, productInfo)
                }
                
                val eventsArray = JSONArray()
                for (eventData in eventDataList) {
                    eventsArray.put(eventData)
                }
                
                val requestData = JSONObject().apply {
                    put("events", eventsArray)
                    put("deviceId", deviceId)
                    put("sessionId", sessionId)
                }
                
                sendBatchToServer(requestData)
            } catch (e: Exception) {
                Log.e(TAG, "Erreur lors de l'envoi du batch d'événements", e)
            }
        }
    }
    
    /**
     * Construit les données d'événement pour l'API
     */
    private fun buildEventData(event: Any, productInfo: Map<String, Any>): JSONObject {
        val eventData = JSONObject().apply {
            put("eventType", "ACCESSIBILITY_EVENT")
            put("timestamp", System.currentTimeMillis())
            put("data", JSONObject().apply {
                put("packageName", "com.unknown.app")
                put("activity", "UnknownActivity")
                put("element", buildElementData(event))
                put("productInfo", JSONObject(productInfo))
            })
        }
        
        return eventData
    }
    
    /**
     * Construit les données d'élément à partir de l'événement d'accessibilité
     */
    private fun buildElementData(event: Any): JSONObject {
        val element = JSONObject()
        
        // Informations de base
        element.put("className", "UnknownClass")
        element.put("id", "")
        element.put("text", "")
        element.put("contentDescription", "")
        
        // Bounds de l'élément
        element.put("bounds", JSONObject().apply {
            put("left", 0)
            put("top", 0)
            put("right", 100)
            put("bottom", 100)
        })
        
        return element
    }
    
    /**
     * Envoie un événement unique au serveur
     */
    private suspend fun sendToServer(eventData: JSONObject) {
        withContext(Dispatchers.IO) {
            try {
                val url = URL("$SERVER_URL/api/accessibility-events")
                val connection = url.openConnection() as HttpURLConnection
                
                connection.requestMethod = "POST"
                connection.setRequestProperty("Content-Type", "application/json")
                connection.doOutput = true
                
                val outputStream = connection.outputStream
                val writer = OutputStreamWriter(outputStream)
                writer.write(eventData.toString())
                writer.flush()
                writer.close()
                
                val responseCode = connection.responseCode
                if (responseCode == HttpURLConnection.HTTP_OK) {
                    Log.d(TAG, "Événement envoyé avec succès")
                } else {
                    Log.e(TAG, "Erreur HTTP: $responseCode")
                }
                
                connection.disconnect()
            } catch (e: Exception) {
                Log.e(TAG, "Erreur lors de l'envoi au serveur", e)
            }
        }
    }
    
    /**
     * Envoie un batch d'événements au serveur
     */
    private suspend fun sendBatchToServer(requestData: JSONObject) {
        withContext(Dispatchers.IO) {
            try {
                val url = URL("$SERVER_URL/api/accessibility-events")
                val connection = url.openConnection() as HttpURLConnection
                
                connection.requestMethod = "POST"
                connection.setRequestProperty("Content-Type", "application/json")
                connection.doOutput = true
                
                val outputStream = connection.outputStream
                val writer = OutputStreamWriter(outputStream)
                writer.write(requestData.toString())
                writer.flush()
                writer.close()
                
                val responseCode = connection.responseCode
                if (responseCode == HttpURLConnection.HTTP_OK) {
                    Log.d(TAG, "Batch d'événements envoyé avec succès")
                } else {
                    Log.e(TAG, "Erreur HTTP: $responseCode")
                }
                
                connection.disconnect()
            } catch (e: Exception) {
                Log.e(TAG, "Erreur lors de l'envoi du batch au serveur", e)
            }
        }
    }
}
