import { pgTable, text, serial, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  characterId: text("character_id").notNull(),
  content: text("content").notNull(),
  isUser: boolean("is_user").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  isPremium: boolean("is_premium").notNull().default(false),
  trialCharactersCreated: integer("trial_characters_created").notNull().default(0),
  subscriptionTier: text("subscription_tier"),
  subscriptionStatus: text("subscription_status").default('trial'),
  subscriptionExpiresAt: timestamp("subscription_expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const customCharacters = pgTable("custom_characters", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  avatar: text("avatar").notNull(),
  description: text("description").notNull(),
  persona: text("persona").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Message schemas
export const insertMessageSchema = createInsertSchema(messages).pick({
  userId: true,
  characterId: true,
  content: true,
  isUser: true,
});

// User schemas
export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
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