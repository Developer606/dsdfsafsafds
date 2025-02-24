import { type Message, type InsertMessage, type User, type InsertUser, type CustomCharacter, type InsertCustomCharacter, type SubscriptionStatus } from "@shared/schema";
import session from "express-session";
import MemoryStore from "memorystore";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { db } from "./db";

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
    const messages = await db.prepare(
      'SELECT * FROM messages WHERE character_id = ? ORDER BY timestamp ASC'
    ).all(characterId);
    return messages.map(msg => ({
      id: msg.id,
      userId: msg.user_id,
      characterId: msg.character_id,
      content: msg.content,
      isUser: Boolean(msg.is_user),
      language: msg.language || null,
      script: msg.script || null,
      timestamp: new Date(msg.timestamp)
    }));
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const result = await db.prepare(`
      INSERT INTO messages (user_id, character_id, content, is_user, language, script, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      RETURNING *
    `).get(
      message.userId,
      message.characterId,
      message.content,
      message.isUser ? 1 : 0,
      message.language || null,
      message.script || null
    );

    return {
      id: result.id,
      userId: result.user_id,
      characterId: result.character_id,
      content: result.content,
      isUser: Boolean(result.is_user),
      language: result.language || null,
      script: result.script || null,
      timestamp: new Date(result.timestamp)
    };
  }

  async clearChat(characterId: string): Promise<void> {
    await db.prepare('DELETE FROM messages WHERE character_id = ?').run(characterId);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.prepare(`
      INSERT INTO users (
        email, username, password, role, is_admin, is_premium,
        subscription_tier, subscription_status, subscription_expires_at,
        trial_characters_created, is_blocked, is_restricted,
        is_email_verified, verification_token, verification_token_expiry,
        created_at, last_login_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, NULL)
      RETURNING *
    `).get(
      insertUser.email,
      insertUser.username,
      insertUser.password,
      insertUser.role || 'user',
      insertUser.isAdmin ? 1 : 0,
      0, // isPremium
      null, // subscriptionTier
      'trial', // subscriptionStatus
      null, // subscriptionExpiresAt
      0, // trialCharactersCreated
      0, // isBlocked
      0, // isRestricted
      0, // isEmailVerified
      null, // verificationToken
      null // verificationTokenExpiry
    );

    return this.mapUserFromDb(result);
  }

  private mapUserFromDb(dbUser: any): User {
    return {
      id: dbUser.id,
      email: dbUser.email,
      username: dbUser.username,
      password: dbUser.password,
      role: dbUser.role,
      isAdmin: Boolean(dbUser.is_admin),
      isPremium: Boolean(dbUser.is_premium),
      subscriptionTier: dbUser.subscription_tier,
      subscriptionStatus: dbUser.subscription_status,
      subscriptionExpiresAt: dbUser.subscription_expires_at ? new Date(dbUser.subscription_expires_at) : null,
      trialCharactersCreated: dbUser.trial_characters_created,
      lastLoginAt: dbUser.last_login_at ? new Date(dbUser.last_login_at) : null,
      isBlocked: Boolean(dbUser.is_blocked),
      isRestricted: Boolean(dbUser.is_restricted),
      isEmailVerified: Boolean(dbUser.is_email_verified),
      verificationToken: dbUser.verification_token,
      verificationTokenExpiry: dbUser.verification_token_expiry ? new Date(dbUser.verification_token_expiry) : null,
      createdAt: new Date(dbUser.created_at)
    };
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const user = await db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    return user ? this.mapUserFromDb(user) : undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const user = await db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    return user ? this.mapUserFromDb(user) : undefined;
  }

  async getUser(id: number): Promise<User | undefined> {
    const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    return user ? this.mapUserFromDb(user) : undefined;
  }

  async getAllUsers(): Promise<User[]> {
    const users = await db.prepare('SELECT * FROM users WHERE is_admin = 0').all();
    return users.map(user => this.mapUserFromDb(user));
  }

  async getUserStats(): Promise<{ totalUsers: number; activeUsers: number; premiumUsers: number; }> {
    const stats = await db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN last_login_at > datetime('now', '-1 day') THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN is_premium = 1 THEN 1 ELSE 0 END) as premium
      FROM users 
      WHERE is_admin = 0
    `).get();

    return {
      totalUsers: stats.total,
      activeUsers: stats.active,
      premiumUsers: stats.premium
    };
  }

  async incrementTrialCharacterCount(userId: number): Promise<void> {
    await db.prepare(`
      UPDATE users 
      SET trial_characters_created = trial_characters_created + 1 
      WHERE id = ?
    `).run(userId);
  }

  async updateLastLogin(userId: number): Promise<void> {
    await db.prepare(`
      UPDATE users 
      SET last_login_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(userId);
  }

  async createCustomCharacter(insertCharacter: InsertCustomCharacter): Promise<CustomCharacter> {
    const result = await db.prepare(`
        INSERT INTO custom_characters (user_id, name, description, created_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        RETURNING *
      `).get(insertCharacter.userId, insertCharacter.name, insertCharacter.description);
    return {
      id: result.id,
      userId: result.user_id,
      name: result.name,
      description: result.description,
      createdAt: new Date(result.created_at)
    };
  }

  async getCustomCharactersByUser(userId: number): Promise<CustomCharacter[]> {
    const characters = await db.prepare('SELECT * FROM custom_characters WHERE user_id = ?').all(userId);
    return characters.map(char => ({
      id: char.id,
      userId: char.user_id,
      name: char.name,
      description: char.description,
      createdAt: new Date(char.created_at)
    }));
  }

  async getCustomCharacterById(id: number): Promise<CustomCharacter | undefined> {
    const character = await db.prepare('SELECT * FROM custom_characters WHERE id = ?').get(id);
    return character ? {
      id: character.id,
      userId: character.user_id,
      name: character.name,
      description: character.description,
      createdAt: new Date(character.created_at)
    } : undefined;
  }

  async deleteCustomCharacter(id: number, userId: number): Promise<void> {
    await db.prepare('DELETE FROM custom_characters WHERE id = ? AND user_id = ?').run(id, userId);
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
    await db.prepare(`
      UPDATE users
      SET is_premium = ?, subscription_tier = ?, subscription_status = ?, subscription_expires_at = ?
      WHERE id = ?
    `).run(data.isPremium ? 1 : 0, data.subscriptionTier, data.subscriptionStatus, data.subscriptionExpiresAt, userId);
  }

  async updateUserStatus(userId: number, status: { isBlocked?: boolean; isRestricted?: boolean; }): Promise<void> {
    await db.prepare(`
      UPDATE users
      SET is_blocked = COALESCE(?, is_blocked), is_restricted = COALESCE(?, is_restricted)
      WHERE id = ?
    `).run(status.isBlocked ? 1 : 0, status.isRestricted ? 1 : 0, userId);
  }

  async deleteUser(userId: number): Promise<void> {
    await db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    await db.prepare('DELETE FROM messages WHERE user_id = ?').run(userId);
    await db.prepare('DELETE FROM custom_characters WHERE user_id = ?').run(userId);
  }
  async verifyEmail(userId: number, token: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) return false;
    const now = new Date();
    if (user.verificationToken === token &&
      user.verificationTokenExpiry &&
      new Date(user.verificationTokenExpiry) > now) {
      await db.prepare(`
        UPDATE users
        SET is_email_verified = 1, verification_token = NULL, verification_token_expiry = NULL
        WHERE id = ?
      `).run(userId);
      return true;
    }
    return false;
  }

  async updateVerificationToken(userId: number, token: string, expiry: Date): Promise<void> {
    await db.prepare(`
      UPDATE users
      SET verification_token = ?, verification_token_expiry = ?
      WHERE id = ?
    `).run(token, expiry, userId);
  }
}

export const storage = new DatabaseStorage();