import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { characters } from "@shared/characters";
import { generateCharacterResponse } from "./openai";
import { insertMessageSchema, insertCustomCharacterSchema, subscriptionPlans, type SubscriptionTier, insertFeedbackSchema } from "@shared/schema";
import { setupAuth, isAdmin } from "./auth";
import { generateOTP, sendVerificationEmail, hashPassword } from './auth'; 
import { feedbackStorage } from './feedback-storage';
import { complaintStorage } from './complaint-storage';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import passport from 'passport';

// Middleware to check if user is blocked
const checkBlockedStatus = async (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) {
    const currentUser = await storage.getUser(req.user.id);
    if (currentUser?.isBlocked) {
      req.logout((err: any) => {
        if (err) {
          console.error('Error logging out blocked user:', err);
        }
      });
      return res.status(403).json({ 
        error: "Your account has been blocked. Please contact support." 
      });
    }
  }
  next();
};

export async function registerRoutes(app: Express) {
  // Set up authentication routes and middleware
  setupAuth(app);

  // Add blocked status check middleware to all routes
  app.use(checkBlockedStatus);

  // Admin dashboard endpoints
  app.get("/api/admin/dashboard/stats", isAdmin, async (req, res) => {
    try {
      const stats = await storage.getUserStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  // Enhanced users endpoint with detailed info
  app.get("/api/admin/users", isAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // New endpoint for recent messages
  app.get("/api/admin/messages/recent", isAdmin, async (req, res) => {
    try {
      const messages = await storage.getMessagesByCharacter("all");
      const enrichedMessages = await Promise.all(
        messages.slice(-20).map(async (msg) => {
          const user = await storage.getUser(msg.userId);
          let characterName = "Unknown";

          if (msg.characterId.startsWith('custom_')) {
            const customChar = await storage.getCustomCharacterById(
              parseInt(msg.characterId.replace('custom_', ''))
            );
            if (customChar) characterName = customChar.name;
          } else {
            const predefinedChar = characters.find(c => c.id === msg.characterId);
            if (predefinedChar) characterName = predefinedChar.name;
          }

          return {
            ...msg,
            username: user?.username || 'Deleted User',
            characterName
          };
        })
      );

      res.json(enrichedMessages.reverse()); // Most recent first
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch recent messages" });
    }
  });

  // New endpoint for character statistics
  app.get("/api/admin/characters/stats", isAdmin, async (req, res) => {
    try {
      const customCharacters = await Promise.all(
        (await storage.getAllUsers()).map(user =>
          storage.getCustomCharactersByUser(user.id)
        )
      );

      const stats = {
        totalCharacters: characters.length + customCharacters.flat().length,
        customCharactersCount: customCharacters.flat().length,
        predefinedCharactersCount: characters.length,
        averageCustomCharactersPerUser: customCharacters.flat().length / Math.max(1, (await storage.getAllUsers()).length)
      };

      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch character statistics" });
    }
  });

  // New admin user management endpoints
  app.post("/api/admin/users/:userId/block", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { blocked } = req.body;

      // Get all active sessions
      const sessions = await new Promise((resolve, reject) => {
        storage.sessionStore.all((err, sessions) => {
          if (err) reject(err);
          else resolve(sessions || {});
        });
      });

      // If blocking the user, find and destroy their session
      if (blocked && sessions) {
        Object.entries(sessions as Record<string, any>).forEach(([sessionId, session]) => {
          if (session?.passport?.user === userId) {
            storage.sessionStore.destroy(sessionId);
          }
        });
      }

      await storage.updateUserStatus(userId, { isBlocked: blocked });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to update user block status" });
    }
  });

  app.post("/api/admin/users/:userId/restrict", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { restricted } = req.body;

      await storage.updateUserStatus(userId, { isRestricted: restricted });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to update user restrictions" });
    }
  });

  app.delete("/api/admin/users/:userId", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);

      // Get all active sessions
      const sessions = await new Promise((resolve, reject) => {
        storage.sessionStore.all((err, sessions) => {
          if (err) reject(err);
          else resolve(sessions || {});
        });
      });

      // Find and destroy session of the deleted user
      Object.entries(sessions).forEach(([sessionId, session]) => {
        if (session.passport?.user === userId) {
          storage.sessionStore.destroy(sessionId);
        }
      });

      await storage.deleteUser(userId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  app.post("/api/admin/users/:userId/subscription", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { planId } = req.body;

      // Handle free plan
      if (planId === 'free') {
        await storage.updateUserSubscription(userId, {
          isPremium: false,
          subscriptionTier: null,
          subscriptionStatus: 'cancelled',
          subscriptionExpiresAt: new Date()
        });
        return res.json({ success: true });
      }

      // Handle premium plans
      if (!Object.keys(subscriptionPlans).some(plan => subscriptionPlans[plan as SubscriptionTier].id === planId)) {
        return res.status(400).json({ error: "Invalid subscription plan" });
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // Set expiration to 30 days from now

      await storage.updateUserSubscription(userId, {
        isPremium: true,
        subscriptionTier: planId,
        subscriptionStatus: 'active',
        subscriptionExpiresAt: expiresAt
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to update user subscription" });
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

  // Update the feedback endpoint to use the new storage
  app.post("/api/feedback", async (req, res) => {
    try {
      const parsedInput = insertFeedbackSchema.safeParse(req.body);
      if (!parsedInput.success) {
        return res.status(400).json({
          error: "Invalid input",
          details: parsedInput.error.errors
        });
      }

      const feedback = await feedbackStorage.createFeedback(parsedInput.data);
      res.status(201).json(feedback);
    } catch (error: any) {
      console.error('Error saving feedback:', error);
      res.status(500).json({ error: "Failed to submit feedback" });
    }
  });

  // Add endpoint to get all feedback (admin only)
  app.get("/api/admin/feedback", isAdmin, async (req, res) => {
    try {
      const allFeedback = await feedbackStorage.getAllFeedback();
      res.json(allFeedback);
    } catch (error: any) {
      console.error('Error fetching feedback:', error);
      res.status(500).json({ error: "Failed to fetch feedback" });
    }
  });

  // Configure multer for file uploads
  const multerStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = 'uploads';
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir);
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueName + path.extname(file.originalname));
    }
  });

  const upload = multer({
    storage: multerStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type'));
      }
    }
  });

  // Add complaint submission endpoint
  app.post("/api/complaints", upload.single('image'), async (req, res) => {
    try {
      const { name, email, message } = req.body;

      const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

      const complaint = await complaintStorage.createComplaint({
        name,
        email,
        message,
        imageUrl
      });

      res.status(201).json(complaint);
    } catch (error: any) {
      console.error('Error saving complaint:', error);
      res.status(500).json({ error: "Failed to submit complaint" });
    }
  });

  // Add endpoint to get all complaints (admin only)
  app.get("/api/admin/complaints", isAdmin, async (req, res) => {
    try {
      const allComplaints = await complaintStorage.getAllComplaints();
      res.json(allComplaints);
    } catch (error: any) {
      console.error('Error fetching complaints:', error);
      res.status(500).json({ error: "Failed to fetch complaints" });
    }
  });

  // Update login route to strictly check blocked status
  app.post("/api/login", async (req, res, next) => {
    try {
      const user = await storage.getUserByUsername(req.body.username);

      // Check for blocked status before authentication
      if (user?.isBlocked) {
        return res.status(403).json({ 
          error: "Your account has been blocked. Please contact support." 
        });
      }

      // Only proceed with authentication if user is not blocked
      passport.authenticate("local", async (err: any, authenticatedUser: any) => {
        if (err) return next(err);

        if (!authenticatedUser) {
          return res.status(401).json({ 
            error: "Invalid username or password" 
          });
        }

        // Double check block status after authentication
        const currentUser = await storage.getUserByUsername(authenticatedUser.username);
        if (currentUser?.isBlocked) {
          return res.status(403).json({ 
            error: "Your account has been blocked. Please contact support." 
          });
        }

        req.logIn(authenticatedUser, async (err) => {
          if (err) return next(err);
          await storage.updateLastLogin(authenticatedUser.id);
          res.json(authenticatedUser);
        });
      })(req, res, next);
    } catch (error) {
      next(error);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}