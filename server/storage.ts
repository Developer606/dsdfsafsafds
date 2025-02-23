import { type Message, type InsertMessage, type User, type InsertUser, type CustomCharacter, type InsertCustomCharacter, type SubscriptionStatus, otpVerifications } from "@shared/schema";
import { db } from "./db";
import { messages, users, customCharacters } from "@shared/schema";
import { eq, and, sql, gt } from "drizzle-orm";
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
  verifyUser(userId: number): Promise<void>;

  // OTP operations
  createOTP(email: string, otp: string, expiresAt: Date): Promise<void>;
  verifyOTP(email: string, otp: string): Promise<boolean>;
  deleteExpiredOTPs(): Promise<void>;

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

  async getMessagesByCharacter(characterId: string): Promise<Message[]> {
    return await db.select().from(messages)
      .where(eq(messages.characterId, characterId))
      .orderBy(messages.timestamp);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(insertMessage).returning();
    return message;
  }

  async clearChat(characterId: string): Promise<void> {
    await db.delete(messages).where(eq(messages.characterId, characterId));
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users)
      .where(eq(users.email, email));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users)
      .where(eq(users.username, username));
    return user;
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users)
      .where(eq(users.id, id));
    return user;
  }

  async incrementTrialCharacterCount(userId: number): Promise<void> {
    await db
      .update(users)
      .set({
        trialCharactersCreated: sql`${users.trialCharactersCreated} + 1`
      })
      .where(eq(users.id, userId));
  }

  async verifyUser(userId: number): Promise<void> {
    await db
      .update(users)
      .set({ isVerified: true })
      .where(eq(users.id, userId));
  }

  async createOTP(email: string, otp: string, expiresAt: Date): Promise<void> {
    // Delete any existing OTPs for this email
    await db
      .delete(otpVerifications)
      .where(eq(otpVerifications.email, email));

    // Create new OTP
    await db
      .insert(otpVerifications)
      .values({
        email,
        otp,
        expiresAt: expiresAt.getTime(),
      });
  }

  async verifyOTP(email: string, otp: string): Promise<boolean> {
    const now = new Date().getTime();
    const [result] = await db
      .select()
      .from(otpVerifications)
      .where(
        and(
          eq(otpVerifications.email, email),
          eq(otpVerifications.otp, otp),
          gt(otpVerifications.expiresAt, now)
        )
      );

    if (result) {
      // Delete the used OTP
      await db
        .delete(otpVerifications)
        .where(eq(otpVerifications.id, result.id));
      return true;
    }

    return false;
  }

  async deleteExpiredOTPs(): Promise<void> {
    const now = new Date().getTime();
    await db
      .delete(otpVerifications)
      .where(sql`${otpVerifications.expiresAt} <= ${now}`);
  }

  async createCustomCharacter(insertCharacter: InsertCustomCharacter): Promise<CustomCharacter> {
    const [character] = await db.insert(customCharacters).values(insertCharacter).returning();
    return character;
  }

  async getCustomCharactersByUser(userId: number): Promise<CustomCharacter[]> {
    return await db.select().from(customCharacters).where(eq(customCharacters.userId, userId));
  }

  async getCustomCharacterById(id: number): Promise<CustomCharacter | undefined> {
    const [character] = await db.select().from(customCharacters)
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
      .set({
        isPremium: Boolean(data.isPremium), // Fix the type conversion
        subscriptionTier: data.subscriptionTier,
        subscriptionStatus: data.subscriptionStatus,
        subscriptionExpiresAt: sql`${data.subscriptionExpiresAt.getTime()}`
      })
      .where(eq(users.id, userId));
  }
}

export const storage = new DatabaseStorage();