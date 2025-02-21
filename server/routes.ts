import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { characters } from "@shared/characters";
import { generateCharacterResponse } from "./openai";
import { insertMessageSchema, insertCustomCharacterSchema, subscriptionPlans, type SubscriptionTier } from "@shared/schema";
import { setupAuth } from "./auth";

export async function registerRoutes(app: Express) {
  const httpServer = createServer(app);

  // Set up authentication routes and middleware
  setupAuth(app);

  app.get("/api/characters", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const customChars = await storage.getCustomCharactersByUser(req.user.id);
      const formattedCustomChars = customChars.map(char => ({
        id: `custom_${char.id}`, 
        name: char.name,
        avatar: char.avatar,
        description: char.description,
        persona: char.persona
      }));

      // Always include default characters along with custom ones
      const allCharacters = [...characters, ...formattedCustomChars];
      console.log("Sending characters:", allCharacters.length); // Debug log
      res.json(allCharacters);
    } catch (error) {
      console.error("Error fetching characters:", error);
      res.status(500).json({ error: "Failed to fetch characters" });
    }
  });

  app.get("/api/messages/:characterId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const messages = await storage.getMessagesByCharacter(req.params.characterId);
    res.json(messages);
  });

  app.get("/api/custom-characters", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const customChars = await storage.getCustomCharactersByUser(req.user.id);
    res.json(customChars);
  });

  app.post("/api/custom-characters", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      if (!req.user.isPremium && req.user.trialCharactersCreated >= 3) {
        return res.status(403).json({
          error: "Trial limit reached. Please upgrade to create more characters."
        });
      }

      const data = insertCustomCharacterSchema.parse({
        ...req.body,
        userId: req.user.id
      });

      const character = await storage.createCustomCharacter(data);
      await storage.incrementTrialCharacterCount(req.user.id);

      res.json(character);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/custom-characters/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      await storage.deleteCustomCharacter(Number(req.params.id), req.user.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/messages", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const data = insertMessageSchema.parse({
        ...req.body,
        userId: req.user.id
      });
      const message = await storage.createMessage(data);

      if (data.isUser) {
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
          chatHistory
        );

        const aiMessage = await storage.createMessage({
          userId: req.user.id,
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
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    await storage.clearChat(req.params.characterId);
    res.json({ success: true });
  });

  app.post("/api/subscribe", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { planId } = req.body;

      if (!Object.keys(subscriptionPlans).some(plan => subscriptionPlans[plan as SubscriptionTier].id === planId)) {
        throw new Error("Invalid subscription plan");
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      await storage.updateUserSubscription(req.user.id, {
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

  return httpServer;
}