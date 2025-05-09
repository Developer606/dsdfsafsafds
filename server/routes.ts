import { createServer, type Server } from "http";
import { storage } from "./storage";
import express from "express";
import * as libraryDb from "./library-db";
import session from "express-session";
import passport from "passport";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  generateOTP as generateOTPemail,
  sendVerificationEmail as sendVerificationEmail2,
  sendPasswordResetEmail,
  isValidEmail,
} from "./email";
import { eq } from "drizzle-orm";
import type { Express } from "express";
import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";
import { parse } from "url";
import fetch from "node-fetch";
import { 
  isUserOnline, 
  getLastActiveTime, 
  getOnlineUserCount,
  getOnlineUsers
} from "./services/user-status";
import { generateCharacterResponse } from "./openai";
import encryptionRoutes from "./encryption-routes";
import advertisementRoutes from "./routes/advertisement-routes";
import uploadRoutes from "./routes/upload";
import socialAuthRoutes, { initializeGoogleStrategy } from "./routes/social-auth";
import { errorHandler } from "./middleware/error-handler";
import { isAdmin } from "./middleware/auth";
import { trackConversation, initializeProactiveMessaging, testProactiveMessage } from "./services/proactive-messaging";
import {
  insertMessageSchema,
  insertCustomCharacterSchema,
  subscriptionPlans,
  type SubscriptionTier,
  insertFeedbackSchema,
  FREE_USER_MESSAGE_LIMIT,
  insertNotificationSchema,
  notifications,
} from "@shared/schema";
import { setupAuth } from "./auth";
import { generateOTP, hashPassword } from "./auth";
import { authenticateJWT } from "./middleware/jwt-auth";
import { rateLimiter, messageRateLimiter, authRateLimiter } from "./middleware/rate-limiter";
import { feedbackStorage } from "./feedback-storage";
import { complaintStorage } from "./complaint-storage";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import {
  notificationDb,
  createBroadcastNotifications,
  getAllNotificationsWithUsers,
  deleteNotification,
  createScheduledBroadcast,
  getScheduledBroadcasts,
  deleteScheduledBroadcast,
} from "./notification-db";
import { getPayPalConfig } from "./config/index";
import { setupSocketIOServer } from "./socket-io-server";

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = "uploads";
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir);
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueName + path.extname(file.originalname));
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type"));
    }
  },
});

// Define middleware to check if user is blocked
const checkBlockedStatus = async (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) {
    const currentUser = await storage.getUser(req.user.id);
    if (currentUser?.isBlocked) {
      req.logout((err: any) => {
        if (err) {
          console.error("Error logging out blocked user:", err);
        }
      });
      return res.status(403).json({
        error: "Your account has been blocked. Please contact support.",
      });
    }
  }
  next();
};

