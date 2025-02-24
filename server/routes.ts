import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { characters } from "@shared/characters";
import { generateCharacterResponse } from "./openai";
import { insertMessageSchema, insertCustomCharacterSchema, subscriptionPlans, type SubscriptionTier } from "@shared/schema";
import { setupAuth, isAdmin } from "./auth";

export async function registerRoutes(app: Express) {
  // Set up authentication routes and middleware
  setupAuth(app);

  // Admin dashboard endpoints
  app.get("/api/admin/dashboard/stats", isAdmin, async (req, res) => {
    try {
      const stats = await storage.getUserStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  app.get("/api/admin/users", isAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/api/characters", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const customChars = await storage.getCustomCharactersByUser(req.user.id);
      const formattedCustomChars = customChars.map(char => ({
        id: `custom_${char.id}`, 
        name: char.name,
        avatar: char.avatar,
        description: char.description,
        persona: char.persona
      }));

      const allCharacters = [...characters, ...formattedCustomChars];
      res.json(allCharacters);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch characters" });
    }
  });

  app.get("/api/messages/:characterId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const messages = await storage.getMessagesByCharacter(req.params.characterId);
      // Only return messages belonging to the authenticated user
      const userMessages = messages.filter(msg => msg.userId === req.user.id);
      res.json(userMessages);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.get("/api/user", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }
    res.json(req.user);
  });

  app.get("/api/custom-characters", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const customChars = await storage.getCustomCharactersByUser(req.user.id);
      res.json(customChars);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch custom characters" });
    }
  });

  app.post("/api/custom-characters", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const user = req.user;
      if (!user) {
        throw new Error("User not found");
      }

      if (!user.isPremium && user.trialCharactersCreated >= 3) {
        return res.status(403).json({
          error: "Trial limit reached. Please upgrade to create more characters."
        });
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

  app.delete("/api/custom-characters/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const user = req.user;
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
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const user = req.user;

      const data = insertMessageSchema.parse({
        ...req.body,
        userId: user.id
      });
      const message = await storage.createMessage(data);

      if (data.isUser) {
        try {
          let character;
          const isCustom = data.characterId.startsWith('custom_');
          const characterIdNum = isCustom ? parseInt(data.characterId.replace('custom_', ''), 10) : null;

          if (isCustom && characterIdNum !== null) {
            const customChar = await storage.getCustomCharacterById(characterIdNum);
            if (!customChar) throw new Error("Custom character not found");
            character = {
              id: `custom_${customChar.id}`,
              name: customChar.name,
              avatar: customChar.avatar,
              description: customChar.description,
              persona: customChar.persona
            };
          } else {
            character = characters.find(c => c.id === data.characterId);
            if (!character) throw new Error("Predefined character not found");
          }

          const messages = await storage.getMessagesByCharacter(data.characterId);
          const chatHistory = messages.map(m =>
            `${m.isUser ? "User" : character.name}: ${m.content}`
          ).join("\n");

          const aiResponse = await generateCharacterResponse(
            character,
            data.content,
            chatHistory,
            data.language
          );

          const aiMessage = await storage.createMessage({
            userId: user.id,
            characterId: data.characterId,
            content: aiResponse,
            isUser: false,
            language: data.language,
            script: data.script
          });

          res.json([message, aiMessage]);
        } catch (error: any) {
          // If AI response fails, still return the user message but with an error
          res.status(207).json({
            messages: [message],
            error: "Failed to generate AI response"
          });
        }
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

  app.post("/api/subscribe", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const user = req.user;
      const { planId } = req.body;

      if (!user) {
        throw new Error("User not found");
      }

      if (!Object.keys(subscriptionPlans).some(plan => subscriptionPlans[plan as SubscriptionTier].id === planId)) {
        throw new Error("Invalid subscription plan");
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      await storage.updateUserSubscription(user.id, {
        isPremium: true,
        subscriptionTier: planId,
        subscriptionStatus: 'active',
        subscriptionExpiresAt: expiresAt
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Add feedback endpoint
  app.post("/api/feedback", async (req, res) => {
    try {
      const { name, email, message } = req.body;
      if (!name || !email || !message) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // For now, just log the feedback
      console.log('Feedback received:', { name, email, message });
      res.json({ success: true, message: "Feedback received" });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to submit feedback" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}