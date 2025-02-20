import { type Message, type InsertMessage, type User, type InsertUser, type Character, type InsertCharacter } from "@shared/schema";

export interface IStorage {
  // Message operations
  getMessagesByCharacter(characterId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  clearChat(characterId: string): Promise<void>;

  // User operations
  createUser(user: InsertUser): Promise<User>;
  getUserById(id: number): Promise<User | null>;
  updateUserSubscription(userId: number, tier: string, endDate: Date): Promise<User>;

  // Character operations
  createCharacter(character: InsertCharacter): Promise<Character>;
  getCharactersByUserId(userId: number): Promise<Character[]>;
  deleteCharacter(id: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private messages: Message[];
  private users: User[];
  private characters: Character[];
  private currentMessageId: number;
  private currentUserId: number;
  private currentCharacterId: number;

  constructor() {
    this.messages = [];
    this.users = [];
    this.characters = [];
    this.currentMessageId = 1;
    this.currentUserId = 1;
    this.currentCharacterId = 1;
  }

  // Message operations
  async getMessagesByCharacter(characterId: string): Promise<Message[]> {
    return this.messages.filter(msg => msg.characterId === characterId);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const message: Message = {
      id: this.currentMessageId++,
      ...insertMessage,
      timestamp: new Date()
    };
    this.messages.push(message);
    return message;
  }

  async clearChat(characterId: string): Promise<void> {
    this.messages = this.messages.filter(msg => msg.characterId !== characterId);
  }

  // User operations
  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      id: this.currentUserId++,
      ...insertUser,
      createdAt: new Date(),
      subscriptionTier: "free",
      subscriptionEndDate: null
    };
    this.users.push(user);
    return user;
  }

  async getUserById(id: number): Promise<User | null> {
    return this.users.find(user => user.id === id) || null;
  }

  async updateUserSubscription(userId: number, tier: string, endDate: Date): Promise<User> {
    const user = await this.getUserById(userId);
    if (!user) throw new Error("User not found");

    user.subscriptionTier = tier;
    user.subscriptionEndDate = endDate;
    return user;
  }

  // Character operations
  async createCharacter(insertCharacter: InsertCharacter): Promise<Character> {
    const character: Character = {
      id: this.currentCharacterId++,
      ...insertCharacter,
      createdAt: new Date()
    };
    this.characters.push(character);
    return character;
  }

  async getCharactersByUserId(userId: number): Promise<Character[]> {
    return this.characters.filter(char => char.userId === userId);
  }

  async deleteCharacter(id: number): Promise<void> {
    this.characters = this.characters.filter(char => char.id !== id);
    // Also remove associated messages
    this.messages = this.messages.filter(msg => msg.characterId !== id.toString());
  }
}

export const storage = new MemStorage();