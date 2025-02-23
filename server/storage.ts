import { type Message, type InsertMessage, type User, type InsertUser, type CustomCharacter, type InsertCustomCharacter, type SubscriptionStatus } from "@shared/schema";
import { db } from "./db";
import { messages, users, customCharacters } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import session from "express-session";
import MemoryStore from "memorystore";

// Create a memory store with a 24-hour TTL
const MemoryStoreSession = MemoryStore(session);

export interface IStorage {
  // Message operations
  getMessagesByCharacter(characterId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  clearChat(characterId: string): Promise<void>;

  // User operations
  createUser(user: InsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUser(id: number): Promise<User | undefined>;
  incrementTrialCharacterCount(userId: number): Promise<void>;

  // Custom character operations
  createCustomCharacter(character: InsertCustomCharacter): Promise<CustomCharacter>;
  getCustomCharactersByUser(userId: number): Promise<CustomCharacter[]>;
  getCustomCharacterById(id: number): Promise<CustomCharacter | undefined>;
  deleteCustomCharacter(id: number, userId: number): Promise<void>;

  // Subscription operations
  updateUserSubscription(userId: number, data: {
    isPremium: boolean;
    subscriptionTier: string;
    subscriptionStatus: SubscriptionStatus;
    subscriptionExpiresAt: Date;
  }): Promise<void>;

  // Session store
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new MemoryStoreSession({
      checkPeriod: 86400000, // 24 hours
      max: 10000 // Store up to 10000 sessions in memory
    });
  }

  // Message operations with prepared statements for better performance
  async getMessagesByCharacter(characterId: string): Promise<Message[]> {
    return db.select().from(messages)
      .where(eq(messages.characterId, characterId))
      .orderBy(messages.timestamp)
      .all();
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(insertMessage).returning();
    return message;
  }

  async clearChat(characterId: string): Promise<void> {
    await db.delete(messages).where(eq(messages.characterId, characterId));
  }

  // User operations with prepared statements
  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return db.select().from(users)
      .where(eq(users.email, email))
      .get();
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return db.select().from(users)
      .where(eq(users.username, username))
      .get();
  }

  async getUser(id: number): Promise<User | undefined> {
    return db.select().from(users)
      .where(eq(users.id, id))
      .get();
  }

  async incrementTrialCharacterCount(userId: number): Promise<void> {
    await db
      .update(users)
      .set({
        trialCharactersCreated: sql`${users.trialCharactersCreated} + 1`
      })
      .where(eq(users.id, userId));
  }

  // Custom character operations
  async createCustomCharacter(insertCharacter: InsertCustomCharacter): Promise<CustomCharacter> {
    const [character] = await db.insert(customCharacters).values(insertCharacter).returning();
    return character;
  }

  async getCustomCharactersByUser(userId: number): Promise<CustomCharacter[]> {
    return await db.select().from(customCharacters).where(eq(customCharacters.userId, userId));
  }

  async getCustomCharacterById(id: number): Promise<CustomCharacter | undefined> {
    return db.select().from(customCharacters)
      .where(eq(customCharacters.id, id))
      .get();
  }

  async deleteCustomCharacter(id: number, userId: number): Promise<void> {
    await db
      .delete(customCharacters)
      .where(
        and(
          eq(customCharacters.id, id),
          eq(customCharacters.userId, userId)
        )
      );
  }

  async updateUserSubscription(
    userId: number,
    data: {
      isPremium: boolean;
      subscriptionTier: string;
      subscriptionStatus: SubscriptionStatus;
      subscriptionExpiresAt: Date;
    }
  ): Promise<void> {
    await db
      .update(users)
      .set({
        isPremium: data.isPremium,
        subscriptionTier: data.subscriptionTier,
        subscriptionStatus: data.subscriptionStatus,
        subscriptionExpiresAt: data.subscriptionExpiresAt
      })
      .where(eq(users.id, userId));
  }
}

export const storage = new DatabaseStorage();