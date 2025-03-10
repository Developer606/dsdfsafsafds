package com.anime.chat.data.api

import com.anime.chat.BuildConfig
import com.anime.chat.data.model.Message
import com.anime.chat.data.model.Character
import com.anime.chat.data.model.User
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.*

interface ApiService {
    @GET("api/characters")
    suspend fun getCharacters(): List<Character>

    @GET("api/messages/{characterId}")
    suspend fun getMessages(@Path("characterId") characterId: String): List<Message>

    @POST("api/messages")
    suspend fun sendMessage(@Body message: Message): List<Message>

    @GET("api/user")
    suspend fun getCurrentUser(): User

    companion object {
        fun create(): ApiService {
            return Retrofit.Builder()
                .baseUrl(BuildConfig.SERVER_HOST)
                .addConverterFactory(GsonConverterFactory.create())
                .build()
                .create(ApiService::class.java)
        }
    }
}
