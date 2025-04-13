import {
  type Message,
  type InsertMessage,
  type User,
  type InsertUser,
  type CustomCharacter,
  type InsertCustomCharacter,
  type PredefinedCharacter,
  type InsertPredefinedCharacter,
  type SubscriptionStatus,
  type PendingVerification,
  type InsertPendingVerification,
  type UserMessage,
  type InsertUserMessage,
  type UserConversation,
  type MessageStatus,
  type SubscriptionPlan,
  type InsertSubscriptionPlan,
  type Advertisement,
  type InsertAdvertisement,
  type AdvertisementMetric,
  type InsertAdvertisementMetric,
  pendingVerifications,
  subscriptionPlans,
  type SubscriptionTier,
  type EncryptionKey,
  type InsertEncryptionKey,
  type ConversationKey,
  type InsertConversationKey,
  encryptionKeys,
  conversationKeys,
  passwordResetAttempts
} from "@shared/schema";
import {
  messages,
  users,
  customCharacters,
  predefinedCharacters,
  subscriptionPlansTable,
  userMessages,
  userConversations,
  advertisements,
  advertisementMetrics
} from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { db } from "./db";
import session from "express-session";
import MemoryStore from "memorystore";
import { hashPassword } from "./auth"; // Import hashPassword from auth.ts
import { planDb } from "./plan-db";
// Note: character-db is imported dynamically to avoid circular dependencies

// Create a memory store with a 24-hour TTL for sessions
const MemoryStoreSession = MemoryStore(session);

export interface IStorage {
  getMessagesByCharacter(characterId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  clearChat(characterId: string): Promise<void>;
  createUser(insertUser: InsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  searchUsersByUsername(query: string): Promise<User[]>;
  getUser(id: number): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    premiumUsers: number;
  }>;
  incrementTrialCharacterCount(userId: number): Promise<void>;
  updateLastLogin(userId: number, ipAddress?: string): Promise<void>;
  createCustomCharacter(
    insertCharacter: InsertCustomCharacter,
  ): Promise<CustomCharacter>;
  getCustomCharactersByUser(userId: number): Promise<CustomCharacter[]>;
  getCustomCharacterById(id: number): Promise<CustomCharacter | undefined>;
  deleteCustomCharacter(id: number, userId: number): Promise<void>;
  updateUserSubscription(
    userId: number,
    data: {
      isPremium: boolean;
      subscriptionTier: string;
      subscriptionStatus: SubscriptionStatus;
      subscriptionExpiresAt: Date;
    },
  ): Promise<void>;
  updateUserStatus(
    userId: number,
    status: {
      isBlocked?: boolean;
      isRestricted?: boolean;
    },
  ): Promise<void>;
  deleteUser(userId: number): Promise<void>;
  verifyEmail(userId: number, token: string): Promise<boolean>;
  updateVerificationToken(
    userId: number,
    token: string,
    expiry: Date,
  ): Promise<void>;
  updateUserPassword(userId: number, hashedPassword: string): Promise<void>;
  updateUserProfile(
    userId: number,
    data: {
      fullName?: string;
      age?: number;
      gender?: string;
      bio?: string;
      profileCompleted?: boolean;
    },
  ): Promise<User>;
  updateUsername(userId: number, username: string): Promise<User>;

  // Add new methods for pending verifications
  createPendingVerification(
    data: InsertPendingVerification,
  ): Promise<PendingVerification>;
  getPendingVerification(
    email: string,
  ): Promise<PendingVerification | undefined>;
  
  /**
   * Count pending verification requests for a given email
   * Used for rate limiting OTP requests
   */
  countPendingVerificationsForEmail(email: string): Promise<number>;
  verifyPendingToken(email: string, token: string): Promise<boolean>;
  deletePendingVerification(email: string): Promise<void>;
  getUserMessageCount(userId: number): Promise<number>;

  // Add new methods for subscription plan management
  getSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  getSubscriptionPlan(id: string): Promise<SubscriptionPlan | undefined>;
  createSubscriptionPlan(
    plan: InsertSubscriptionPlan,
  ): Promise<SubscriptionPlan>;
  updateSubscriptionPlan(
    id: string,
    plan: Partial<InsertSubscriptionPlan>,
  ): Promise<SubscriptionPlan>;
  deleteSubscriptionPlan(id: string): Promise<void>;

  // Add these methods to the IStorage interface
  validateCharacterCreation(userId: number): Promise<boolean>;
  getCharacterLimit(userId: number): Promise<number>;
  validateFeatureAccess(
    userId: number,
    feature: "basic" | "advanced" | "api" | "team",
  ): Promise<boolean>;
  
  // User-to-user messaging methods
  createUserMessage(message: InsertUserMessage): Promise<UserMessage>;
  getUserMessages(
    userId: number, 
    otherUserId: number, 
    options?: { page?: number, limit?: number }
  ): Promise<{ 
    messages: UserMessage[], 
    total: number, 
    page: number, 
    pages: number 
  }>;
  updateMessageStatus(messageId: number, status: MessageStatus): Promise<void>;
  getUserConversations(userId: number): Promise<UserConversation[]>;
  getUnreadMessageCount(userId: number): Promise<number>;
  createConversation(user1Id: number, user2Id: number): Promise<UserConversation>;
  getConversationBetweenUsers(user1Id: number, user2Id: number): Promise<UserConversation | null>;
  updateConversationStatus(user1Id: number, user2Id: number, data: { isBlocked: boolean }): Promise<void>;
  deleteConversationMessages(user1Id: number, user2Id: number): Promise<void>;

  // Predefined character methods
  getAllPredefinedCharacters(): Promise<PredefinedCharacter[]>;
  getPredefinedCharacterById(id: string): Promise<PredefinedCharacter | undefined>;
  createPredefinedCharacter(character: InsertPredefinedCharacter): Promise<PredefinedCharacter>;
  updatePredefinedCharacter(id: string, character: Partial<InsertPredefinedCharacter>): Promise<PredefinedCharacter>;
  deletePredefinedCharacter(id: string): Promise<void>;
  
  // Encryption related methods
  storeEncryptionKey(userId: number, publicKey: string): Promise<EncryptionKey>;
  getEncryptionKey(userId: number): Promise<string | null>;
  storeEncryptedConversationKey(userId: number, otherUserId: number, encryptedKey: string): Promise<ConversationKey>;
  getEncryptedConversationKey(userId: number, otherUserId: number): Promise<string | null>;
  getConversationEncryptionKey(userId: number, otherUserId: number): Promise<ConversationKey | null>;
  
  // Advertisement management methods
  createAdvertisement(data: InsertAdvertisement): Promise<Advertisement>;
  getAllAdvertisements(): Promise<Advertisement[]>;
  getActiveAdvertisements(): Promise<Advertisement[]>;
  getAdvertisementById(id: number): Promise<Advertisement | undefined>;
  updateAdvertisement(id: number, data: Partial<InsertAdvertisement>): Promise<Advertisement>;
  deleteAdvertisement(id: number): Promise<void>;
  recordAdvertisementMetric(data: InsertAdvertisementMetric): Promise<AdvertisementMetric>;
  getAdvertisementMetrics(advertisementId: number): Promise<AdvertisementMetric[]>;
  getAdvertisementPerformance(advertisementId?: number): Promise<{
    impressions: number;
    clicks: number;
    ctr: number;
    advertisementId?: number;
  }>;
  incrementAdvertisementStat(advertisementId: number, stat: 'impressions' | 'clicks'): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    // Initialize session store with proper configuration
    this.sessionStore = new MemoryStoreSession({
      checkPeriod: 86400000, // Prune expired entries every 24h
      max: 1000, // Maximum number of sessions to store
      ttl: 86400000 * 7, // Session TTL (7 days)
      stale: false, // Delete stale sessions
    });

    // Initialize admin user when storage is created
    this.initializeAdmin();
    
    // Initialize the user messaging database
    this.initializeUserMessaging();
    
    // Initialize encryption tables
    this.initializeEncryption();
    
    // Initialize advertisement tables
    this.initializeAdvertisementTables();
    
    // Initialize password reset tracking table
    this.initializePasswordResetTracking();
  }
  
