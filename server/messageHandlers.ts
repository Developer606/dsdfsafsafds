import { storage } from './storage';
import { type UserMessage, type InsertUserMessage } from '@shared/schema';

/**
 * Creates a new user message in the database
 * @param messageData The message data to insert
 * @returns The created message
 */
export async function createUserMessage(messageData: InsertUserMessage): Promise<UserMessage> {
  try {
    return await storage.createUserMessage(messageData);
  } catch (error) {
    console.error('Error creating user message:', error);
    throw error;
  }
}

/**
 * Updates the status of a message
 * @param messageId The ID of the message to update
 * @param status The new status of the message
 */
export async function updateMessageStatus(messageId: number, status: 'sent' | 'delivered' | 'read'): Promise<void> {
  try {
    await storage.updateMessageStatus(messageId, status);
  } catch (error) {
    console.error(`Error updating message ${messageId} status to ${status}:`, error);
    throw error;
  }
}

/**
 * Gets messages between two users
 * @param userId The ID of the current user
 * @param otherUserId The ID of the other user
 * @returns Array of messages between the two users
 */
export async function getUserMessages(userId: number, otherUserId: number): Promise<UserMessage[]> {
  try {
    return await storage.getUserMessages(userId, otherUserId);
  } catch (error) {
    console.error(`Error getting messages between users ${userId} and ${otherUserId}:`, error);
    throw error;
  }
}

/**
 * Gets all conversations for a user
 * @param userId The ID of the user
 * @returns Array of conversations
 */
export async function getUserConversations(userId: number): Promise<any[]> {
  try {
    return await storage.getUserConversations(userId);
  } catch (error) {
    console.error(`Error getting conversations for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Gets the count of unread messages for a user
 * @param userId The ID of the user
 * @returns The count of unread messages
 */
export async function getUnreadMessageCount(userId: number): Promise<number> {
  try {
    return await storage.getUnreadMessageCount(userId);
  } catch (error) {
    console.error(`Error getting unread message count for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Creates a new conversation between two users if it doesn't exist
 * @param user1Id The ID of the first user
 * @param user2Id The ID of the second user
 * @returns The created or existing conversation
 */
export async function ensureConversationExists(user1Id: number, user2Id: number): Promise<any> {
  try {
    // Get existing conversation or create new one
    return await storage.createConversation(user1Id, user2Id);
  } catch (error) {
    console.error(`Error ensuring conversation exists between users ${user1Id} and ${user2Id}:`, error);
    throw error;
  }
}