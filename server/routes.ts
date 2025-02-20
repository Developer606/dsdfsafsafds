import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { characters as defaultCharacters } from "@shared/characters";
import { generateCharacterResponse } from "./openai";
import { insertMessageSchema, insertCharacterSchema, insertUserSchema } from "@shared/schema";

const MAX_FREE_CHARACTERS = 2;

export async function registerRoutes(app: Express) {
  const httpServer = createServer(app);

  // User routes
  app.post("/api/users", async (req, res) => {
    try {
      const data = insertUserSchema.parse(req.body);
      const user = await storage.createUser(data);
      res.json(user);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.post("/api/subscribe", async (req, res) => {
    try {
      const { userId, planId } = req.body;
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1); // 1 month subscription

      const tier = planId === "premium" ? "premium" : "basic";
      const user = await storage.updateUserSubscription(userId, tier, endDate);
      res.json(user);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  // Character routes
  app.get("/api/characters/:userId", async (req, res) => {
    try {
      const characters = await storage.getCharactersByUserId(parseInt(req.params.userId));
      res.json(characters);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.post("/api/characters", async (req, res) => {
    try {
      const data = insertCharacterSchema.parse(req.body);
      const user = await storage.getUserById(data.userId);
      if (!user) throw new Error("User not found");

      const userCharacters = await storage.getCharactersByUserId(data.userId);

      if (user.subscriptionTier === "free" && userCharacters.length >= MAX_FREE_CHARACTERS) {
        return res.status(403).json({ 
          error: "Free tier limit reached. Please upgrade to create more characters." 
        });
      }

      if (user.subscriptionTier === "basic" && userCharacters.length >= 5) {
        return res.status(403).json({ 
          error: "Basic tier limit reached. Please upgrade to premium for unlimited characters." 
        });
      }

      const character = await storage.createCharacter(data);
      res.json(character);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.delete("/api/characters/:id", async (req, res) => {
    try {
      await storage.deleteCharacter(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  // Message routes
  app.get("/api/messages/:characterId", async (req, res) => {
    const messages = await storage.getMessagesByCharacter(req.params.characterId);
    res.json(messages);
  });

  app.post("/api/messages", async (req, res) => {
    try {
      const data = insertMessageSchema.parse(req.body);
      const message = await storage.createMessage(data);

      if (data.isUser) {
        const character = defaultCharacters.find(c => c.id === data.characterId);
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
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.delete("/api/messages/:characterId", async (req, res) => {
    await storage.clearChat(req.params.characterId);
    res.json({ success: true });
  });

  return httpServer;
}