/**
 * Character Reaction GIF Generator
 * This module handles generating and serving reaction GIFs for characters
 * based on their emotional state and current conversation context.
 */

import { Character } from '../shared/schema';
import path from 'path';
import fs from 'fs';

// Map of emotions to corresponding GIF filenames
interface EmotionGifMap {
  [emotion: string]: string[];
}

// GIF mapping by character
interface CharacterGifLibrary {
  [characterId: string]: EmotionGifMap;
}

// Available emotions that can be detected and matched to GIFs
export enum Emotion {
  HAPPY = 'happy',
  SAD = 'sad',
  ANGRY = 'angry',
  SURPRISED = 'surprised',
  CONFUSED = 'confused',
  EXCITED = 'excited',
  EMBARRASSED = 'embarrassed',
  ANNOYED = 'annoyed',
  THOUGHTFUL = 'thoughtful',
  DETERMINED = 'determined',
  NERVOUS = 'nervous',
  SHY = 'shy',
  CALM = 'calm',
  BORED = 'bored',
  NEUTRAL = 'neutral'
}

// Default/fallback GIF library with general reaction GIFs
const defaultGifLibrary: EmotionGifMap = {
  [Emotion.HAPPY]: ['happy_1.gif', 'happy_2.gif', 'happy_3.gif'],
  [Emotion.SAD]: ['sad_1.gif', 'sad_2.gif', 'sad_3.gif'],
  [Emotion.ANGRY]: ['angry_1.gif', 'angry_2.gif', 'angry_3.gif'],
  [Emotion.SURPRISED]: ['surprised_1.gif', 'surprised_2.gif'],
  [Emotion.CONFUSED]: ['confused_1.gif', 'confused_2.gif'],
  [Emotion.EXCITED]: ['excited_1.gif', 'excited_2.gif'],
  [Emotion.EMBARRASSED]: ['embarrassed_1.gif', 'embarrassed_2.gif'],
  [Emotion.ANNOYED]: ['annoyed_1.gif', 'annoyed_2.gif'],
  [Emotion.THOUGHTFUL]: ['thoughtful_1.gif', 'thoughtful_2.gif'],
  [Emotion.DETERMINED]: ['determined_1.gif', 'determined_2.gif'],
  [Emotion.NERVOUS]: ['nervous_1.gif', 'nervous_2.gif'],
  [Emotion.SHY]: ['shy_1.gif', 'shy_2.gif'],
  [Emotion.CALM]: ['calm_1.gif', 'calm_2.gif'],
  [Emotion.BORED]: ['bored_1.gif', 'bored_2.gif'],
  [Emotion.NEUTRAL]: ['neutral_1.gif', 'neutral_2.gif'],
};

// Character-specific GIF libraries
const characterGifLibrary: CharacterGifLibrary = {
  // Sakura character GIFs
  'sakura': {
    [Emotion.HAPPY]: ['sakura_happy_1.gif', 'sakura_happy_2.gif'],
    [Emotion.ANGRY]: ['sakura_angry_1.gif', 'sakura_angry_2.gif'],
    [Emotion.SURPRISED]: ['sakura_surprised_1.gif'],
    // Add more emotions for Sakura
  },
  // Add more characters with their emotion-specific GIFs
};

// Base directory for GIF storage
const GIF_DIRECTORY = path.join(process.cwd(), 'public', 'reaction-gifs');

/**
 * Analyzes a message to determine the emotional context
 * @param message The character's message to analyze
 * @returns The detected emotion
 */
