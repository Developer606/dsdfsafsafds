import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  username: text("username").notNull(),
  password: text("password").notNull(),
  isPremium: boolean("is_premium").notNull().default(false),
  trialCharactersCreated: integer("trial_characters_created").notNull().default(0),
  subscriptionTier: text("subscription_tier"),
  subscriptionStatus: text("subscription_status").default('trial'),
  subscriptionExpiresAt: timestamp("subscription_expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  characterId: text("character_id").notNull(),
  content: text("content").notNull(),
  isUser: boolean("is_user").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  messageType: text("message_type").notNull().default('text'), // New field
  stickerId: text("sticker_id"), // New field
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
export const messageTypeSchema = z.enum(['text', 'emoji', 'sticker']);

export const stickerSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  category: z.string(),
  keywords: z.array(z.string())
});

export const stickers = {
  categories: [
    {
      id: 'anime',
      name: 'Anime',
      stickers: [
        {
          id: 'anime_happy',
          url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=happy',
          category: 'anime',
          keywords: ['happy', 'smile', 'joy']
        },
        {
          id: 'anime_sad',
          url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=sad',
          category: 'anime',
          keywords: ['sad', 'cry', 'tears']
        },
        {
          id: 'anime_love',
          url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=love',
          category: 'anime',
          keywords: ['love', 'heart', 'affection']
        }
      ]
    }
  ]
} as const;

export const insertMessageSchema = createInsertSchema(messages).pick({
  userId: true,
  characterId: true,
  content: true,
  isUser: true,
}).extend({
  language: z.string().default("english"),
  script: z.enum(["devanagari", "latin"]).optional(),
  messageType: messageTypeSchema.default('text'),
  stickerId: z.string().optional()
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
export type MessageType = z.infer<typeof messageTypeSchema>;
export type Sticker = z.infer<typeof stickerSchema>;

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