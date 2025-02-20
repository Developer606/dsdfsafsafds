import { type Message, type InsertMessage } from "@shared/schema";

export interface IStorage {
  getMessagesByCharacter(characterId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  clearChat(characterId: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private messages: Message[];
  private currentId: number;

  constructor() {
    this.messages = [];
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
}

export const storage = new MemStorage();
