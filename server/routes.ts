import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { characters } from "@shared/characters";
import { generateCharacterResponse } from "./openai";
import { insertMessageSchema, insertCustomCharacterSchema, subscriptionPlans, type SubscriptionTier, insertFeedbackSchema, FREE_USER_MESSAGE_LIMIT, insertNotificationSchema } from "@shared/schema";
import { setupAuth, isAdmin } from "./auth";
import { generateOTP, hashPassword } from './auth';
import { feedbackStorage } from './feedback-storage';
import { complaintStorage } from './complaint-storage';
import { notificationDb } from './notification-db';
import multer from 'multer';
import path from "path";
import fs from "fs";
import passport from 'passport';
import { generateOTP as generateOTPemail, sendVerificationEmail as sendVerificationEmail2, sendPasswordResetEmail, isValidEmail } from './email';
import * as schema from '@shared/schema'; // Added import for schema


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


  // Add new plan management routes before httpServer creation
  app.get("/api/admin/plans", isAdmin, async (req, res) => {
    try {
      const plans = await storage.getSubscriptionPlans();
      res.json(plans);
    } catch (error: any) {
      console.error("Error fetching plans:", error);
      res.status(500).json({ error: "Failed to fetch plans" });
    }
  });

  app.post("/api/admin/plans", isAdmin, async (req, res) => {
    try {
      const plan = await storage.createSubscriptionPlan(req.body);
      res.status(201).json(plan);
    } catch (error: any) {
      console.error("Error creating plan:", error);
      res.status(500).json({ error: "Failed to create plan" });
    }
  });

  app.patch("/api/admin/plans/:id", isAdmin, async (req, res) => {
    try {
      const plan = await storage.updateSubscriptionPlan(req.params.id, req.body);
      res.json(plan);
    } catch (error: any) {
      console.error("Error updating plan:", error);
      res.status(500).json({ error: "Failed to update plan" });
    }
  });

  app.delete("/api/admin/plans/:id", isAdmin, async (req, res) => {
    try {
      await storage.deleteSubscriptionPlan(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting plan:", error);
      res.status(500).json({ error: "Failed to delete plan" });
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

      // Check message limit for free users
      if (!user.isPremium) {
        const messageCount = await storage.getUserMessageCount(user.id);
        if (messageCount >= FREE_USER_MESSAGE_LIMIT) {
          return res.status(403).json({
            error: "Message limit reached. Please upgrade to premium to continue chatting.",
            limitReached: true
          });
        }
      }

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

  // Add endpoint to delete feedback (admin only)
  app.delete("/api/admin/feedback/:id", isAdmin, async (req, res) => {
    try {
      const feedbackId = parseInt(req.params.id);
      await feedbackStorage.deleteFeedback(feedbackId);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting feedback:', error);
      res.status(500).json({ error: "Failed to delete feedback" });
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

  // New endpoint for sending OTP during registration
  app.post("/api/verify/send-otp", async (req, res) => {
    try {
      const { email, registrationData } = req.body;

      if (!email || !isValidEmail(email)) {
        return res.status(400).json({ error: "Invalid email address" });
      }

      // Check if email already exists and is verified
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser?.isEmailVerified) {
        return res.status(400).json({ error: "Email already registered and verified" });
      }

      const otp = await generateOTPemail();
      const expiry = new Date();
      expiry.setMinutes(expiry.getMinutes() + 10); // OTP expires in 10 minutes

      // Store pending verification with registration data if provided
      await storage.createPendingVerification({
        email,
        verificationToken: otp,
        tokenExpiry: expiry,
        registrationData: registrationData ? JSON.stringify(registrationData) : null
      });

      await sendVerificationEmail2(email, otp);
      res.json({ message: "OTP sent successfully" });
    } catch (error: any) {
      console.error("Error sending OTP:", error);
      res.status(500).json({ error: "Failed to send OTP" });
    }
  });

  // Update verify-otp endpoint to properly hash password during registration
  app.post("/api/verify/verify-otp", async (req, res) => {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        return res.status(400).json({ error: "Email and OTP are required" });
      }

      const verification = await storage.getPendingVerification(email);
      if (!verification) {
        return res.status(400).json({ error: "No pending verification found" });
      }

      const isValid = await storage.verifyPendingToken(email, otp);
      if (!isValid) {
        return res.status(400).json({ error: "Invalid or expired OTP" });
      }

      // If we have registration data, create the user
      if (verification.registrationData) {
        const userData = JSON.parse(verification.registrationData);
        // Hash the password before creating user
        const hashedPassword = await hashPassword(userData.password);
        const user = await storage.createUser({
          ...userData,
          password: hashedPassword,
          isEmailVerified: true
        });
        await storage.deletePendingVerification(email);

        // Log in the user after successful registration
        req.login(user, (err) => {
          if (err) {
            console.error("Auto-login after registration failed:", err);
            return res.json({ message: "Email verified and account created successfully. Please login.", user });
          }
          res.json({ message: "Email verified and account created successfully", user });
        });
      } else {
        await storage.deletePendingVerification(email);
        res.json({ message: "Email verified successfully" });
      }
    } catch (error: any) {
      console.error("Error verifying OTP:", error);
      res.status(500).json({ error: "Failed to verify OTP" });
    }
  });

  // Endpoint for password reset request
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email || !isValidEmail(email)) {
        return res.status(400).json({ error: "Invalid email address" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const otp = await generateOTPemail();
      const expiry = new Date();
      expiry.setMinutes(expiry.getMinutes() + 10);

      await storage.updateVerificationToken(user.id, otp, expiry);
      await sendPasswordResetEmail(email, otp);

      res.json({ message: "Password reset OTP sent successfully" });
    } catch (error: any) {
      console.error("Error initiating password reset:", error);
      res.status(500).json({ error: "Failed to initiate password reset" });
    }
  });

  // Endpoint for resetting password with OTP
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { email, otp, newPassword } = req.body;

      if (!email || !otp || !newPassword) {
        return res.status(400).json({ error: "All fields are required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const isValid = await storage.verifyEmail(user.id, otp);
      if (!isValid) {
        return res.status(400).json({ error: "Invalid or expired OTP" });
      }

      // Hash new password and update
      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUserPassword(user.id, hashedPassword);

      res.json({ message: "Password reset successfully" });
    } catch (error: any) {
      console.error("Error resetting password:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  // Add new analytics endpoints before httpServer creation
  app.get("/api/admin/analytics/activity", isAdmin, async (req, res) => {
    try {
      // Get user activity data for the last 24 hours
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Get all users who logged in within the last 24 hours
      const activeUsers = await storage.getAllUsers();
      const hourlyActivity = Array(24).fill(0).map((_, hour) => ({
        hour,
        activeUsers: activeUsers.filter(user => {
          if (!user.lastLoginAt) return false;
          const loginHour = new Date(user.lastLoginAt).getHours();
          return loginHour === hour;
        }).length
      }));

      res.json({ hourlyActivity });
    } catch (error: any) {
      console.error("Error fetching activity data:", error);
      res.status(500).json({ error: "Failed to fetch activity data" });
    }
  });

  app.get("/api/admin/analytics/messages", isAdmin, async (req, res) => {
    try {
      // Get message volume for the last 7 days
      const messages = await storage.getMessagesByCharacter("all");
      const daily = Array(7).fill(0).map((_, index) => {
        const date = new Date();
        date.setDate(date.getDate() - index);
        date.setHours(0, 0, 0, 0);

        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        return {
          date: date.toISOString().split('T')[0],
          messages: messages.filter(msg => {
            const msgDate = new Date(msg.timestamp);
            return msgDate >= date && msgDate < nextDate;
          }).length
        };
      }).reverse();

      res.json({ daily });
    } catch (error: any) {
      console.error("Error fetching message volume:", error);
      res.status(500).json({ error: "Failed to fetch message volume" });
    }
  });

  app.get("/api/admin/analytics/characters/popularity", isAdmin, async (req, res) => {
    try {
      const messages = await storage.getMessagesByCharacter("all");
      const characterStats = new Map();

      // Process messages to get character statistics
      for (const msg of messages) {
        if (!characterStats.has(msg.characterId)) {
          characterStats.set(msg.characterId, {
            messageCount: 0,
            users: new Set()
          });
        }
        const stats = characterStats.get(msg.characterId);
        stats.messageCount++;
        stats.users.add(msg.userId);
      }

      // Convert stats to response format
      const charactersData = [];
      for (const [charId, stats] of characterStats.entries()) {
        let name = "Unknown";
        if (charId.startsWith('custom_')) {
          const customChar = await storage.getCustomCharacterById(
            parseInt(charId.replace('custom_', ''))
          );
          if (customChar) name = customChar.name;
        } else {
          const predefinedChar = characters.find(c => c.id === charId);
          if (predefinedChar) name = predefinedChar.name;
        }

        charactersData.push({
          name,
          messageCount: stats.messageCount,
          userCount: stats.users.size
        });
      }

      res.json({ characters: charactersData });
    } catch (error: any) {
      console.error("Error fetching character popularity:", error);
      res.status(500).json({ error: "Failed to fetch character popularity" });
    }
  });

  // Add a public route for subscription plans
  app.get("/api/plans", async (req, res) => {
    try {
      const plans = await storage.getSubscriptionPlans();
      res.json(plans);
    } catch (error: any) {
      console.error("Error fetching plans:", error);
      res.status(500).json({ error: "Failed to fetch plans" });
    }
  });

  // Get user notifications
  app.get("/api/notifications", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const notifications = await notificationDb.query.notifications.findMany({
        where: (notifications, { eq }) => eq(notifications.userId, req.user.id),
        orderBy: (notifications, { desc }) => [desc(notifications.createdAt)]
      });

      res.json(notifications);
    } catch (error: any) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  // Mark notification as read
  app.patch("/api/notifications/:id/read", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const notificationId = parseInt(req.params.id);

      // Update notification read status
      await notificationDb.update(schema.notifications)
        .set({ read: true })
        .where(schema.eq(schema.notifications.id, notificationId))
        .where(schema.eq(schema.notifications.userId, req.user.id))
        .execute();

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ error: "Failed to update notification" });
    }
  });

  // Create notification (admin only)
  app.post("/api/admin/notifications", isAdmin, async (req, res) => {
    try {
      const data = insertNotificationSchema.parse(req.body);

      const notification = await notificationDb.insert(schema.notifications)
        .values(data)
        .returning()
        .get();

      res.status(201).json(notification);
    } catch (error: any) {
      console.error("Error creating notification:", error);
      res.status(500).json({ error: "Failed to create notification" });
    }
  });

  // Add new plan management routes before httpServer creation
  app.get("/api/admin/plans", isAdmin, async (req, res) => {
    try {
      const plans = await storage.getSubscriptionPlans();
      res.json(plans);
    } catch (error: any) {
      console.error("Error fetching plans:", error);
      res.status(500).json({ error: "Failed to fetch plans" });
    }
  });

  app.post("/api/admin/plans", isAdmin, async (req, res) => {
    try {
      const plan = await storage.createSubscriptionPlan(req.body);
      res.status(201).json(plan);
    } catch (error: any) {
      console.error("Error creating plan:", error);
      res.status(500).json({ error: "Failed to create plan" });
    }
  });

  app.patch("/api/admin/plans/:id", isAdmin, async (req, res) => {
    try {
      const plan = await storage.updateSubscriptionPlan(req.params.id, req.body);
      res.json(plan);
    } catch (error: any) {
      console.error("Error updating plan:", error);
      res.status(500).json({ error: "Failed to update plan" });
    }
  });

  app.delete("/api/admin/plans/:id", isAdmin, async (req, res) => {
    try {
      await storage.deleteSubscriptionPlan(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting plan:", error);
      res.status(500).json({ error: "Failed to delete plan" });
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

      // Check message limit for free users
      if (!user.isPremium) {
        const messageCount = await storage.getUserMessageCount(user.id);
        if (messageCount >= FREE_USER_MESSAGE_LIMIT) {
          return res.status(403).json({
            error: "Message limit reached. Please upgrade to premium to continue chatting.",
            limitReached: true
          });
        }
      }

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

  // Add endpoint to delete feedback (admin only)
  app.delete("/api/admin/feedback/:id", isAdmin, async (req, res) => {
    try {
      const feedbackId = parseInt(req.params.id);
      await feedbackStorage.deleteFeedback(feedbackId);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting feedback:', error);
      res.status(500).json({ error: "Failed to delete feedback" });
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

  // New endpoint for sending OTP during registration
  app.post("/api/verify/send-otp", async (req, res) => {
    try {
      const { email, registrationData } = req.body;

      if (!email || !isValidEmail(email)) {
        return res.status(400).json({ error: "Invalid email address" });
      }

      // Check if email already exists and is verified
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser?.isEmailVerified) {
        return res.status(400).json({ error: "Email already registered and verified" });
      }

      const otp = await generateOTPemail();
      const expiry = new Date();
      expiry.setMinutes(expiry.getMinutes() + 10); // OTP expires in 10 minutes

      // Store pending verification with registration data if provided
      await storage.createPendingVerification({
        email,
        verificationToken: otp,
        tokenExpiry: expiry,
        registrationData: registrationData ? JSON.stringify(registrationData) : null
      });

      await sendVerificationEmail2(email, otp);
      res.json({ message: "OTP sent successfully" });
    } catch (error: any) {
      console.error("Error sending OTP:", error);
      res.status(500).json({ error: "Failed to send OTP" });
    }
  });

  // Update verify-otp endpoint to properly hash password during registration
  app.post("/api/verify/verify-otp", async (req, res) => {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        return res.status(400).json({ error: "Email and OTP are required" });
      }

      const verification = await storage.getPendingVerification(email);
      if (!verification) {
        return res.status(400).json({ error: "No pending verification found" });
      }

      const isValid = await storage.verifyPendingToken(email, otp);
      if (!isValid) {
        return res.status(400).json({ error: "Invalid or expired OTP" });
      }

      // If we have registration data, create the user
      if (verification.registrationData) {
        const userData = JSON.parse(verification.registrationData);
        // Hash the password before creating user
        const hashedPassword = await hashPassword(userData.password);
        const user = await storage.createUser({
          ...userData,
          password: hashedPassword,
          isEmailVerified: true
        });
        await storage.deletePendingVerification(email);

        // Log in the user after successful registration
        req.login(user, (err) => {
          if (err) {
            console.error("Auto-login after registration failed:", err);
            return res.json({ message: "Email verified and account created successfully. Please login.", user });
          }
          res.json({ message: "Email verified and account created successfully", user });
        });
      } else {
        await storage.deletePendingVerification(email);
        res.json({ message: "Email verified successfully" });
      }
    } catch (error: any) {
      console.error("Error verifying OTP:", error);
      res.status(500).json({ error: "Failed to verify OTP" });
    }
  });

  // Endpoint for password reset request
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email || !isValidEmail(email)) {
        return res.status(400).json({ error: "Invalid email address" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const otp = await generateOTPemail();
      const expiry = new Date();
      expiry.setMinutes(expiry.getMinutes() + 10);

      await storage.updateVerificationToken(user.id, otp, expiry);
      await sendPasswordResetEmail(email, otp);

      res.json({ message: "Password reset OTP sent successfully" });
    } catch (error: any) {
      console.error("Error initiating password reset:", error);
      res.status(500).json({ error: "Failed to initiate password reset" });
    }
  });

  // Endpoint for resetting password with OTP
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { email, otp, newPassword } = req.body;

      if (!email || !otp || !newPassword) {
        return res.status(400).json({ error: "All fields are required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const isValid = await storage.verifyEmail(user.id, otp);
      if (!isValid) {
        return res.status(400).json({ error: "Invalid or expired OTP" });
      }

      // Hash new password and update
      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUserPassword(user.id, hashedPassword);

      res.json({ message: "Password reset successfully" });
    } catch (error: any) {
      console.error("Error resetting password:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  // Add new analytics endpoints before httpServer creation
  app.get("/api/admin/analytics/activity", isAdmin, async (req, res) => {
    try {
      // Get user activity data for the last 24 hours
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Get all users who logged in within the last 24 hours
      const activeUsers = await storage.getAllUsers();
      const hourlyActivity = Array(24).fill(0).map((_, hour) => ({
        hour,
        activeUsers: activeUsers.filter(user => {
          if (!user.lastLoginAt) return false;
          const loginHour = new Date(user.lastLoginAt).getHours();
          return loginHour === hour;
        }).length
      }));

      res.json({ hourlyActivity });
    } catch (error: any) {
      console.error("Error fetching activity data:", error);
      res.status(500).json({ error: "Failed to fetch activity data" });
    }
  });

  app.get("/api/admin/analytics/messages", isAdmin, async (req, res) => {
    try {
      // Get message volume for the last 7 days
      const messages = await storage.getMessagesByCharacter("all");
      const daily = Array(7).fill(0).map((_, index) => {
        const date = new Date();
        date.setDate(date.getDate() - index);
        date.setHours(0, 0, 0, 0);

        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        return {
          date: date.toISOString().split('T')[0],
          messages: messages.filter(msg => {
            const msgDate = new Date(msg.timestamp);
            return msgDate >= date && msgDate < nextDate;
          }).length
        };
      }).reverse();

      res.json({ daily });
    } catch (error: any) {
      console.error("Error fetching message volume:", error);
      res.status(500).json({ error: "Failed to fetch message volume" });
    }
  });

  app.get("/api/admin/analytics/characters/popularity", isAdmin, async (req, res) => {
    try {
      const messages = await storage.getMessagesByCharacter("all");
      const characterStats = new Map();

      // Process messages to get character statistics
      for (const msg of messages) {
        if (!characterStats.has(msg.characterId)) {
          characterStats.set(msg.characterId, {
            messageCount: 0,
            users: new Set()
          });
        }
        const stats = characterStats.get(msg.characterId);
        stats.messageCount++;
        stats.users.add(msg.userId);
      }

      // Convert stats to response format
      const charactersData = [];
      for (const [charId, stats] of characterStats.entries()) {
        let name = "Unknown";
        if (charId.startsWith('custom_')) {
          const customChar = await storage.getCustomCharacterById(
            parseInt(charId.replace('custom_', ''))
          );
          if (customChar) name = customChar.name;
        } else {
          const predefinedChar = characters.find(c => c.id === charId);
          if (predefinedChar) name = predefinedChar.name;
        }

        charactersData.push({
          name,
          messageCount: stats.messageCount,
          userCount: stats.users.size
        });
      }

      res.json({ characters: charactersData });
    } catch (error: any) {
      console.error("Error fetching character popularity:", error);
      res.status(500).json({ error: "Failed to fetch character popularity" });
    }
  });

  // Add a public route for subscription plans
  app.get("/api/plans", async (req, res) => {
    try {
      const plans = await storage.getSubscriptionPlans();
      res.json(plans);
    } catch (error: any) {
      console.error("Error fetching plans:", error);
      res.status(500).json({ error: "Failed to fetch plans" });
    }
  });

  // Get user notifications
  app.get("/api/notifications", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const notifications = await notificationDb.query.notifications.findMany({
        where: (notifications, { eq }) => eq(notifications.userId, req.user.id),
        orderBy: (notifications, { desc }) => [desc(notifications.createdAt)]
      });

      res.json(notifications);
    } catch (error: any) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  // Mark notification as read
  app.patch("/api/notifications/:id/read", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const notificationId = parseInt(req.params.id);

      // Update notification read status
      await notificationDb.update(schema.notifications)
        .set({ read: true })
        .where(schema.eq(schema.notifications.id, notificationId))
        .where(schema.eq(schema.notifications.userId, req.user.id))
        .execute();

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ error: "Failed to update notification" });
    }
  });

  // Create notification (admin only)
  app.post("/api/admin/notifications", isAdmin, async (req, res) => {
    try {
      const data = insertNotificationSchema.parse(req.body);

      const notification = await notificationDb.insert(schema.notifications)
        .values(data)
        .returning()
        .get();

      res.status(201).json(notification);
    } catch (error: any) {
      console.error("Error creating notification:", error);
      res.status(500).json({ error: "Failed to create notification" });
    }
  });
  // Get all notifications (admin only)
  app.get("/api/admin/notifications/all", isAdmin, async (req, res) => {
    try {
      const notifications = await notificationDb.query.notifications.findMany({
        orderBy: (notifications, { desc }) => [desc(notifications.createdAt)]
      });

      const notificationsWithUserDetails = await Promise.all(
        notifications.map(async (notification) => {
          const user = await storage.getUser(notification.userId);
          return {
            ...notification,
            username: user?.username || 'Deleted User',
            userEmail: user?.email || 'N/A'
          };
        })
      );

      res.json(notificationsWithUserDetails);
    } catch (error: any) {
      console.error("Error fetching all notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  // Broadcast notification to all users
  app.post("/api/admin/notifications/broadcast", isAdmin, async (req, res) => {
    try {
      const { title, message, type } = req.body;

      // Get all active users
      const users = await storage.getAllUsers();

      // Create notifications for all users
      const notifications = await Promise.all(
        users.map(user =>
          notificationDb.insert(schema.notifications)
            .values({
              userId: user.id,
              type,
              title,
              message,
              read: false
            })
            .returning()
            .get()
        )
      );

      res.status(201).json({ success: true, count: notifications.length });
    } catch (error: any) {
      console.error("Error broadcasting notification:", error);
      res.status(500).json({ error: "Failed to broadcast notification" });
    }
  });

  // Send notification to specific user
  app.post("/api/admin/notifications/user/:userId", isAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { title, message, type } = req.body;

      // Verify user exists
      const user = await storage.getUser(parseInt(userId));
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Create notification
      const notification = await notificationDb.insert(schema.notifications)
        .values({
          userId: parseInt(userId),
          type,
          title,
          message,
          read: false
        })
        .returning()
        .get();

      res.status(201).json(notification);
    } catch (error: any) {
      console.error("Error sending notification:", error);
      res.status(500).json({ error: "Failed to send notification" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}