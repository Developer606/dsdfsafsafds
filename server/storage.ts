import { type Message, type InsertMessage, type User, type InsertUser, type CustomCharacter, type InsertCustomCharacter } from "@shared/schema";
import { db } from "./db";
import { messages, users, customCharacters } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Message operations
  getMessagesByCharacter(characterId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  clearChat(characterId: string): Promise<void>;

  // User operations
  createUser(user: InsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  incrementTrialCharacterCount(userId: number): Promise<void>;

  // Custom character operations
  createCustomCharacter(character: InsertCustomCharacter): Promise<CustomCharacter>;
  getCustomCharactersByUser(userId: number): Promise<CustomCharacter[]>;
  deleteCustomCharacter(id: number, userId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Message operations
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

  // User operations
  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async incrementTrialCharacterCount(userId: number): Promise<void> {
    await db
      .update(users)
      .set({ trialCharactersCreated: users.trialCharactersCreated + 1 })
      .where(eq(users.id, userId));
  }

  // Custom character operations
  async createCustomCharacter(insertCharacter: InsertCustomCharacter): Promise<CustomCharacter> {
    const [character] = await db.insert(customCharacters).values(insertCharacter).returning();
    return character;
  }

  async getCustomCharactersByUser(userId: number): Promise<CustomCharacter[]> {
    return await db.select().from(customCharacters).where(eq(customCharacters.userId, userId));
  }

  async deleteCustomCharacter(id: number, userId: number): Promise<void> {
    await db
      .delete(customCharacters)
      .where(eq(customCharacters.id, id))
      .where(eq(customCharacters.userId, userId));
  }
}

export const storage = new DatabaseStorage();