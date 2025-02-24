import { type Message, type InsertMessage, type User, type InsertUser, type CustomCharacter, type InsertCustomCharacter, type SubscriptionStatus } from "@shared/schema";
import session from "express-session";
import MemoryStore from "memorystore";
import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "./db";
import { users, messages, customCharacters } from "@shared/schema";

// Create a memory store with a 24-hour TTL for sessions only
const MemoryStoreSession = MemoryStore(session);

export interface IStorage {
  getMessagesByCharacter(characterId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  clearChat(characterId: string): Promise<void>;
  createUser(insertUser: InsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUser(id: number): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getUserStats(): Promise<{ totalUsers: number; activeUsers: number; premiumUsers: number; }>;
  incrementTrialCharacterCount(userId: number): Promise<void>;
  updateLastLogin(userId: number): Promise<void>;
  createCustomCharacter(insertCharacter: InsertCustomCharacter): Promise<CustomCharacter>;
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
    }
  ): Promise<void>;
  updateUserStatus(userId: number, status: {
    isBlocked?: boolean;
    isRestricted?: boolean;
  }): Promise<void>;
  deleteUser(userId: number): Promise<void>;
  verifyEmail(userId: number, token: string): Promise<boolean>;
  updateVerificationToken(userId: number, token: string, expiry: Date): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new MemoryStoreSession({
      checkPeriod: 86400000, // 24 hours
      max: 10000 // Store up to 10000 sessions in memory
    });
  }

  async getMessagesByCharacter(characterId: string): Promise<Message[]> {
    const result = await db
      .select()
      .from(messages)
      .where(eq(messages.characterId, characterId))
      .orderBy(messages.timestamp);

    return result;
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [result] = await db
      .insert(messages)
      .values({
        userId: message.userId,
        characterId: message.characterId,
        content: message.content,
        isUser: message.isUser,
        language: message.language,
        script: message.script,
        timestamp: new Date()
      })
      .returning();

    return result;
  }

  async clearChat(characterId: string): Promise<void> {
    await db
      .delete(messages)
      .where(eq(messages.characterId, characterId));
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        isPremium: false,
        trialCharactersCreated: 0,
        lastLoginAt: null,
        isBlocked: false,
        isRestricted: false,
        isEmailVerified: false,
        verificationToken: null,
        verificationTokenExpiry: null,
        createdAt: new Date()
      })
      .returning();

    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user;
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id));
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.isAdmin, false));
  }

  async getUserStats(): Promise<{ totalUsers: number; activeUsers: number; premiumUsers: number; }> {
    const [result] = await db
      .select({
        total: sql<number>`count(*)`,
        active: sql<number>`sum(case when ${users.lastLoginAt} > datetime('now', '-1 day') then 1 else 0 end)`,
        premium: sql<number>`sum(case when ${users.isPremium} = true then 1 else 0 end)`
      })
      .from(users)
      .where(eq(users.isAdmin, false));

    return {
      totalUsers: result.total || 0,
      activeUsers: result.active || 0,
      premiumUsers: result.premium || 0
    };
  }

  async incrementTrialCharacterCount(userId: number): Promise<void> {
    await db
      .update(users)
      .set({
        trialCharactersCreated: sql`${users.trialCharactersCreated} + 1`
      })
      .where(eq(users.id, userId));
  }

  async updateLastLogin(userId: number): Promise<void> {
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, userId));
  }

  async createCustomCharacter(insertCharacter: InsertCustomCharacter): Promise<CustomCharacter> {
    const [character] = await db
      .insert(customCharacters)
      .values({
        ...insertCharacter,
        createdAt: new Date()
      })
      .returning();

    return character;
  }

  async getCustomCharactersByUser(userId: number): Promise<CustomCharacter[]> {
    return await db
      .select()
      .from(customCharacters)
      .where(eq(customCharacters.userId, userId));
  }

  async getCustomCharacterById(id: number): Promise<CustomCharacter | undefined> {
    const [character] = await db
      .select()
      .from(customCharacters)
      .where(eq(customCharacters.id, id));
    return character;
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
      .set(data)
      .where(eq(users.id, userId));
  }

  async updateUserStatus(userId: number, status: { isBlocked?: boolean; isRestricted?: boolean; }): Promise<void> {
    await db
      .update(users)
      .set(status)
      .where(eq(users.id, userId));
  }

  async deleteUser(userId: number): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(users).where(eq(users.id, userId));
      await tx.delete(messages).where(eq(messages.userId, userId));
      await tx.delete(customCharacters).where(eq(customCharacters.userId, userId));
    });
  }

  async verifyEmail(userId: number, token: string): Promise<boolean> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) return false;

    const now = new Date();
    if (user.verificationToken === token &&
      user.verificationTokenExpiry &&
      user.verificationTokenExpiry > now) {
      await db
        .update(users)
        .set({
          isEmailVerified: true,
          verificationToken: null,
          verificationTokenExpiry: null
        })
        .where(eq(users.id, userId));
      return true;
    }
    return false;
  }

  async updateVerificationToken(userId: number, token: string, expiry: Date): Promise<void> {
    await db
      .update(users)
      .set({
        verificationToken: token,
        verificationTokenExpiry: expiry
      })
      .where(eq(users.id, userId));
  }
}

export const storage = new DatabaseStorage();