  /**
   * Initialize password reset attempts tracking table
   */
  private async initializePasswordResetTracking() {
    try {
      console.log("Initializing password reset tracking...");
      
      // Create indexes for efficient querying
      await db.run(sql`CREATE INDEX IF NOT EXISTS idx_password_reset_user_id 
                       ON password_reset_attempts(user_id)`);
      
      await db.run(sql`CREATE INDEX IF NOT EXISTS idx_password_reset_timestamp 
                       ON password_reset_attempts(timestamp)`);
      
      console.log("Password reset tracking initialized successfully");
    } catch (error) {
      console.error("Error initializing password reset tracking:", error);
    }
  }
  
  /**
   * Initialize encryption tables and indexes
   */
  private async initializeEncryption() {
    try {
      console.log("Initializing encryption tables...");
      
      // Create or update schema
      const { db } = await import("./db");
      
      // Ensure required indexes exist - run each statement separately
      await db.run(sql`CREATE INDEX IF NOT EXISTS idx_encryption_keys_user_id ON encryption_keys(user_id)`);
      
      await db.run(sql`CREATE INDEX IF NOT EXISTS idx_conversation_keys_user_id ON conversation_keys(user_id)`);
      
      await db.run(sql`CREATE INDEX IF NOT EXISTS idx_conversation_keys_other_user_id ON conversation_keys(other_user_id)`);
      
      await db.run(sql`CREATE INDEX IF NOT EXISTS idx_conversation_keys_user_pair ON conversation_keys(user_id, other_user_id)`);
      
      console.log("Encryption tables initialized successfully");
    } catch (error) {
      console.error("Error initializing encryption tables:", error);
    }
  }
  
  // User messaging methods implementation
  async createUserMessage(message: InsertUserMessage): Promise<UserMessage> {
    // Import the messages database to avoid circular imports
    const { messagesDb } = await import("./messages-db");
    
    const [newMessage] = await messagesDb
      .insert(userMessages)
      .values({
        ...message,
        timestamp: new Date(),
      })
      .returning();
    
    // Update or create conversation
    const user1Id = Math.min(message.senderId, message.receiverId);
    const user2Id = Math.max(message.senderId, message.receiverId);
    
    // Check if conversation exists
    const [existingConversation] = await messagesDb
      .select()
      .from(userConversations)
      .where(
        sql`${userConversations.user1Id} = ${user1Id} AND ${userConversations.user2Id} = ${user2Id}`
      );
    
    if (existingConversation) {
      // Update existing conversation
      await messagesDb
        .update(userConversations)
        .set({
          lastMessageId: newMessage.id,
          lastMessageTimestamp: newMessage.timestamp,
          // Increment unread count for the recipient
          unreadCountUser1: message.receiverId === user1Id ? 
            sql`${userConversations.unreadCountUser1} + 1` : 
            userConversations.unreadCountUser1,
          unreadCountUser2: message.receiverId === user2Id ? 
            sql`${userConversations.unreadCountUser2} + 1` : 
            userConversations.unreadCountUser2,
        })
        .where(
          sql`${userConversations.user1Id} = ${user1Id} AND ${userConversations.user2Id} = ${user2Id}`
        );
    } else {
      // Create new conversation
      await messagesDb
        .insert(userConversations)
        .values({
          user1Id,
          user2Id,
          lastMessageId: newMessage.id,
          lastMessageTimestamp: newMessage.timestamp,
          unreadCountUser1: message.receiverId === user1Id ? 1 : 0,
          unreadCountUser2: message.receiverId === user2Id ? 1 : 0,
          createdAt: new Date(),
        });
    }
    
    return newMessage;
  }
  
  async getUserMessages(
    userId: number, 
    otherUserId: number, 
    options?: { page?: number, limit?: number }
  ): Promise<{ messages: UserMessage[], total: number, page: number, pages: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    // Import the messages database to avoid circular imports
    const { messagesDb } = await import("./messages-db");
    
    // Calculate offset for pagination
    const offset = (page - 1) * limit;
    
    // Get total count for pagination metadata
    const totalResult = await messagesDb
      .select({ count: sql<number>`count(*)` })
      .from(userMessages)
      .where(
        sql`(${userMessages.senderId} = ${userId} AND ${userMessages.receiverId} = ${otherUserId}) OR
            (${userMessages.senderId} = ${otherUserId} AND ${userMessages.receiverId} = ${userId})`
      );
    
    const total = totalResult[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);
    
    // Get paginated messages between two users (in either direction)
    const messages = await messagesDb
      .select()
      .from(userMessages)
      .where(
        sql`(${userMessages.senderId} = ${userId} AND ${userMessages.receiverId} = ${otherUserId}) OR
            (${userMessages.senderId} = ${otherUserId} AND ${userMessages.receiverId} = ${userId})`
      )
      .orderBy(sql`${userMessages.timestamp} DESC`)
      .limit(limit)
      .offset(offset);
    
    // Return messages in chronological order (oldest first)
    return {
      messages: messages.reverse(),
      total,
      page,
      pages: totalPages
    };
  }
  
