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

  // Get user details
  app.get("/api/user", async (_req, res) => {
    // For demo, create a default user if not exists
    let user = await storage.getUserByEmail("demo@example.com");
    if (!user) {
      user = await storage.createUser({ email: "demo@example.com" });
    }
    res.json(user);
  });

  // Get custom characters
  app.get("/api/custom-characters", async (_req, res) => {
    // For demo, get characters for demo user
    let user = await storage.getUserByEmail("demo@example.com");
    if (!user) {
      user = await storage.createUser({ email: "demo@example.com" });
    }
    const customChars = await storage.getCustomCharactersByUser(user.id);
    res.json(customChars);
  });

  // Create custom character
  app.post("/api/custom-characters", async (req, res) => {
    try {
      const user = await storage.getUserByEmail("demo@example.com");
      if (!user) {
        throw new Error("User not found");
      }

      const data = insertCustomCharacterSchema.parse({
        ...req.body,
        userId: user.id
      });

      const character = await storage.createCustomCharacter(data);
      await storage.incrementTrialCharacterCount(user.id);

      res.json(character);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Delete custom character
  app.delete("/api/custom-characters/:id", async (req, res) => {
    try {
      const user = await storage.getUserByEmail("demo@example.com");
      if (!user) {
        throw new Error("User not found");
      }

      await storage.deleteCustomCharacter(Number(req.params.id), user.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
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

  app.delete("/api/messages/:characterId", async (req, res) => {
    await storage.clearChat(req.params.characterId);
    res.json({ success: true });
  });

  return httpServer;
}