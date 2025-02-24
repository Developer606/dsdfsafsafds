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
  updateLastLogin(userId: number): Promise<void>;
  getAllUsers(): Promise<User[]>;
  getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    premiumUsers: number;
  }>;

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
    this.createUser({
      email: "admin@system.local",
      username: "admin",
      password: "admin123", // In real app, this should be hashed
      role: "admin",
      isAdmin: true,
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
}

export const storage = new DatabaseStorage();