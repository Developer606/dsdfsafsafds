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

// Users table with optimized indexes for high-traffic login/signup
export const users = sqliteTable("users", {
  id: integer("id").primaryKey(),
  email: text("email").notNull().unique(),
  username: text("username").notNull(),
  password: text("password").notNull(),
  role: text("role").notNull().default("user"),
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
});

// Add message limit constant
export const FREE_USER_MESSAGE_LIMIT = 50;

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
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
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

// Add subscription plans table for dynamic management
export const subscriptionPlans = sqliteTable("subscription_plans", {
  id: integer("id").primaryKey(),
  planId: text("plan_id").notNull().unique(),
  name: text("name").notNull(),
  price: text("price").notNull(),
  features: text("features").notNull(), // JSON string array
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// Add insert schema for subscription plans
export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).pick({
  planId: true,
  name: true,
  price: true,
  features: true,
  isActive: true,
});

// Add subscription plan types
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
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