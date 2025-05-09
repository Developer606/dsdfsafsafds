import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

// Add pending verifications table
export const pendingVerifications = sqliteTable("pending_verifications", {
  id: integer("id").primaryKey(),
  email: text("email").notNull().unique(),
  verificationToken: text("verification_token").notNull(),
  tokenExpiry: integer("token_expiry", { mode: "timestamp_ms" }).notNull(),
  registrationData: text("registration_data"), // JSON string of registration data
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// Add schema for pending verifications
export const insertPendingVerificationSchema = createInsertSchema(pendingVerifications).pick({
  email: true,
  verificationToken: true,
  tokenExpiry: true,
  registrationData: true,
});

// Add types for pending verifications
export type PendingVerification = typeof pendingVerifications.$inferSelect;
export type InsertPendingVerification = z.infer<typeof insertPendingVerificationSchema>;

// Add message limit constant
export const FREE_USER_MESSAGE_LIMIT = 50;

// Users table with optimized indexes for high-traffic login/signup
export const users = sqliteTable("users", {
  id: integer("id").primaryKey(),
  email: text("email").notNull().unique(),
  username: text("username").notNull(),
  password: text("password").notNull(),
  role: text("role").notNull().default("user"),
  fullName: text("full_name"),
  age: integer("age"),
  gender: text("gender"),
  bio: text("bio"),
  profileCompleted: integer("profile_completed", { mode: "boolean" }).default(false),
  isAdmin: integer("is_admin", { mode: "boolean" })
    .notNull()
    .default(false),
  isPremium: integer("is_premium", { mode: "boolean" })
    .notNull()
    .default(false),
  isBlocked: integer("is_blocked", { mode: "boolean" })
    .notNull()
    .default(false),
  isRestricted: integer("is_restricted", { mode: "boolean" })
    .notNull()
    .default(false),
  isEmailVerified: integer("is_email_verified", { mode: "boolean" })
    .notNull()
    .default(false),
  messageCount: integer("message_count").notNull().default(0),
  verificationToken: text("verification_token"),
  verificationTokenExpiry: integer("verification_token_expiry", { mode: "timestamp_ms" }),
  trialCharactersCreated: integer("trial_characters_created")
    .notNull()
    .default(0),
  subscriptionTier: text("subscription_tier"),
  subscriptionStatus: text("subscription_status").default("trial"),
  subscriptionExpiresAt: integer("subscription_expires_at", {
    mode: "timestamp_ms",
  }),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  lastLoginAt: integer("last_login_at", { mode: "timestamp_ms" }),
  lastLoginIp: text("last_login_ip"),
  countryCode: text("country_code"),
  countryName: text("country_name"),
  cityName: text("city_name"),
});


// Messages table optimized for chat history retrieval
export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  characterId: text("character_id").notNull(),
  content: text("content").notNull(),
  isUser: integer("is_user", { mode: "boolean" }).notNull(),
  language: text("language").default("english"),
  script: text("script"),
  timestamp: integer("timestamp", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// Custom characters table
export const customCharacters = sqliteTable("custom_characters", {
  id: integer("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  avatar: text("avatar").notNull(),
  description: text("description").notNull(),
  persona: text("persona").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// Predefined characters table
export const predefinedCharacters = sqliteTable("predefined_characters", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  avatar: text("avatar").notNull(),
  description: text("description").notNull(),
  persona: text("persona").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// Message schemas
export const insertMessageSchema = createInsertSchema(messages)
  .pick({
    userId: true,
    characterId: true,
    content: true,
    isUser: true,
  })
  .extend({
    language: z.string().default("english"),
    script: z.enum(["devanagari", "latin"]).optional(),
  });

// User schemas
export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  username: true,
  password: true,
  role: true,
  isAdmin: true,
  fullName: true,
  isEmailVerified: true,
  profileCompleted: true,
  subscriptionStatus: true,
  age: true,
  gender: true,
  bio: true,
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  rememberMe: z.boolean().optional(),
});

// Add admin login schema
export const adminLoginSchema = loginSchema.extend({
  isAdmin: z.literal(true),
});

// Custom character schemas
export const insertCustomCharacterSchema = createInsertSchema(
  customCharacters,
).pick({
  userId: true,
  name: true,
  avatar: true,
  description: true,
  persona: true,
});

// Types
export type Message = {
  id: number;
  userId: number;
  characterId: string;
  content: string;
  isUser: boolean;
  language?: string;
  script?: string | null;
  timestamp: Date;
};
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Role = "user" | "admin";

export type CustomCharacter = typeof customCharacters.$inferSelect;
export type InsertCustomCharacter = z.infer<typeof insertCustomCharacterSchema>;

// Predefined character schemas
export const insertPredefinedCharacterSchema = createInsertSchema(predefinedCharacters).pick({
  id: true,
  name: true,
  avatar: true,
  description: true,
  persona: true,
});

export type PredefinedCharacter = typeof predefinedCharacters.$inferSelect;
export type InsertPredefinedCharacter = z.infer<typeof insertPredefinedCharacterSchema>;

// Subscription Types
export const subscriptionPlans = {
  BASIC: {
    id: "basic",
    name: "Basic Plan",
    price: "$4.99",
    features: [
      "Create up to 15 characters",
      "Basic character customization",
      "Standard support",
    ],
    characterLimit: 15
  },
  PREMIUM: {
    id: "premium",
    name: "Premium Plan",
    price: "$9.99",
    features: [
      "Create up to 45 characters",
      "Advanced character customization",
      "Priority support",
      "Early access to new features",
      "Multiple chat UI styles",
    ],
    characterLimit: 45
  },
  PRO: {
    id: "pro",
    name: "Pro Plan",
    price: "$19.99",
    features: [
      "Everything in Premium",
      "Custom character API access",
      "Dedicated support",
      "White-label option",
      "Team collaboration features",
    ],
    characterLimit: Infinity
  },
} as const;

// Add a helper function to get character limit based on subscription tier
export function getCharacterLimit(tier?: string): number {
  switch (tier) {
    case "basic":
      return subscriptionPlans.BASIC.characterLimit;
    case "premium":
      return subscriptionPlans.PREMIUM.characterLimit;
    case "pro":
      return subscriptionPlans.PRO.characterLimit;
    default:
      return subscriptionPlans.BASIC.characterLimit;
  }
}

// Add subscription plan table
export const subscriptionPlansTable = sqliteTable("subscription_plans", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  price: text("price").notNull(),
  features: text("features").notNull(), // Stored as JSON string
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// Add insert schema for subscription plans
export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlansTable).pick({
  id: true,
  name: true,
  price: true,
  features: true,
});

export type SubscriptionPlan = typeof subscriptionPlansTable.$inferSelect;
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;

export type SubscriptionTier = keyof typeof subscriptionPlans;
export type SubscriptionStatus = "trial" | "active" | "cancelled" | "expired";

// Add supported languages
export const supportedLanguages = [
  { id: "english", name: "English" },
  { id: "japanese", name: "日本語" },
  { id: "spanish", name: "Español" },
  { id: "french", name: "Français" },
  { id: "chinese", name: "中文" },
  { id: "korean", name: "한국어" },
  {
    id: "hindi",
    name: "हिन्दी",
    scripts: [
      { id: "devanagari", name: "देवनागरी" },
      { id: "latin", name: "Roman" },
    ],
  },
] as const;

export type SupportedLanguage = (typeof supportedLanguages)[number]["id"];
export type ScriptPreference = "devanagari" | "latin";

// Feedback table for storing user feedback
export const feedback = sqliteTable("feedback", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  message: text("message").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// Feedback schema
export const insertFeedbackSchema = createInsertSchema(feedback).pick({
  name: true,
  email: true,
  message: true,
});

// Feedback types
export type Feedback = typeof feedback.$inferSelect;
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;

// Add complaints table schema
export const complaints = sqliteTable("complaints", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  message: text("message").notNull(),
  imageUrl: text("image_url"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// Add complaints schema for validation
export const insertComplaintSchema = createInsertSchema(complaints).pick({
  name: true,
  email: true,
  message: true,
  imageUrl: true,
});

// Add complaint types
export type Complaint = typeof complaints.$inferSelect;
export type InsertComplaint = z.infer<typeof insertComplaintSchema>;

// Add notifications table schema
export const notifications = sqliteTable("notifications", {
  id: integer("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'admin_reply' | 'update' | 'feature'
  title: text("title").notNull(),
  message: text("message").notNull(),
  read: integer("read", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// Add notification schemas for validation
export const insertNotificationSchema = createInsertSchema(notifications).pick({
  userId: true,
  type: true,
  title: true,
  message: true,
  read: true,
});

// Add notification types
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// Add scheduled broadcasts table schema
export const scheduledBroadcasts = sqliteTable("scheduled_broadcasts", {
  id: integer("id").primaryKey(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  scheduledFor: integer("scheduled_for", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  sent: integer("sent", { mode: "boolean" }).notNull().default(false),
});

// Add scheduled broadcast schemas for validation
export const insertScheduledBroadcastSchema = createInsertSchema(scheduledBroadcasts).pick({
  type: true,
  title: true,
  message: true,
  scheduledFor: true,
});

// Add scheduled broadcast types
export type ScheduledBroadcast = typeof scheduledBroadcasts.$inferSelect;
export type InsertScheduledBroadcast = z.infer<typeof insertScheduledBroadcastSchema>;

// User chat message status types
export type MessageStatus = "sent" | "delivered" | "read";

// User-to-user messages table
export const userMessages = sqliteTable("user_messages", {
  id: integer("id").primaryKey(),
  senderId: integer("sender_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  receiverId: integer("receiver_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  status: text("status").notNull().default("sent"),
  timestamp: integer("timestamp", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// User-to-user conversations table to track conversations between users
export const userConversations = sqliteTable("user_conversations", {
  id: integer("id").primaryKey(),
  user1Id: integer("user1_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  user2Id: integer("user2_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  lastMessageId: integer("last_message_id").references(() => userMessages.id),
  lastMessageTimestamp: integer("last_message_timestamp", { mode: "timestamp_ms" }),
  unreadCountUser1: integer("unread_count_user1").notNull().default(0),
  unreadCountUser2: integer("unread_count_user2").notNull().default(0),
  isBlocked: integer("is_blocked", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// User message schema
export const insertUserMessageSchema = createInsertSchema(userMessages).pick({
  senderId: true,
  receiverId: true,
  content: true,
  status: true,
});

// User types
export type UserMessage = typeof userMessages.$inferSelect;
export type InsertUserMessage = z.infer<typeof insertUserMessageSchema>;
export type UserConversation = typeof userConversations.$inferSelect;

// Flagged messages for content moderation
export const flaggedMessages = sqliteTable("flagged_messages", {
  id: integer("id").primaryKey(),
  messageId: integer("message_id").notNull(),
  senderId: integer("sender_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  receiverId: integer("receiver_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  reason: text("reason").notNull(),
  reviewed: integer("reviewed", { mode: "boolean" }).notNull().default(false),
  timestamp: integer("timestamp", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// Flagged message schema for validation
export const insertFlaggedMessageSchema = createInsertSchema(flaggedMessages).pick({
  messageId: true,
  senderId: true,
  receiverId: true,
  content: true,
  reason: true,
  reviewed: true,
});

// Flagged message types
export type FlaggedMessage = typeof flaggedMessages.$inferSelect;
export type InsertFlaggedMessage = z.infer<typeof insertFlaggedMessageSchema>;

// Password reset attempts tracking for rate limiting
export const passwordResetAttempts = sqliteTable(
  "password_reset_attempts", 
  {
    id: integer("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    timestamp: integer("timestamp", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    ip: text("ip"), // IP addresses are sensitive, stored for security audits only
  }
);

// Encryption keys table to store user public keys
export const encryptionKeys = sqliteTable("encryption_keys", {
  id: integer("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  publicKey: text("public_key").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// Conversation keys table to store encrypted keys for each conversation
export const conversationKeys = sqliteTable("conversation_keys", {
  id: integer("id").primaryKey(),
  user1Id: integer("user1_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  user2Id: integer("user2_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  encryptedKey1: text("encrypted_key1").notNull(), // Key encrypted with user1's public key
  encryptedKey2: text("encrypted_key2").notNull(), // Key encrypted with user2's public key
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// Schemas for encryption tables
export const insertEncryptionKeySchema = createInsertSchema(encryptionKeys).pick({
  userId: true,
  publicKey: true,
});

export const insertConversationKeySchema = createInsertSchema(conversationKeys).pick({
  user1Id: true,
  user2Id: true,
  encryptedKey1: true,
  encryptedKey2: true,
});

// Types for encryption tables
export type EncryptionKey = typeof encryptionKeys.$inferSelect;
export type InsertEncryptionKey = z.infer<typeof insertEncryptionKeySchema>;
export type ConversationKey = typeof conversationKeys.$inferSelect;
export type InsertConversationKey = z.infer<typeof insertConversationKeySchema>;

// Advertisement schema for the Featured section
export const advertisements = sqliteTable("advertisements", {
  id: integer("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url").notNull(),
  videoUrl: text("video_url"),
  mediaType: text("media_type").default("image"),
  buttonText: text("button_text").default("Learn More"),
  buttonLink: text("button_link").notNull(),
  buttonStyle: text("button_style").default("primary"),
  backgroundColor: text("background_color").default("#8B5CF6"),
  textColor: text("text_color").default("#FFFFFF"),
  position: integer("position").default(0),
  animationType: text("animation_type").default("fade"),
  startDate: integer("start_date", { mode: "timestamp_ms" }).notNull(),
  endDate: integer("end_date", { mode: "timestamp_ms" }).notNull(),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  impressions: integer("impressions").default(0),
  clicks: integer("clicks").default(0),
});

// Advertisement metrics for tracking performance
export const advertisementMetrics = sqliteTable("advertisement_metrics", {
  id: integer("id").primaryKey(),
  advertisementId: integer("advertisement_id")
    .notNull()
    .references(() => advertisements.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => users.id),
  action: text("action").notNull(), // 'view', 'click', etc.
  timestamp: integer("timestamp", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  deviceType: text("device_type"),
  browserInfo: text("browser_info"),
});

// Schemas for advertisement tables
export const baseInsertAdvertisementSchema = createInsertSchema(advertisements).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  impressions: true,
  clicks: true,
});

// Enhanced schema that accepts date strings too and makes imageUrl optional for video ads
export const insertAdvertisementSchema = baseInsertAdvertisementSchema.extend({
  startDate: z.union([z.date(), z.string().transform(str => new Date(str))]),
  endDate: z.union([z.date(), z.string().transform(str => new Date(str))]),
  // Override imageUrl to make it conditional based on mediaType
  imageUrl: z.string().optional().transform(val => {
    // For video ads, a blank or undefined imageUrl is acceptable
    if (val === "" || val === undefined) {
      return "placeholder-empty.png"; // Use a placeholder for the database
    }
    return val;
  }),
});

export const insertAdvertisementMetricSchema = createInsertSchema(advertisementMetrics).omit({
  id: true,
  timestamp: true,
});

// Types for advertisement tables
export type Advertisement = typeof advertisements.$inferSelect;
export type InsertAdvertisement = z.infer<typeof insertAdvertisementSchema>;
export type AdvertisementMetric = typeof advertisementMetrics.$inferSelect;
export type InsertAdvertisementMetric = z.infer<typeof insertAdvertisementMetricSchema>;

// Library tables for manga, books, and news
export const manga = sqliteTable("manga", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  cover: text("cover").notNull(),
  description: text("description").notNull(),
  author: text("author").notNull(),
  chapters: integer("chapters").notNull(),
  tags: text("tags").notNull(), // JSON string array
  release_date: text("release_date").notNull(),
  content_url: text("content_url"), // URL for "Read Now" button
  created_at: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updated_at: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const books = sqliteTable("books", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  cover: text("cover").notNull(),
  description: text("description").notNull(),
  author: text("author").notNull(),
  pages: integer("pages").notNull(),
  tags: text("tags").notNull(), // JSON string array
  release_date: text("release_date").notNull(),
  content_url: text("content_url"), // URL for "Read Now" button
  created_at: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updated_at: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const news = sqliteTable("news", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  image: text("image").notNull(),
  summary: text("summary").notNull(),
  author: text("author").notNull(),
  date: text("date").notNull(),
  tags: text("tags").notNull(), // JSON string array 
  source: text("source").notNull(),
  content_url: text("content_url"), // URL for "Read Full Article" button
  created_at: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updated_at: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// Library insert schemas
export const insertMangaSchema = createInsertSchema(manga);

export const insertBookSchema = createInsertSchema(books);

export const insertNewsSchema = createInsertSchema(news);

// Library types
export type Manga = typeof manga.$inferSelect;
export type InsertManga = z.infer<typeof insertMangaSchema>;
export type Book = typeof books.$inferSelect;
export type InsertBook = z.infer<typeof insertBookSchema>;
export type News = typeof news.$inferSelect;
export type InsertNews = z.infer<typeof insertNewsSchema>;