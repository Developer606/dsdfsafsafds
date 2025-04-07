/**
 * Emoji Mappings
 * 
 * This module exports comprehensive mappings between text expressions in asterisks
 * and their emoji equivalents. These are used to convert character expressions
 * into appropriate emojis for a more anime-like chat experience.
 * 
 * Each category is organized in separate files for better maintainability:
 * - facial-expressions.ts: Contains facial expressions (smiles, frowns, etc.)
 * - emotional-reactions.ts: Contains emotional reactions (laughs, cries, etc.)
 * - gestures-and-movements.ts: Contains body language and physical movements
 * - anime-specific.ts: Contains anime-specific expressions (sweatdrop, etc.)
 * - special-actions.ts: Contains special actions and miscellaneous expressions
 * - social-media.ts: Contains social media behaviors and digital life expressions
 * - daily-life.ts: Contains everyday life situations and routines
 * - mental-states.ts: Contains internal thoughts and emotional states
 */

import { facialExpressions } from './facial-expressions';
import { emotionalReactions } from './emotional-reactions';
import { gesturesAndMovements } from './gestures-and-movements';
import { animeSpecific } from './anime-specific';
import { specialActions } from './special-actions';
import { socialMediaExpressions } from './social-media';
import { dailyLifeExpressions } from './daily-life';
import { mentalStateExpressions } from './mental-states';

// Combine all emoji mapping categories into a single object
export const textToEmojiMap: Record<string, string> = {
  ...facialExpressions,
  ...emotionalReactions,
  ...gesturesAndMovements,
  ...animeSpecific,
  ...specialActions,
  ...socialMediaExpressions,
  ...dailyLifeExpressions,
  ...mentalStateExpressions
};

/**
 * Function to convert text expressions in asterisks to emoji
 * Uses a two-pass approach to handle both exact matches and partial matches
 * Always removes asterisks and their content if no emoji match is found
 * 
 * @param text The text containing expressions in asterisks
 * @returns Text with expressions converted to emojis or asterisks removed
 */
export function convertTextExpressionsToEmoji(text: string): string {
  if (!text) return text;
  
  let processedText = text;
  
  // Extract all expressions in asterisks
  const asteriskRegex = /\*(.*?)\*/g;
  const matches = [...processedText.matchAll(asteriskRegex)];
  
  // Process each match
  for (const match of matches) {
    const fullMatch = match[0]; // The entire match including asterisks
    const expression = match[1]; // Just the content inside asterisks
    
    // Skip empty asterisks
    if (!expression.trim()) {
      processedText = processedText.replace(fullMatch, "");
      continue;
    }
    
    // First check for direct matches in our map
    const directEmoji = textToEmojiMap[expression.toLowerCase()];
    if (directEmoji) {
      processedText = processedText.replace(fullMatch, directEmoji);
      continue;
    }
    
    // If no direct match, try to match parts within the expression
    let matched = false;
    
    // Sort keys by length (descending) to prioritize longer matches
    const sortedKeys = Object.keys(textToEmojiMap).sort((a, b) => b.length - a.length);
    
    for (const key of sortedKeys) {
      // Check if the expression contains this key as a word or phrase
      const pattern = new RegExp(`\\b${key}\\b`, 'i');
      if (pattern.test(expression)) {
        processedText = processedText.replace(fullMatch, textToEmojiMap[key]);
        matched = true;
        break;
      }
    }
    
    // Special case handling based on keywords
    if (!matched) {
      // Handle expressions based on partial keywords
      if (/confus(ed|ion)/i.test(expression)) {
        processedText = processedText.replace(fullMatch, '😕');
      } else if (/scratch.*head/i.test(expression)) {
        processedText = processedText.replace(fullMatch, '🤔');
      } else if (/holds.*out.*hand/i.test(expression)) {
        processedText = processedText.replace(fullMatch, '✋');
      } else if (/scrunches.*face/i.test(expression)) {
        processedText = processedText.replace(fullMatch, '😕');
      } else if (/looks.*around/i.test(expression)) {
        processedText = processedText.replace(fullMatch, '👀');
      } else if (/looks.*confused/i.test(expression)) {
        processedText = processedText.replace(fullMatch, '😕');
      } else if (/looks.*away/i.test(expression)) {
        processedText = processedText.replace(fullMatch, '😒');
      } else if (/nods.*enthusiastically/i.test(expression)) {
        processedText = processedText.replace(fullMatch, '😃👍');
      } else if (/laughs.*nervously/i.test(expression)) {
        processedText = processedText.replace(fullMatch, '😅');
      } else {
        // If we couldn't find a match, just remove the asterisks and text within them
        processedText = processedText.replace(fullMatch, "");
      }
    }
  }
  
  // Remove any standalone asterisks that might remain
  processedText = processedText.replace(/\*/g, "");
  
  return processedText;
}