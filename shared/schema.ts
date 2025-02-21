import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  username: text("username").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  characterId: text("character_id").notNull(),
  content: text("content").notNull(),
  isUser: boolean("is_user").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
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
}).extend({
  language: z.string().default("english"),
  script: z.enum(["devanagari", "latin"]).optional()
});

// User schemas
export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  username: true,
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