  async updateMessageStatus(messageId: number, status: MessageStatus): Promise<void> {
    // Import the messages database to avoid circular imports
    const { messagesDb } = await import("./messages-db");
    
    await messagesDb
      .update(userMessages)
      .set({ status })
      .where(eq(userMessages.id, messageId));
      
    // If status is read, update the conversation's unread count
    if (status === "read") {
      const [message] = await messagesDb
        .select()
        .from(userMessages)
        .where(eq(userMessages.id, messageId));
      
      if (message) {
        const user1Id = Math.min(message.senderId, message.receiverId);
        const user2Id = Math.max(message.senderId, message.receiverId);
        const readerId = message.receiverId; // The reader is the recipient
        
        await messagesDb
          .update(userConversations)
          .set({
            unreadCountUser1: readerId === user1Id ? 0 : userConversations.unreadCountUser1,
            unreadCountUser2: readerId === user2Id ? 0 : userConversations.unreadCountUser2,
          })
          .where(
            sql`${userConversations.user1Id} = ${user1Id} AND ${userConversations.user2Id} = ${user2Id}`
          );
      }
    }
  }
  
  async getUserConversations(userId: number): Promise<UserConversation[]> {
    // Import the messages database to avoid circular imports
    const { messagesDb } = await import("./messages-db");
    
    // Get all conversations where the user is either user1 or user2
    return await messagesDb
      .select()
      .from(userConversations)
      .where(
        sql`${userConversations.user1Id} = ${userId} OR ${userConversations.user2Id} = ${userId}`
      )
      .orderBy(sql`${userConversations.lastMessageTimestamp} DESC`);
  }
  
  async getUnreadMessageCount(userId: number): Promise<number> {
    // Get total unread messages across all conversations
    const conversations = await this.getUserConversations(userId);
    let totalUnread = 0;
    
    for (const conversation of conversations) {
      if (conversation.user1Id === userId) {
        totalUnread += conversation.unreadCountUser1;
      } else {
        totalUnread += conversation.unreadCountUser2;
      }
    }
    
    return totalUnread;
  }
  
  async createConversation(user1Id: number, user2Id: number): Promise<UserConversation> {
    // Import the messages database to avoid circular imports
    const { messagesDb } = await import("./messages-db");
    
    // Ensure user1Id is always the smaller ID for consistency
    const [smallerId, largerId] = user1Id < user2Id 
      ? [user1Id, user2Id] 
      : [user2Id, user1Id];
    
    const [existingConversation] = await messagesDb
      .select()
      .from(userConversations)
      .where(
        sql`${userConversations.user1Id} = ${smallerId} AND ${userConversations.user2Id} = ${largerId}`
      );
    
    if (existingConversation) {
      return existingConversation;
    }
    
    const [newConversation] = await messagesDb
      .insert(userConversations)
      .values({
        user1Id: smallerId,
        user2Id: largerId,
        unreadCountUser1: 0,
        unreadCountUser2: 0,
        createdAt: new Date(),
      })
      .returning();
    
    return newConversation;
  }
  
  /**
   * Get a conversation between two users
   * @param user1Id First user ID
   * @param user2Id Second user ID
   * @returns The conversation or null if it doesn't exist
   */
  async getConversationBetweenUsers(user1Id: number, user2Id: number): Promise<UserConversation | null> {
    // Import the messages database to avoid circular imports
    const { messagesDb } = await import("./messages-db");
    
    // Make sure user1Id is always the smaller ID for consistency
    const minUserId = Math.min(user1Id, user2Id);
    const maxUserId = Math.max(user1Id, user2Id);
    
    // Get conversation between users
    const [conversation] = await messagesDb
      .select()
      .from(userConversations)
      .where(
        sql`${userConversations.user1Id} = ${minUserId} AND ${userConversations.user2Id} = ${maxUserId}`
      );
    
    return conversation || null;
  }
  
