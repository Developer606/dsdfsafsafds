import { type Message, type InsertMessage, type User, type InsertUser, type CustomCharacter, type InsertCustomCharacter, type SubscriptionStatus } from "@shared/schema";
import { messages, users, customCharacters } from "@shared/schema";
import { eq } from "drizzle-orm";
import { db } from "./db";
import session from "express-session";
import MemoryStore from "memorystore";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

// Create a memory store with a 24-hour TTL for sessions only
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
  updateUser(userId: number, data: Partial<Omit<User, "id">>): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new MemoryStoreSession({
      checkPeriod: 86400000, // 24 hours
      max: 10000 // Store up to 10000 sessions in memory
    });
    // Initialize admin user when storage is created
    this.initializeAdmin();
  }

  async getMessagesByCharacter(characterId: string): Promise<Message[]> {
    return await db.select().from(messages).where(eq(messages.characterId, characterId));
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values({
      ...message,
      timestamp: new Date()
    }).returning();
    return newMessage;
  }

  async clearChat(characterId: string): Promise<void> {
    await db.delete(messages).where(eq(messages.characterId, characterId));
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values({
      ...insertUser,
      createdAt: new Date(),
      isPremium: false,
      trialCharactersCreated: 0,
      isBlocked: false,
      isRestricted: false,
      isEmailVerified: false,
      verificationToken: null,
      verificationTokenExpiry: null,
      lastLoginAt: null
    }).returning();
    return newUser;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.isAdmin, false));
  }

  async getUserStats(): Promise<{ totalUsers: number; activeUsers: number; premiumUsers: number; }> {
    const allUsers = await this.getAllUsers();
    const now = Date.now();
    const activeThreshold = now - (24 * 60 * 60 * 1000); // Active in last 24 hours

    return {
      totalUsers: allUsers.length,
      activeUsers: allUsers.filter(u => u.lastLoginAt && u.lastLoginAt.getTime() > activeThreshold).length,
      premiumUsers: allUsers.filter(u => u.isPremium).length,
    };
  }

  async incrementTrialCharacterCount(userId: number): Promise<void> {
    await db
      .update(users)
      .set({ trialCharactersCreated: users.trialCharactersCreated + 1 })
      .where(eq(users.id, userId));
  }

  async updateLastLogin(userId: number): Promise<void> {
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, userId));
  }

  async createCustomCharacter(insertCharacter: InsertCustomCharacter): Promise<CustomCharacter> {
    const [newCharacter] = await db.insert(customCharacters).values({
      ...insertCharacter,
      createdAt: new Date()
    }).returning();
    return newCharacter;
  }

  async getCustomCharactersByUser(userId: number): Promise<CustomCharacter[]> {
    return await db.select().from(customCharacters).where(eq(customCharacters.userId, userId));
  }

  async getCustomCharacterById(id: number): Promise<CustomCharacter | undefined> {
    const [character] = await db.select().from(customCharacters).where(eq(customCharacters.id, id));
    return character;
  }

  async deleteCustomCharacter(id: number, userId: number): Promise<void> {
    await db.delete(customCharacters)
      .where(eq(customCharacters.id, id))
      .where(eq(customCharacters.userId, userId));
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
    await db.update(users)
      .set(data)
      .where(eq(users.id, userId));
  }

  async updateUserStatus(userId: number, status: { isBlocked?: boolean; isRestricted?: boolean; }): Promise<void> {
    await db.update(users)
      .set(status)
      .where(eq(users.id, userId));
  }

  async deleteUser(userId: number): Promise<void> {
    await db.delete(users).where(eq(users.id, userId));
  }

  async verifyEmail(userId: number, token: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) return false;

    const now = new Date();
    if (user.verificationToken === token &&
      user.verificationTokenExpiry &&
      new Date(user.verificationTokenExpiry) > now) {
      await db.update(users)
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
    await db.update(users)
      .set({
        verificationToken: token,
        verificationTokenExpiry: expiry
      })
      .where(eq(users.id, userId));
  }
  async updateUser(userId: number, data: Partial<Omit<User, "id">>): Promise<void> {
    await db.update(users)
      .set(data)
      .where(eq(users.id, userId));
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
          lastLoginAt: null
        });
        console.log("Admin user created successfully");
      }
    } catch (error) {
      console.error("Error creating admin user:", error);
    }
  }
}

export const storage = new DatabaseStorage();