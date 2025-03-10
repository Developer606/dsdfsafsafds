package com.anime.chat

import android.app.Application
import com.anime.chat.network.ApiService
import com.anime.chat.network.WebSocketManager
import com.anime.chat.data.repository.AuthRepository
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

class ChatApplication : Application() {
    lateinit var webSocketManager: WebSocketManager
    lateinit var apiService: ApiService
    lateinit var authRepository: AuthRepository
    private lateinit var okHttpClient: OkHttpClient

    override fun onCreate() {
        super.onCreate()

        // Initialize OkHttpClient with logging and timeout configuration
        val loggingInterceptor = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }

        okHttpClient = OkHttpClient.Builder()
            .addInterceptor(loggingInterceptor)
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build()

        // Initialize Retrofit for API calls
        val retrofit = Retrofit.Builder()
            .baseUrl("http://${BuildConfig.SERVER_HOST}/api/")
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()

        apiService = retrofit.create(ApiService::class.java)

        // Initialize AuthRepository
        authRepository = AuthRepository(this, apiService)

        // Initialize WebSocket with AuthRepository
        webSocketManager = WebSocketManager(authRepository)
        webSocketManager.connect("ws://${BuildConfig.SERVER_HOST}/ws")
    }
}