  /**
   * Update conversation status (block/unblock)
   * @param user1Id First user ID
   * @param user2Id Second user ID
   * @param data Update data (isBlocked)
   * @returns The updated conversation
   */
  async updateConversationStatus(user1Id: number, user2Id: number, data: { isBlocked: boolean }): Promise<void> {
    // Import the messages database to avoid circular imports
    const { messagesDb } = await import("./messages-db");
    
    // Make sure user1Id is always the smaller ID for consistency
    const minUserId = Math.min(user1Id, user2Id);
    const maxUserId = Math.max(user1Id, user2Id);
    
    // Ensure isBlocked is a boolean value
    const isBlocked = !!data.isBlocked;
    
    console.log(`[updateConversationStatus] Setting conversation between users ${minUserId} and ${maxUserId} to isBlocked=${isBlocked}`);
    
    // Check if conversation exists in messages database
    const conversation = await this.getConversationBetweenUsers(minUserId, maxUserId);
    console.log(`[updateConversationStatus] Found conversation in messages.db:`, conversation);
    
    try {
      // Update in messages.db
      if (conversation) {
        // Update existing conversation
        console.log(`[updateConversationStatus] Updating existing conversation in messages.db to isBlocked=${isBlocked}`);
        await messagesDb
          .update(userConversations)
          .set({ 
            isBlocked: isBlocked 
          })
          .where(
            sql`${userConversations.user1Id} = ${minUserId} AND ${userConversations.user2Id} = ${maxUserId}`
          );
      } else {
        // Create new conversation with blocked status
        console.log(`[updateConversationStatus] Creating new conversation in messages.db with isBlocked=${isBlocked}`);
        await messagesDb
          .insert(userConversations)
          .values({
            user1Id: minUserId,
            user2Id: maxUserId,
            isBlocked: isBlocked,
            unreadCountUser1: 0,
            unreadCountUser2: 0,
            createdAt: new Date()
          });
      }
      
      // Also update in the main database (sqlite.db)
      // Check if conversation exists in main database
      const [mainConversation] = await db
        .select()
        .from(userConversations)
        .where(
          sql`${userConversations.user1Id} = ${minUserId} AND ${userConversations.user2Id} = ${maxUserId}`
        );
      
      console.log(`[updateConversationStatus] Found conversation in sqlite.db:`, mainConversation);
      
      if (mainConversation) {
        // Update existing conversation in main database
        console.log(`[updateConversationStatus] Updating existing conversation in sqlite.db to isBlocked=${isBlocked}`);
        await db
          .update(userConversations)
          .set({ 
            isBlocked: isBlocked 
          })
          .where(
            sql`${userConversations.user1Id} = ${minUserId} AND ${userConversations.user2Id} = ${maxUserId}`
          );
      } else {
        // Create new conversation with blocked status in main database
        console.log(`[updateConversationStatus] Creating new conversation in sqlite.db with isBlocked=${isBlocked}`);
        await db
          .insert(userConversations)
          .values({
            user1Id: minUserId,
            user2Id: maxUserId,
            isBlocked: isBlocked,
            unreadCountUser1: 0,
            unreadCountUser2: 0,
            createdAt: new Date()
          });
      }
      
      // Verify the update was successful
      const verifyConversation = await this.getConversationBetweenUsers(minUserId, maxUserId);
      if (verifyConversation?.isBlocked !== isBlocked) {
        console.error(`[updateConversationStatus] WARNING: Update verification failed in messages.db! Expected isBlocked=${isBlocked} but got ${verifyConversation?.isBlocked}`);
        
        // Force update if verification failed
        if (verifyConversation) {
          console.log(`[updateConversationStatus] Forcing update in messages.db to isBlocked=${isBlocked}`);
          await messagesDb
            .update(userConversations)
            .set({ isBlocked: isBlocked })
            .where(
              sql`${userConversations.user1Id} = ${minUserId} AND ${userConversations.user2Id} = ${maxUserId}`
            );
        }
      }
      
      // Verify update in main database
      const [verifyMainConversation] = await db
        .select()
        .from(userConversations)
        .where(
          sql`${userConversations.user1Id} = ${minUserId} AND ${userConversations.user2Id} = ${maxUserId}`
        );
        
      if (verifyMainConversation?.isBlocked !== isBlocked) {
        console.error(`[updateConversationStatus] WARNING: Update verification failed in sqlite.db! Expected isBlocked=${isBlocked} but got ${verifyMainConversation?.isBlocked}`);
        
        // Force update if verification failed
        if (verifyMainConversation) {
          console.log(`[updateConversationStatus] Forcing update in sqlite.db to isBlocked=${isBlocked}`);
          await db
            .update(userConversations)
            .set({ isBlocked: isBlocked })
            .where(
              sql`${userConversations.user1Id} = ${minUserId} AND ${userConversations.user2Id} = ${maxUserId}`
            );
        }
      }
      
    } catch (error) {
      console.error(`[updateConversationStatus] Error updating conversation status:`, error);
      throw error;
    }
  }
  
  /**
   * Delete all messages between two users
   * @param user1Id First user ID
   * @param user2Id Second user ID
   */
  async deleteConversationMessages(user1Id: number, user2Id: number): Promise<void> {
    // Import the messages database to avoid circular imports
    const { messagesDb } = await import("./messages-db");
    
    // Delete messages in both directions
    await messagesDb
      .delete(userMessages)
      .where(
        sql`(${userMessages.senderId} = ${user1Id} AND ${userMessages.receiverId} = ${user2Id}) OR
            (${userMessages.senderId} = ${user2Id} AND ${userMessages.receiverId} = ${user1Id})`
      );
    
    // Reset conversation but keep it in place
    const minUserId = Math.min(user1Id, user2Id);
    const maxUserId = Math.max(user1Id, user2Id);
    
    const conversation = await this.getConversationBetweenUsers(minUserId, maxUserId);
    
    if (conversation) {
      await messagesDb
        .update(userConversations)
        .set({ 
          lastMessageId: null,
          lastMessageTimestamp: null,
          unreadCountUser1: 0,
          unreadCountUser2: 0
        })
        .where(
          sql`${userConversations.user1Id} = ${minUserId} AND ${userConversations.user2Id} = ${maxUserId}`
        );
    }
  }
  
  /**
   * Get all predefined characters
   * @returns Array of predefined characters
   */
  async getAllPredefinedCharacters(): Promise<PredefinedCharacter[]> {
    try {
      // Import dynamically to avoid circular dependencies
      const { getAllPredefinedCharactersFromDb } = await import('./character-db');
      return await getAllPredefinedCharactersFromDb();
    } catch (error) {
      console.error("Error fetching predefined characters from character.db:", error);
      // Fallback to the main database if there's an error with character.db
      console.log("Falling back to main database for predefined characters");
      return await db.select().from(predefinedCharacters);
    }
  }
  
  /**
   * Get a predefined character by ID
   * @param id Character ID
   * @returns The character or undefined if not found
   */
  async getPredefinedCharacterById(id: string): Promise<PredefinedCharacter | undefined> {
    try {
      // Import dynamically to avoid circular dependencies
      const { getPredefinedCharacterByIdFromDb } = await import('./character-db');
      const character = await getPredefinedCharacterByIdFromDb(id);
      
      // If found in character.db, return it
      if (character) {
        return character;
      }
      
      // If not found in character.db, try the main database
      console.log(`Character ${id} not found in character.db, trying main database`);
      const [mainDbCharacter] = await db
        .select()
        .from(predefinedCharacters)
        .where(eq(predefinedCharacters.id, id));
      
      return mainDbCharacter;
    } catch (error) {
      console.error(`Error fetching character ${id} from character.db:`, error);
      // Fallback to the main database if there's an error with character.db
      console.log(`Falling back to main database for character ${id}`);
      const [character] = await db
        .select()
        .from(predefinedCharacters)
        .where(eq(predefinedCharacters.id, id));
      
      return character;
    }
  }
  
  /**
   * Create a new predefined character
   * @param character Character data
   * @returns The created character
   */
  async createPredefinedCharacter(character: InsertPredefinedCharacter): Promise<PredefinedCharacter> {
    try {
      // Import dynamically to avoid circular dependencies
      const { createPredefinedCharacterInDb } = await import('./character-db');
      return await createPredefinedCharacterInDb(character);
    } catch (error) {
      console.error("Error creating predefined character in character.db:", error);
      // Fallback to the main database if there's an error with character.db
      console.log("Falling back to main database for creating predefined character");
      const [newCharacter] = await db
        .insert(predefinedCharacters)
        .values({
          ...character,
          createdAt: new Date()
        })
        .returning();
      
      return newCharacter;
    }
  }
  
