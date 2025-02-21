import { type Message, type InsertMessage, type User, type InsertUser, type CustomCharacter, type InsertCustomCharacter, type SubscriptionStatus } from "@shared/schema";
import { db } from "./db";
import { messages, users, customCharacters } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { sql } from "drizzle-orm";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // Message operations
  getMessagesByCharacter(characterId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  clearChat(characterId: string): Promise<void>;

  // User operations
  createUser(user: InsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
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
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
  }

  async getMessagesByCharacter(characterId: string): Promise<Message[]> {
    const result = await db
      .select()
      .from(messages)
      .where(eq(messages.characterId, characterId));
    return result;
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [result] = await db
      .insert(messages)
      .values(insertMessage)
      .returning();
    return result;
  }

  async clearChat(characterId: string): Promise<void> {
    await db
      .delete(messages)
      .where(eq(messages.characterId, characterId));
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [result] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return result;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [result] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
    return result;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [result] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return result;
  }

  async getUserById(id: number): Promise<User | undefined> {
    const [result] = await db
      .select()
      .from(users)
      .where(eq(users.id, id));
    return result;
  }

  async incrementTrialCharacterCount(userId: number): Promise<void> {
    await db
      .update(users)
      .set({
        trialCharactersCreated: sql`${users.trialCharactersCreated} + 1`
      })
      .where(eq(users.id, userId));
  }

  async createCustomCharacter(insertCharacter: InsertCustomCharacter): Promise<CustomCharacter> {
    const [result] = await db
      .insert(customCharacters)
      .values(insertCharacter)
      .returning();
    return result;
  }

  async getCustomCharactersByUser(userId: number): Promise<CustomCharacter[]> {
    const result = await db
      .select()
      .from(customCharacters)
      .where(eq(customCharacters.userId, userId));
    return result;
  }

  async getCustomCharacterById(id: number): Promise<CustomCharacter | undefined> {
    const [result] = await db
      .select()
      .from(customCharacters)
      .where(eq(customCharacters.id, id));
    return result;
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