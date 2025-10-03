package com.bascule.leclerctracking

import android.annotation.SuppressLint
import android.content.Intent
import android.os.Bundle
import android.view.Menu
import android.view.MenuItem
import android.webkit.WebView
import android.webkit.WebViewClient
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.ConsoleMessage
import android.webkit.WebSettings
import android.webkit.JavascriptInterface
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.ViewModelProvider
import com.bascule.leclerctracking.databinding.ActivityMainBinding
import com.bascule.leclerctracking.tracking.AndroidTrackingManager
import com.bascule.leclerctracking.tracking.TrackingViewModel

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var trackingViewModel: TrackingViewModel
    private lateinit var androidTrackingManager: AndroidTrackingManager

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        // Initialize tracking
        trackingViewModel = ViewModelProvider(this)[TrackingViewModel::class.java]
        androidTrackingManager = AndroidTrackingManager(this, trackingViewModel)
        
        setupToolbar()
        setupWebView()
        setupTrackingObservers()
        
        // Load Leclerc mobile site
        loadLeclercSite()
    }
    
    private fun setupToolbar() {
        setSupportActionBar(binding.toolbar)
        supportActionBar?.title = "Leclerc Drive - Android"
        supportActionBar?.subtitle = "Tracking Mobile Natif"
    }
    
    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        val webView = binding.webView
        
        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.allowFileAccess = true
        webView.settings.allowContentAccess = true
        webView.settings.setSupportZoom(true)
        webView.settings.builtInZoomControls = true
        webView.settings.displayZoomControls = false
        webView.settings.useWideViewPort = true
        webView.settings.loadWithOverviewMode = true
        webView.settings.userAgentString = "LeclercTrackingApp/1.0 (Android; Mobile) " + webView.settings.userAgentString
        
        // Add JavaScript interface for native tracking - temporarily disabled for build
        // webView.addJavaScriptInterface(androidTrackingManager.getJavaScriptInterface(), "AndroidTracker")
        
        webView.apply {
            
            webViewClient = object : WebViewClient() {
                override fun onPageStarted(view: WebView?, url: String?, favicon: android.graphics.Bitmap?) {
                    super.onPageStarted(view, url, favicon)
                    androidTrackingManager.trackPageLoad(url ?: "")
                    updateUrlDisplay(url)
                }
                
                override fun onPageFinished(view: WebView?, url: String?) {
                    super.onPageFinished(view, url)
                    
                    // Inject native tracking bridge
                    val jsCode = """
                        // Bridge Android native tracking with web tracking
                        if (window.leclercMobileTracker) {
                            const originalTrackEvent = window.leclercMobileTracker.trackEvent.bind(window.leclercMobileTracker);
                            window.leclercMobileTracker.trackEvent = function(eventType, data) {
                                // Send to web tracking
                                originalTrackEvent(eventType, data);
                                
                                // Send to native Android tracking
                                if (window.AndroidTracker) {
                                    AndroidTracker.trackEvent(eventType, JSON.stringify(data || {}));
                                }
                            };
                            
                            console.log('🔗 Android-Web tracking bridge initialized');
                        }
                        
                        // Override touch events for native tracking
                        document.addEventListener('touchstart', function(e) {
                            if (window.AndroidTracker) {
                                AndroidTracker.trackTouch('touchstart', e.touches[0].clientX, e.touches[0].clientY);
                            }
                        });
                        
                        document.addEventListener('touchend', function(e) {
                            if (window.AndroidTracker) {
                                AndroidTracker.trackTouch('touchend', e.changedTouches[0].clientX, e.changedTouches[0].clientY);
                            }
                        });
                    """.trimIndent()
                    
                    view?.evaluateJavascript(jsCode, null)
                }
                
                override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                    val url = request?.url?.toString()
                    if (url != null && (url.contains("localhost") || url.contains("127.0.0.1"))) {
                        return false // Allow loading our local server
                    }
                    return super.shouldOverrideUrlLoading(view, request)
                }
            }
            
            webChromeClient = object : WebChromeClient() {
                override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                    consoleMessage?.let {
                        android.util.Log.d("WebView", "${it.messageLevel()}: ${it.message()}")
                    }
                    return true
                }
            }
        }
    }
    
    private fun setupTrackingObservers() {
        trackingViewModel.trackingEvents.observe(this) { events ->
            binding.eventCounter.text = "Events: ${events.size}"
        }
        
        trackingViewModel.currentSession.observe(this) { session ->
            binding.sessionInfo.text = "Session: ${session?.sessionId?.takeLast(8) ?: "None"}"
        }
    }
    
    private fun loadLeclercSite() {
        // Try to connect to local server first, fallback to demo
        val localUrl = "http://192.168.1.43:3001/leclerc-mobile" // Device physique sur WiFi
        binding.webView.loadUrl(localUrl)
        updateUrlDisplay(localUrl)
    }
    
    private fun updateUrlDisplay(url: String?) {
        binding.urlDisplay.text = url ?: "No URL"
    }
    
    override fun onCreateOptionsMenu(menu: Menu): Boolean {
        menuInflater.inflate(R.menu.main_menu, menu)
        return true
    }
    
    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        return when (item.itemId) {
            R.id.action_comparison -> {
                // Open comparison dashboard in browser instead
                val intent = Intent(Intent.ACTION_VIEW, android.net.Uri.parse("http://192.168.1.43:3001/comparison"))
                startActivity(intent)
                true
            }
            R.id.action_refresh -> {
                binding.webView.reload()
                true
            }
            R.id.action_clear_data -> {
                trackingViewModel.clearAllData()
                true
            }
            R.id.action_export -> {
                androidTrackingManager.exportTrackingData()
                true
            }
            else -> super.onOptionsItemSelected(item)
        }
    }
    
    override fun onBackPressed() {
        if (binding.webView.canGoBack()) {
            binding.webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
    
    override fun onDestroy() {
        super.onDestroy()
        androidTrackingManager.cleanup()
    }
}