  /**
   * Update a predefined character
   * @param id Character ID
   * @param character Updated character data
   * @returns The updated character
   */
  async updatePredefinedCharacter(
    id: string, 
    character: Partial<InsertPredefinedCharacter>
  ): Promise<PredefinedCharacter> {
    try {
      // Import dynamically to avoid circular dependencies
      const { updatePredefinedCharacterInDb } = await import('./character-db');
      return await updatePredefinedCharacterInDb(id, character);
    } catch (error) {
      console.error(`Error updating predefined character ${id} in character.db:`, error);
      // Fallback to the main database if there's an error with character.db
      console.log(`Falling back to main database for updating predefined character ${id}`);
      const [updatedCharacter] = await db
        .update(predefinedCharacters)
        .set({
          ...character,
        })
        .where(eq(predefinedCharacters.id, id))
        .returning();
      
      return updatedCharacter;
    }
  }
  
  /**
   * Delete a predefined character
   * @param id Character ID
   */
  async deletePredefinedCharacter(id: string): Promise<void> {
    try {
      // Import dynamically to avoid circular dependencies
      const { deletePredefinedCharacterFromDb } = await import('./character-db');
      await deletePredefinedCharacterFromDb(id);
    } catch (error) {
      console.error(`Error deleting predefined character ${id} from character.db:`, error);
      // Fallback to the main database if there's an error with character.db
      console.log(`Falling back to main database for deleting predefined character ${id}`);
      await db
        .delete(predefinedCharacters)
        .where(eq(predefinedCharacters.id, id));
    }
  }

