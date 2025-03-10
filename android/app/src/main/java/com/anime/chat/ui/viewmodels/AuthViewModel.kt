package com.anime.chat.ui.viewmodels

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.anime.chat.data.model.User
import com.anime.chat.data.repository.AuthRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class AuthViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = AuthRepository(application, (application as com.anime.chat.ChatApplication).apiService)
    
    private val _user = MutableStateFlow<User?>(null)
    val user: StateFlow<User?> = _user
    
    val isAuthenticated: Boolean
        get() = _user.value != null

    init {
        viewModelScope.launch {
            repository.isAuthenticated.collect { isAuth ->
                if (isAuth) {
                    // Fetch user data if authenticated
                    refreshUserData()
                }
            }
        }
    }

    fun login(username: String, password: String, onResult: (Result<User>) -> Unit) {
        viewModelScope.launch {
            val result = repository.login(username, password)
            result.onSuccess { user ->
                _user.value = user
            }
            onResult(result)
        }
    }

    fun register(username: String, email: String, password: String, onResult: (Result<User>) -> Unit) {
        viewModelScope.launch {
            val result = repository.register(username, email, password)
            result.onSuccess { user ->
                _user.value = user
            }
            onResult(result)
        }
    }

    fun logout() {
        viewModelScope.launch {
            repository.logout()
            _user.value = null
        }
    }

    private suspend fun refreshUserData() {
        try {
            val user = (getApplication() as com.anime.chat.ChatApplication).apiService.getCurrentUser()
            _user.value = user
        } catch (e: Exception) {
            // Handle error
        }
    }
}
