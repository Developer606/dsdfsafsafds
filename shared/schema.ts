import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  subscriptionTier: text("subscription_tier").notNull().default("free"),
  subscriptionEndDate: timestamp("subscription_end_date"),
});

export const characters = pgTable("characters", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  avatar: text("avatar").notNull(),
  description: text("description").notNull(),
  persona: text("persona").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  characterId: text("character_id").notNull(),
  content: text("content").notNull(),
  isUser: boolean("is_user").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

// Schema for user insertion
export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
});

// Schema for character insertion
export const insertCharacterSchema = createInsertSchema(characters).pick({
  userId: true,
  name: true,
  avatar: true,
  description: true,
  persona: true,
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  characterId: true,
  content: true,
  isUser: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertCharacter = z.infer<typeof insertCharacterSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type User = typeof users.$inferSelect;
export type Character = typeof characters.$inferSelect;
export type Message = typeof messages.$inferSelect;