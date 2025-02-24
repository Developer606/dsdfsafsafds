import { type Message, type InsertMessage, type User, type InsertUser, type CustomCharacter, type InsertCustomCharacter, type SubscriptionStatus } from "@shared/schema";
import session from "express-session";
import MemoryStore from "memorystore";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

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
  // New user management methods
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
  private users: User[] = [];
  private messages: Message[] = [];
  private customCharacters: CustomCharacter[] = [];
  private nextUserId = 1;
  private nextMessageId = 1;
  private nextCharacterId = 1;

  constructor() {
    this.sessionStore = new MemoryStoreSession({
      checkPeriod: 86400000, // 24 hours
      max: 10000 // Store up to 10000 sessions in memory
    });

    // Create default admin user
    this.initializeAdmin();
  }

  private async initializeAdmin() {
    const hashedPassword = await hashPassword("admin123");
    this.createUser({
      email: "admin@system.local",
      username: "SysRoot_99",
      password: hashedPassword,
      role: "admin",
      isAdmin: true,
      subscriptionTier: null,
      subscriptionStatus: null,
      subscriptionExpiresAt: null,
      isEmailVerified: true, //added
      verificationToken: null, //added
      verificationTokenExpiry: null //added

    });
  }

  async getMessagesByCharacter(characterId: string): Promise<Message[]> {
    return this.messages.filter(m => m.characterId === characterId);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const newMessage = {
      id: this.nextMessageId++,
      ...message,
      timestamp: new Date(),
    };
    this.messages.push(newMessage);
    return newMessage;
  }

  async clearChat(characterId: string): Promise<void> {
    this.messages = this.messages.filter(m => m.characterId !== characterId);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const newUser = {
      id: this.nextUserId++,
      ...insertUser,
      createdAt: new Date(),
      isPremium: false,
      trialCharactersCreated: 0,
      lastLoginAt: null,
      isBlocked: false,
      isRestricted: false,
      isEmailVerified: false, //added
      verificationToken: null, //added
      verificationTokenExpiry: null //added
    };
    this.users.push(newUser);
    return newUser;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.users.find(u => u.email === email);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.users.find(u => u.username === username);
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.find(u => u.id === id);
  }

  async getAllUsers(): Promise<User[]> {
    return this.users.filter(u => !u.isAdmin); // Exclude admin users from the list
  }

  async getUserStats(): Promise<{ totalUsers: number; activeUsers: number; premiumUsers: number; }> {
    const nonAdminUsers = this.users.filter(u => !u.isAdmin);
    const now = Date.now();
    const activeThreshold = now - (24 * 60 * 60 * 1000); // Active in last 24 hours

    return {
      totalUsers: nonAdminUsers.length,
      activeUsers: nonAdminUsers.filter(u => u.lastLoginAt && u.lastLoginAt.getTime() > activeThreshold).length,
      premiumUsers: nonAdminUsers.filter(u => u.isPremium).length,
    };
  }

  async incrementTrialCharacterCount(userId: number): Promise<void> {
    const user = await this.getUser(userId);
    if (user) {
      user.trialCharactersCreated++;
    }
  }

  async updateLastLogin(userId: number): Promise<void> {
    const user = await this.getUser(userId);
    if (user) {
      user.lastLoginAt = new Date();
    }
  }

  async createCustomCharacter(insertCharacter: InsertCustomCharacter): Promise<CustomCharacter> {
    const newCharacter = {
      id: this.nextCharacterId++,
      ...insertCharacter,
      createdAt: new Date(),
    };
    this.customCharacters.push(newCharacter);
    return newCharacter;
  }

  async getCustomCharactersByUser(userId: number): Promise<CustomCharacter[]> {
    return this.customCharacters.filter(c => c.userId === userId);
  }

  async getCustomCharacterById(id: number): Promise<CustomCharacter | undefined> {
    return this.customCharacters.find(c => c.id === id);
  }

  async deleteCustomCharacter(id: number, userId: number): Promise<void> {
    this.customCharacters = this.customCharacters.filter(
      c => !(c.id === id && c.userId === userId)
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
    const user = await this.getUser(userId);
    if (user) {
      Object.assign(user, data);
    }
  }

  async updateUserStatus(userId: number, status: { isBlocked?: boolean; isRestricted?: boolean; }): Promise<void> {
    const user = await this.getUser(userId);
    if (user) {
      if (status.isBlocked !== undefined) {
        user.isBlocked = status.isBlocked;
      }
      if (status.isRestricted !== undefined) {
        user.isRestricted = status.isRestricted;
      }
    }
  }

  async deleteUser(userId: number): Promise<void> {
    // Remove user from storage
    this.users = this.users.filter(u => u.id !== userId);

    // Remove associated messages
    this.messages = this.messages.filter(m => m.userId !== userId);

    // Remove associated custom characters
    this.customCharacters = this.customCharacters.filter(c => c.userId !== userId);
  }
  async verifyEmail(userId: number, token: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) return false;

    const now = new Date();
    if (user.verificationToken === token &&
      user.verificationTokenExpiry &&
      new Date(user.verificationTokenExpiry) > now) {
      user.isEmailVerified = true;
      user.verificationToken = null;
      user.verificationTokenExpiry = null;
      return true;
    }
    return false;
  }

  async updateVerificationToken(userId: number, token: string, expiry: Date): Promise<void> {
    const user = await this.getUser(userId);
    if (user) {
      user.verificationToken = token;
      user.verificationTokenExpiry = expiry;
    }
  }
}

export const storage = new DatabaseStorage();