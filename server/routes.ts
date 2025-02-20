import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { characters } from "@shared/characters";
import { generateCharacterResponse } from "./openai";
import { insertMessageSchema } from "@shared/schema";

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
          userId: data.userId,
          characterId: data.characterId,
          content: aiResponse,
          isUser: false
        });

        res.json([message, aiMessage]);
      } else {
        res.json([message]);
      }
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/subscribe", async (req, res) => {
    try {
      const { planId } = req.body;
      const user = await storage.getUser(req.user?.id);

      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Set subscription end date to 30 days from now
      const subscriptionEndDate = new Date();
      subscriptionEndDate.setDate(subscriptionEndDate.getDate() + 30);

      await storage.updateUserSubscription(user.id, {
        subscriptionType: planId,
        subscriptionEndDate
      });

      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/custom-characters", async (req, res) => {
    try {
      const user = await storage.getUser(req.user?.id);
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const characters = await storage.getCustomCharacters(user.id);
      res.json(characters);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/custom-characters", async (req, res) => {
    try {
      const user = await storage.getUser(req.user?.id);
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Check character limit based on subscription
      const characterLimit = await storage.getCharacterLimit(user.id);
      if (user.customCharacterCount >= characterLimit) {
        return res.status(403).json({ 
          error: "Character limit reached. Please upgrade your subscription to create more characters." 
        });
      }

      const character = await storage.createCustomCharacter({
        ...req.body,
        userId: user.id
      });

      res.json(character);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/messages/:characterId", async (req, res) => {
    await storage.clearChat(req.params.characterId);
    res.json({ success: true });
  });

  return httpServer;
}