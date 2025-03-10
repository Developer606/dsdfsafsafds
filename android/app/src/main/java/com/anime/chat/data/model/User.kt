package com.anime.chat.data.model

data class User(
    val id: String,
    val username: String,
    val email: String,
    val isPremium: Boolean = false,
    val subscriptionTier: String? = null,
    val subscriptionStatus: String? = null,
    val subscriptionExpiresAt: String? = null
)