// Helper function to get background images
async function getBackgroundImages(): Promise<string[]> {
  try {
    // In ESM, __dirname is not available, so use process.cwd()
    const currentDir = process.cwd();
    const backgroundDir = path.join(currentDir, "client/public/background");
    const files = await fs.promises.readdir(backgroundDir);

    // Filter for image files and sort them
    const imageFiles = files
      .filter((file: string) => {
        const ext = path.extname(file).toLowerCase();
        return [".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext);
      })
      .sort();

    // Return paths relative to the public directory
    return imageFiles.map((file: string) => `/background/${file}`);
  } catch (error) {
    console.error("Error reading background images directory:", error);
    return [];
  }
}

export async function registerRoutes(app: Express, existingServer?: Server): Promise<Server> {
  // Configure session middleware first
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "your-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
      store: storage.sessionStore,
    }),
  );

  // Initialize passport after session
  app.use(passport.initialize());
  app.use(passport.session());

  // Update authentication check middleware
  const authCheck = (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({
        error: "Authentication required",
        redirectTo: "/login",
      });
    }
    next();
  };

  const httpServer = existingServer || createServer(app);
  
  // Set up Socket.IO server with our enhanced implementation
  // Pass true to indicate we want the Socket.IO server to handle all WebSocket traffic
  // This eliminates duplicate WebSocket servers to reduce memory and CPU usage
  const io = setupSocketIOServer(httpServer, true);
  
  // Initialize the proactive messaging service
  initializeProactiveMessaging();
  
  // Test endpoint for proactive messaging (protected by auth)
  app.post("/api/test-proactive-message", authCheck, async (req, res) => {
    try {
      const { characterId } = req.body;
      
      if (!characterId) {
        return res.status(400).json({ error: "Character ID is required" });
      }
      
      const result = await testProactiveMessage(req.user!.id, characterId);
      
      if (result) {
        res.json({ success: true, message: "Proactive message test initiated successfully" });
      } else {
        res.status(500).json({ error: "Failed to send proactive message" });
      }
    } catch (error) {
      console.error("Error testing proactive message:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Tracking for socket.io connections will be handled within the socket-io-server.ts
  // The code below gets replaced by the io.on('connection') handler in socket-io-server.ts

  // REMOVED: Legacy WebSocket code that was migrated to socket-io-server.ts
  // All WebSocket traffic is now handled by Socket.IO with optimized connections

  // These message handling functions have been moved to socket-io-server.ts
  // We now use Socket.IO for all real-time communication, including direct messages
  
  // Function signature remains for reference but implementation is in socket-io-server.ts
  async function handleUserMessage(senderId: number, message: any) {
    console.log("[DEPRECATED] This function has been moved to socket-io-server.ts");
    return;
  }
  
  // Function signature remains for reference but implementation is in socket-io-server.ts
  async function handleMessageStatusUpdate(userId: number, message: any) {
    console.log("[DEPRECATED] This function has been moved to socket-io-server.ts");
    return;
  }
  
  // Function signature remains for reference but implementation is in socket-io-server.ts
  async function handleTypingIndicator(senderId: number, message: any) {
    console.log("[DEPRECATED] This function has been moved to socket-io-server.ts");
    return;
  }

  // Updated broadcast function to use Socket.IO
  const broadcastUpdate = (type: string, adminOnly = false) => {
    // Import the socketService to access the Socket.IO instance
    const { socketService } = require('./socket-io-server');
    
    // Use the Socket.IO server to emit events instead of direct WebSocket connections
    // This is optimized to reduce RAM and CPU usage with a single source of broadcasts
    if (adminOnly) {
      // Send only to admin clients
      socketService.io.to('admin').emit(type);
    } else {
      // Send to all connected users as a broadcast event
      socketService.io.emit(type);
    }
  };

  // Set up authentication routes and middleware
  setupAuth(app);
  app.use(checkBlockedStatus);
  
  // Initialize Google OAuth strategy
  await initializeGoogleStrategy();
  
  // Add social authentication routes
  app.use('/api/auth', socialAuthRoutes);

  // Apply auth check to protected routes
  app.use(
    [
      "/api/messages",
      "/api/characters",
      "/api/character",
      "/api/custom-characters",
      "/api/notifications",
      "/api/subscribe",
      "/api/verify-payment",
      "/api/users/search",
      "/api/user-messages",
    ],
    authCheck,
  );

  // Add PayPal config endpoint before existing routes - now with async support
  app.get("/api/paypal-config", async (req, res) => {
    try {
      const config = await getPayPalConfig();
      if (!config.clientId) {
        throw new Error("PayPal configuration not found");
      }
      res.json({ clientId: config.clientId });
    } catch (error) {
      console.error("Error serving PayPal config:", error);
      res.status(500).json({ error: "Failed to load PayPal configuration" });
    }
  });

  // Add background images endpoint
  app.get("/api/background-images", async (req, res) => {
    try {
      const images = await getBackgroundImages();
      res.json(images);
    } catch (error) {
      console.error("Error fetching background images:", error);
      res.status(500).json({ error: "Failed to load background images" });
    }
  });

  // Notification Routes
  app.get("/api/notifications", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    
    try {
      const userId = req.user.id;
      console.log(`Fetching notifications for user ID: ${userId}`);
      
      // Force a direct database connection for maximum freshness
      const rawNotifications = await new Promise((resolve, reject) => {
        try {
          const db = notificationDb.$client;
          
          // To ensure we always get the most current data, we'll use a direct prepared statement
          const query = `
            SELECT 
              id,
              user_id as userId,
              type,
              title,
              message,
              read,
              created_at as createdAt
            FROM notifications
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 100
          `;
          
          const stmt = db.prepare(query);
          const results = stmt.all(userId);
          
          resolve(results);
        } catch (err) {
          console.error("Database error in direct query:", err);
          reject(err);
        }
      });
      
      console.log(`Found ${(rawNotifications as any[]).length} notifications for user ID: ${userId}`);
      
      // Format dates properly
      const notifications = (rawNotifications as any[]).map(notification => ({
        ...notification,
        createdAt: new Date(notification.createdAt) // Ensure proper date formatting
      }));
      
      res.json(notifications);
    } catch (error: any) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.patch("/api/notifications/:id/read", async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      console.log("Marking notification as read:", notificationId);

      await notificationDb
        .update(notifications)
        .set({ read: true })
        .where(eq(notifications.id, notificationId))
        .where(eq(notifications.userId, req.user.id))
        .execute();

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ error: "Failed to update notification" });
    }
  });

  // Admin Notification Routes
  app.post("/api/admin/notifications", isAdmin, async (req, res) => {
    try {
      const data = insertNotificationSchema.parse(req.body);
      console.log("Creating new notification:", data);

      const notification = await notificationDb
        .insert(notifications)
        .values(data)
        .returning()
        .get();

      res.status(201).json(notification);
    } catch (error: any) {
      console.error("Error creating notification:", error);
      res.status(500).json({ error: "Failed to create notification" });
    }
  });

  // Update GET endpoint for admin notifications
  app.get("/api/admin/notifications/all", isAdmin, async (req, res) => {
    try {
      console.log("Fetching all notifications");
      const notificationsWithUserDetails = await getAllNotificationsWithUsers();
      res.json(notificationsWithUserDetails);
    } catch (error: any) {
      console.error("Error fetching all notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  // Add DELETE endpoint for notifications
  app.delete("/api/admin/notifications/:id", isAdmin, async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      await deleteNotification(notificationId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ error: "Failed to delete notification" });
    }
  });

  // Test endpoint for IP geolocation (admin only)
  app.get("/api/admin/test-ip-location", isAdmin, async (req, res) => {
    try {
      const { getLocationFromIp } = await import("./ip-location");
      const testIp = (req.query.ip as string) || req.ip;
      const locationData = getLocationFromIp(testIp);
      res.json({
        ip: testIp,
        location: locationData,
      });
    } catch (error) {
      console.error("Error testing IP location:", error);
      res.status(500).json({ error: "Failed to test IP location" });
    }
  });
  
  // Content moderation routes
  app.get("/api/admin/flagged-messages", isAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;
      const includeReviewed = req.query.includeReviewed === 'true';
      
      const { getFlaggedMessages } = await import("./content-moderation");
      const flaggedMessages = await getFlaggedMessages(limit, offset, includeReviewed);
      res.json(flaggedMessages);
    } catch (error) {
      console.error("Error fetching flagged messages:", error);
      res.status(500).json({ error: "Failed to fetch flagged messages" });
    }
  });
  
  app.get("/api/admin/flagged-messages/stats", isAdmin, async (req, res) => {
    try {
      const { getFlaggedMessageStats } = await import("./content-moderation");
      const stats = await getFlaggedMessageStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching flagged message stats:", error);
      res.status(500).json({ error: "Failed to fetch flagged message stats" });
    }
  });
  
  app.put("/api/admin/flagged-messages/:id/review", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { reviewed } = req.body;
      
      const { markFlaggedMessageAsReviewed } = await import("./content-moderation");
      await markFlaggedMessageAsReviewed(id, reviewed);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating flagged message review status:", error);
      res.status(500).json({ error: "Failed to update flagged message" });
    }
  });
  
  // Content moderation prohibited words management
  app.get("/api/admin/content-moderation/prohibited-words", isAdmin, async (req, res) => {
    try {
      const { getProhibitedWords } = await import("./content-moderation");
      const words = getProhibitedWords();
      res.json(words);
    } catch (error) {
      console.error("Error fetching prohibited words:", error);
      res.status(500).json({ error: "Failed to fetch prohibited words" });
    }
  });
  
  app.post("/api/admin/content-moderation/prohibited-words", isAdmin, async (req, res) => {
    try {
      const { category, word } = req.body;
      
      if (!category || !word) {
        return res.status(400).json({ error: "Category and word are required" });
      }
      
      const { addProhibitedWord } = await import("./content-moderation");
      const result = addProhibitedWord(category, word);
      
      if (result.success) {
        res.json({ success: true });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error) {
      console.error("Error adding prohibited word:", error);
      res.status(500).json({ error: "Failed to add prohibited word" });
    }
  });
  
  app.delete("/api/admin/content-moderation/prohibited-words", isAdmin, async (req, res) => {
    try {
      const { category, word } = req.body;
      
      if (!category || !word) {
        return res.status(400).json({ error: "Category and word are required" });
      }
      
      const { removeProhibitedWord } = await import("./content-moderation");
      const result = removeProhibitedWord(category, word);
      
      if (result.success) {
        res.json({ success: true });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error) {
      console.error("Error removing prohibited word:", error);
      res.status(500).json({ error: "Failed to remove prohibited word" });
    }
  });
  
  app.post("/api/admin/content-moderation/prohibited-categories", isAdmin, async (req, res) => {
    try {
      const { category } = req.body;
      
      if (!category) {
        return res.status(400).json({ error: "Category name is required" });
      }
      
      const { addProhibitedCategory } = await import("./content-moderation");
      const result = addProhibitedCategory(category);
      
      if (result.success) {
        res.json({ success: true });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error) {
      console.error("Error adding prohibited category:", error);
      res.status(500).json({ error: "Failed to add prohibited category" });
    }
  });
  
  // Admin endpoints for message history and user management
  
  // Get conversation history between two users
  app.get("/api/admin/message-history/:senderId/:receiverId", isAdmin, async (req, res) => {
    try {
      const senderId = parseInt(req.params.senderId);
      const receiverId = parseInt(req.params.receiverId);
      const limit = parseInt(req.query.limit as string) || 7;
      
      const messages = await storage.getUserMessages(senderId, receiverId, { limit });
      
      res.json({ messages });
    } catch (error) {
      console.error("Error fetching message history:", error);
      res.status(500).json({ error: "Failed to fetch message history" });
    }
  });
  
  // Get detailed user information
  app.get("/api/admin/users/:userId", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Add additional user details as needed
      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        isBlocked: user.isBlocked || false,
        isRestricted: user.isRestricted || false,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt
      });
    } catch (error) {
      console.error("Error fetching user details:", error);
      res.status(500).json({ error: "Failed to fetch user details" });
    }
  });
  
  // Get conversation details between two users
  app.get("/api/admin/conversations/:user1Id/:user2Id", isAdmin, async (req, res) => {
    try {
      const user1Id = parseInt(req.params.user1Id);
      const user2Id = parseInt(req.params.user2Id);
      
      const conversation = await storage.getConversationBetweenUsers(user1Id, user2Id);
      
      if (!conversation) {
        // If conversation doesn't exist yet, return default values
        return res.json({
          user1Id,
          user2Id,
          isBlocked: false,
          lastMessageId: null,
          lastMessageTimestamp: null
        });
      }
      
      res.json(conversation);
    } catch (error) {
      console.error("Error fetching conversation details:", error);
      res.status(500).json({ error: "Failed to fetch conversation details" });
    }
  });
  
  // Get message history between two users (admin access)
  app.get("/api/admin/conversations/:user1Id/:user2Id/messages", isAdmin, async (req, res) => {
    try {
      const user1Id = parseInt(req.params.user1Id);
      const user2Id = parseInt(req.params.user2Id);
      
      // Extract pagination parameters
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      
      // Validate pagination parameters
      if (page < 1 || limit < 1 || limit > 100) {
        return res.status(400).json({ 
          error: "Invalid pagination parameters. Page must be >= 1 and limit must be between 1 and 100." 
        });
      }
      
      // Get messages between users
      const result = await storage.getUserMessages(user1Id, user2Id, { page, limit });
      
      // Get user details for both participants
      const user1 = await storage.getUser(user1Id);
      const user2 = await storage.getUser(user2Id);
      
      // Enrich result with user information
      const enrichedResult = {
        ...result,
        user1: user1 ? {
          id: user1.id,
          username: user1.username,
          email: user1.email,
          isBlocked: user1.isBlocked,
          isRestricted: user1.isRestricted
        } : null,
        user2: user2 ? {
          id: user2.id,
          username: user2.username,
          email: user2.email,
          isBlocked: user2.isBlocked,
          isRestricted: user2.isRestricted
        } : null
      };
      
      res.json(enrichedResult);
    } catch (error) {
      console.error("Error fetching conversation messages:", error);
      res.status(500).json({ error: "Failed to fetch conversation messages" });
    }
  });
  
  // Block or unblock a conversation between users
  app.post("/api/admin/conversations/:user1Id/:user2Id/block", isAdmin, async (req, res) => {
    try {
      const user1Id = parseInt(req.params.user1Id);
      const user2Id = parseInt(req.params.user2Id);
      
      // Ensure the blocked parameter is a boolean
      let blocked = false;
      if (typeof req.body.blocked === 'boolean') {
        blocked = req.body.blocked;
      } else if (typeof req.body.blocked === 'string') {
        blocked = req.body.blocked.toLowerCase() === 'true';
      }
      
      console.log(`[BLOCK API] Received request to ${blocked ? 'block' : 'unblock'} conversation between users ${user1Id} and ${user2Id}`);
      console.log(`[BLOCK API] Original request body:`, req.body);
      console.log(`[BLOCK API] Parsed blocked value:`, blocked);
      
      // Force clear any existing state by getting the current conversation status
      const currentConversation = await storage.getConversationBetweenUsers(user1Id, user2Id);
      console.log(`[BLOCK API] Current conversation status:`, currentConversation);
      
      // Import database modules directly to ensure we can do direct operations if needed
      const { messagesDb } = await import("./messages-db");
      
      // Update the conversation status through storage interface first
      await storage.updateConversationStatus(user1Id, user2Id, { isBlocked: blocked });
      
      // Verify the update worked by fetching the updated conversation
      const updatedConversation = await storage.getConversationBetweenUsers(user1Id, user2Id);
      console.log(`[BLOCK API] Updated conversation status:`, updatedConversation);
      
      // Force direct update to ensure state consistency
      try {
        const minUserId = Math.min(user1Id, user2Id);
        const maxUserId = Math.max(user1Id, user2Id);
        
        // Run direct SQL to force the status - this ensures database is in sync
        await messagesDb.exec(`
          UPDATE userConversations 
          SET isBlocked = ${blocked ? 1 : 0} 
          WHERE (user1Id = ${minUserId} AND user2Id = ${maxUserId})
        `);
        
        // Also update in main database directly
        await db.exec(`
          UPDATE userConversations 
          SET isBlocked = ${blocked ? 1 : 0} 
          WHERE (user1Id = ${minUserId} AND user2Id = ${maxUserId})
        `);
        
        console.log(`[BLOCK API] Forced direct database update completed successfully`);
      } catch (dbError) {
        console.error(`[BLOCK API] Error during direct database update:`, dbError);
      }
      
      // Get the FINAL conversation status to be sure
      const finalConversation = await storage.getConversationBetweenUsers(user1Id, user2Id);
      console.log(`[BLOCK API] Final conversation status:`, finalConversation);
      
      // Broadcast a refresh event via WebSockets to both users 
      // This uses the Server-Side Broadcasting system
      const io = req.app.get('io');
      if (io) {
        try {
          console.log(`[BLOCK API] Broadcasting update to users via Socket.IO...`);
          
          // Use direct IO server broadcasts to rooms for reliability
          io.to(`user:${user1Id}`).emit('conversation_status_update', {
            otherUserId: user2Id,
            isBlocked: blocked,
            timestamp: new Date().toISOString()
          });
          
          io.to(`user:${user2Id}`).emit('conversation_status_update', {
            otherUserId: user1Id,
            isBlocked: blocked,
            timestamp: new Date().toISOString()
          });
          
          // Also send refresh events for redundancy
          io.to(`user:${user1Id}`).emit('refresh_conversation', { 
            otherUserId: user2Id,
            force: true 
          });
          
          io.to(`user:${user2Id}`).emit('refresh_conversation', { 
            otherUserId: user1Id,
            force: true 
          });
          
          // Try also sending directly to individual connections
          const user1Sockets = Array.from(io.sockets.sockets.values())
            .filter(socket => socket.data && socket.data.userId === user1Id);
          
          const user2Sockets = Array.from(io.sockets.sockets.values())
            .filter(socket => socket.data && socket.data.userId === user2Id);
          
          console.log(`[BLOCK API] Found ${user1Sockets.length} sockets for user ${user1Id}`);
          console.log(`[BLOCK API] Found ${user2Sockets.length} sockets for user ${user2Id}`);
          
          user1Sockets.forEach(socket => {
            socket.emit('conversation_status_update', { 
              otherUserId: user2Id,
              isBlocked: blocked,
              timestamp: new Date().toISOString()
            });
            
            socket.emit('refresh_conversation', { 
              otherUserId: user2Id,
              force: true 
            });
          });
          
          user2Sockets.forEach(socket => {
            socket.emit('conversation_status_update', { 
              otherUserId: user1Id,
              isBlocked: blocked,
              timestamp: new Date().toISOString()
            });
            
            socket.emit('refresh_conversation', { 
              otherUserId: user1Id,
              force: true 
            });
          });
          
          console.log(`[BLOCK API] Socket broadcasts completed successfully`);
        } catch (socketError) {
          console.error(`[BLOCK API] Error during socket broadcast:`, socketError);
        }
      } else {
        console.log(`[BLOCK API] Warning: Socket.IO server not available for broadcasting`);
      }
      
      console.log(`[BLOCK API] Successfully ${blocked ? 'blocked' : 'unblocked'} conversation`);
      res.json({ 
        success: true, 
        message: `Conversation ${blocked ? 'blocked' : 'unblocked'} successfully`,
        previousStatus: currentConversation?.isBlocked,
        newStatus: updatedConversation?.isBlocked
      });
    } catch (error) {
      console.error("Error updating conversation status:", error);
      res.status(500).json({ error: "Failed to update conversation status" });
    }
  });
  
  // Clear conversation history between users
  app.delete("/api/admin/conversations/:user1Id/:user2Id/messages", isAdmin, async (req, res) => {
    try {
      const user1Id = parseInt(req.params.user1Id);
      const user2Id = parseInt(req.params.user2Id);
      
      await storage.deleteConversationMessages(user1Id, user2Id);
      
      // Broadcast a refresh event via WebSockets to both users
      const io = req.app.get('io');
      if (io) {
        // Use the emitToUser function which will notify all active sessions for a given user
        const emitToUser = (userId, event, data) => {
          // Find all socket connections for this user
          const connections = Array.from(io.sockets.sockets.values())
            .filter(socket => socket.data && socket.data.userId === userId);
            
          if (connections.length > 0) {
            console.log(`[CLEAR API] Broadcasting ${event} to user ${userId} (${connections.length} active connections)`);
            // Emit to all connections for this user
            connections.forEach(socket => socket.emit(event, data));
            return true;
          }
          return false;
        };
        
        // Emit refresh_conversation event to both users
        emitToUser(user1Id, 'refresh_conversation', { otherUserId: user2Id });
        emitToUser(user2Id, 'refresh_conversation', { otherUserId: user1Id });
        console.log(`[CLEAR API] Broadcast refresh_conversation events to users ${user1Id} and ${user2Id}`);
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error clearing conversation history:", error);
      res.status(500).json({ error: "Failed to clear conversation history" });
    }
  });

  // Public test endpoint for development/debugging only (remove in production)
  app.get("/api/debug/ip-location", async (req, res) => {
    try {
      const { getLocationFromIp } = await import("./ip-location");
      const testIp = (req.query.ip as string) || req.ip;
      const locationData = getLocationFromIp(testIp);
      res.json({
        ip: testIp,
        location: locationData,
      });
    } catch (error) {
      console.error("Error testing IP location:", error);
      res.status(500).json({ error: "Failed to test IP location" });
    }
  });

  app.post("/api/admin/notifications/broadcast", isAdmin, async (req, res) => {
    try {
      const { title, message, type } = req.body;
      console.log("Broadcasting notification:", { title, type });

      const users = await storage.getAllUsers();

      // Use the createBroadcastNotifications function from notification-db
      await createBroadcastNotifications(users, {
        type,
        title,
        message,
      });
      broadcastUpdate("notification_update"); // Broadcast notification update
      res.status(201).json({ success: true, count: users.length });
    } catch (error: any) {
      console.error("Error broadcasting notification:", error);
      res.status(500).json({ error: "Failed to broadcast notification" });
    }
  });

  app.post(
    "/api/admin/notifications/user/:userId",
    isAdmin,
    async (req, res) => {
      try {
        const { userId } = req.params;
        const { title, message, type } = req.body;
        console.log("Sending notification to user:", userId);

        const user = await storage.getUser(parseInt(userId));
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        const notification = await notificationDb
          .insert(notifications)
          .values({
            userId: parseInt(userId),
            type,
            title,
            message,
            read: false,
          })
          .returning()
          .get();

        res.json(notification);
      } catch (error: any) {
        console.error("Error sending notification:", error);
        res.status(500).json({ error: "Failed to send notification" });
      }
    },
  );

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

          if (msg.characterId.startsWith("custom_")) {
            const customChar = await storage.getCustomCharacterById(
              parseInt(msg.characterId.replace("custom_", "")),
            );
            if (customChar) characterName = customChar.name;
          } else {
            // Get character from database instead of hardcoded array
            const predefinedChar = await storage.getPredefinedCharacterById(msg.characterId);
            if (predefinedChar) characterName = predefinedChar.name;
          }

          return {
            ...msg,
            username: user?.username || "Deleted User",
            characterName,
          };
        }),
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
        (await storage.getAllUsers()).map((user) =>
          storage.getCustomCharactersByUser(user.id),
        ),
      );
      
      // Get all predefined characters from the database
      const predefinedChars = await storage.getAllPredefinedCharacters();

      const stats = {
        totalCharacters: predefinedChars.length + customCharacters.flat().length,
        customCharactersCount: customCharacters.flat().length,
        predefinedCharactersCount: predefinedChars.length,
        averageCustomCharactersPerUser:
          customCharacters.flat().length /
          Math.max(1, (await storage.getAllUsers()).length),
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
        Object.entries(sessions as Record<string, any>).forEach(
          ([sessionId, session]) => {
            if (session?.passport?.user === userId) {
              storage.sessionStore.destroy(sessionId);
            }
          },
        );
      }

      await storage.updateUserStatus(userId, { isBlocked: blocked });
      broadcastUpdate("user_update"); // Broadcast update
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
      broadcastUpdate("user_update"); // Broadcast user deletion
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  app.post(
    "/api/admin/users/:userId/subscription",
    isAdmin,
    async (req, res) => {
      try {
        const userId = parseInt(req.params.userId);
        const { planId } = req.body;

        // Handle free plan
        if (planId === "free") {
          await storage.updateUserSubscription(userId, {
            isPremium: false,
            subscriptionTier: null,
            subscriptionStatus: "cancelled",
            subscriptionExpiresAt: new Date(),
          });
          return res.json({ success: true });
        }

        // Handle premium plans
        if (
          !Object.keys(subscriptionPlans).some(
            (plan) => subscriptionPlans[plan as SubscriptionTier].id === planId,
          )
        ) {
          return res.status(400).json({ error: "Invalid subscription plan" });
        }

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // Set expiration to 30 days from now

        await storage.updateUserSubscription(userId, {
          isPremium: true,
          subscriptionTier: planId,
          subscriptionStatus: "active",
          subscriptionExpiresAt: expiresAt,
        });

        res.json({ success: true });
      } catch (error: any) {
        res.status(500).json({ error: "Failed to update user subscription" });
      }
    },
  );

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
      const plan = await storage.updateSubscriptionPlan(
        req.params.id,
        req.body,
      );
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

  // Predefined characters management for admin dashboard
  app.get("/api/admin/predefined-characters", isAdmin, async (req, res) => {
    try {
      const characters = await storage.getAllPredefinedCharacters();
      res.json(characters);
    } catch (error: any) {
      console.error("Error fetching predefined characters:", error);
      res.status(500).json({ error: "Failed to fetch predefined characters" });
    }
  });
  
  // Configure multer storage for file uploads
  const multerStorage = multer.diskStorage({
    destination: function(req, file, cb) {
      const currentDir = process.cwd();
      const uploadDir = path.join(currentDir, 'client/public/character_images');
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      cb(null, uploadDir);
    },
    filename: function(req, file, cb) {
      // Generate unique filename with original extension
      const fileExt = path.extname(file.originalname);
      const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${fileExt}`;
      cb(null, uniqueName);
    }
  });
  
  // Set up file upload middleware with file type filter
  const upload = multer({
    storage: multerStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file size limit
    fileFilter: function(req, file, cb) {
      // Accept only image files
      if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
      }
      cb(null, true);
    }
  });
  
  // Get list of available character images from the local directory
  app.get("/api/admin/character-images", isAdmin, async (req, res) => {
    try {
      // In ESM, __dirname is not available, so we need to get the current directory in a different way
      const currentDir = process.cwd();
      const imagesDir = path.join(currentDir, 'client/public/character_images');
      
      // Check if directory exists
      if (!fs.existsSync(imagesDir)) {
        return res.json({ localImages: [] });
      }
      
      // Read the directory
      const files = fs.readdirSync(imagesDir);
      
      // Filter for image files only
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      const imageFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return imageExtensions.includes(ext);
      });
      
      // Format the response with path for frontend
      const localImages = imageFiles.map(file => ({
        filename: file,
        path: `/character_images/${file}`
      }));
      
      res.json({ localImages });
    } catch (error) {
      console.error("Error fetching character images:", error);
      res.status(500).json({ error: "Failed to fetch character images" });
    }
  });
  
  // Upload character image endpoint
  app.post("/api/admin/upload-character-image", isAdmin, upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      // Return the file path that can be used in the avatar field
      const filePath = `/character_images/${req.file.filename}`;
      
      // If characterId is provided, check if we need to clean up old images
      const characterId = req.body.characterId;
      if (characterId) {
        try {
          const existingCharacter = await storage.getPredefinedCharacterById(characterId);
          if (existingCharacter && existingCharacter.avatar && existingCharacter.avatar.startsWith('/character_images/')) {
            // Extract the old filename from the path
            const oldFilename = existingCharacter.avatar.split('/').pop();
            if (oldFilename && oldFilename !== req.file.filename) { // Don't delete if it's the same name (unlikely)
              const oldFilePath = `client/public/character_images/${oldFilename}`;
              // Check if file exists before attempting to delete
              if (fs.existsSync(oldFilePath)) {
                fs.unlinkSync(oldFilePath);
                console.log(`Deleted old character image: ${oldFilePath}`);
              }
            }
          }
        } catch (err) {
          console.error("Error cleaning up old character image:", err);
          // Continue even if deletion fails - don't block the upload
        }
      }
      
      res.json({ 
        success: true, 
        filename: req.file.filename,
        path: filePath
      });
    } catch (error) {
      console.error("Error uploading character image:", error);
      res.status(500).json({ error: "Failed to upload image" });
    }
  });

  app.get("/api/admin/predefined-characters/:id", isAdmin, async (req, res) => {
    try {
      const character = await storage.getPredefinedCharacterById(req.params.id);
      if (!character) {
        return res.status(404).json({ error: "Character not found" });
      }
      res.json(character);
    } catch (error: any) {
      console.error(`Error fetching predefined character ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to fetch predefined character" });
    }
  });

  app.post("/api/admin/predefined-characters", isAdmin, async (req, res) => {
    try {
      let { id, name, avatar, description, persona } = req.body;
      
      if (!id || !name || !avatar || !description || !persona) {
        return res.status(400).json({ error: "All fields are required" });
      }
      
      // Trim ID to prevent trailing spaces issues
      id = id.trim();
      
      // Check for case sensitivity issues and whitespace in ID
      if (id.includes(" ")) {
        return res.status(400).json({ 
          error: "Character ID should not contain spaces. Please use hyphens or underscores instead.",
          suggestion: id.replace(/\s+/g, "_") // Suggest a valid ID with underscores
        });
      }
      
      // Normalize ID to lowercase for consistency
      const normalizedId = id.toLowerCase();
      
      // Check if ID contains uppercase letters and warn if it does
      if (id !== normalizedId) {
        console.warn(`Character ID contains uppercase letters: ${id}. Consider using lowercase for consistency.`);
      }
      
      // Check if character with this ID already exists (exact match)
      const existingCharacter = await storage.getPredefinedCharacterById(id);
      if (existingCharacter) {
        return res.status(409).json({ error: "Character with this ID already exists" });
      }
      
      // Also check if character with normalized ID already exists
      if (id !== normalizedId) {
        const existingWithNormalizedId = await storage.getPredefinedCharacterById(normalizedId);
        if (existingWithNormalizedId) {
          return res.status(409).json({ 
            error: `A character with ID "${normalizedId}" already exists. IDs are case-sensitive but using different cases may cause confusion.` 
          });
        }
      }

      const newCharacter = await storage.createPredefinedCharacter({
        id,
        name,
        avatar,
        description,
        persona
      });

      res.status(201).json(newCharacter);
    } catch (error: any) {
      console.error("Error creating predefined character:", error);
      res.status(500).json({ error: "Error creating predefined character" });
    }
  });

  app.put("/api/admin/predefined-characters/:id", isAdmin, async (req, res) => {
    try {
      const { name, avatar, description, persona } = req.body;
      const characterId = req.params.id;
      
      // Check if character exists
      const existingCharacter = await storage.getPredefinedCharacterById(characterId);
      if (!existingCharacter) {
        return res.status(404).json({ error: "Character not found" });
      }
      
      // Clean up old local image if switching to URL
      if (existingCharacter.avatar && existingCharacter.avatar.startsWith('/character_images/') && 
          avatar && !avatar.startsWith('/character_images/')) {
        try {
          // Extract the old filename from the path
          const oldFilename = existingCharacter.avatar.split('/').pop();
          if (oldFilename) {
            const oldFilePath = `client/public/character_images/${oldFilename}`;
            // Check if file exists before attempting to delete
            if (fs.existsSync(oldFilePath)) {
              fs.unlinkSync(oldFilePath);
              console.log(`Deleted old character image when switching to URL: ${oldFilePath}`);
            }
          }
        } catch (err) {
          console.error("Error deleting old character image:", err);
          // Continue even if deletion fails
        }
      }

      // Update character
      const updatedCharacter = await storage.updatePredefinedCharacter(
        characterId,
        { name, avatar, description, persona }
      );

      res.json(updatedCharacter);
    } catch (error: any) {
      console.error(`Error updating predefined character ${req.params.id}:`, error);
      res.status(500).json({ error: "Error updating predefined character" });
    }
  });

  app.delete("/api/admin/predefined-characters/:id", isAdmin, async (req, res) => {
    try {
      let characterId = req.params.id;
      let existingCharacter;
      
      // Check if character exists
      existingCharacter = await storage.getPredefinedCharacterById(characterId);
      
      // Special case for "kishor" without space at the end
      if (!existingCharacter && characterId === "kishor") {
        // Try with a space at the end "kishor " for deletion too
        characterId = "kishor ";
        existingCharacter = await storage.getPredefinedCharacterById(characterId);
      }
      
      if (!existingCharacter) {
        return res.status(404).json({ error: "Character not found" });
      }
      
      // Clean up local image file if it's a local image
      if (existingCharacter.avatar && existingCharacter.avatar.startsWith('/character_images/')) {
        try {
          const oldFilename = existingCharacter.avatar.split('/').pop();
          if (oldFilename) {
            const oldFilePath = `client/public/character_images/${oldFilename}`;
            if (fs.existsSync(oldFilePath)) {
              fs.unlinkSync(oldFilePath);
              console.log(`Deleted character image file when deleting character: ${oldFilePath}`);
            }
          }
        } catch (err) {
          console.error("Error deleting character image file:", err);
          // Continue with deletion even if image cleanup fails
        }
      }

      // Delete character
      await storage.deletePredefinedCharacter(characterId);

      res.json({ success: true, message: "Character deleted successfully" });
    } catch (error: any) {
      console.error(`Error deleting predefined character ${req.params.id}:`, error);
      res.status(500).json({ error: "Error deleting predefined character" });
    }
  });

  app.get("/api/characters", async (req, res) => {
    try {
      // Get predefined characters from database
      const predefinedChars = await storage.getAllPredefinedCharacters();
      
      // Get custom characters created by the user
      const customChars = await storage.getCustomCharactersByUser(req.user.id);
      
      // Define the threshold for new characters (7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      // Format predefined characters and mark recent ones as "new"
      const formattedPredefinedChars = predefinedChars.map(char => {
        const isNew = char.createdAt && char.createdAt > sevenDaysAgo;
        return {
          ...char,
          isNew // Add isNew flag
        };
      });
      
      // Format custom characters
      const formattedCustomChars = customChars.map((char) => ({
        id: `custom_${char.id}`,
        name: char.name,
        avatar: char.avatar,
        description: char.description,
        persona: char.persona,
        isNew: false // Custom characters don't get the "new" badge
      }));

      // Always use characters from the database without fallback
      const allCharacters = [...formattedPredefinedChars, ...formattedCustomChars];
        
      res.json(allCharacters);
    } catch (error: any) {
      console.error("Error fetching characters:", error);
      res.status(500).json({ error: "Failed to fetch characters" });
    }
  });

  // Handle the /api/character endpoint without an ID parameter
  app.get("/api/character", async (req, res) => {
    // Return a default response when no ID is provided
    return res.status(200).json({ message: "Please specify a character ID" });
  });

  // Add endpoint to fetch any character (predefined or custom) by ID
  app.get("/api/character/:id", async (req, res) => {
    try {
      const characterId = req.params.id;
      let character;
      
      // Check if it's a custom character (ID starts with "custom_")
      if (characterId.startsWith("custom_")) {
        const customId = parseInt(characterId.replace("custom_", ""), 10);
        character = await storage.getCustomCharacterById(customId);
      } else {
        // It's a predefined character
        character = await storage.getPredefinedCharacterById(characterId);
        
        // Special case for "kishor" without space at the end
        if (!character && characterId === "kishor") {
          // Try with a space at the end "kishor "
          character = await storage.getPredefinedCharacterById("kishor ");
        }
      }
      
      if (!character) {
        return res.status(404).json({ error: "Character not found" });
      }
      
      // Add the same formatting as in the /api/characters endpoint
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      // Format based on character type
      const formattedCharacter = characterId.startsWith("custom_") 
        ? {
            id: characterId, // Keep the custom_ prefix
            name: character.name,
            avatar: character.avatar,
            description: character.description,
            persona: character.persona,
            isNew: false // Custom characters don't get the "new" badge
          }
        : {
            ...character,
            isNew: character.createdAt && character.createdAt > sevenDaysAgo
          };
      
      res.json(formattedCharacter);
    } catch (error: any) {
      console.error(`Error fetching character ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to fetch character" });
    }
  });

  app.get("/api/messages/:characterId", async (req, res) => {
    try {
      let characterId = req.params.characterId;
      
      // Special case for "kishor" without space at the end
      if (characterId === "kishor") {
        // Use with a space at the end "kishor " for messages too
        characterId = "kishor ";
      }
      
      const messages = await storage.getMessagesByCharacter(characterId);
      // Only return messages belonging to the authenticated user
      const userMessages = messages.filter((msg) => msg.userId === req.user.id);
      res.json(userMessages);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.get("/api/user", async (req, res) => {
    res.json(req.user);
  });
  
  // Search users by username endpoint
  app.get("/api/users/search", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    try {
      const query = req.query.q as string;
      
      if (!query || query.trim() === "") {
        return res.status(400).json({ error: "Search query is required" });
      }
      
      const users = await storage.searchUsersByUsername(query);
      
      // Remove sensitive information before sending to client
      const sanitizedUsers = users.map(user => ({
        id: user.id,
        username: user.username,
        fullName: user.fullName || user.username,
        profileCompleted: user.profileCompleted || false,
        lastLoginAt: user.lastLoginAt
      }));
      
      res.json(sanitizedUsers);
    } catch (error) {
      console.error("Error searching users:", error);
      res.status(500).json({ error: "Failed to search users" });
    }
  });
  
  // Update user profile endpoint
  app.post("/api/user/profile", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    try {
      const { fullName, age, gender, bio } = req.body;
      
      // Validate the input data
      if (!fullName || fullName.trim() === "") {
        return res.status(400).json({ error: "Full name is required" });
      }
      
      if (age === undefined || isNaN(Number(age)) || Number(age) < 13) {
        return res.status(400).json({ error: "Valid age is required (must be 13 or older)" });
      }
      
      if (!gender || gender.trim() === "") {
        return res.status(400).json({ error: "Gender is required" });
      }
      
      // Get current user to check if they already have a full name
      // This ensures we don't overwrite Google-provided names unnecessarily
      const currentUser = await storage.getUser(req.user.id);
      
      // Update the user profile 
      const updatedUser = await storage.updateUserProfile(req.user.id, {
        // Only update fullName if it's different or not already set
        fullName: currentUser?.fullName && fullName === currentUser.fullName ? currentUser.fullName : fullName,
        age: Number(age),
        gender,
        bio,
        profileCompleted: true,
      });
      
      // Return the updated user
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });
  
  // Update username endpoint
  app.post("/api/user/username", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    try {
      const { username } = req.body;
      
      // Validate the input data
      if (!username || username.trim() === "") {
        return res.status(400).json({ error: "Username is required" });
      }
      
      if (username.length < 3) {
        return res.status(400).json({ error: "Username must be at least 3 characters" });
      }
      
      // Update the username
      const updatedUser = await storage.updateUsername(req.user.id, username);
      
      // Return the updated user
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating username:", error);
      if (error.message === "Username already taken") {
        return res.status(400).json({ error: "Username already taken" });
      }
      res.status(500).json({ error: "Failed to update username" });
    }
  });

  app.post("/api/custom-characters", async (req, res) => {
    try {
      const user = req.user;
      if (!user) {
        throw new Error("User not found");
      }

      // Check if user can create more characters based on their plan
      const canCreate = await storage.validateCharacterCreation(user.id);
      if (!canCreate) {
        const limit = await storage.getCharacterLimit(user.id);
        const planName = user.subscriptionTier
          ? subscriptionPlans[user.subscriptionTier.toUpperCase()]?.name
          : "Free";

        return res.status(403).json({
          error: `Character creation limit reached (${limit} characters) for ${planName}. ${
            user.subscriptionTier === "basic"
              ? "Upgrade to Premium plan to create up to 45 characters."
              : "Please upgrade your plan to create more characters."
          }`,
          limitReached: true,
        });
      }

      const data = insertCustomCharacterSchema.parse({
        ...req.body,
        userId: user.id,
      });

      const character = await storage.createCustomCharacter(data);
      if (!user.isPremium) {
        await storage.incrementTrialCharacterCount(user.id);
      }

      res.json(character);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/custom-characters/:id", async (req, res) => {
    try {
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
      const user = req.user;

      // Check message limit for free users
      if (!user.isPremium) {
        const messageCount = await storage.getUserMessageCount(user.id);
        if (messageCount >= FREE_USER_MESSAGE_LIMIT) {
          return res.status(403).json({
            error:
              "Message limit reached. Please upgrade to premium to continue chatting.",
            limitReached: true,
          });
        }
      }

      const data = insertMessageSchema.parse({
        ...req.body,
        userId: user.id,
      });
      const message = await storage.createMessage(data);
      
      // Track this conversation for potential proactive messaging
      let character: any = null;
      
      // Get character data for tracking
      if (data.characterId.startsWith('custom_')) {
        const customId = parseInt(data.characterId.replace('custom_', ''));
        character = await storage.getCustomCharacterById(customId);
      } else {
        character = await storage.getPredefinedCharacterById(data.characterId);
      }
      
      // Track the conversation for proactive messaging
      if (character) {
        trackConversation(user.id, data.characterId, true, character);
      }

      if (data.isUser) {
        try {
          let character;
          const isCustom = data.characterId.startsWith("custom_");
          const characterIdNum = isCustom
            ? parseInt(data.characterId.replace("custom_", ""), 10)
            : null;

          // Check if user has access to advanced features
          const hasAdvancedAccess = await storage.validateFeatureAccess(
            user.id,
            "advanced",
          );
          if (!hasAdvancedAccess && data.script) {
            return res.status(403).json({
              error:
                "Advanced character features require a premium subscription.",
              premiumRequired: true,
            });
          }

          if (isCustom && characterIdNum !== null) {
            const customChar =
              await storage.getCustomCharacterById(characterIdNum);
            if (!customChar) throw new Error("Custom character not found");
            character = {
              id: `custom_${customChar.id}`,
              name: customChar.name,
              avatar: customChar.avatar,
              description: customChar.description,
              persona: customChar.persona,
            };
          } else {
            // Get character from the database
            character = await storage.getPredefinedCharacterById(data.characterId);
            
            // Special case for "kishor" without space at the end
            if (!character && data.characterId === "kishor") {
              // Try with a space at the end "kishor "
              character = await storage.getPredefinedCharacterById("kishor ");
            }
            
            if (!character) throw new Error("Predefined character not found");
          }

          const messages = await storage.getMessagesByCharacter(
            data.characterId,
          );
          const chatHistory = messages
            .map((m) => `${m.isUser ? "User" : character.name}: ${m.content}`)
            .join("\n");
          
          // Fetch user profile data to personalize responses
          const userProfile = await storage.getUser(user.id);
          
          // Extract only profile fields
          const userProfileData = userProfile ? {
            fullName: userProfile.fullName,
            age: userProfile.age,
            gender: userProfile.gender,
            bio: userProfile.bio
          } : undefined;
          
          console.log(`Generating AI response for ${character.name} with user profile data:`, 
                      userProfileData ? 'Profile data available' : 'No profile data');

          const aiResponse = await generateCharacterResponse(
            character,
            data.content,
            chatHistory,
            data.language,
            data.script,
            userProfileData
          );

          const aiMessage = await storage.createMessage({
            userId: user.id,
            characterId: data.characterId,
            content: aiResponse,
            isUser: false,
            language: data.language,
            script: data.script,
          });
          
          // Track the conversation for the AI response too
          trackConversation(user.id, data.characterId, false, character);

          // Return the messages immediately so the client has the user message
          res.json([message, aiMessage]);
          
          // After response is sent, start progressive delivery
          try {
            // Import the progressive delivery service
            const { deliverProgressiveMessage } = await import('./services/progressive-delivery');
            
            // Deliver the message in progressive chunks with typing animations
            deliverProgressiveMessage(
              user.id,
              data.characterId,
              aiResponse,
              aiMessage.id,
              character.name,
              character.avatar
            ).catch(err => {
              console.error('Error in progressive message delivery:', err);
            });
            
            // Also schedule a follow-up message if the character promised something
            // This schedules automatic responses for things like "I'll be right back with food"
            try {
              // Import the follow-up messages service
              const { scheduleFollowUpMessage } = await import('./services/follow-up-messages');
              
              // Get character personality for contextual follow-ups
              const personality = character.persona || 'friendly and helpful';
              
              // Schedule a follow-up message if the AI's response contains a promise
              scheduleFollowUpMessage(
                user.id,
                data.characterId,
                aiResponse,
                character.name,
                character.avatar,
                personality
              ).catch(err => {
                console.error('Error scheduling follow-up message:', err);
              });
            } catch (followUpError) {
              console.error('Failed to initialize follow-up message service:', followUpError);
              // Non-critical error - main functionality will still work
            }
          } catch (error) {
            console.error('Failed to initialize progressive message delivery:', error);
          }
        } catch (error: any) {
          // If AI response fails, still return the user message but with an error
          res.status(207).json({
            messages: [message],
            error: "Failed to generate AI response",
          });
        }
      } else {
        res.json([message]);
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Add API access check for custom character API endpoints
  app.get("/api/custom-characters/api", async (req, res) => {
    try {
      const hasApiAccess = await storage.validateFeatureAccess(
        req.user.id,
        "api",
      );
      if (!hasApiAccess) {
        return res.status(403).json({
          error: "API access requires a Pro subscription.",
          upgradeRequired: true,
        });
      }

      const customChars = await storage.getCustomCharactersByUser(req.user.id);
      res.json(customChars);
    } catch (error: any) {
      res
        .status(500)
        .json({ error: "Failed to fetch custom characters API data" });
    }
  });

  app.delete("/api/messages/:characterId", async (req, res) => {
    let characterId = req.params.characterId;
    
    // Special case for "kishor" without space at the end
    if (characterId === "kishor") {
      // Use with a space at the end "kishor " for messages too
      characterId = "kishor ";
    }
    
    await storage.clearChat(characterId);
    res.json({ success: true });
  });

  // Add more detailed logging in the payment verification route
  app.post("/api/verify-payment", async (req, res) => {
    try {
      const { orderID, planId } = req.body;
      console.log("Starting payment verification process:", {
        orderID,
        planId,
      });

      if (!orderID) {
        console.log("Payment verification failed: Missing order ID");
        return res.status(400).json({ error: "Order ID is required" });
      }

      if (!planId) {
        console.log("Payment verification failed: Missing plan ID");
        return res.status(400).json({ error: "Plan ID is required" });
      }

      // Verify plan exists
      const plan = await storage.getSubscriptionPlan(planId);
      if (!plan) {
        console.log("Payment verification failed: Invalid plan ID:", planId);
        return res.status(400).json({ error: "Invalid subscription plan" });
      }

      console.log("Verifying payment with PayPal:", orderID);
      console.log("Using plan:", plan);

      // Get PayPal configuration from database
      const paypalConfig = await getPayPalConfig();
      if (!paypalConfig.clientId || !paypalConfig.clientSecret) {
        console.error("Missing PayPal credentials in configuration");
        return res
          .status(500)
          .json({
            error:
              "Payment verification unavailable. Missing PayPal credentials.",
          });
      }

      // Building PayPal API auth and request
      const auth = Buffer.from(
        `${paypalConfig.clientId}:${paypalConfig.clientSecret}`,
      ).toString("base64");
      console.log("Making PayPal API request for order:", orderID);

      const paypalResponse = await fetch(
        `https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderID}`,
        {
          method: "GET",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!paypalResponse.ok) {
        const errorText = await paypalResponse.text();
        console.error("PayPal API error response:", errorText);
        return res.status(400).json({
          error: "PayPal verification failed",
          details: `Status: ${paypalResponse.status} ${paypalResponse.statusText}`,
        });
      }

      const paypalData = await paypalResponse.json();
      console.log("PayPal API response:", paypalData);

      // Verify payment was completed successfully
      if (
        paypalData.status !== "COMPLETED" &&
        paypalData.status !== "APPROVED"
      ) {
        console.log("Payment not completed. Status:", paypalData.status);
        return res.status(400).json({
          error: "Payment not completed",
          details: paypalData,
        });
      }

      // Verify payment amount matches plan price
      const priceValue = parseFloat(plan.price.replace(/[^0-9.]/g, ""));
      let paymentAmount = 0;

      if (
        paypalData.purchase_units &&
        paypalData.purchase_units[0] &&
        paypalData.purchase_units[0].amount
      ) {
        paymentAmount = parseFloat(paypalData.purchase_units[0].amount.value);
      }

      console.log("Verifying payment amount:", {
        expected: priceValue,
        received: paymentAmount,
      });

      if (paymentAmount < priceValue) {
        console.log("Payment amount mismatch:", {
          expected: priceValue,
          received: paymentAmount,
        });
        return res.status(400).json({
          error: "Payment amount does not match plan price",
          expected: priceValue,
          received: paymentAmount,
        });
      }

      // Return success response with verification data
      console.log("Payment verified successfully");
      res.json({
        success: true,
        verification: paypalData,
      });
    } catch (error: any) {
      console.error("Payment verification error:", error);
      res.status(400).json({
        error: "Payment verification failed",
        message: error.message,
      });
    }
  });

  app.post("/api/subscribe", async (req, res) => {
    try {
      const user = req.user;
      const { planId, paymentVerified } = req.body;

      if (!user) {
        throw new Error("User not found");
      }

      if (!planId) {
        throw new Error("Plan ID is required");
      }

      console.log(
        `Subscription request for user ${user.id}, plan ${planId}, payment verified: ${paymentVerified}`,
      );

      // Only proceed if payment has been verified
      if (!paymentVerified) {
        console.warn(
          `Subscription attempted without payment verification for user ${user.id}`,
        );
        throw new Error(
          "Payment must be verified before subscription can be activated",
        );
      }

      // Get plan from database to ensure it exists
      const plan = await storage.getSubscriptionPlan(planId);
      if (!plan) {
        console.error(
          `Invalid subscription plan ${planId} requested by user ${user.id}`,
        );
        throw new Error("Invalid subscription plan");
      }

      console.log(
        `Processing subscription for user ${user.id} to plan ${plan.name} (${planId})`,
      );

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      await storage.updateUserSubscription(user.id, {
        isPremium: true,
        subscriptionTier: planId,
        subscriptionStatus: "active",
        subscriptionExpiresAt: expiresAt,
      });

      console.log(`Subscription successfully activated for user ${user.id}`);

      res.json({
        success: true,
        message: "Subscription activated successfully",
      });
    } catch (error: any) {
      console.error("Subscription error:", error);
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
          details: parsedInput.error.errors,
        });
      }

      const feedback = await feedbackStorage.createFeedback(parsedInput.data);
      res.status(201).json(feedback);
    } catch (error: any) {
      console.error("Error saving feedback:", error);
      res.status(500).json({ error: "Failed to submit feedback" });
    }
  });

  // Add endpoint to get all feedback (admin only)
  app.get("/api/admin/feedback", isAdmin, async (req, res) => {
    try {
      const allFeedback = await feedbackStorage.getAllFeedback();
      res.json(allFeedback);
    } catch (error: any) {
      console.error("Error fetching feedback:", error);
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
      console.error("Error deleting feedback:", error);
      res.status(500).json({ error: "Failed to delete feedback" });
    }
  });

  // Username availability check endpoint
  app.get("/api/auth/check-username/:username", async (req, res) => {
    try {
      const { username } = req.params;
      if (!username || username.trim().length < 3) {
        return res.status(400).json({
          available: false,
          error: "Username must be at least 3 characters"
        });
      }

      const existingUser = await storage.getUserByUsername(username);
      return res.json({
        available: !existingUser,
        message: existingUser ? "Username already taken" : "Username available"
      });
    } catch (error: any) {
      console.error("Error checking username availability:", error);
      res.status(500).json({ error: "Failed to check username availability" });
    }
  });

  // Email availability check endpoint
  app.get("/api/auth/check-email/:email", async (req, res) => {
    try {
      const { email } = req.params;
      if (!email || !isValidEmail(email)) {
        return res.status(400).json({
          available: false,
          error: "Invalid email format"
        });
      }

      const existingUser = await storage.getUserByEmail(email);
      return res.json({
        available: !existingUser,
        message: existingUser ? "Email already registered" : "Email available"
      });
    } catch (error: any) {
      console.error("Error checking email availability:", error);
      res.status(500).json({ error: "Failed to check email availability" });
    }
  });

  // Add complaint submission endpoint
  app.post("/api/complaints", upload.single("image"), async (req, res) => {
    try {
      const { name, email, message } = req.body;

      const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

      const complaint = await complaintStorage.createComplaint({
        name,
        email,
        message,
        imageUrl,
      });

      res.status(201).json(complaint);
    } catch (error: any) {
      console.error("Error saving complaint:", error);
      res.status(500).json({ error: "Failed to submit complaint" });
    }
  });

  // Add endpoint to get all complaints (admin only)
  app.get("/api/admin/complaints", isAdmin, async (req, res) => {
    try {
      const allComplaints = await complaintStorage.getAllComplaints();
      res.json(allComplaints);
    } catch (error: any) {
      console.error("Error fetching complaints:", error);
      res.status(500).json({ error: "Failed to fetch complaints" });
    }
  });

  // Enhanced login route - SQL injection-proof and optimized for high volume
  app.post("/api/login", authRateLimiter(), async (req, res, next) => {
    try {
      // Input validation using zod schema to prevent SQL injection
      const loginSchema = z.object({
        username: z.string().trim().min(1).max(50),
        password: z.string().min(1),
        rememberMe: z.boolean().optional()
      });
      
      // Safe parsing with detailed error handling
      const validationResult = loginSchema.safeParse(req.body);
      if (!validationResult.success) {
        const errorMessage = fromZodError(validationResult.error).message;
        return res.status(400).json({
          error: "Invalid input format",
          details: errorMessage
        });
      }
      
      const { username, password, rememberMe } = validationResult.data;
      
      // Use parameterized queries via Drizzle ORM to prevent SQL injection
      const user = await storage.getUserByUsername(username);

      // Check for blocked status before authentication
      if (user?.isBlocked) {
        return res.status(403).json({
          error: "Your account has been blocked. Please contact support.",
        });
      }

      // Early return if user doesn't exist (prevents timing attacks)
      if (!user) {
        // Use constant time comparison to prevent timing attacks
        // Still perform password hash operation even though user doesn't exist
        // This prevents timing attacks that could determine if a username exists
        await hashPassword("dummy-password");
        
        return res.status(401).json({
          error: "Invalid username or password",
        });
      }

      // Only proceed with authentication if user exists and is not blocked
      passport.authenticate(
        "local",
        async (err: any, authenticatedUser: any) => {
          if (err) return next(err);

          if (!authenticatedUser) {
            return res.status(401).json({
              error: "Invalid username or password",
            });
          }

          // Double check block status after authentication to prevent race conditions
          const currentUser = await storage.getUserByUsername(
            authenticatedUser.username,
          );
          if (currentUser?.isBlocked) {
            return res.status(403).json({
              error: "Your account has been blocked. Please contact support.",
            });
          }

          // Set session expiration based on remember me option
          if (rememberMe) {
            // If remember me is checked, set cookie to expire in 30 days
            req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
          } else {
            // Otherwise, use default session expiration (typically browser session)
            req.session.cookie.expires = undefined;
          }
          
          // Set additional security headers for the session cookie
          req.session.cookie.secure = process.env.NODE_ENV === "production";
          req.session.cookie.httpOnly = true; // Prevent JavaScript access to cookie
          req.session.cookie.sameSite = "lax"; // CSRF protection
          
          req.logIn(authenticatedUser, async (err) => {
            if (err) return next(err);
            
            // Get client IP for security logging
            const clientIP = (req.headers['x-forwarded-for'] || req.ip || '').toString();
            await storage.updateLastLogin(authenticatedUser.id, clientIP);
            
            // Filter sensitive data before sending response
            const { password, verificationToken, tokenExpiry, ...safeUserData } = authenticatedUser;
            res.json(safeUserData);
          });
        },
      )(req, res, next);
    } catch (error) {
      next(error);
    }
  });

  // Enhanced endpoint for sending OTP during registration - SQL injection-proof and high-volume capable
  app.post("/api/verify/send-otp", authRateLimiter(), async (req, res) => {
    try {
      // Input validation using Zod schema to prevent injection
      const otpSchema = z.object({
        email: z.string().email("Invalid email format").trim().toLowerCase(),
        registrationData: z.object({
          username: z.string().min(3).max(30),
          email: z.string().email(),
          password: z.string().min(8),
          fullName: z.string().optional(),
          bio: z.string().optional(),
          // Add any other expected registration fields
        }).optional()
      });
      
      // Safely parse and validate input
      const validationResult = otpSchema.safeParse(req.body);
      if (!validationResult.success) {
        const errorMessage = fromZodError(validationResult.error).message;
        return res.status(400).json({ 
          error: "Invalid input data", 
          details: errorMessage 
        });
      }
      
      const { email, registrationData } = validationResult.data;

      // Check if email already exists and is verified (using parameterized query)
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser?.isEmailVerified) {
        return res
          .status(400)
          .json({ error: "Email already registered and verified" });
      }

      // Additional validation for registration data if provided
      if (registrationData) {
        const { username, email: regEmail } = registrationData;
        
        // Double check username and email availability using parameterized queries
        const existingUsername = await storage.getUserByUsername(username);
        if (existingUsername) {
          return res.status(400).json({ error: "Username already taken" });
        }
        
        // Verify that the email in registration data matches the main email parameter
        if (regEmail.toLowerCase() !== email.toLowerCase()) {
          return res.status(400).json({ error: "Email mismatch in registration data" });
        }
      }

      // Generate secure OTP
      const otp = await generateOTPemail();
      const expiry = new Date();
      expiry.setMinutes(expiry.getMinutes() + 10); // OTP expires in 10 minutes

      // Implement rate limiting for OTP requests per email
      const existingVerifications = await storage.countPendingVerificationsForEmail(email);
      if (existingVerifications > 5) {
        return res.status(429).json({ 
          error: "Too many verification attempts. Please try again later." 
        });
      }

      // Store pending verification with registration data if provided
      // Use parameterized queries for database operations
      await storage.createPendingVerification({
        email,
        verificationToken: otp,
        tokenExpiry: expiry,
        registrationData: registrationData
          ? JSON.stringify(registrationData)
          : null,
      });

      // Send the OTP email
      await sendVerificationEmail2(email, otp);
      
      // Return sanitized response
      res.json({ 
        message: "OTP sent successfully",
        expiresIn: "10 minutes"
      });
    } catch (error: any) {
      console.error("Error sending OTP:", error);
      // Generic error message for production to prevent information disclosure
      res.status(500).json({ error: "Failed to process verification request. Please try again." });
    }
  });

  // Enhanced verify-otp endpoint - SQL injection-proof and high-volume capable
  app.post("/api/verify/verify-otp", authRateLimiter(), async (req, res) => {
    try {
      // Input validation with zod schema
      const otpVerifySchema = z.object({
        email: z.string().email("Invalid email format").trim().toLowerCase(),
        otp: z.string().min(4).max(8)
      });
      
      // Safe parsing with detailed error handling
      const validationResult = otpVerifySchema.safeParse(req.body);
      if (!validationResult.success) {
        const errorMessage = fromZodError(validationResult.error).message;
        return res.status(400).json({ 
          error: "Invalid input data", 
          details: errorMessage 
        });
      }
      
      const { email, otp } = validationResult.data;

      // Check if there's a pending verification using parameterized query
      const verification = await storage.getPendingVerification(email);
      if (!verification) {
        return res.status(400).json({ error: "No pending verification found" });
      }

      // Verify the OTP using parameterized query and constant-time comparison
      const isValid = await storage.verifyPendingToken(email, otp);
      if (!isValid) {
        return res.status(400).json({ error: "Invalid or expired OTP" });
      }

      // If we have registration data, create the user
      if (verification.registrationData) {
        const userData = JSON.parse(verification.registrationData);
        
        // Final validation check before creating user
        // Check if username or email was taken during the verification window
        const existingUsername = await storage.getUserByUsername(userData.username);
        const existingEmail = await storage.getUserByEmail(userData.email);
        
        if (existingUsername) {
          await storage.deletePendingVerification(email);
          return res.status(400).json({ 
            error: "Username has been taken while your verification was pending. Please choose another username." 
          });
        }
        
        if (existingEmail && existingEmail.isEmailVerified) {
          await storage.deletePendingVerification(email);
          return res.status(400).json({ 
            error: "Email has been registered while your verification was pending." 
          });
        }
        
        // Hash the password before creating user
        const hashedPassword = await hashPassword(userData.password);
        const user = await storage.createUser({
          ...userData,
          password: hashedPassword,
          isEmailVerified: true,
        });
        await storage.deletePendingVerification(email);

        // Log in the user after successful registration
        req.login(user, (err) => {
          if (err) {
            console.error("Auto-login after registration failed:", err);
            return res.json({
              message:
                "Email verified and account created successfully. Please login.",
              user,
            });
          }
          res.json({
            message: "Email verified and account created successfully",
            user,
          });
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

  // Enhanced password reset request endpoint - SQL injection-proof and high-volume capable
  app.post("/api/auth/forgot-password", authRateLimiter(), async (req, res) => {
    try {
      // Input validation with zod schema
      const forgotPasswordSchema = z.object({
        email: z.string().email("Invalid email format").trim().toLowerCase()
      });
      
      // Safe parsing with detailed error handling
      const validationResult = forgotPasswordSchema.safeParse(req.body);
      if (!validationResult.success) {
        const errorMessage = fromZodError(validationResult.error).message;
        return res.status(400).json({ 
          error: "Invalid input data", 
          details: errorMessage 
        });
      }
      
      const { email } = validationResult.data;
      
      // Get client IP for tracking and rate limiting
      const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
      
      // Add a small random delay to prevent timing attacks (helps hide whether user exists)
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 150));

      // Check user existence with parameterized query
      const user = await storage.getUserByEmail(email);
      
      // Respond with generic success even if user not found (prevents user enumeration)
      if (!user) {
        // Create a dummy OTP but don't send it or store it
        await generateOTPemail();
        
        console.log(`Password reset requested for non-existent email: ${email} from IP: ${ipAddress}`);
        
        return res.json({ 
          message: "If your email exists in our system, you will receive a password reset OTP shortly" 
        });
      }

      // Check if account is blocked or restricted
      if (user.isBlocked || user.isRestricted) {
        console.log(`Password reset blocked for restricted/blocked account: ${email}`);
        
        // Return generic message even though we won't send email
        return res.json({
          message: "If your email exists in our system, you will receive a password reset OTP shortly"
        });
      }

      // Rate limit password reset requests per user
      const recentRequests = await storage.countRecentPasswordResetRequests(user.id);
      if (recentRequests > 3) { // No more than 3 requests in last 30 minutes
        console.log(`Password reset rate limited for user ID ${user.id}, email ${email}: ${recentRequests} attempts`);
        
        // Log this rate limit hit too
        await storage.logPasswordResetAttempt(user.id);
        
        return res.status(429).json({ 
          error: "Too many password reset attempts. Please try again later." 
        });
      }

      // Generate secure OTP
      const otp = await generateOTPemail();
      const expiry = new Date();
      expiry.setMinutes(expiry.getMinutes() + 10);

      // Update verification token with parameterized queries
      await storage.updateVerificationToken(user.id, otp, expiry);
      
      // Log password reset attempt for rate limiting
      await storage.logPasswordResetAttempt(user.id);
      
      // Send the password reset email
      await sendPasswordResetEmail(email, otp);
      
      console.log(`Password reset email sent to user ID ${user.id}, email ${email}`);

      // Return generic success response
      res.json({ 
        message: "If your email exists in our system, you will receive a password reset OTP shortly",
        expiresIn: "10 minutes"
      });
    } catch (error: any) {
      console.error("Error initiating password reset:", error);
      // Generic error message for production to prevent information disclosure
      res.status(500).json({ error: "Failed to process your request. Please try again." });
    }
  });

  // Endpoint for resetting password with OTP
  app.post("/api/auth/reset-password", authRateLimiter(), async (req, res) => {
    try {
      // Input validation with zod schema
      const resetPasswordSchema = z.object({
        email: z.string().email("Invalid email format").trim().toLowerCase(),
        otp: z.string().min(6, "OTP must be at least 6 characters").max(10),
        newPassword: z.string()
          .min(8, "Password must be at least 8 characters")
          .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
          .regex(/[a-z]/, "Password must contain at least one lowercase letter")
          .regex(/[0-9]/, "Password must contain at least one number")
          .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character")
      });
      
      // Safe parsing with detailed error handling
      const validationResult = resetPasswordSchema.safeParse(req.body);
      if (!validationResult.success) {
        const errorMessage = fromZodError(validationResult.error).message;
        return res.status(400).json({ 
          error: "Invalid input data", 
          details: errorMessage 
        });
      }
      
      const { email, otp, newPassword } = validationResult.data;

      // Get user with parameterized query
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Return generic error to prevent user enumeration
        await new Promise(resolve => setTimeout(resolve, 250)); // Add delay to prevent timing attacks
        return res.status(400).json({ error: "Invalid or expired OTP" });
      }

      // Check for excessive reset attempts
      const recentRequests = await storage.countRecentPasswordResetRequests(user.id);
      if (recentRequests > 5) { // No more than 5 verification attempts in 30 minutes
        return res.status(429).json({ 
          error: "Too many password reset attempts. Please request a new code." 
        });
      }

      // Verify OTP with parameterized query
      const isValid = await storage.verifyEmail(user.id, otp);
      if (!isValid) {
        // Log failed attempt
        await storage.logPasswordResetAttempt(user.id);
        return res.status(400).json({ error: "Invalid or expired OTP" });
      }

      // Hash new password and update with SQL injection protection
      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUserPassword(user.id, hashedPassword);

      // Force logout of all existing sessions for this user (optional security measure)
      // This requires session store access which is not implemented here

      res.json({ 
        message: "Password reset successfully",
        redirectTo: "/login"
      });
    } catch (error: any) {
      console.error("Error resetting password:", error);
      // Generic error message for production to prevent information disclosure
      res.status(500).json({ error: "Failed to process your request. Please try again." });
    }
  });

  // Add new analytics endpoints before httpServer creation
  // Endpoint for user location distribution
  app.get("/api/admin/analytics/user-locations", isAdmin, async (req, res) => {
    try {
      // Query all users and count by country
      const allUsers = await storage.getAllUsers();

      // Count users by country
      const countryData = allUsers.reduce(
        (acc: Record<string, number>, user) => {
          const country = user.countryName || "Unknown";
          acc[country] = (acc[country] || 0) + 1;
          return acc;
        },
        {},
      );

      // Convert to array and sort by count (descending)
      const locationStats = Object.entries(countryData)
        .map(([country, count]) => ({ country, count }))
        .sort((a, b) => b.count - a.count);

      res.json({ locations: locationStats });
    } catch (error) {
      console.error("Error getting user locations:", error);
      res.status(500).json({ error: "Failed to get user location data" });
    }
  });

  app.get("/api/admin/analytics/activity", isAdmin, async (req, res) => {
    try {
      // Get user activity data for the last 24 hours
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Get all users who logged in within the last 24 hours
      const activeUsers = await storage.getAllUsers();
      const hourlyActivity = Array(24)
        .fill(0)
        .map((_, hour) => ({
          hour,
          activeUsers: activeUsers.filter((user) => {
            if (!user.lastLoginAt) return false;
            const loginHour = new Date(user.lastLoginAt).getHours();
            return loginHour === hour;
          }).length,
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
      const daily = Array(7)
        .fill(0)
        .map((_, index) => {
          const date = new Date();
          date.setDate(date.getDate() - index);
          date.setHours(0, 0, 0, 0);

          const nextDate = new Date(date);
          nextDate.setDate(nextDate.getDate() + 1);

          return {
            date: date.toISOString().split("T")[0],
            messages: messages.filter((msg) => {
              const msgDate = new Date(msg.timestamp);
              return msgDate >= date && msgDate < nextDate;
            }).length,
          };
        })
        .reverse();

      res.json({ daily });
    } catch (error: any) {
      console.error("Error fetching message volume:", error);
      res.status(500).json({ error: "Failed to fetch message volume" });
    }
  });

  app.get(
    "/api/admin/analytics/characters/popularity",
    isAdmin,
    async (req, res) => {
      try {
        const messages = await storage.getMessagesByCharacter("all");
        const characterStats = new Map();

        // Process messages to get character statistics
        for (const msg of messages) {
          if (!characterStats.has(msg.characterId)) {
            characterStats.set(msg.characterId, {
              messageCount: 0,
              users: new Set(),
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
          if (charId.startsWith("custom_")) {
            const customChar = await storage.getCustomCharacterById(
              parseInt(charId.replace("custom_", "")),
            );
            if (customChar) name = customChar.name;
          } else {
            // Get character from database instead of hardcoded array
            const predefinedChar = await storage.getPredefinedCharacterById(charId);
            if (predefinedChar) name = predefinedChar.name;
          }

          charactersData.push({
            name,
            messageCount: stats.messageCount,
            userCount: stats.users.size,
          });
        }

        res.json({ characters: charactersData });
      } catch (error: any) {
        console.error("Error fetching character popularity:", error);
        res.status(500).json({ error: "Failed to fetch character popularity" });
      }
    },
  );

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
  // Mark notification as read
  app.patch("/api/notifications/:id/read", async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      await notificationDb
        .update(notifications)
        .set({ read: true })
        .where(eq(notifications.id, notificationId))
        .where(eq(notifications.userId, req.user.id))
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
      const notification = await notificationDb
        .insert(notifications)
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
        orderBy: (notifications, { desc }) => [desc(notifications.createdAt)],
      });

      const notificationsWithUserDetails = await Promise.all(
        notifications.map(async (notification) => {
          const user = await storage.getUser(notification.userId);
          return {
            ...notification,
            username: user?.username || "Deleted User",
            userEmail: user?.email || "N/A",
          };
        }),
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
        users.map((user) =>
          notificationDb
            .insert(notifications)
            .values({
              userId: user.id,
              type,
              title,
              message,
              read: false,
            })
            .returning()
            .get(),
        ),
      );

      res.json({ success: true, count: notifications.length });
    } catch (error: any) {
      console.error("Error broadcasting notification:", error);
      res.status(500).json({ error: "Failed to broadcast notification" });
    }
  });

  // Send notification to specific user
  app.post(
    "/api/admin/notifications/user/:userId",
    isAdmin,
    async (req, res) => {
      try {
        const { userId } = req.params;
        const { title, message, type } = req.body;

        // Verify user exists
        const user = await storage.getUser(parseInt(userId));
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        // Create notification
        const notification = await notificationDb
          .insert(notifications)
          .values({
            userId: parseInt(userId),
            type,
            title,
            message,
            read: false,
          })
          .returning()
          .get();

        res.status(201).json(notification);
      } catch (error: any) {
        console.error("Error sending notification:", error);
        res.status(500).json({ error: "Failed to send notification" });
      }
    },
  );

  // Add new endpoints for scheduled broadcasts before httpServer creation
  app.post("/api/admin/broadcasts/schedule", isAdmin, async (req, res) => {
    try {
      const { type, title, message, scheduledFor } = req.body;

      const scheduledBroadcast = await createScheduledBroadcast({
        type,
        title,
        message,
        scheduledFor: new Date(scheduledFor).getTime(),
      });

      res.status(201).json({ success: true, id: scheduledBroadcast });
    } catch (error: any) {
      console.error("Error scheduling broadcast:", error);
      res.status(500).json({ error: "Failed to schedule broadcast" });
    }
  });

  app.get("/api/admin/broadcasts/scheduled", isAdmin, async (req, res) => {
    try {
      const scheduledBroadcasts = await getScheduledBroadcasts();
      res.json(scheduledBroadcasts);
    } catch (error: any) {
      console.error("Error fetching scheduled broadcasts:", error);
      res.status(500).json({ error: "Failed to fetch scheduled broadcasts" });
    }
  });

  app.delete(
    "/api/admin/broadcasts/scheduled/:id",
    isAdmin,
    async (req, res) => {
      try {
        const broadcastId = parseInt(req.params.id);
        await deleteScheduledBroadcast(broadcastId);
        res.json({ success: true });
      } catch (error: any) {
        console.error("Error deleting scheduled broadcast:", error);
        res.status(500).json({ error: "Failed to delete scheduled broadcast" });
      }
    },
  );
  
  // Credential Management API Endpoints
  app.get("/api/admin/credentials", isAdmin, async (req, res) => {
    try {
      const { getAllApiKeys } = await import("./admin-db");
      const credentials = await getAllApiKeys();
      
      // Mask sensitive values in the response
      const maskedCredentials = credentials.map(cred => {
        const key = cred.key;
        let maskedKey = key;
        
        // Apply masking to protect sensitive information
        if (key && key.length > 8) {
          maskedKey = key.substring(0, 4) + '*'.repeat(key.length - 8) + key.substring(key.length - 4);
        } else if (key) {
          maskedKey = '*'.repeat(key.length);
        }
        
        return {
          ...cred,
          key: maskedKey,
          actualValueHidden: true
        };
      });
      
      res.json(maskedCredentials);
    } catch (error: any) {
      console.error("Error fetching credentials:", error);
      res.status(500).json({ error: "Failed to fetch credentials" });
    }
  });
  
  app.get("/api/admin/credentials/:service", isAdmin, async (req, res) => {
    try {
      const { getApiKey } = await import("./admin-db");
      const service = req.params.service;
      const key = await getApiKey(service);
      
      if (!key) {
        return res.status(404).json({ error: "Credential not found" });
      }
      
      res.json({ service, key });
    } catch (error: any) {
      console.error(`Error fetching credential for ${req.params.service}:`, error);
      res.status(500).json({ error: "Failed to fetch credential" });
    }
  });
  
  app.post("/api/admin/credentials", isAdmin, async (req, res) => {
    try {
      const { setApiKey } = await import("./admin-db");
      const { service, key, description } = req.body;
      
      if (!service || !key) {
        return res.status(400).json({ error: "Service name and key are required" });
      }
      
      const success = await setApiKey(service, key, description);
      
      if (success) {
        res.status(201).json({ success: true, message: "Credential saved successfully" });
      } else {
        res.status(500).json({ error: "Failed to save credential" });
      }
    } catch (error: any) {
      console.error("Error saving credential:", error);
      res.status(500).json({ error: "Failed to save credential" });
    }
  });
  
  app.delete("/api/admin/credentials/:service", isAdmin, async (req, res) => {
    try {
      const { adminDb, apiKeys } = await import("./admin-db");
      const { eq } = await import("drizzle-orm");
      const service = req.params.service;
      
      // Delete the API key
      const result = await adminDb
        .delete(apiKeys)
        .where(eq(apiKeys.service, service))
        .returning()
        .get();
      
      if (!result) {
        return res.status(404).json({ error: "Credential not found" });
      }
      
      res.json({ success: true, message: "Credential deleted successfully" });
    } catch (error: any) {
      console.error(`Error deleting credential for ${req.params.service}:`, error);
      res.status(500).json({ error: "Failed to delete credential" });
    }
  });
  
  // Update a credential
  app.put("/api/admin/credentials/:service", isAdmin, async (req, res) => {
    try {
      const { adminDb, apiKeys } = await import("./admin-db");
      const { eq } = await import("drizzle-orm");
      const service = req.params.service;
      const { key, description } = req.body;
      
      if (!key) {
        return res.status(400).json({ error: "Key is required" });
      }
      
      // Update the API key
      const result = await adminDb
        .update(apiKeys)
        .set({ 
          key, 
          description: description || null,
          updatedAt: new Date().toISOString()
        })
        .where(eq(apiKeys.service, service))
        .returning()
        .get();
      
      if (!result) {
        return res.status(404).json({ error: "Credential not found" });
      }
      
      res.json({ 
        success: true, 
        message: "Credential updated successfully",
        credential: {
          ...result,
          key: result.key // Send the actual key back to the client
        }
      });
    } catch (error: any) {
      console.error(`Error updating credential for ${req.params.service}:`, error);
      res.status(500).json({ error: "Failed to update credential" });
    }
  });
  
  // User-to-user messaging endpoints
  app.get("/api/user-messages/conversations", async (req, res) => {
    try {
      const conversations = await storage.getUserConversations(req.user.id);
      
      // Enrich conversations with user details
      const enrichedConversations = await Promise.all(
        conversations.map(async (conversation) => {
          const otherUserId = conversation.user1Id === req.user.id 
            ? conversation.user2Id 
            : conversation.user1Id;
          
          const otherUser = await storage.getUser(otherUserId);
          
          return {
            ...conversation,
            otherUser: otherUser ? {
              id: otherUser.id,
              username: otherUser.username,
              fullName: otherUser.fullName || otherUser.username,
              lastLoginAt: otherUser.lastLoginAt,
            } : null,
            unreadCount: conversation.user1Id === req.user.id 
              ? conversation.unreadCountUser1 
              : conversation.unreadCountUser2
          };
        })
      );
      
      res.json(enrichedConversations);
    } catch (error) {
      console.error("Error fetching user conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });
  
  app.get("/api/user-messages/unread-count", async (req, res) => {
    try {
      const unreadCount = await storage.getUnreadMessageCount(req.user.id);
      res.json({ unreadCount });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ error: "Failed to fetch unread count" });
    }
  });
  
  // Get user by ID endpoint
  app.get("/api/users/:userId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }
      
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Remove sensitive information before sending to client
      const sanitizedUser = {
        id: user.id,
        username: user.username,
        fullName: user.fullName || user.username,
        profileCompleted: user.profileCompleted || false,
        lastLoginAt: user.lastLoginAt
      };
      
      res.json(sanitizedUser);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });
  
  app.get("/api/user-messages/:userId", async (req, res) => {
    try {
      const otherUserId = parseInt(req.params.userId);
      
      // Extract pagination parameters from query string
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      
      // Validate pagination parameters
      if (page < 1 || limit < 1 || limit > 100) {
        return res.status(400).json({ 
          error: "Invalid pagination parameters. Page must be >= 1 and limit must be between 1 and 100." 
        });
      }
      
      // Check if the conversation is blocked
      const minUserId = Math.min(req.user.id, otherUserId);
      const maxUserId = Math.max(req.user.id, otherUserId);
      const conversation = await storage.getConversationBetweenUsers(minUserId, maxUserId);
      const isBlocked = conversation?.isBlocked || false;
      
      // Get paginated messages
      const result = await storage.getUserMessages(req.user.id, otherUserId, { page, limit });
      
      // Mark messages as read when fetched
      for (const message of result.messages) {
        if (message.receiverId === req.user.id && message.status !== "read") {
          await storage.updateMessageStatus(message.id, "read");
        }
      }
      
      // Return the paginated results with metadata
      res.json({
        messages: result.messages,
        pagination: {
          total: result.total,
          page: result.page,
          pages: result.pages,
          limit
        },
        conversationStatus: {
          isBlocked
        }
      });
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });
  
  app.post("/api/user-messages/:userId", messageRateLimiter(30, 60000), async (req, res) => {
    try {
      const receiverId = parseInt(req.params.userId);
      const { content } = req.body;
      
      if (!content || content.trim() === "") {
        return res.status(400).json({ error: "Message content is required" });
      }
      
      // Check if the conversation is blocked
      const minUserId = Math.min(req.user.id, receiverId);
      const maxUserId = Math.max(req.user.id, receiverId);
      const conversation = await storage.getConversationBetweenUsers(minUserId, maxUserId);
      
      if (conversation?.isBlocked) {
        return res.status(403).json({ 
          error: "Conversation blocked", 
          message: "This conversation has been blocked by a moderator for violating community guidelines." 
        });
      }
      
      // Check message content for prohibited words
      const { checkMessageContent, flagMessage } = await import("./content-moderation");
      const contentCheck = checkMessageContent(content);
      
      // Create message in database
      const message = await storage.createUserMessage({
        senderId: req.user.id,
        receiverId,
        content,
        status: "sent"
      });
      
      // If flagged, handle content moderation
      if (contentCheck.flagged) {
        console.log(`[REST API] FLAGGED MESSAGE from user ${req.user.id}: ${contentCheck.reason}`);
        
        // Flag the message in the moderation system
        try {
          await flagMessage(
            message.id,
            req.user.id,
            receiverId,
            content,
            contentCheck.reason || 'Prohibited content'
          );
          
          // Notify admins about flagged content via socket if available
          // The socket server will handle sending notifications to online admins
        } catch (err) {
          console.error(`Error flagging message: ${err}`);
        }
      }
      
      res.status(201).json(message);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });
  
  // Mark user messages as read
  app.post("/api/user-messages/:userId/read", rateLimiter(50, 60000), async (req, res) => {
    try {
      const otherUserId = parseInt(req.params.userId);
      
      // We need to get all messages, not just the paginated ones
      // Set a large limit to get all messages in one request
      const result = await storage.getUserMessages(req.user.id, otherUserId, { page: 1, limit: 1000 });
      
      // Mark all messages from other user as read
      for (const message of result.messages) {
        if (message.receiverId === req.user.id && message.status !== "read") {
          await storage.updateMessageStatus(message.id, "read");
        }
      }
      
      res.json({ 
        success: true,
        messagesRead: result.messages.filter(m => m.receiverId === req.user.id && m.status !== "read").length
      });
    } catch (error) {
      console.error("Error marking messages as read:", error);
      res.status(500).json({ error: "Failed to mark messages as read" });
    }
  });
  
  // Get conversation status between users
  app.get("/api/conversations/:userId/status", async (req, res) => {
    try {
      const otherUserId = parseInt(req.params.userId);
      const currentUserId = req.user.id;
      
      // Ensure we check in consistent order (smaller ID first)
      const minUserId = Math.min(currentUserId, otherUserId);
      const maxUserId = Math.max(currentUserId, otherUserId);
      
      // Get conversation status from storage
      const conversation = await storage.getConversationBetweenUsers(minUserId, maxUserId);
      
      console.log(`[Status API] Conversation status between ${currentUserId} and ${otherUserId}:`, conversation);
      
      res.json({ 
        isBlocked: !!conversation?.isBlocked,
        timestamp: new Date().toISOString(),
        conversationId: conversation?.id
      });
    } catch (error) {
      console.error("Error fetching conversation status:", error);
      res.status(500).json({ error: "Failed to fetch conversation status" });
    }
  });
  
  // User status endpoint (disabled - no longer showing online/offline status)
  app.get("/api/users/status/:userId", authenticateJWT, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Get user from database first to verify they exist
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Return user info without online status
      // Per client request, online status indicators have been removed
      res.json({
        userId,
        username: user.username,
        online: false, // Always return false for privacy
        lastActive: null // No longer tracking last active time
      });
    } catch (error) {
      console.error("Error checking user status:", error);
      res.status(500).json({ error: "Failed to check user status" });
    }
  });
  
  // Get all online users (disabled - no longer showing online/offline status)
  app.get("/api/users/online", authenticateJWT, async (req, res) => {
    try {
      // Per client request, online status indicators have been removed
      // Return empty array instead of actual online users
      res.json({
        count: 0,
        users: []
      });
    } catch (error) {
      console.error("Error getting online users:", error);
      res.status(500).json({ error: "Failed to get online users" });
    }
  });
  
  // Get count of online users (disabled - no longer showing online/offline status)
  app.get("/api/users/online/count", authenticateJWT, async (req, res) => {
    try {
      // Per client request, online status indicators have been removed
      // Return 0 instead of actual count
      res.json({ count: 0 });
    } catch (error) {
      console.error("Error getting online user count:", error);
      res.status(500).json({ error: "Failed to get online user count" });
    }
  });

  // Register encryption routes with error handler middleware
  app.use("/api/encryption", encryptionRoutes);
  app.use("/api/encryption", errorHandler);
  
  // Register advertisement routes
  app.use("/api/advertisements", advertisementRoutes);
  app.use("/api/advertisements", errorHandler);
  
  // Register routes for file uploads
  app.use("/api/upload", uploadRoutes);
  app.use("/api/upload", errorHandler);

  // Initialize library database
  try {
    await libraryDb.initializeLibraryDatabase();
    console.log("Library database initialized successfully");
  } catch (error) {
    console.error("Error initializing library database:", error);
  }

  // Library API Routes
  // Manga routes
  app.get('/api/library/manga', async (req, res) => {
    try {
      const query = req.query.q as string;
      let manga;
      
      if (query) {
        manga = await libraryDb.searchManga(query);
      } else {
        manga = await libraryDb.getAllManga();
      }
      
      // Parse JSON string arrays back to JavaScript arrays
      const formattedManga = manga.map(item => ({
        ...item,
        tags: JSON.parse(item.tags)
      }));
      
      res.json(formattedManga);
    } catch (error) {
      console.error("Error fetching manga:", error);
      res.status(500).json({ error: "Failed to fetch manga" });
    }
  });

  app.get('/api/library/manga/:id', async (req, res) => {
    try {
      const manga = await libraryDb.getMangaById(req.params.id);
      
      if (!manga) {
        return res.status(404).json({ error: "Manga not found" });
      }
      
      // Parse JSON string arrays back to JavaScript arrays
      const formattedManga = {
        ...manga,
        tags: JSON.parse(manga.tags)
      };
      
      res.json(formattedManga);
    } catch (error) {
      console.error(`Error fetching manga ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to fetch manga" });
    }
  });

  // Books routes
  app.get('/api/library/books', async (req, res) => {
    try {
      const query = req.query.q as string;
      let books;
      
      if (query) {
        books = await libraryDb.searchBooks(query);
      } else {
        books = await libraryDb.getAllBooks();
      }
      
      // Parse JSON string arrays back to JavaScript arrays
      const formattedBooks = books.map(item => ({
        ...item,
        tags: JSON.parse(item.tags)
      }));
      
      res.json(formattedBooks);
    } catch (error) {
      console.error("Error fetching books:", error);
      res.status(500).json({ error: "Failed to fetch books" });
    }
  });

  app.get('/api/library/books/:id', async (req, res) => {
    try {
      const book = await libraryDb.getBookById(req.params.id);
      
      if (!book) {
        return res.status(404).json({ error: "Book not found" });
      }
      
      // Parse JSON string arrays back to JavaScript arrays
      const formattedBook = {
        ...book,
        tags: JSON.parse(book.tags)
      };
      
      res.json(formattedBook);
    } catch (error) {
      console.error(`Error fetching book ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to fetch book" });
    }
  });

  // News routes
  app.get('/api/library/news', async (req, res) => {
    try {
      const query = req.query.q as string;
      let news;
      
      if (query) {
        news = await libraryDb.searchNews(query);
      } else {
        news = await libraryDb.getAllNews();
      }
      
      // Parse JSON string arrays back to JavaScript arrays
      const formattedNews = news.map(item => ({
        ...item,
        tags: JSON.parse(item.tags)
      }));
      
      res.json(formattedNews);
    } catch (error) {
      console.error("Error fetching news:", error);
      res.status(500).json({ error: "Failed to fetch news" });
    }
  });

  app.get('/api/library/news/:id', async (req, res) => {
    try {
      const news = await libraryDb.getNewsById(req.params.id);
      
      if (!news) {
        return res.status(404).json({ error: "News article not found" });
      }
      
      // Parse JSON string arrays back to JavaScript arrays
      const formattedNews = {
        ...news,
        tags: JSON.parse(news.tags)
      };
      
      res.json(formattedNews);
    } catch (error) {
      console.error(`Error fetching news ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to fetch news article" });
    }
  });

  // Admin Library Management Endpoints
  // Manga management
  app.post('/api/admin/library/manga', isAdmin, async (req, res) => {
    try {
      const mangaData = req.body;
      const result = await libraryDb.createManga(mangaData);
      res.status(201).json(result);
    } catch (error) {
      console.error("Error creating manga:", error);
      res.status(500).json({ error: "Failed to create manga" });
    }
  });

  app.put('/api/admin/library/manga/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const mangaData = req.body;
      const result = await libraryDb.updateManga(id, mangaData);
      if (!result) {
        return res.status(404).json({ error: "Manga not found" });
      }
      res.json(result);
    } catch (error) {
      console.error("Error updating manga:", error);
      res.status(500).json({ error: "Failed to update manga" });
    }
  });

  app.delete('/api/admin/library/manga/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await libraryDb.deleteManga(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting manga:", error);
      res.status(500).json({ error: "Failed to delete manga" });
    }
  });

  // Book management
  app.post('/api/admin/library/books', isAdmin, async (req, res) => {
    try {
      const bookData = req.body;
      const result = await libraryDb.createBook(bookData);
      res.status(201).json(result);
    } catch (error) {
      console.error("Error creating book:", error);
      res.status(500).json({ error: "Failed to create book" });
    }
  });

  app.put('/api/admin/library/books/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const bookData = req.body;
      const result = await libraryDb.updateBook(id, bookData);
      if (!result) {
        return res.status(404).json({ error: "Book not found" });
      }
      res.json(result);
    } catch (error) {
      console.error("Error updating book:", error);
      res.status(500).json({ error: "Failed to update book" });
    }
  });

  app.delete('/api/admin/library/books/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await libraryDb.deleteBook(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting book:", error);
      res.status(500).json({ error: "Failed to delete book" });
    }
  });

  // News management
  app.post('/api/admin/library/news', isAdmin, async (req, res) => {
    try {
      const newsData = req.body;
      const result = await libraryDb.createNews(newsData);
      res.status(201).json(result);
    } catch (error) {
      console.error("Error creating news:", error);
      res.status(500).json({ error: "Failed to create news" });
    }
  });

  app.put('/api/admin/library/news/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const newsData = req.body;
      const result = await libraryDb.updateNews(id, newsData);
      if (!result) {
        return res.status(404).json({ error: "News not found" });
      }
      res.json(result);
    } catch (error) {
      console.error("Error updating news:", error);
      res.status(500).json({ error: "Failed to update news" });
    }
  });

  app.delete('/api/admin/library/news/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await libraryDb.deleteNews(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting news:", error);
      res.status(500).json({ error: "Failed to delete news" });
    }
  });
  
  // CRITICAL FIX: Add endpoint to expose follow-up message configuration to client
  app.get('/api/follow-up-messages/config', authenticateJWT, async (req, res) => {
    // Return the standard follow-up message delays that match those in follow-up-messages.ts
    return res.json({
      delays: {
        // Action categories with their delay values (in milliseconds)
        cooking: 15 * 1000,         // 15 seconds
        fetching: 8 * 1000,         // 8 seconds
        searching: 12 * 1000,       // 12 seconds
        communication: 10 * 1000,   // 10 seconds
        meeting: 15 * 1000,         // 15 seconds
        cleaning: 20 * 1000,        // 20 seconds
        household: 12 * 1000,       // 12 seconds
        promise: 15 * 1000,         // 15 seconds
        availability: 10 * 1000,    // 10 seconds
        general: 12 * 1000,         // 12 seconds
        
        // Polling configuration (for client use)
        minPollingInterval: 2 * 1000,    // 2 seconds minimum polling interval
        maxPollingInterval: 5 * 1000,    // 5 seconds maximum polling interval
        defaultPollingInterval: 2 * 1000 // 2 seconds default polling interval
      }
    });
  });

  return httpServer;
}
