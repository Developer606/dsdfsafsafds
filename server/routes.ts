import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { characters } from "@shared/characters";
import { generateCharacterResponse } from "./openai";
import { insertMessageSchema, insertCustomCharacterSchema, subscriptionPlans, type SubscriptionTier } from "@shared/schema";
import { setupAuth } from "./auth";

export async function registerRoutes(app: Express) {
  // Set up authentication routes and middleware
  setupAuth(app);

  // Helper function to get or create demo user
  async function getOrCreateDemoUser() {
    let user = await storage.getUserByEmail("demo@example.com");
    if (!user) {
      user = await storage.createUser({ 
        email: "demo@example.com",
        username: "demo_user",
        password: "demo_password" // This will be hashed by the auth system
      });
    }
    return user;
  }

  app.get("/api/characters", async (_req, res) => {
    try {
      const user = await getOrCreateDemoUser();
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
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch characters" });
    }
  });

  app.get("/api/messages/:characterId", async (req, res) => {
    try {
      const messages = await storage.getMessagesByCharacter(req.params.characterId);
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.get("/api/user", async (_req, res) => {
    try {
      const user = await getOrCreateDemoUser();
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.get("/api/custom-characters", async (_req, res) => {
    try {
      const user = await getOrCreateDemoUser();
      const customChars = await storage.getCustomCharactersByUser(user.id);
      res.json(customChars);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch custom characters" });
    }
  });

  app.post("/api/custom-characters", async (req, res) => {
    try {
      const user = await getOrCreateDemoUser();
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
      const user = await getOrCreateDemoUser();
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
      const user = await getOrCreateDemoUser();

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
            data.language,
            data.script,
            data.model
          );

          const aiMessage = await storage.createMessage({
            userId: user.id,
            characterId: data.characterId,
            content: aiResponse,
            isUser: false,
            language: data.language,
            script: data.script,
            model: data.model
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
      const { planId } = req.body;
      const user = await getOrCreateDemoUser();

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

  const httpServer = createServer(app);
  return httpServer;
}