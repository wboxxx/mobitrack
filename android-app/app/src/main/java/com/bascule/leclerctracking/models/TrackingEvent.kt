package com.bascule.leclerctracking.models

data class TrackingEvent(
    val sessionId: String,
    val eventType: String,
    val timestamp: Long,
    val platform: String,
    val data: Map<String, Any> = emptyMap()
)

data class TrackingSession(
    val sessionId: String,
    val startTime: Long,
    val platform: String,
    val events: MutableList<TrackingEvent> = mutableListOf()
)

