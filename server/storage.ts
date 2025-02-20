import { 
  type Message, type InsertMessage,
  type User, type InsertUser,
  type Subscription, type InsertSubscription,
  type CustomCharacter, type InsertCustomCharacter,
  messages, users, subscriptions, customCharacters
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User management
  createUser(user: InsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  updateUserPremiumStatus(userId: number, isPremium: boolean): Promise<void>;

  // Subscription management
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  getActiveSubscription(userId: number): Promise<Subscription | undefined>;

  // Custom character management
  createCustomCharacter(character: InsertCustomCharacter): Promise<CustomCharacter>;
  getCustomCharactersByUser(userId: number): Promise<CustomCharacter[]>;
  deleteCustomCharacter(id: number, userId: number): Promise<void>;

  // Chat messages
  getMessagesByCharacter(characterId: string, userId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  clearChat(characterId: string, userId: number): Promise<void>;

  // Session store
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true
    });
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async updateUserPremiumStatus(userId: number, isPremium: boolean): Promise<void> {
    await db.update(users)
      .set({ isPremium })
      .where(eq(users.id, userId));
  }

  async createSubscription(insertSubscription: InsertSubscription): Promise<Subscription> {
    const [subscription] = await db.insert(subscriptions)
      .values(insertSubscription)
      .returning();
    return subscription;
  }

  async getActiveSubscription(userId: number): Promise<Subscription | undefined> {
    const [subscription] = await db.select()
      .from(subscriptions)
      .where(and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.active, true)
      ));
    return subscription;
  }

  async createCustomCharacter(insertCharacter: InsertCustomCharacter): Promise<CustomCharacter> {
    const [character] = await db.insert(customCharacters)
      .values(insertCharacter)
      .returning();
    return character;
  }

  async getCustomCharactersByUser(userId: number): Promise<CustomCharacter[]> {
    return db.select()
      .from(customCharacters)
      .where(eq(customCharacters.userId, userId));
  }

  async deleteCustomCharacter(id: number, userId: number): Promise<void> {
    await db.delete(customCharacters)
      .where(and(
        eq(customCharacters.id, id),
        eq(customCharacters.userId, userId)
      ));
  }

  async getMessagesByCharacter(characterId: string, userId: number): Promise<Message[]> {
    return db.select()
      .from(messages)
      .where(and(
        eq(messages.characterId, characterId),
        eq(messages.userId, userId)
      ));
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages)
      .values(insertMessage)
      .returning();
    return message;
  }

  async clearChat(characterId: string, userId: number): Promise<void> {
    await db.delete(messages)
      .where(and(
        eq(messages.characterId, characterId),
        eq(messages.userId, userId)
      ));
  }
}

export const storage = new DatabaseStorage();