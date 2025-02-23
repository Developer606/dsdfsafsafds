import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

// Users table with optimized indexes for high-traffic login/signup
export const users = sqliteTable("users", {
  id: integer("id").primaryKey(),
  email: text("email").notNull().unique(),
  username: text("username").notNull(),
  password: text("password").notNull(),
  isPremium: integer("is_premium", { mode: "boolean" }).notNull().default(false),
  trialCharactersCreated: integer("trial_characters_created").notNull().default(0),
  subscriptionTier: text("subscription_tier"),
  subscriptionStatus: text("subscription_status").default('trial'),
  subscriptionExpiresAt: integer("subscription_expires_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Messages table optimized for chat history retrieval
export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  characterId: text("character_id").notNull(),
  content: text("content").notNull(),
  isUser: integer("is_user", { mode: "boolean" }).notNull(),
  language: text("language").default("english"),
  script: text("script"),
  model: text("model").default("DEFAULT"),
  timestamp: integer("timestamp", { mode: "timestamp_ms" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Custom characters table
export const customCharacters = sqliteTable("custom_characters", {
  id: integer("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  avatar: text("avatar").notNull(),
  description: text("description").notNull(),
  persona: text("persona").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Message schemas
export const insertMessageSchema = createInsertSchema(messages).pick({
  userId: true,
  characterId: true,
  content: true,
  isUser: true,
}).extend({
  language: z.string().default("english"),
  script: z.enum(["devanagari", "latin"]).optional(),
  model: z.enum(["DEFAULT", "RESEARCH"]).default("DEFAULT")
});

// User schemas
export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  username: true,
  password: true,
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Custom character schemas
export const insertCustomCharacterSchema = createInsertSchema(customCharacters)
  .pick({
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

export type CustomCharacter = typeof customCharacters.$inferSelect;
export type InsertCustomCharacter = z.infer<typeof insertCustomCharacterSchema>;

// Subscription Types
export const subscriptionPlans = {
  BASIC: {
    id: 'basic',
    name: 'Basic Plan',
    price: '$4.99/month',
    features: [
      'Create up to 5 characters',
      'Basic character customization',
      'Standard support'
    ]
  },
  PREMIUM: {
    id: 'premium',
    name: 'Premium Plan',
    price: '$9.99/month',
    features: [
      'Unlimited character creation',
      'Advanced character customization',
      'Priority support',
      'Early access to new features'
    ]
  },
  PRO: {
    id: 'pro',
    name: 'Pro Plan',
    price: '$19.99/month',
    features: [
      'Everything in Premium',
      'Custom character API access',
      'Dedicated support',
      'White-label option',
      'Team collaboration features'
    ]
  }
} as const;

export type SubscriptionTier = keyof typeof subscriptionPlans;
export type SubscriptionStatus = 'trial' | 'active' | 'cancelled' | 'expired';

// Add supported languages
export const supportedLanguages = [
  { id: "english", name: "English" },
  { id: "japanese", name: "日本語" },
  { id: "spanish", name: "Español" },
  { id: "french", name: "Français" },
  { id: "chinese", name: "中文" },
  { id: "korean", name: "한국어" },
  { id: "hindi", name: "हिन्दी", scripts: [
    { id: "devanagari", name: "देवनागरी" },
    { id: "latin", name: "Roman" }
  ]}
] as const;

export type SupportedLanguage = typeof supportedLanguages[number]["id"];
export type ScriptPreference = "devanagari" | "latin";