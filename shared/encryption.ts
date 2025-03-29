import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

/**
 * Table for storing user encryption keys
 */
export const encryptionKeys = sqliteTable("encryption_keys", {
  id: integer("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  publicKey: text("public_key").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const insertEncryptionKeySchema = createInsertSchema(encryptionKeys).pick({
  userId: true,
  publicKey: true,
});

export type EncryptionKey = typeof encryptionKeys.$inferSelect;
export type InsertEncryptionKey = z.infer<typeof insertEncryptionKeySchema>;

/**
 * Table for storing encrypted conversation keys
 * Each conversation between two users has two entries (one for each user)
 * with their own encrypted version of the symmetric key
 */
export const conversationKeys = sqliteTable("conversation_keys", {
  id: integer("id").primaryKey(),
  userId: integer("user_id").notNull(), 
  otherUserId: integer("other_user_id").notNull(),
  encryptedKey: text("encrypted_key").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// Add unique constraint to prevent duplicate entries for the same conversation
// from the perspective of a single user
export const conversationKeysConstraints = {
  uniqueConversation: {
    name: "unique_conversation_key",
    columns: ["userId", "otherUserId"],
  },
};

export const insertConversationKeySchema = createInsertSchema(conversationKeys).pick({
  userId: true,
  otherUserId: true,
  encryptedKey: true,
});

export type ConversationKey = typeof conversationKeys.$inferSelect;
export type InsertConversationKey = z.infer<typeof insertConversationKeySchema>;