import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { characters } from "@shared/characters";
import { generateCharacterResponse } from "./openai";
import { insertMessageSchema, insertCustomCharacterSchema, subscriptionPlans, type SubscriptionTier } from "@shared/schema";

export async function registerRoutes(app: Express) {
  const httpServer = createServer(app);

  app.get("/api/characters", async (_req, res) => {
    let user = await storage.getUserByEmail("demo@example.com");
    if (!user) {
      user = await storage.createUser({ 
        email: "demo@example.com",
        username: "demo_user" 
      });
    }

    const customChars = await storage.getCustomCharactersByUser(user.id);

    const formattedCustomChars = customChars.map(char => ({
      id: `custom_${char.id}`, 
      name: char.name,
      avatar: char.avatar,
      description: char.description,
      persona: char.persona
    }));

    const allCharacters = [...characters, ...formattedCustomChars];
    res.json(allCharacters);
  });

  app.get("/api/messages/:characterId", async (req, res) => {
    const messages = await storage.getMessagesByCharacter(req.params.characterId);
    res.json(messages);
  });

  app.get("/api/user", async (_req, res) => {
    let user = await storage.getUserByEmail("demo@example.com");
    if (!user) {
      user = await storage.createUser({ 
        email: "demo@example.com",
        username: "demo_user" 
      });
    }
    res.json(user);
  });

  app.get("/api/custom-characters", async (_req, res) => {
    let user = await storage.getUserByEmail("demo@example.com");
    if (!user) {
      user = await storage.createUser({ 
        email: "demo@example.com",
        username: "demo_user" 
      });
    }
    const customChars = await storage.getCustomCharactersByUser(user.id);
    res.json(customChars);
  });

  app.post("/api/custom-characters", async (req, res) => {
    try {
      const user = await storage.getUserByEmail("demo@example.com");
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
      let user = await storage.getUserByEmail("demo@example.com");
      if (!user) {
        user = await storage.createUser({ email: "demo@example.com", username: "demo_user" });
      }

      const data = insertMessageSchema.parse({
        ...req.body,
        userId: user.id
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
      const { planId } = req.body;
      const user = await storage.getUserByEmail("demo@example.com");

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

  return httpServer;
}