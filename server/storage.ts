import { type Message, type InsertMessage, type User, type CustomCharacter, type InsertCustomCharacter } from "@shared/schema";

interface UpdateSubscriptionData {
  subscriptionType: string;
  subscriptionEndDate: Date;
}

export interface IStorage {
  getMessagesByCharacter(characterId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  clearChat(characterId: string): Promise<void>;
  getUser(id: number): Promise<User | undefined>;
  updateUserSubscription(userId: number, data: UpdateSubscriptionData): Promise<void>;
  getCustomCharacters(userId: number): Promise<CustomCharacter[]>;
  createCustomCharacter(character: InsertCustomCharacter): Promise<CustomCharacter>;
  getCharacterLimit(userId: number): Promise<number>;
}

export class MemStorage implements IStorage {
  private messages: Message[];
  private users: User[];
  private customCharacters: CustomCharacter[];
  private currentId: number;

  constructor() {
    this.messages = [];
    this.users = [];
    this.customCharacters = [];
    this.currentId = 1;
  }

  async getMessagesByCharacter(characterId: string): Promise<Message[]> {
    return this.messages.filter(msg => msg.characterId === characterId);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const message: Message = {
      id: this.currentId++,
      ...insertMessage,
      timestamp: new Date()
    };
    this.messages.push(message);
    return message;
  }

  async clearChat(characterId: string): Promise<void> {
    this.messages = this.messages.filter(msg => msg.characterId !== characterId);
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.find(user => user.id === id);
  }

  async updateUserSubscription(userId: number, data: UpdateSubscriptionData): Promise<void> {
    const userIndex = this.users.findIndex(user => user.id === userId);
    if (userIndex !== -1) {
      this.users[userIndex] = {
        ...this.users[userIndex],
        subscriptionType: data.subscriptionType,
        subscriptionEndDate: data.subscriptionEndDate
      };
    }
  }

  async getCustomCharacters(userId: number): Promise<CustomCharacter[]> {
    return this.customCharacters.filter(char => char.userId === userId);
  }

  async createCustomCharacter(character: InsertCustomCharacter): Promise<CustomCharacter> {
    const newCharacter: CustomCharacter = {
      id: this.currentId++,
      ...character,
      createdAt: new Date()
    };
    this.customCharacters.push(newCharacter);
    return newCharacter;
  }

  async getCharacterLimit(userId: number): Promise<number> {
    const user = await this.getUser(userId);
    if (!user) return 0;

    switch (user.subscriptionType) {
      case 'premium':
        return 10;
      case 'ultimate':
        return Infinity;
      default:
        return 2; // Free tier
    }
  }
}

export const storage = new MemStorage();