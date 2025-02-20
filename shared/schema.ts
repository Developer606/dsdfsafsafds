import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
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