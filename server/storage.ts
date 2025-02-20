import { type Message, type InsertMessage, type User, type InsertUser, type CustomCharacter, type InsertCustomCharacter } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { messages, users, customCharacters } from "@shared/schema";

export interface IStorage {
  // Message methods
  getMessagesByCharacter(characterId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  clearChat(characterId: string): Promise<void>;

  // User methods
  createUser(user: InsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  updateUserSubscription(userId: number, status: string, endDate: Date): Promise<User>;

  // Custom character methods
  getCustomCharactersByUser(userId: number): Promise<CustomCharacter[]>;
  createCustomCharacter(character: InsertCustomCharacter): Promise<CustomCharacter>;
  deleteCustomCharacter(id: number, userId: number): Promise<void>;
  getCustomCharacterCount(userId: number): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  // Message methods
  async getMessagesByCharacter(characterId: string): Promise<Message[]> {
    return await db.select().from(messages).where(eq(messages.characterId, characterId));
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(insertMessage).returning();
    return message;
  }

  async clearChat(characterId: string): Promise<void> {
    await db.delete(messages).where(eq(messages.characterId, characterId));
  }

  // User methods
  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async updateUserSubscription(userId: number, status: string, endDate: Date): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ subscriptionStatus: status, subscriptionEndDate: endDate })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Custom character methods
  async getCustomCharactersByUser(userId: number): Promise<CustomCharacter[]> {
    return await db.select().from(customCharacters).where(eq(customCharacters.userId, userId));
  }

  async createCustomCharacter(insertCharacter: InsertCustomCharacter): Promise<CustomCharacter> {
    const count = await this.getCustomCharacterCount(insertCharacter.userId);
    const user = await db.select().from(users).where(eq(users.id, insertCharacter.userId)).limit(1);

    if (!user[0]) throw new Error("User not found");

    const isFree = user[0].subscriptionStatus === "free";
    if (isFree && count >= 2) {
      throw new Error("Free users can only create 2 custom characters. Please upgrade to premium.");
    }

    const [character] = await db.insert(customCharacters).values(insertCharacter).returning();
    return character;
  }

  async deleteCustomCharacter(id: number, userId: number): Promise<void> {
    await db
      .delete(customCharacters)
      .where(eq(customCharacters.id, id))
      .where(eq(customCharacters.userId, userId));
  }

  async getCustomCharacterCount(userId: number): Promise<number> {
    const characters = await db
      .select()
      .from(customCharacters)
      .where(eq(customCharacters.userId, userId));
    return characters.length;
  }
}

export const storage = new DatabaseStorage();