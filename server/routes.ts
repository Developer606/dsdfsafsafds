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
import { eq } from 'drizzle-orm';
import type { Express } from "express";

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
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
  }),
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
  setupAuth(app);
  app.use(checkBlockedStatus);

  // Notification Routes
  app.get("/api/notifications", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      console.log("Fetching notifications for user:", req.user.id);
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

  app.patch("/api/notifications/:id/read", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const notificationId = parseInt(req.params.id);
      console.log("Marking notification as read:", notificationId);

      await notificationDb.update(schema.notifications)
        .set({ read: true })
        .where(eq(schema.notifications.id, notificationId))
        .where(eq(schema.notifications.userId, req.user.id))
        .execute();

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ error: "Failed to update notification" });
    }
  });

  // Broadcast notification to all users
  app.post("/api/admin/notifications/broadcast", isAdmin, async (req, res) => {
    try {
      const { title, message, type } = req.body;
      console.log("Broadcasting notification:", { title, type });

      if (!title || !message || !type) {
        return res.status(400).json({ error: "Title, message and type are required" });
      }

      if (!['admin_reply', 'update', 'feature'].includes(type)) {
        return res.status(400).json({ error: "Invalid notification type" });
      }

      // Get all active users
      const users = await storage.getAllUsers();
      console.log(`Broadcasting to ${users.length} users`);

      // Create notifications for all users
      const notifications = await Promise.all(
        users.map(async (user) => {
          try {
            return await notificationDb.insert(schema.notifications)
              .values({
                userId: user.id,
                type: type as 'admin_reply' | 'update' | 'feature',
                title,
                message,
                read: false,
                createdAt: new Date()
              })
              .returning()
              .get();
          } catch (error) {
            console.error(`Failed to create notification for user ${user.id}:`, error);
            return null;
          }
        })
      );

      const successfulNotifications = notifications.filter(n => n !== null);
      console.log(`Successfully sent ${successfulNotifications.length} notifications`);

      res.status(201).json({ 
        success: true, 
        count: successfulNotifications.length,
        total: users.length 
      });
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
      console.log("Sending notification to user:", userId);

      if (!title || !message || !type) {
        return res.status(400).json({ error: "Title, message and type are required" });
      }

      if (!['admin_reply', 'update', 'feature'].includes(type)) {
        return res.status(400).json({ error: "Invalid notification type" });
      }

      // Verify user exists
      const user = await storage.getUser(parseInt(userId));
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Create notification
      const notification = await notificationDb.insert(schema.notifications)
        .values({
          userId: parseInt(userId),
          type: type as 'admin_reply' | 'update' | 'feature',
          title,
          message,
          read: false,
          createdAt: new Date()
        })
        .returning()
        .get();

      res.status(201).json(notification);
    } catch (error: any) {
      console.error("Error sending notification:", error);
      res.status(500).json({ error: "Failed to send notification" });
    }
  });

  app.get("/api/admin/notifications/all", isAdmin, async (req, res) => {
    try {
      console.log("Fetching all notifications");
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
  const httpServer = createServer(app);
  return httpServer;
}