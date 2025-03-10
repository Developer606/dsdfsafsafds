package com.anime.chat.data.repository

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.anime.chat.data.model.User
import com.anime.chat.network.ApiService
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.collect

private val Context.dataStore by preferencesDataStore(name = "auth_prefs")

class AuthRepository(
    private val context: Context,
    private val apiService: ApiService
) {
    private val SESSION_TOKEN = stringPreferencesKey("session_token")
    private val USER_DATA = stringPreferencesKey("user_data")

    val isAuthenticated: Flow<Boolean> = context.dataStore.data
        .map { preferences ->
            preferences[SESSION_TOKEN] != null
        }

    suspend fun login(username: String, password: String): Result<User> {
        return try {
            val response = apiService.login(mapOf(
                "username" to username,
                "password" to password
            ))
            context.dataStore.edit { preferences ->
                preferences[SESSION_TOKEN] = response.sessionToken
            }
            Result.success(response.user)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun register(username: String, email: String, password: String): Result<User> {
        return try {
            val response = apiService.register(mapOf(
                "username" to username,
                "email" to email,
                "password" to password
            ))
            context.dataStore.edit { preferences ->
                preferences[SESSION_TOKEN] = response.sessionToken
            }
            Result.success(response.user)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun logout() {
        context.dataStore.edit { preferences ->
            preferences.remove(SESSION_TOKEN)
            preferences.remove(USER_DATA)
        }
    }

    suspend fun getSessionToken(): String? {
        return context.dataStore.data.map { preferences ->
            preferences[SESSION_TOKEN]
        }.collect { it }
    }
}