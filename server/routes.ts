import { createServer, type Server } from "http";
import { storage } from "./storage";
import express from "express";
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
import { characters } from "@shared/characters";
import { generateCharacterResponse } from "./openai";
import encryptionRoutes from "./encryption-routes";
import { errorHandler } from "./middleware/error-handler";
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
import { setupAuth, isAdmin } from "./auth";
import { generateOTP, hashPassword } from "./auth";
import { authenticateJWT } from "./middleware/jwt-auth";
import { rateLimiter, messageRateLimiter, authRateLimiter } from "./middleware/rate-limiter";
import { feedbackStorage } from "./feedback-storage";
import { complaintStorage } from "./complaint-storage";
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
  const fs = require("fs");
  const path = require("path");

  try {
    const backgroundDir = path.join(__dirname, "../client/public/background");
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

  const httpServer = existingServer || createServer(app);
  
  // Set up Socket.IO server with our enhanced implementation
  const io = setupSocketIOServer(httpServer);

  // Initialize WebSocket server with session verification
  const wss = new WebSocketServer({
    server: httpServer,
    path: "/ws",
    verifyClient: async (info: {
      origin: string;
      secure: boolean;
      req: IncomingMessage;
    }) => {
      const cookies = info.req.headers.cookie;
      if (!cookies) return false;

      // Parse session ID from cookies
      const sessionMatch = cookies.match(/connect\.sid=([^;]+)/);
      if (!sessionMatch) return false;

      const sessionId = decodeURIComponent(sessionMatch[1]);

      try {
        // Verify session exists
        const session: any = await new Promise((resolve, reject) => {
          storage.sessionStore.get(
            sessionId.replace("s:", ""),
            (err, session) => {
              if (err) reject(err);
              else resolve(session);
            },
          );
        });

        // Allow any authenticated user (not just admins)
        return !!session?.passport?.user;
      } catch (error) {
        console.error("WebSocket authentication error:", error);
        return false;
      }
    },
  });

  // Map to track user connections by userId
  const userConnections = new Map<number, Set<WebSocket>>();
  // Set for admin clients (for admin-only broadcasts)
  const adminClients = new Set<WebSocket>();

  wss.on("connection", async (ws: WebSocket, req: IncomingMessage) => {
    // Parse the user ID from the session
    try {
      const cookies = req.headers.cookie;
      if (!cookies) return;

      const sessionMatch = cookies.match(/connect\.sid=([^;]+)/);
      if (!sessionMatch) return;

      const sessionId = decodeURIComponent(sessionMatch[1]);
      
      const session: any = await new Promise((resolve, reject) => {
        storage.sessionStore.get(
          sessionId.replace("s:", ""),
          (err, session) => {
            if (err) reject(err);
            else resolve(session);
          },
        );
      });

      const userId = session?.passport?.user;
      if (!userId) return;

      // Get the user to check if they're an admin
      const user = await storage.getUser(userId);
      if (!user) return;

      // Assign this connection to the user
      if (!userConnections.has(userId)) {
        userConnections.set(userId, new Set());
      }
      userConnections.get(userId)?.add(ws);

      // Also add admins to the admin set
      if (user.isAdmin) {
        adminClients.add(ws);
      }

      // Store the userId in the WebSocket for later use
      (ws as any).userId = userId;
      console.log(`User ${userId} connected via WebSocket`);

      // Handle user messages
      ws.on("message", async (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());
          
          // Handle different message types
          switch (message.type) {
            case "user_message":
              await handleUserMessage(userId, message);
              break;
            case "message_status_update":
              await handleMessageStatusUpdate(userId, message);
              break;
            case "typing_indicator":
              await handleTypingIndicator(userId, message);
              break;
          }
        } catch (error) {
          console.error("Error processing WebSocket message:", error);
        }
      });

      // Remove connection when closed
      ws.on("close", () => {
        userConnections.get(userId)?.delete(ws);
        if (userConnections.get(userId)?.size === 0) {
          userConnections.delete(userId);
        }
        adminClients.delete(ws);
        console.log(`User ${userId} disconnected from WebSocket`);
      });
    } catch (error) {
      console.error("Error handling WebSocket connection:", error);
    }
  });

  // Function to handle user messages
  async function handleUserMessage(senderId: number, message: any) {
    try {
      console.log("Handling user message:", { senderId, message });
      const { receiverId, content } = message;
      
      if (!receiverId || !content) {
        console.error("Invalid message format:", message);
        return;
      }
      
      // Create message in database
      const newMessage = await storage.createUserMessage({
        senderId,
        receiverId,
        content,
        status: "sent"
      });
      
      console.log("Created new message in database:", newMessage);
      
      // Send message to all connections of the receiver
      const receiverConnections = userConnections.get(receiverId);
      console.log(`Receiver ${receiverId} has ${receiverConnections?.size || 0} active connections`);
      
      if (receiverConnections && receiverConnections.size > 0) {
        const messageData = JSON.stringify({
          type: "new_message",
          message: newMessage
        });
        
        let delivered = false;
        
        receiverConnections.forEach(conn => {
          if (conn.readyState === WebSocket.OPEN) {
            console.log(`Sending message to receiver ${receiverId}`);
            conn.send(messageData);
            delivered = true;
          }
        });
        
        // Only update status if at least one connection received the message
        if (delivered) {
          console.log(`Updating message ${newMessage.id} status to delivered`);
          await storage.updateMessageStatus(newMessage.id, "delivered");
        }
      }
      
      // Send confirmation back to sender's connections
      const senderConnections = userConnections.get(senderId);
      console.log(`Sender ${senderId} has ${senderConnections?.size || 0} active connections`);
      
      if (senderConnections) {
        const confirmationData = JSON.stringify({
          type: "message_sent",
          messageId: newMessage.id,
          message: newMessage,
          timestamp: newMessage.timestamp
        });
        
        senderConnections.forEach(conn => {
          if (conn.readyState === WebSocket.OPEN) {
            console.log(`Sending confirmation to sender ${senderId}`);
            conn.send(confirmationData);
          }
        });
      }
      
      // Also send the message to the sender's connections to ensure both sides see the message
      // This ensures the sender can immediately see their own message
      if (senderConnections) {
        const messageDataForSender = JSON.stringify({
          type: "new_message",
          message: newMessage
        });
        
        senderConnections.forEach(conn => {
          if (conn.readyState === WebSocket.OPEN) {
            console.log(`Sending message copy to sender ${senderId}`);
            conn.send(messageDataForSender);
          }
        });
      }
    } catch (error) {
      console.error("Error handling user message:", error);
    }
  }
  
  // Function to handle message status updates
  async function handleMessageStatusUpdate(userId: number, message: any) {
    try {
      console.log("Handling message status update:", { userId, message });
      const { messageId, status } = message;
      
      if (!messageId || !status) {
        console.error("Invalid message status update format:", message);
        return;
      }
      
      // Update message status in database
      await storage.updateMessageStatus(messageId, status);
      console.log(`Updated message ${messageId} status to ${status} in database`);
      
      // Get the message details using storage interface
      console.log("Fetching message details...");
      const allUserMessages = await storage.getUserMessages(userId, 0); // Get all messages
      const msg = allUserMessages.find(m => m.id === messageId);
      
      if (!msg) {
        console.log(`Message ${messageId} not found`);
        return;
      }
      
      console.log("Found message:", msg);
      
      // Only proceed if this user is the receiver of the message
      if (msg.receiverId !== userId) {
        console.log(`User ${userId} is not the receiver of message ${messageId}`);
        return;
      }
      
      // Notify the sender about the status update
      const senderConnections = userConnections.get(msg.senderId);
      console.log(`Sender ${msg.senderId} has ${senderConnections?.size || 0} active connections`);
      
      if (senderConnections) {
        const statusData = JSON.stringify({
          type: "message_status_update",
          messageId,
          status
        });
        
        senderConnections.forEach(conn => {
          if (conn.readyState === WebSocket.OPEN) {
            console.log(`Notifying sender ${msg.senderId} about message ${messageId} status update to ${status}`);
            conn.send(statusData);
          }
        });
      }
    } catch (error) {
      console.error("Error updating message status:", error);
    }
  }
  
  // Function to handle typing indicators
  async function handleTypingIndicator(senderId: number, message: any) {
    try {
      const { receiverId, isTyping } = message;
      
      // Send typing indicator to receiver
      const receiverConnections = userConnections.get(receiverId);
      if (receiverConnections) {
        const typingData = JSON.stringify({
          type: "typing_indicator",
          senderId,
          isTyping
        });
        
        receiverConnections.forEach(conn => {
          if (conn.readyState === WebSocket.OPEN) {
            conn.send(typingData);
          }
        });
      }
    } catch (error) {
      console.error("Error sending typing indicator:", error);
    }
  }

  // Updated broadcast function to use tracked clients
  const broadcastUpdate = (type: string, adminOnly = false) => {
    const message = JSON.stringify({ type });
    
    if (adminOnly) {
      // Send only to admin clients
      adminClients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    } else {
      // Send to all connected users
      for (const connections of userConnections.values()) {
        connections.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(message);
          }
        });
      }
    }
  };

  // Set up authentication routes and middleware
  setupAuth(app);
  app.use(checkBlockedStatus);

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

  // Apply auth check to protected routes
  app.use(
    [
      "/api/messages",
      "/api/characters",
      "/api/custom-characters",
      "/api/notifications",
      "/api/subscribe",
      "/api/verify-payment",
      "/api/users/search",
      "/api/user-messages",
    ],
    authCheck,
  );

  // Add PayPal config endpoint before existing routes
  app.get("/api/paypal-config", (req, res) => {
    try {
      const config = getPayPalConfig();
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
    try {
      const notifications = await notificationDb.query.notifications.findMany({
        where: (notifications, { eq }) => eq(notifications.userId, req.user.id),
        orderBy: (notifications, { desc }) => [desc(notifications.createdAt)],
      });

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
            const predefinedChar = characters.find(
              (c) => c.id === msg.characterId,
            );
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
      const { id, name, avatar, description, persona } = req.body;
      
      if (!id || !name || !avatar || !description || !persona) {
        return res.status(400).json({ error: "All fields are required" });
      }

      // Check if character with this ID already exists
      const existingCharacter = await storage.getPredefinedCharacterById(id);
      if (existingCharacter) {
        return res.status(409).json({ error: "Character with this ID already exists" });
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
      const characterId = req.params.id;
      
      // Check if character exists
      const existingCharacter = await storage.getPredefinedCharacterById(characterId);
      if (!existingCharacter) {
        return res.status(404).json({ error: "Character not found" });
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
      
      // Format custom characters
      const formattedCustomChars = customChars.map((char) => ({
        id: `custom_${char.id}`,
        name: char.name,
        avatar: char.avatar,
        description: char.description,
        persona: char.persona,
      }));

      // Use the predefined characters from database, falling back to hardcoded if none exist
      const allCharacters = predefinedChars.length > 0 
        ? [...predefinedChars, ...formattedCustomChars]
        : [...characters, ...formattedCustomChars];
        
      res.json(allCharacters);
    } catch (error: any) {
      console.error("Error fetching characters:", error);
      res.status(500).json({ error: "Failed to fetch characters" });
    }
  });

  app.get("/api/messages/:characterId", async (req, res) => {
    try {
      const messages = await storage.getMessagesByCharacter(
        req.params.characterId,
      );
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
      
      // Update the user profile
      const updatedUser = await storage.updateUserProfile(req.user.id, {
        fullName,
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
            // Try to find the character in the database first
            const dbCharacter = await storage.getPredefinedCharacterById(data.characterId);
            
            if (dbCharacter) {
              character = dbCharacter;
            } else {
              // Fall back to hardcoded characters if not found in database
              character = characters.find((c) => c.id === data.characterId);
            }
            
            if (!character) throw new Error("Predefined character not found");
          }

          const messages = await storage.getMessagesByCharacter(
            data.characterId,
          );
          const chatHistory = messages
            .map((m) => `${m.isUser ? "User" : character.name}: ${m.content}`)
            .join("\n");

          const aiResponse = await generateCharacterResponse(
            character,
            data.content,
            chatHistory,
            data.language,
          );

          const aiMessage = await storage.createMessage({
            userId: user.id,
            characterId: data.characterId,
            content: aiResponse,
            isUser: false,
            language: data.language,
            script: data.script,
          });

          res.json([message, aiMessage]);
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
    await storage.clearChat(req.params.characterId);
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

      // Get PayPal configuration
      const paypalConfig = getPayPalConfig();
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

  // Update login route to strictly check blocked status
  app.post("/api/login", async (req, res, next) => {
    try {
      const user = await storage.getUserByUsername(req.body.username);

      // Check for blocked status before authentication
      if (user?.isBlocked) {
        return res.status(403).json({
          error: "Your account has been blocked. Please contact support.",
        });
      }

      // Only proceed with authentication if user is not blocked
      passport.authenticate(
        "local",
        async (err: any, authenticatedUser: any) => {
          if (err) return next(err);

          if (!authenticatedUser) {
            return res.status(401).json({
              error: "Invalid username or password",
            });
          }

          // Double check block status after authentication
          const currentUser = await storage.getUserByUsername(
            authenticatedUser.username,
          );
          if (currentUser?.isBlocked) {
            return res.status(403).json({
              error: "Your account has been blocked. Please contact support.",
            });
          }

          // Set session expiration based on remember me option
          if (req.body.rememberMe) {
            // If remember me is checked, set cookie to expire in 30 days
            req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
          } else {
            // Otherwise, use default session expiration (typically browser session)
            req.session.cookie.expires = undefined;
          }
          
          req.logIn(authenticatedUser, async (err) => {
            if (err) return next(err);
            await storage.updateLastLogin(authenticatedUser.id);
            res.json(authenticatedUser);
          });
        },
      )(req, res, next);
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
        return res
          .status(400)
          .json({ error: "Email already registered and verified" });
      }

      const otp = await generateOTPemail();
      const expiry = new Date();
      expiry.setMinutes(expiry.getMinutes() + 10); // OTP expires in 10 minutes

      // Store pending verification with registration data if provided
      await storage.createPendingVerification({
        email,
        verificationToken: otp,
        tokenExpiry: expiry,
        registrationData: registrationData
          ? JSON.stringify(registrationData)
          : null,
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

  // Endpoint for password reset request
  app.post("/api/auth/forgot-password", authRateLimiter(), async (req, res) => {
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
  app.post("/api/auth/reset-password", authRateLimiter(), async (req, res) => {
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
            const predefinedChar = characters.find((c) => c.id === charId);
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
  app.get("/api/notifications", async (req, res) => {
    try {
      const notifications = await notificationDb.query.notifications.findMany({
        where: (notifications, { eq }) => eq(notifications.userId, req.user.id),
        orderBy: (notifications, { desc }) => [desc(notifications.createdAt)],
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

  return httpServer;
}