  async getMessagesByCharacter(characterId: string): Promise<Message[]> {
    const rawMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.characterId, characterId));
    
    // Convert raw messages to Message type
    return rawMessages.map(msg => ({
      id: msg.id,
      userId: msg.userId,
      characterId: msg.characterId,
      content: msg.content,
      isUser: Boolean(msg.isUser),
      language: msg.language || undefined,
      script: msg.script,
      timestamp: new Date(msg.timestamp)
    }));
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db
      .insert(messages)
      .values({
        ...message,
        timestamp: new Date(),
      })
      .returning();

    // Increment message count for user messages only
    if (message.isUser) {
      await db
        .update(users)
        .set({ messageCount: sql`${users.messageCount} + 1` })
        .where(eq(users.id, message.userId));
    }

    return {
      ...newMessage,
      timestamp: new Date(newMessage.timestamp),
      language: newMessage.language || undefined,
      script: newMessage.script,
    };
  }

  async clearChat(characterId: string): Promise<void> {
    await db.delete(messages).where(eq(messages.characterId, characterId));
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Ensure default values are properly set for the new fields
    const userDataWithDefaults = {
      ...insertUser,
      createdAt: new Date(),
      isPremium: false,
      trialCharactersCreated: 0,
      isBlocked: false,
      isRestricted: false,
      // Allow email verification to be overridden (for OAuth users)
      isEmailVerified: insertUser.isEmailVerified || false,
      // Allow profile completion to be overridden based on data availability
      profileCompleted: insertUser.profileCompleted || false,
      verificationToken: null,
      verificationTokenExpiry: null,
      lastLoginAt: null,
      messageCount: 0, // Initialize message count
      // Optional demographic fields from Google OAuth
      age: insertUser.age || null,
      gender: insertUser.gender || null, 
      bio: insertUser.bio || null
    };
    
    const [newUser] = await db
      .insert(users)
      .values(userDataWithDefaults)
      .returning();
      
    return newUser;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user;
  }
  
  async searchUsersByUsername(query: string): Promise<User[]> {
    // Use the LIKE operator for pattern matching with % wildcard
    return await db
      .select()
      .from(users)
      .where(sql`${users.username} LIKE ${`%${query}%`} AND ${users.isAdmin} = false`);
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.isAdmin, false));
  }

  async getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    premiumUsers: number;
  }> {
    const allUsers = await this.getAllUsers();
    const now = Date.now();
    const activeThreshold = now - 24 * 60 * 60 * 1000; // Active in last 24 hours

    return {
      totalUsers: allUsers.length,
      activeUsers: allUsers.filter(
        (u) => u.lastLoginAt && u.lastLoginAt.getTime() > activeThreshold,
      ).length,
      premiumUsers: allUsers.filter((u) => u.isPremium).length,
    };
  }

  async incrementTrialCharacterCount(userId: number): Promise<void> {
    await db
      .update(users)
      .set({ trialCharactersCreated: sql`${users.trialCharactersCreated} + 1` })
      .where(eq(users.id, userId));
  }

  async updateLastLogin(userId: number, ipAddress?: string): Promise<void> {
    const updateData: any = { lastLoginAt: new Date() };

    // If IP address is provided, update location data
    if (ipAddress) {
      const { getLocationFromIp } = await import("./ip-location");
      const locationData = getLocationFromIp(ipAddress);

      updateData.lastLoginIp = ipAddress;
      updateData.countryCode = locationData.countryCode;
      updateData.countryName = locationData.countryName;
      updateData.cityName = locationData.cityName;
    }

    await db.update(users).set(updateData).where(eq(users.id, userId));
  }

  async createCustomCharacter(
    insertCharacter: InsertCustomCharacter,
  ): Promise<CustomCharacter> {
    const [newCharacter] = await db
      .insert(customCharacters)
      .values({
        ...insertCharacter,
        createdAt: new Date(),
      })
      .returning();
    return newCharacter;
  }

  async getCustomCharactersByUser(userId: number): Promise<CustomCharacter[]> {
    return await db
      .select()
      .from(customCharacters)
      .where(eq(customCharacters.userId, userId));
  }

  async getCustomCharacterById(
    id: number,
  ): Promise<CustomCharacter | undefined> {
    const [character] = await db
      .select()
      .from(customCharacters)
      .where(eq(customCharacters.id, id));
    return character;
  }

  async deleteCustomCharacter(id: number, userId: number): Promise<void> {
    const result = await db
      .delete(customCharacters)
      .where(
        sql`${customCharacters.id} = ${id} AND ${customCharacters.userId} = ${userId}`,
      )
      .returning();

    if (!result.length) {
      throw new Error("Character not found or unauthorized");
    }
  }

  async updateUserSubscription(
    userId: number,
    data: {
      isPremium: boolean;
      subscriptionTier: string;
      subscriptionStatus: SubscriptionStatus;
      subscriptionExpiresAt: Date;
    },
  ): Promise<void> {
    await db.update(users).set(data).where(eq(users.id, userId));
  }

  async updateUserStatus(
    userId: number,
    status: { isBlocked?: boolean; isRestricted?: boolean },
  ): Promise<void> {
    await db.update(users).set(status).where(eq(users.id, userId));
  }

  async deleteUser(userId: number): Promise<void> {
    await db.delete(users).where(eq(users.id, userId));
  }

  async verifyEmail(userId: number, token: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) return false;

    const now = new Date();
    if (
      user.verificationToken === token &&
      user.verificationTokenExpiry &&
      new Date(user.verificationTokenExpiry) > now
    ) {
      await db
        .update(users)
        .set({
          isEmailVerified: true,
          verificationToken: null,
          verificationTokenExpiry: null,
        })
        .where(eq(users.id, userId));
      return true;
    }
    return false;
  }

  async updateVerificationToken(
    userId: number,
    token: string,
    expiry: Date,
  ): Promise<void> {
    await db
      .update(users)
      .set({
        verificationToken: token,
        verificationTokenExpiry: expiry,
      })
      .where(eq(users.id, userId));
  }
  // Add methods to track password reset attempts
  async countRecentPasswordResetRequests(userId: number): Promise<number> {
    try {
      // Look for password reset attempts in the last 30 minutes
      const thirtyMinutesAgo = new Date();
      thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);
      
      const result = await db
        .select({ count: sql`count(*)` })
        .from(passwordResetAttempts)
        .where(sql`
          ${passwordResetAttempts.userId} = ${userId} AND 
          ${passwordResetAttempts.timestamp} > ${thirtyMinutesAgo.toISOString()}
        `);
      
      return Number(result[0]?.count || 0);
    } catch (error) {
      console.error("Error counting recent password reset requests:", error);
      return 0;
    }
  }
  
  async logPasswordResetAttempt(userId: number): Promise<void> {
    try {
      await db
        .insert(passwordResetAttempts)
        .values({
          userId,
          timestamp: new Date(),
          ip: "stored-separately" // IP is stored separately in logs for security
        });
    } catch (error) {
      console.error("Error logging password reset attempt:", error);
      // Don't throw - this is a non-critical operation
    }
  }
  
  private async initializeAdmin() {
    try {
      // Check if admin already exists
      const existingAdmin = await this.getUserByUsername("SysRoot_99");
      if (!existingAdmin) {
        const hashedPassword = await hashPassword("admin123");
        await db.insert(users).values({
          email: "admin@system.local",
          username: "SysRoot_99",
          password: hashedPassword,
          role: "admin",
          isAdmin: true,
          isPremium: false,
          isBlocked: false,
          isRestricted: false,
          isEmailVerified: true,
          verificationToken: null,
          verificationTokenExpiry: null,
          trialCharactersCreated: 0,
          subscriptionTier: null,
          subscriptionStatus: "trial",
          subscriptionExpiresAt: null,
          createdAt: new Date(),
          lastLoginAt: null,
          messageCount: 0, // Initialize message count
        });
        console.log("Admin user created successfully");
      }
    } catch (error) {
      console.error("Error creating admin user:", error);
    }
  }
  async updateUserPassword(
    userId: number,
    hashedPassword: string,
  ): Promise<void> {
    await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId));
  }
  
  async updateUserProfile(
    userId: number,
    data: {
      fullName?: string;
      age?: number;
      gender?: string;
      bio?: string;
      profileCompleted?: boolean;
    },
  ): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({
        fullName: data.fullName,
        age: data.age,
        gender: data.gender,
        bio: data.bio,
        profileCompleted: data.profileCompleted ?? true,
      })
      .where(eq(users.id, userId))
      .returning();
    
    return updatedUser;
  }
  
  /**
   * Update a user's username
   * @param userId The ID of the user
   * @param username The new username
   * @returns The updated user
   */
  async updateUsername(userId: number, username: string): Promise<User> {
    // Check if username is already taken
    const existingUser = await this.getUserByUsername(username);
    if (existingUser && existingUser.id !== userId) {
      throw new Error("Username already taken");
    }
    
    // Update the username
    const [updatedUser] = await db
      .update(users)
      .set({ username })
      .where(eq(users.id, userId))
      .returning();
    
    return updatedUser;
  }

  async createPendingVerification(
    data: InsertPendingVerification,
  ): Promise<PendingVerification> {
    try {
      // Delete any existing verification for this email
      await db
        .delete(pendingVerifications)
        .where(eq(pendingVerifications.email, data.email));

      // Create new verification
      const [newVerification] = await db
        .insert(pendingVerifications)
        .values(data)
        .returning();

      return newVerification;
    } catch (error) {
      console.error("Error creating pending verification:", error);
      throw new Error("Failed to create pending verification");
    }
  }

  async getPendingVerification(
    email: string,
  ): Promise<PendingVerification | undefined> {
    try {
      const [verification] = await db
        .select()
        .from(pendingVerifications)
        .where(eq(pendingVerifications.email, email));
      return verification;
    } catch (error) {
      console.error("Error getting pending verification:", error);
      return undefined;
    }
  }

  /**
   * Count pending verification requests for a given email
   * Used for rate limiting OTP requests
   */
  async countPendingVerificationsForEmail(email: string): Promise<number> {
    try {
      const result = await db
        .select({ count: sql`count(*)` })
        .from(pendingVerifications)
        .where(eq(pendingVerifications.email, email));
      
      return Number(result[0]?.count || 0);
    } catch (error) {
      console.error("Error counting pending verifications:", error);
      return 0;
    }
  }
  
  async verifyPendingToken(email: string, token: string): Promise<boolean> {
    try {
      const verification = await this.getPendingVerification(email);
      if (!verification) return false;

      const now = new Date();
      if (
        verification.verificationToken === token &&
        verification.tokenExpiry > now
      ) {
        // If verification is successful, delete the verification record
        await this.deletePendingVerification(email);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error verifying pending token:", error);
      return false;
    }
  }

  async deletePendingVerification(email: string): Promise<void> {
    try {
      await db
        .delete(pendingVerifications)
        .where(eq(pendingVerifications.email, email));
    } catch (error) {
      console.error("Error deleting pending verification:", error);
      throw new Error("Failed to delete pending verification");
    }
  }

  async getUserMessageCount(userId: number): Promise<number> {
    const [user] = await db
      .select({ messageCount: users.messageCount })
      .from(users)
      .where(eq(users.id, userId));
    return user?.messageCount || 0;
  }

  // Update subscription plan methods to use planDb
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return await planDb.select().from(subscriptionPlansTable);
  }

  async getSubscriptionPlan(id: string): Promise<SubscriptionPlan | undefined> {
    const [plan] = await planDb
      .select()
      .from(subscriptionPlansTable)
      .where(eq(subscriptionPlansTable.id, id));
    return plan;
  }

  async createSubscriptionPlan(
    plan: InsertSubscriptionPlan,
  ): Promise<SubscriptionPlan> {
    const [newPlan] = await planDb
      .insert(subscriptionPlansTable)
      .values(plan)
      .returning();
    return newPlan;
  }

  async updateSubscriptionPlan(
    id: string,
    plan: Partial<InsertSubscriptionPlan>,
  ): Promise<SubscriptionPlan> {
    const [updatedPlan] = await planDb
      .update(subscriptionPlansTable)
      .set({ ...plan, updatedAt: new Date() })
      .where(eq(subscriptionPlansTable.id, id))
      .returning();
    return updatedPlan;
  }

  async deleteSubscriptionPlan(id: string): Promise<void> {
    await planDb
      .delete(subscriptionPlansTable)
      .where(eq(subscriptionPlansTable.id, id));
  }

  async validateCharacterCreation(userId: number): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) return false;

    // Free users are limited by trial characters
    if (!user.isPremium) {
      return user.trialCharactersCreated < 3;
    }

    // Check subscription tier limits
    const characters = await this.getCustomCharactersByUser(userId);
    const characterCount = characters.length;

    // Need to convert lowercase tier names to uppercase for indexing subscriptionPlans
    const tier = user.subscriptionTier?.toUpperCase() as keyof typeof subscriptionPlans;
    
    if (tier === "BASIC") {
      return characterCount < subscriptionPlans.BASIC.characterLimit;
    } else if (tier === "PREMIUM") {
      return characterCount < subscriptionPlans.PREMIUM.characterLimit;
    } else if (tier === "PRO") {
      return true; // Pro users have unlimited characters
    } else {
      return false;
    }
  }

  async getCharacterLimit(userId: number): Promise<number> {
    const user = await this.getUser(userId);
    if (!user) return 0;

    if (!user.isPremium) return 3; // Trial limit

    // Need to convert lowercase tier names to uppercase for indexing subscriptionPlans
    const tier = user.subscriptionTier?.toUpperCase() as keyof typeof subscriptionPlans;
    
    if (tier === "BASIC") {
      return subscriptionPlans.BASIC.characterLimit;
    } else if (tier === "PREMIUM") {
      return subscriptionPlans.PREMIUM.characterLimit;
    } else if (tier === "PRO") {
      return Infinity;
    } else {
      return 0;
    }
  }

  async validateFeatureAccess(
    userId: number,
    feature: "basic" | "advanced" | "api" | "team",
  ): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) return false;

    switch (feature) {
      case "basic":
        return true; // All users have basic features
      case "advanced":
        return (
          user.isPremium &&
          ["premium", "pro"].includes(user.subscriptionTier || "")
        );
      case "api":
        return user.isPremium && user.subscriptionTier === "pro";
      case "team":
        return user.isPremium && user.subscriptionTier === "pro";
      default:
        return false;
    }
  }

  // This is just a placeholder comment for initialization timing
  private async initializeUserMessaging() {
    try {
      // Initialize the messages database
      const { initializeMessagesDb } = await import("./messages-db");
      await initializeMessagesDb();
      console.log("Messages database initialized successfully");
    } catch (error) {
      console.error("Failed to initialize messages database:", error);
    }
  }

  // Encryption methods implementation
  
  /**
   * Store a user's public encryption key
   * @param userId User ID
   * @param publicKey Public key as string
   * @returns The stored encryption key
   */
  async storeEncryptionKey(userId: number, publicKey: string): Promise<EncryptionKey> {
    // Check if a key already exists for this user
    const [existingKey] = await db
      .select()
      .from(encryptionKeys)
      .where(eq(encryptionKeys.userId, userId));
    
    if (existingKey) {
      // Update the existing key
      const [updatedKey] = await db
        .update(encryptionKeys)
        .set({ publicKey })
        .where(eq(encryptionKeys.userId, userId))
        .returning();
      
      return updatedKey;
    }
    
    // Insert a new key
    const [newKey] = await db
      .insert(encryptionKeys)
      .values({
        userId,
        publicKey,
      })
      .returning();
    
    return newKey;
  }
  
  /**
   * Get a user's public encryption key
   * @param userId User ID
   * @returns The user's public key or null if not found
   */
  async getEncryptionKey(userId: number): Promise<string | null> {
    const [key] = await db
      .select()
      .from(encryptionKeys)
      .where(eq(encryptionKeys.userId, userId));
    
    return key ? key.publicKey : null;
  }
  
  /**
   * Store an encrypted conversation key for a user pair
   * @param userId User ID
   * @param otherUserId Other user ID
   * @param encryptedKey Encrypted key
   * @returns The stored conversation key
   */
  async storeEncryptedConversationKey(
    userId: number, 
    otherUserId: number, 
    encryptedKey: string
  ): Promise<ConversationKey> {
    // Ensure user IDs are ordered (smaller ID is always user1Id)
    const user1Id = Math.min(userId, otherUserId);
    const user2Id = Math.max(userId, otherUserId);
    
    // Check if a key already exists for this user pair
    const [existingKey] = await db
      .select()
      .from(conversationKeys)
      .where(
        sql`${conversationKeys.user1Id} = ${user1Id} AND 
            ${conversationKeys.user2Id} = ${user2Id}`
      );
    
    if (existingKey) {
      // Update the existing key - use different encrypted key based on which user is updating
      const [updatedKey] = await db
        .update(conversationKeys)
        .set({ 
          encryptedKey1: userId === user1Id ? encryptedKey : conversationKeys.encryptedKey1,
          encryptedKey2: userId === user2Id ? encryptedKey : conversationKeys.encryptedKey2
        })
        .where(
          sql`${conversationKeys.user1Id} = ${user1Id} AND 
              ${conversationKeys.user2Id} = ${user2Id}`
        )
        .returning();
      
      return updatedKey;
    }
    
    // Insert a new key
    const [newKey] = await db
      .insert(conversationKeys)
      .values({
        user1Id,
        user2Id,
        encryptedKey1: userId === user1Id ? encryptedKey : "",
        encryptedKey2: userId === user2Id ? encryptedKey : "",
      })
      .returning();
    
    return newKey;
  }
  
  /**
   * Get the encrypted conversation key for a user pair
   * @param userId User ID
   * @param otherUserId Other user ID
   * @returns The encrypted key or null if not found
   */
  async getEncryptedConversationKey(
    userId: number, 
    otherUserId: number
  ): Promise<string | null> {
    // Ensure user IDs are ordered (smaller ID is always user1Id)
    const user1Id = Math.min(userId, otherUserId);
    const user2Id = Math.max(userId, otherUserId);
    
    const [key] = await db
      .select()
      .from(conversationKeys)
      .where(
        sql`${conversationKeys.user1Id} = ${user1Id} AND 
            ${conversationKeys.user2Id} = ${user2Id}`
      );
    
    // Return the correct encrypted key based on which user is requesting
    if (key) {
      return userId === user1Id ? key.encryptedKey1 : key.encryptedKey2;
    }
    
    return null;
  }
  
  /**
   * Get the full conversation key record for a user pair
   * @param userId User ID
   * @param otherUserId Other user ID
   * @returns The conversation key or null if not found
   */
  async getConversationEncryptionKey(
    userId: number, 
    otherUserId: number
  ): Promise<ConversationKey | null> {
    // Ensure user IDs are ordered (smaller ID is always user1Id)
    const user1Id = Math.min(userId, otherUserId);
    const user2Id = Math.max(userId, otherUserId);
    
    const [key] = await db
      .select()
      .from(conversationKeys)
      .where(
        sql`${conversationKeys.user1Id} = ${user1Id} AND 
            ${conversationKeys.user2Id} = ${user2Id}`
      );
    
    return key || null;
  }
  
  // Initialize advertisement database tables and necessary indexes
  private async initializeAdvertisementTables() {
    try {
      console.log("Initializing advertisement tables...");
      
      // Import and initialize the advertisement database
      const { initializeAdvertisementDb } = await import('./advertisement-db');
      await initializeAdvertisementDb();
      
      console.log("Advertisement tables initialized successfully");
    } catch (error) {
      console.error("Error initializing advertisement tables:", error);
    }
  }
  
  // Advertisement management methods implementation
  async createAdvertisement(data: InsertAdvertisement): Promise<Advertisement> {
    // Use the advertisement database implementation
    const { createAdvertisementInDb } = await import('./advertisement-db');
    return await createAdvertisementInDb(data);
  }
  
  async getAllAdvertisements(): Promise<Advertisement[]> {
    // Use the advertisement database implementation
    const { getAllAdvertisementsFromDb } = await import('./advertisement-db');
    return await getAllAdvertisementsFromDb();
  }
  
  async getActiveAdvertisements(): Promise<Advertisement[]> {
    // Use the advertisement database implementation
    const { getActiveAdvertisementsFromDb } = await import('./advertisement-db');
    return await getActiveAdvertisementsFromDb();
  }
  
  async getAdvertisementById(id: number): Promise<Advertisement | undefined> {
    // Use the advertisement database implementation
    const { getAdvertisementByIdFromDb } = await import('./advertisement-db');
    return await getAdvertisementByIdFromDb(id);
  }
  
  async updateAdvertisement(id: number, data: Partial<InsertAdvertisement>): Promise<Advertisement> {
    // Use the advertisement database implementation
    const { updateAdvertisementInDb } = await import('./advertisement-db');
    return await updateAdvertisementInDb(id, data);
  }
  
  async deleteAdvertisement(id: number): Promise<void> {
    // Use the advertisement database implementation
    const { deleteAdvertisementFromDb } = await import('./advertisement-db');
    await deleteAdvertisementFromDb(id);
  }
  
  async recordAdvertisementMetric(data: InsertAdvertisementMetric): Promise<AdvertisementMetric> {
    // Use the advertisement database implementation
    const { recordAdvertisementMetricInDb } = await import('./advertisement-db');
    return await recordAdvertisementMetricInDb(data);
  }
  
  async getAdvertisementMetrics(advertisementId: number): Promise<AdvertisementMetric[]> {
    // Use the advertisement database implementation
    const { getAdvertisementMetricsFromDb } = await import('./advertisement-db');
    return await getAdvertisementMetricsFromDb(advertisementId);
  }
  
  async getAdvertisementPerformance(advertisementId?: number): Promise<{
    impressions: number;
    clicks: number;
    ctr: number;
    advertisementId?: number;
  }> {
    // Use the advertisement database implementation
    const { getAdvertisementPerformanceFromDb } = await import('./advertisement-db');
    return await getAdvertisementPerformanceFromDb(advertisementId);
  }
  
  async incrementAdvertisementStat(advertisementId: number, stat: 'impressions' | 'clicks'): Promise<void> {
    // Use the advertisement database implementation
    const { incrementAdvertisementStatInDb } = await import('./advertisement-db');
    await incrementAdvertisementStatInDb(advertisementId, stat);
  }
  
  /**
   * Get a user by ID (used by proactive messaging service)
   * @param userId The user ID to look up
   * @returns The user object or null if not found
   */
  async getUserById(userId: number): Promise<User | null> {
    try {
      const user = await this.getUser(userId);
      return user || null; // Explicitly return null instead of undefined
    } catch (error) {
      console.error(`Error in getUserById: ${error}`);
      return null;
    }
  }
  
  /**
   * Get messages between a user and character (used by proactive messaging service)
   * @param userId The user ID
   * @param characterId The character ID 
   * @param limit Maximum number of messages to return (default: 50)
   * @returns Array of messages between user and character
   */
  async getUserCharacterMessages(userId: number, characterId: string, limit: number = 50): Promise<Message[]> {
    try {
      // Get messages from the database with pagination
      const result = await db
        .select()
        .from(messages)
        .where(sql`${messages.userId} = ${userId} AND ${messages.characterId} = ${characterId}`)
        .orderBy(sql`${messages.id} DESC`)
        .limit(limit);
      
      // Transform the results to match the Message type by converting null to undefined
      const transformedMessages = result.map(msg => ({
        ...msg,
        language: msg.language || undefined,
        script: msg.script || undefined
      }));
      
      // Return messages in chronological order (oldest first)
      return transformedMessages.reverse();
    } catch (error) {
      console.error(`Error in getUserCharacterMessages: ${error}`);
      return [];
    }
  }
}

export const storage = new DatabaseStorage();
