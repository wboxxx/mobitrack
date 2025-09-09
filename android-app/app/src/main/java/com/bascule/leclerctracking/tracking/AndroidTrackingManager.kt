package com.bascule.leclerctracking.tracking

import android.content.Context
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log
import android.webkit.JavascriptInterface
import androidx.core.content.ContextCompat.getSystemService
import com.bascule.leclerctracking.models.TrackingEvent
import com.bascule.leclerctracking.models.TrackingEventType
import com.google.gson.Gson
import java.util.*
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException

class AndroidTrackingManager(
    private val context: Context,
    private val trackingViewModel: TrackingViewModel?
) {
    
    private val gson = Gson()
    private val httpClient = OkHttpClient()
    private val serverUrl = "http://10.0.2.2:3001" // Android emulator localhost
    private val vibrator: Vibrator? = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
        val vibratorManager = getSystemService(context, VibratorManager::class.java)
        vibratorManager?.defaultVibrator
    } else {
        @Suppress("DEPRECATION")
        getSystemService(context, Vibrator::class.java)
    }
    
    private var sessionId: String = generateSessionId()
    private var touchStartTime = 0L
    private var touchStartX = 0f
    private var touchStartY = 0f
    
    init {
        initializeSession()
    }
    
    private fun generateSessionId(): String {
        return "android_session_${System.currentTimeMillis()}_${UUID.randomUUID().toString().take(8)}"
    }
    
    private fun initializeSession() {
        trackEvent(TrackingEventType.SESSION_START, mapOf(
            "platform" to "android_native",
            "sessionId" to sessionId,
            "deviceInfo" to getDeviceInfo()
        ))
    }
    
    private fun getDeviceInfo(): Map<String, Any> {
        return mapOf(
            "manufacturer" to android.os.Build.MANUFACTURER,
            "model" to android.os.Build.MODEL,
            "version" to android.os.Build.VERSION.RELEASE,
            "sdk" to android.os.Build.VERSION.SDK_INT,
            "screenDensity" to context.resources.displayMetrics.density,
            "screenWidth" to context.resources.displayMetrics.widthPixels,
            "screenHeight" to context.resources.displayMetrics.heightPixels
        )
    }
    
    fun trackEvent(eventType: TrackingEventType, data: Map<String, Any> = emptyMap()) {
        val event = TrackingEvent(
            sessionId = sessionId,
            eventType = eventType.name,
            timestamp = System.currentTimeMillis(),
            platform = "android_native",
            data = data
        )
        
        trackingViewModel?.addEvent(event)
        Log.d("AndroidTracking", "Event tracked: ${eventType.name} - $data")
        
        // Send to server
        sendEventToServer(event)
    }
    
    fun trackPageLoad(url: String) {
        trackEvent(TrackingEventType.PAGE_LOAD, mapOf(
            "url" to url,
            "timestamp" to System.currentTimeMillis()
        ))
    }
    
    fun getJavaScriptInterface(): AndroidJavaScriptInterface {
        return AndroidJavaScriptInterface()
    }
    
    fun exportTrackingData() {
        val events = trackingViewModel?.trackingEvents?.value ?: emptyList()
        val jsonData = gson.toJson(events)
        
        // For now, just log the data. In a real app, you'd save to file or send to server
        Log.d("AndroidTracking", "Exported ${events.size} events")
        Log.d("AndroidTracking", "JSON Data: $jsonData")
        
        trackEvent(TrackingEventType.DATA_EXPORT, mapOf(
            "eventCount" to events.size,
            "exportTime" to System.currentTimeMillis()
        ))
    }
    
    private fun sendEventToServer(event: TrackingEvent) {
        try {
            val json = gson.toJson(mapOf(
                "sessionId" to event.sessionId,
                "eventType" to event.eventType,
                "timestamp" to event.timestamp,
                "platform" to event.platform,
                "data" to event.data
            ))
            
            val requestBody = json.toRequestBody("application/json".toMediaType())
            val request = Request.Builder()
                .url("$serverUrl/api/track")
                .post(requestBody)
                .build()
            
            httpClient.newCall(request).enqueue(object : Callback {
                override fun onFailure(call: Call, e: IOException) {
                    Log.w("AndroidTracking", "Failed to send event to server: ${e.message}")
                }
                
                override fun onResponse(call: Call, response: Response) {
                    if (response.isSuccessful) {
                        Log.d("AndroidTracking", "Event sent to server successfully")
                    } else {
                        Log.w("AndroidTracking", "Server responded with error: ${response.code}")
                    }
                    response.close()
                }
            })
        } catch (e: Exception) {
            Log.e("AndroidTracking", "Error sending event to server: ${e.message}")
        }
    }

    fun cleanup() {
        trackEvent(TrackingEventType.SESSION_END, mapOf(
            "sessionDuration" to (System.currentTimeMillis() - sessionId.split("_")[2].toLong()),
            "totalEvents" to (trackingViewModel?.trackingEvents?.value?.size ?: 0)
        ))
    }
    
    inner class AndroidJavaScriptInterface {
        
        @JavascriptInterface
        fun trackEvent(eventType: String, dataJson: String) {
            try {
                val data = if (dataJson.isNotEmpty()) {
                    gson.fromJson(dataJson, Map::class.java) as Map<String, Any>
                } else {
                    emptyMap()
                }
                
                val enhancedData = data.toMutableMap().apply {
                    put("source", "webview_bridge")
                    put("nativeTimestamp", System.currentTimeMillis())
                }
                
                val safeEventType = try {
            TrackingEventType.valueOf(eventType.uppercase().replace("-", "_").replace(" ", "_"))
        } catch (e: IllegalArgumentException) {
            TrackingEventType.CLICK // Default fallback
        }
        trackEvent(safeEventType, enhancedData)
                
            } catch (e: Exception) {
                Log.e("AndroidTracking", "Error tracking event from WebView: ${e.message}")
                trackEvent(TrackingEventType.ERROR, mapOf(
                    "error" to e.message.toString(),
                    "eventType" to eventType,
                    "dataJson" to dataJson
                ))
            }
        }
        
        @JavascriptInterface
        fun trackTouch(touchType: String, x: Float, y: Float) {
            when (touchType) {
                "touchstart" -> {
                    touchStartTime = System.currentTimeMillis()
                    touchStartX = x
                    touchStartY = y
                }
                "touchend" -> {
                    val duration = System.currentTimeMillis() - touchStartTime
                    val distance = kotlin.math.sqrt(
                        (x - touchStartX) * (x - touchStartX) + 
                        (y - touchStartY) * (y - touchStartY)
                    )
                    
                    val gestureType = when {
                        distance < 10 && duration > 500 -> "long_press"
                        distance < 10 -> "tap"
                        distance > 50 -> "swipe"
                        else -> "touch"
                    }
                    
                    trackEvent(TrackingEventType.NATIVE_TOUCH, mapOf(
                        "gestureType" to gestureType,
                        "startX" to touchStartX,
                        "startY" to touchStartY,
                        "endX" to x,
                        "endY" to y,
                        "duration" to duration,
                        "distance" to distance
                    ))
                    
                    // Provide haptic feedback for certain gestures
                    if (gestureType == "tap" || gestureType == "long_press") {
                        vibrator?.vibrate(50)
                    }
                }
            }
        }
        
        @JavascriptInterface
        fun trackScroll(scrollX: Int, scrollY: Int) {
            trackEvent(TrackingEventType.SCROLL, mapOf(
                "scrollX" to scrollX,
                "scrollY" to scrollY,
                "source" to "native_webview"
            ))
        }
        
        @JavascriptInterface
        fun trackOrientation(orientation: Int) {
            trackEvent(TrackingEventType.ORIENTATION_CHANGE, mapOf(
                "orientation" to orientation,
                "timestamp" to System.currentTimeMillis()
            ))
        }
        
        @JavascriptInterface
        fun getSessionId(): String {
            return sessionId
        }
        
        @JavascriptInterface
        fun logMessage(message: String) {
            Log.d("WebViewJS", message)
        }
    }
}
