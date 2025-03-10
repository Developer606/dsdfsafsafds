package com.anime.chat.data.model

data class Message(
    val id: String = "",
    val content: String,
    val isUser: Boolean,
    val characterId: String,
    val userId: String = "",
    val createdAt: String = "",
    val language: String? = null,
    val script: String? = null
)

data class Character(
    val id: String,
    val name: String,
    val avatar: String,
    val description: String,
    val persona: String? = null
)

data class User(
    val id: Int,
    val username: String,
    val email: String,
    val isPremium: Boolean = false,
    val subscriptionTier: String? = null,
    val subscriptionStatus: String? = null
)
