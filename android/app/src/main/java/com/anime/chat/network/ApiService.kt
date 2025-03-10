package com.anime.chat.network

import com.anime.chat.data.model.Character
import com.anime.chat.data.model.Message
import com.anime.chat.data.model.User
import retrofit2.http.*

interface ApiService {
    @POST("login")
    suspend fun login(
        @Body credentials: Map<String, String>
    ): LoginResponse

    @POST("register")
    suspend fun register(
        @Body userData: Map<String, String>
    ): LoginResponse

    @GET("user")
    suspend fun getCurrentUser(): User

    @GET("characters")
    suspend fun getCharacters(): List<Character>

    @GET("messages/{characterId}")
    suspend fun getMessages(@Path("characterId") characterId: String): List<Message>

    @POST("messages")
    suspend fun sendMessage(@Body message: Message): Message
}

data class LoginResponse(
    val user: User,
    val sessionToken: String
)