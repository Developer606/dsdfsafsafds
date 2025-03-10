package com.anime.chat.data.model

data class Message(
    val id: String,
    val content: String,
    val isUser: Boolean,
    val characterId: String,
    val userId: String,
    val createdAt: String,
    val language: String? = null,
    val script: String? = null
)
