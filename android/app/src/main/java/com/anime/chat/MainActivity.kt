package com.anime.chat

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import com.anime.chat.ui.theme.AnimeCharacterChatTheme
import com.anime.chat.ui.screens.ChatScreen
import com.anime.chat.ui.screens.LoginScreen
import com.anime.chat.ui.viewmodels.AuthViewModel

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            AnimeCharacterChatTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    val authViewModel: AuthViewModel = viewModel()
                    val isAuthenticated by authViewModel.user.collectAsState()

                    if (isAuthenticated != null) {
                        ChatScreen()
                    } else {
                        LoginScreen(
                            onLoginSuccess = { /* Navigation will be handled automatically */ },
                            onRegisterClick = { /* Add navigation to register screen */ }
                        )
                    }
                }
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
fun DefaultPreview() {
    AnimeCharacterChatTheme {
        ChatScreen()
    }
}