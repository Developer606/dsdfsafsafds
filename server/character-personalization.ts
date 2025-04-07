/**
 * Character Personalization Module
 * Implements the methods needed for personalized character conversations
 */

import { storage } from './storage';
import { Character } from '@shared/characters';

/**
 * Get character by ID, whether it's predefined or custom
 * This is a unified method that works with both types of characters
 */
export async function getCharacterById(characterId: string): Promise<Character | undefined> {
  try {
    // Check if it's a custom character (starts with "custom_")
    if (characterId.startsWith("custom_")) {
      const customCharId = parseInt(characterId.replace("custom_", ""), 10);
      if (isNaN(customCharId)) {
        return undefined;
      }
      
      const customChar = await storage.getCustomCharacterById(customCharId);
      if (!customChar) {
        return undefined;
      }
      
      return {
        id: `custom_${customChar.id}`,
        name: customChar.name,
        avatar: customChar.avatar,
        description: customChar.description,
        persona: customChar.persona
      };
    } else {
      // It's a predefined character
      return await storage.getPredefinedCharacterById(characterId);
    }
  } catch (error) {
    console.error("Error getting character by ID:", error);
    return undefined;
  }
}

/**
 * Get extended user profile data for personalization
 * This retrieves user data specifically for character personalization
 */
export async function getUserProfileData(userId: number): Promise<{
  fullName?: string;
  age?: number;
  gender?: string;
  bio?: string;
  profileCompleted?: boolean;
} | undefined> {
  try {
    const user = await storage.getUser(userId);
    if (!user) {
      return undefined;
    }
    
    return {
      fullName: user.fullName || undefined,
      age: user.age || undefined,
      gender: user.gender || undefined,
      bio: user.bio || undefined,
      profileCompleted: user.profileCompleted || false
    };
  } catch (error) {
    console.error("Error getting user profile data for personalization:", error);
    return undefined;
  }
}