package com.anime.chat.network

import android.util.Log
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import okhttp3.*
import org.json.JSONObject
import com.anime.chat.data.model.Message
import com.anime.chat.data.repository.AuthRepository

class WebSocketManager(private val authRepository: AuthRepository) {
    private var webSocket: WebSocket? = null
    private val client = OkHttpClient()
    private val _messageFlow = MutableStateFlow<List<Message>>(emptyList())
    val messageFlow: StateFlow<List<Message>> = _messageFlow

    suspend fun connect(serverUrl: String) {
        val sessionToken = authRepository.getSessionToken()
        Log.d("WebSocket", "Attempting to connect with session token: ${sessionToken?.take(10)}...")

        val request = Request.Builder()
            .url(serverUrl)
            .apply {
                sessionToken?.let { token ->
                    Log.d("WebSocket", "Adding authentication headers")
                    addHeader("Cookie", "connect.sid=$token")
                    addHeader("Authorization", "Bearer $token")
                }
            }
            .build()

        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                Log.d("WebSocket", "Connection opened successfully")
                Log.d("WebSocket", "Response headers: ${response.headers}")
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                Log.d("WebSocket", "Received message: $text")
                try {
                    val json = JSONObject(text)
                    when (json.getString("type")) {
                        "message_update" -> handleMessageUpdate(json)
                        "character_update" -> handleCharacterUpdate(json)
                    }
                } catch (e: Exception) {
                    Log.e("WebSocket", "Error parsing message: ${e.message}")
                }
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                Log.e("WebSocket", "Connection failed: ${t.message}")
                Log.d("WebSocket", "Response code: ${response?.code}")
                Log.d("WebSocket", "Response headers: ${response?.headers}")
                Log.d("WebSocket", "Response body: ${response?.body?.string()}")

                // Attempt to reconnect after a delay if we're still authenticated
                if (sessionToken != null) {
                    Thread.sleep(5000)
                    connect(serverUrl)
                }
            }
        })
    }

    private fun handleMessageUpdate(json: JSONObject) {
        try {
            val messages = json.getJSONArray("messages").let { array ->
                List(array.length()) { i ->
                    val msg = array.getJSONObject(i)
                    Message(
                        id = msg.getString("id"),
                        content = msg.getString("content"),
                        isUser = msg.getBoolean("isUser"),
                        characterId = msg.getString("characterId"),
                        userId = msg.getString("userId"),
                        createdAt = msg.getString("createdAt"),
                        language = msg.optString("language"),
                        script = msg.optString("script")
                    )
                }
            }
            Log.d("WebSocket", "Updated messages count: ${messages.size}")
            _messageFlow.value = messages
        } catch (e: Exception) {
            Log.e("WebSocket", "Error handling message update: ${e.message}")
        }
    }

    private fun handleCharacterUpdate(json: JSONObject) {
        Log.d("WebSocket", "Character update received: $json")
    }

    fun disconnect() {
        Log.d("WebSocket", "Disconnecting WebSocket")
        webSocket?.close(1000, "User disconnected")
    }
}