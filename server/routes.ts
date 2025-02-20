import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { characters } from "@shared/characters";
import { generateCharacterResponse } from "./openai";
import { insertMessageSchema, insertSubscriptionSchema } from "@shared/schema";
import { setupAuth } from "./auth";

function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

export async function registerRoutes(app: Express) {
  const httpServer = createServer(app);

  // Set up authentication routes
  setupAuth(app);

  // Public routes
  app.get("/api/characters", (_req, res) => {
    res.json(characters);
  });

  // Protected routes
  app.get("/api/messages/:characterId", requireAuth, async (req, res) => {
    const messages = await storage.getMessagesByCharacter(
      req.params.characterId,
      req.user!.id
    );
    res.json(messages);
  });

  app.post("/api/messages", requireAuth, async (req, res) => {
    try {
      const data = insertMessageSchema.parse({
        ...req.body,
        userId: req.user!.id
      });

      const message = await storage.createMessage(data);

      if (data.isUser) {
        const character = characters.find(c => c.id === data.characterId);
        if (!character) throw new Error("Character not found");

        const messages = await storage.getMessagesByCharacter(data.characterId, req.user!.id);
        const chatHistory = messages.map(m => 
          `${m.isUser ? "User" : character.name}: ${m.content}`
        ).join("\n");

        const aiResponse = await generateCharacterResponse(
          character,
          data.content,
          chatHistory
        );

        const aiMessage = await storage.createMessage({
          userId: req.user!.id,
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

  app.delete("/api/messages/:characterId", requireAuth, async (req, res) => {
    await storage.clearChat(req.params.characterId, req.user!.id);
    res.json({ success: true });
  });

  // Subscription routes
  app.post("/api/subscribe", requireAuth, async (req, res) => {
    try {
      const data = insertSubscriptionSchema.parse({
        ...req.body,
        userId: req.user!.id,
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      });

      const subscription = await storage.createSubscription(data);
      await storage.updateUserPremiumStatus(req.user!.id, true);

      res.json(subscription);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/subscription", requireAuth, async (req, res) => {
    const subscription = await storage.getActiveSubscription(req.user!.id);
    res.json(subscription || null);
  });

  return httpServer;
}