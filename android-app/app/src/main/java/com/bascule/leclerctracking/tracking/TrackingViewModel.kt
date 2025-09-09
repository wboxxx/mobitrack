package com.bascule.leclerctracking.tracking

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import com.bascule.leclerctracking.models.TrackingEvent
import com.bascule.leclerctracking.models.TrackingSession

class TrackingViewModel : ViewModel() {
    
    private val _trackingEvents = MutableLiveData<List<TrackingEvent>>(emptyList())
    val trackingEvents: LiveData<List<TrackingEvent>> = _trackingEvents
    
    private val _currentSession = MutableLiveData<TrackingSession?>()
    val currentSession: LiveData<TrackingSession?> = _currentSession
    
    private val _isTracking = MutableLiveData<Boolean>(false)
    val isTracking: LiveData<Boolean> = _isTracking
    
    fun addEvent(event: TrackingEvent) {
        val currentEvents = _trackingEvents.value?.toMutableList() ?: mutableListOf()
        currentEvents.add(event)
        _trackingEvents.value = currentEvents
        
        // Update session if it's a session event
        if (event.eventType == "SESSION_START") {
            _currentSession.value = TrackingSession(
                sessionId = event.sessionId,
                startTime = event.timestamp,
                platform = event.platform,
                events = mutableListOf(event)
            )
            _isTracking.value = true
        }
    }
    
    fun getEventsByType(eventType: String): List<TrackingEvent> {
        return _trackingEvents.value?.filter { it.eventType == eventType } ?: emptyList()
    }
    
    fun getEventsInTimeRange(startTime: Long, endTime: Long): List<TrackingEvent> {
        return _trackingEvents.value?.filter { 
            it.timestamp >= startTime && it.timestamp <= endTime 
        } ?: emptyList()
    }
    
    fun clearAllData() {
        _trackingEvents.value = emptyList()
        _currentSession.value = null
        _isTracking.value = false
    }
    
    fun getEventCount(): Int {
        return _trackingEvents.value?.size ?: 0
    }
    
    fun getSessionDuration(): Long {
        val session = _currentSession.value
        return if (session != null) {
            System.currentTimeMillis() - session.startTime
        } else {
            0L
        }
    }
}
