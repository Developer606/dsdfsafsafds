import { pgTable, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

// Add OTP attempts table schema
export const otpAttempts = pgTable("otp_attempts", {
  id: integer("id").primaryKey(),
  email: text("email").notNull(),
  timestamp: timestamp("timestamp")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// Add schema for OTP attempts
export const insertOtpAttemptSchema = createInsertSchema(otpAttempts).pick({
  email: true,
});

// Add type for OTP attempts
export type OtpAttempt = typeof otpAttempts.$inferSelect;
export type InsertOtpAttempt = z.infer<typeof insertOtpAttemptSchema>;

// Add pending verifications table
export const pendingVerifications = pgTable("pending_verifications", {
  id: integer("id").primaryKey(),
  email: text("email").notNull().unique(),
  verificationToken: text("verification_token").notNull(),
  tokenExpiry: timestamp("token_expiry").notNull(),
  registrationData: text("registration_data"),
  createdAt: timestamp("created_at")
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
export const users = pgTable("users", {
  id: integer("id").primaryKey(),
  email: text("email").notNull().unique(),
  username: text("username").notNull(),
  password: text("password").notNull(),
  role: text("role").notNull().default("user"),
  isAdmin: boolean("is_admin").notNull().default(false),
  isPremium: boolean("is_premium").notNull().default(false),
  isBlocked: boolean("is_blocked").notNull().default(false),
  isRestricted: boolean("is_restricted").notNull().default(false),
  isEmailVerified: boolean("is_email_verified").notNull().default(false),
  verificationToken: text("verification_token"),
  verificationTokenExpiry: timestamp("verification_token_expiry"),
  trialCharactersCreated: integer("trial_characters_created")
    .notNull()
    .default(0),
  subscriptionTier: text("subscription_tier"),
  subscriptionStatus: text("subscription_status").default("trial"),
  subscriptionExpiresAt: timestamp("subscription_expires_at"),
  createdAt: timestamp("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  lastLoginAt: timestamp("last_login_at"),
});

// Messages table optimized for chat history retrieval
export const messages = pgTable("messages", {
  id: integer("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  characterId: text("character_id").notNull(),
  content: text("content").notNull(),
  isUser: boolean("is_user").notNull(),
  language: text("language").default("english"),
  script: text("script"),
  timestamp: timestamp("timestamp")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// Custom characters table
export const customCharacters = pgTable("custom_characters", {
  id: integer("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  avatar: text("avatar").notNull(),
  description: text("description").notNull(),
  persona: text("persona").notNull(),
  createdAt: timestamp("created_at")
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
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Role = "user" | "admin";

export type CustomCharacter = typeof customCharacters.$inferSelect;
export type InsertCustomCharacter = z.infer<typeof insertCustomCharacterSchema>;

// Subscription Types
export const subscriptionPlans = {
  BASIC: {
    id: "basic",
    name: "Basic Plan",
    price: "$4.99",
    features: [
      "Create up to 5 characters",
      "Basic character customization",
      "Standard support",
    ],
  },
  PREMIUM: {
    id: "premium",
    name: "Premium Plan",
    price: "$9.99",
    features: [
      "Unlimited character creation",
      "Advanced character customization",
      "Priority support",
      "Early access to new features",
    ],
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
  },
} as const;

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
export const feedback = pgTable("feedback", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at")
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
export const complaints = pgTable("complaints", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  message: text("message").notNull(),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at")
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