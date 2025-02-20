import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { characters } from "@shared/characters";
import { generateCharacterResponse } from "./openai";
import { insertMessageSchema, insertCustomCharacterSchema } from "@shared/schema";

export async function registerRoutes(app: Express) {
  const httpServer = createServer(app);

  app.get("/api/characters", (_req, res) => {
    res.json(characters);
  });

  app.get("/api/messages/:characterId", async (req, res) => {
    const messages = await storage.getMessagesByCharacter(req.params.characterId);
    res.json(messages);
  });

  app.post("/api/messages", async (req, res) => {
    try {
      const data = insertMessageSchema.parse(req.body);
      const message = await storage.createMessage(data);

      if (data.isUser) {
        const character = characters.find(c => c.id === data.characterId);
        if (!character) throw new Error("Character not found");

        const messages = await storage.getMessagesByCharacter(data.characterId);
        const chatHistory = messages.map(m => 
          `${m.isUser ? "User" : character.name}: ${m.content}`
        ).join("\n");

        const aiResponse = await generateCharacterResponse(
          character,
          data.content,
          chatHistory
        );

        const aiMessage = await storage.createMessage({
          characterId: data.characterId,
          content: aiResponse,
          isUser: false
        });

        res.json([message, aiMessage]);
      } else {
        res.json([message]);
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/custom-characters", async (req, res) => {
    try {
      // For now, using a mock user ID until auth is implemented
      const userId = 1;
      const characters = await storage.getCustomCharactersByUser(userId);
      res.json(characters);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/custom-characters", async (req, res) => {
    try {
      // For now, using a mock user ID until auth is implemented
      const userId = 1;
      const data = {
        ...insertCustomCharacterSchema.parse(req.body),
        userId,
      };
      const character = await storage.createCustomCharacter(data);
      res.json(character);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/custom-characters/:id", async (req, res) => {
    try {
      // For now, using a mock user ID until auth is implemented
      const userId = 1;
      await storage.deleteCustomCharacter(parseInt(req.params.id), userId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/messages/:characterId", async (req, res) => {
    await storage.clearChat(req.params.characterId);
    res.json({ success: true });
  });

  return httpServer;
}