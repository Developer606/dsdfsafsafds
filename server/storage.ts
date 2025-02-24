import { db } from "./db";
import session from "express-session";
import MemoryStore from "memorystore";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { eq } from "drizzle-orm";
import type { Message, InsertMessage, User, InsertUser, CustomCharacter, InsertCustomCharacter, SubscriptionStatus } from "@shared/schema";

// Create a memory store with a 24-hour TTL
const MemoryStoreSession = MemoryStore(session);

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

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

    // Create default admin user
    this.initializeAdmin();
  }

  private async initializeAdmin() {
    const existingAdmin = await this.getUserByUsername("SysRoot_99");
    if (!existingAdmin) {
      const hashedPassword = await hashPassword("admin123");
      await this.createUser({
        email: "admin@system.local",
        username: "SysRoot_99",
        password: hashedPassword,
        role: "admin",
        isAdmin: true,
        subscriptionTier: "none",
        subscriptionStatus: "none",
        subscriptionExpiresAt: null,
        isEmailVerified: true,
        verificationToken: null,
        verificationTokenExpiry: null
      });
    }
  }

  async getMessagesByCharacter(characterId: string): Promise<Message[]> {
    const messages = await db.query.messages.findMany({
      where: characterId === "all" ? undefined : eq(db.messages.characterId, characterId),
      orderBy: (messages, { desc }) => [desc(messages.timestamp)]
    });
    return messages;
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db
      .insert(db.messages)
      .values({
        ...message,
        script: message.script || null,
        language: message.language || null,
        timestamp: new Date()
      })
      .returning();
    return newMessage;
  }

  async clearChat(characterId: string): Promise<void> {
    await db.delete(db.messages).where(eq(db.messages.characterId, characterId));
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [newUser] = await db
      .insert(db.users)
      .values({
        ...insertUser,
        createdAt: new Date(),
        isPremium: false,
        trialCharactersCreated: 0,
        lastLoginAt: null,
        isBlocked: false,
        isRestricted: false,
        isEmailVerified: false,
        verificationToken: null,
        verificationTokenExpiry: null,
        subscriptionTier: "none",
        subscriptionStatus: "none",
        subscriptionExpiresAt: null
      })
      .returning();
    return newUser;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(db.users)
      .where(eq(db.users.email, email));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(db.users)
      .where(eq(db.users.username, username));
    return user;
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(db.users)
      .where(eq(db.users.id, id));
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    const users = await db
      .select()
      .from(db.users)
      .where(eq(db.users.isAdmin, false));
    return users;
  }

  async getUserStats(): Promise<{ totalUsers: number; activeUsers: number; premiumUsers: number; }> {
    const users = await this.getAllUsers();
    const now = Date.now();
    const activeThreshold = now - (24 * 60 * 60 * 1000); // Active in last 24 hours

    return {
      totalUsers: users.length,
      activeUsers: users.filter(u => u.lastLoginAt && u.lastLoginAt.getTime() > activeThreshold).length,
      premiumUsers: users.filter(u => u.isPremium).length,
    };
  }

  async incrementTrialCharacterCount(userId: number): Promise<void> {
    await db
      .update(db.users)
      .set({ trialCharactersCreated: (u) => u.trialCharactersCreated + 1 })
      .where(eq(db.users.id, userId));
  }

  async updateLastLogin(userId: number): Promise<void> {
    await db
      .update(db.users)
      .set({ lastLoginAt: new Date() })
      .where(eq(db.users.id, userId));
  }

  async createCustomCharacter(insertCharacter: InsertCustomCharacter): Promise<CustomCharacter> {
    const [newCharacter] = await db
      .insert(db.customCharacters)
      .values({
        ...insertCharacter,
        createdAt: new Date()
      })
      .returning();
    return newCharacter;
  }

  async getCustomCharactersByUser(userId: number): Promise<CustomCharacter[]> {
    const characters = await db
      .select()
      .from(db.customCharacters)
      .where(eq(db.customCharacters.userId, userId));
    return characters;
  }

  async getCustomCharacterById(id: number): Promise<CustomCharacter | undefined> {
    const [character] = await db
      .select()
      .from(db.customCharacters)
      .where(eq(db.customCharacters.id, id));
    return character;
  }

  async deleteCustomCharacter(id: number, userId: number): Promise<void> {
    await db
      .delete(db.customCharacters)
      .where(eq(db.customCharacters.id, id))
      .where(eq(db.customCharacters.userId, userId));
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
      .update(db.users)
      .set(data)
      .where(eq(db.users.id, userId));
  }

  async updateUserStatus(userId: number, status: { isBlocked?: boolean; isRestricted?: boolean; }): Promise<void> {
    if (status.isBlocked !== undefined || status.isRestricted !== undefined) {
      await db
        .update(db.users)
        .set(status)
        .where(eq(db.users.id, userId));
    }
  }

  async deleteUser(userId: number): Promise<void> {
    // Delete all related data
    await db.delete(db.messages).where(eq(db.messages.userId, userId));
    await db.delete(db.customCharacters).where(eq(db.customCharacters.userId, userId));
    await db.delete(db.users).where(eq(db.users.id, userId));
  }

  async verifyEmail(userId: number, token: string): Promise<boolean> {
    const [user] = await db
      .select()
      .from(db.users)
      .where(eq(db.users.id, userId))
      .where(eq(db.users.verificationToken, token));

    if (!user || !user.verificationTokenExpiry) return false;

    const now = new Date();
    if (new Date(user.verificationTokenExpiry) > now) {
      await db
        .update(db.users)
        .set({
          isEmailVerified: true,
          verificationToken: null,
          verificationTokenExpiry: null
        })
        .where(eq(db.users.id, userId));
      return true;
    }
    return false;
  }

  async updateVerificationToken(userId: number, token: string, expiry: Date): Promise<void> {
    await db
      .update(db.users)
      .set({
        verificationToken: token,
        verificationTokenExpiry: expiry
      })
      .where(eq(db.users.id, userId));
  }
}

export const storage = new DatabaseStorage();