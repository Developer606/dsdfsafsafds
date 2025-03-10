package com.anime.chat.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.anime.chat.ChatApplication
import com.anime.chat.data.model.Message
import com.anime.chat.data.model.Character
import com.anime.chat.ui.components.ChatMessage
import com.anime.chat.ui.components.ChatInput
import kotlinx.coroutines.launch

@Composable
fun ChatScreen() {
    val context = LocalContext.current
    val application = remember { context.applicationContext as ChatApplication }
    val scope = rememberCoroutineScope()

    var messages by remember { mutableStateOf(emptyList<Message>()) }
    var characters by remember { mutableStateOf(emptyList<Character>()) }
    var selectedCharacter by remember { mutableStateOf<Character?>(null) }
    var inputText by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    // Load characters
    LaunchedEffect(Unit) {
        try {
            characters = application.apiService.getCharacters()
            if (characters.isNotEmpty()) {
                selectedCharacter = characters.first()
            }
        } catch (e: Exception) {
            error = "Failed to load characters: ${e.message}"
        }
    }

    // Collect WebSocket updates
    LaunchedEffect(Unit) {
        application.webSocketManager.messageFlow.collect { updatedMessages ->
            messages = updatedMessages
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // Character selection
        selectedCharacter?.let { character ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Chatting with: ${character.name}",
                    style = MaterialTheme.typography.titleMedium
                )
                TextButton(onClick = {
                    // Show character selection dialog
                }) {
                    Text("Change Character")
                }
            }
        }

        // Error message
        error?.let { errorMessage ->
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 8.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.errorContainer
                )
            ) {
                Text(
                    text = errorMessage,
                    modifier = Modifier.padding(16.dp),
                    color = MaterialTheme.colorScheme.onErrorContainer
                )
            }
        }

        // Messages list
        LazyColumn(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth(),
            reverseLayout = true
        ) {
            items(messages.reversed()) { message ->
                ChatMessage(
                    content = message.content,
                    isUser = message.isUser
                )
            }
        }

        // Input field
        ChatInput(
            value = inputText,
            onValueChange = { inputText = it },
            onSend = {
                if (inputText.isNotEmpty() && selectedCharacter != null) {
                    scope.launch {
                        isLoading = true
                        error = null
                        try {
                            val message = Message(
                                id = "",  // Will be set by server
                                content = inputText,
                                isUser = true,
                                characterId = selectedCharacter!!.id,
                                userId = "",  // Will be set by server
                                createdAt = "",  // Will be set by server
                                language = null,
                                script = null
                            )
                            application.apiService.sendMessage(message)
                            inputText = ""
                        } catch (e: Exception) {
                            error = "Failed to send message: ${e.message}"
                        } finally {
                            isLoading = false
                        }
                    }
                }
            },
            enabled = !isLoading && selectedCharacter != null
        )
    }
}