export function detectEmotion(message: string): Emotion {
  const lowerMessage = message.toLowerCase();
  
  // Simple keyword-based emotion detection
  if (lowerMessage.includes('😊') || lowerMessage.includes('happy') || 
      lowerMessage.includes('glad') || lowerMessage.includes('joy')) {
    return Emotion.HAPPY;
  }
  
  if (lowerMessage.includes('😢') || lowerMessage.includes('sad') || 
      lowerMessage.includes('sorry') || lowerMessage.includes('upset')) {
    return Emotion.SAD;
  }
  
  if (lowerMessage.includes('😠') || lowerMessage.includes('angry') || 
      lowerMessage.includes('mad') || lowerMessage.includes('furious')) {
    return Emotion.ANGRY;
  }
  
  if (lowerMessage.includes('😲') || lowerMessage.includes('surprised') || 
      lowerMessage.includes('shocked') || lowerMessage.includes('wow')) {
    return Emotion.SURPRISED;
  }
  
  if (lowerMessage.includes('😕') || lowerMessage.includes('confused') || 
      lowerMessage.includes('unsure') || lowerMessage.includes('not understand')) {
    return Emotion.CONFUSED;
  }
  
  if (lowerMessage.includes('excited') || lowerMessage.includes('can\'t wait') || 
      lowerMessage.includes('amazing')) {
    return Emotion.EXCITED;
  }
  
  if (lowerMessage.includes('embarrassed') || lowerMessage.includes('blush')) {
    return Emotion.EMBARRASSED;
  }
  
  if (lowerMessage.includes('annoyed') || lowerMessage.includes('irritated')) {
    return Emotion.ANNOYED;
  }
  
  if (lowerMessage.includes('hmm') || lowerMessage.includes('thinking') || 
      lowerMessage.includes('consider')) {
    return Emotion.THOUGHTFUL;
  }
  
  if (lowerMessage.includes('will') || lowerMessage.includes('determined') || 
      lowerMessage.includes('definitely')) {
    return Emotion.DETERMINED;
  }
  
  if (lowerMessage.includes('nervous') || lowerMessage.includes('anxious')) {
    return Emotion.NERVOUS;
  }
  
  if (lowerMessage.includes('shy') || lowerMessage.includes('timid')) {
    return Emotion.SHY;
  }
  
  // Default to neutral if no clear emotion is detected
  return Emotion.NEUTRAL;
}

/**
 * Gets a random GIF URL for a character based on the detected emotion
 * @param character The character object
 * @param emotion The detected emotion
 * @returns URL to the selected GIF
 */
export function getReactionGif(character: Character, emotion: Emotion): string {
  // Get character-specific GIF library or fall back to default
  const characterGifs = characterGifLibrary[character.id];
  const emotionGifs = characterGifs?.[emotion] || defaultGifLibrary[emotion] || defaultGifLibrary[Emotion.NEUTRAL];
  
  // Select a random GIF from the available options
  const randomIndex = Math.floor(Math.random() * emotionGifs.length);
  const selectedGif = emotionGifs[randomIndex];
  
  // Return the path to the GIF
  return `/reaction-gifs/${selectedGif}`;
}

/**
 * Ensures the GIF directory structure exists
 */
export function initializeGifDirectory(): void {
  if (!fs.existsSync(GIF_DIRECTORY)) {
    try {
      fs.mkdirSync(GIF_DIRECTORY, { recursive: true });
      console.log(`Created GIF directory at ${GIF_DIRECTORY}`);
    } catch (error) {
      console.error('Error creating GIF directory:', error);
    }
  }
}

/**
 * Adds a new emotion-GIF mapping for a character
 * @param characterId The character's ID
 * @param emotion The emotion to map
 * @param gifFilename The GIF filename
 */
export function addCharacterEmotionGif(characterId: string, emotion: Emotion, gifFilename: string): void {
  // Initialize character in library if not exists
  if (!characterGifLibrary[characterId]) {
    characterGifLibrary[characterId] = {};
  }
  
  // Initialize emotion array if not exists
  if (!characterGifLibrary[characterId][emotion]) {
    characterGifLibrary[characterId][emotion] = [];
  }
  
  // Add the GIF to the character's emotion library
  characterGifLibrary[characterId][emotion].push(gifFilename);
}

/**
 * Gets a reaction GIF URL based on a message and character
 * @param character The character object
 * @param message The message to analyze for emotion
 * @returns URL to the reaction GIF
 */
export function getReactionGifFromMessage(character: Character, message: string): string {
  const emotion = detectEmotion(message);
  return getReactionGif(character, emotion);
}