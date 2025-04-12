import { completeEmojiMap } from './emoji-mappings';
import { EmotionCategory, getEmotionForEmoji } from './emoji-emotion-mapping';

// Create a sorted array of [key, value] pairs for more efficient matching
// Sort by key length (descending) to prioritize longer, more specific matches
const sortedEmojiEntries = Object.entries(completeEmojiMap)
  .sort((a, b) => b[0].length - a[0].length);

/**
 * Processes the user message to ensure emojis are preserved for AI responses
 * Per requirements, we don't modify user input - we leave it as is
 * 
 * @param text User input message text containing emojis
 * @returns Original text without modification
 */
export function processUserInput(text: string): string {
  // Return the text as-is, we don't process user emojis
  return text;
}

/**
 * Improved emoji matching for phrases, not just individual words
 * This handles whole phrases like "I think I know" more intelligently
 * 
 * @param text The text to analyze for emoji matching
 * @returns Object with the best matching emoji and its original text, or null if no good match
 */
function findBestEmojiMatch(text: string): { emoji: string; originalText: string } | null {
  if (!text) return null;
  
  const lowerCaseText = text.toLowerCase().trim();
  
  // First, try exact matches for complete phrases
  for (const [expression, emoji] of sortedEmojiEntries) {
    // Check if the expression is the same as the full text or almost the same
    if (lowerCaseText === expression || 
        lowerCaseText === expression + 's' ||
        lowerCaseText === expression + 'ing') {
      return { emoji, originalText: text };
    }
  }
  
  // Next, check for expressions that make up a significant portion of the text
  for (const [expression, emoji] of sortedEmojiEntries) {
    // Only match expressions that are standalone actions/emotions
    if (expression.length >= 4 && 
        (lowerCaseText.includes(` ${expression} `) || 
         lowerCaseText.startsWith(`${expression} `) || 
         lowerCaseText.endsWith(` ${expression}`))) {
      return { emoji, originalText: text };
    }
  }
  
  // For shorter texts, handle full-text partial matches
  if (lowerCaseText.length < 30) {
    for (const [expression, emoji] of sortedEmojiEntries) {
      // For short expressions, they should be more significant parts of the text
      if (expression.length >= 4 && lowerCaseText.includes(expression)) {
        return { emoji, originalText: text };
      }
    }
  }
  
  return null;
}

/**
 * Information about an emotion expressed in a message
 */
export interface EmotionInfo {
  emoji: string;
  originalText: string;
  category: EmotionCategory;
}

/**
 * Converts text enclosed in asterisks to appropriate emojis
 * This function handles expressions like *smile*, *wave*, etc.
 * Improved version with better context-aware matching logic
 * 
 * @param text Text that may contain expressions in asterisks
 * @returns Text with asterisk expressions converted to emojis
 */
export function convertAsteriskTextToEmojis(text: string): string {
  if (!text) return text;
  
  // Regular expression to match text inside asterisks: *text*
  const asteriskPattern = /\*([^*]+)\*/g;
  
  return text.replace(asteriskPattern, (match, textInsideAsterisks) => {
    // Get the best matching emoji using our improved context-aware function
    const result = findBestEmojiMatch(textInsideAsterisks);
    
    // If we found a good match, use it
    if (result) {
      return result.emoji;
    }
    
    // If no match found, keep the original text but remove asterisks
    return textInsideAsterisks;
  });
}

/**
 * Processes the AI response to ensure proper emoji display
 * This function replaces text expressions like *waves* with their emoji equivalents
 * Enhanced with better context-aware matching and emotion categories
 * 
 * @param text AI generated response text
 * @returns Object containing the processed text and emotion information
 */
export function processAIResponse(text: string): {
  processedText: string;
  emotions: EmotionInfo[];
} {
  if (!text) return { processedText: text, emotions: [] };
  
  // Clean up prefix patterns like "Character:" or "Assistant:"
  let processedText = text.replace(/^(Assistant|Character|[^:]+):\s*/i, "");
  
  // Remove starting and ending quotes if present
  processedText = processedText.replace(/^['"]|['"]$/g, "");
  
  // Store the emotion information found
  const emotions: EmotionInfo[] = [];
  
  // Replace all expressions within asterisks with their corresponding emojis
  // Using our improved context-aware matching
  const resultText = processedText.replace(/\*([^*]+)\*/g, (match, textInsideAsterisks) => {
    // Get the best matching emoji using our improved context-aware function
    const result = findBestEmojiMatch(textInsideAsterisks);
    
    // If we found a good match, use it and store the emotion information
    if (result) {
      const category = getEmotionForEmoji(result.emoji);
      emotions.push({
        emoji: result.emoji,
        originalText: textInsideAsterisks,
        category
      });
      return result.emoji;
    }
    
    // If no match found, just return the text without asterisks
    return textInsideAsterisks;
  });
  
  return {
    processedText: resultText,
    emotions
  };
}

/**
 * Adds detailed emotion expression instructions to the AI system prompt
 * Improved version to provide better guidance for expression
 * 
 * @param systemPrompt The original system prompt
 * @returns Updated system prompt with better instructions
 */
export function addEmojiInstructions(systemPrompt: string): string {
  // More detailed instruction to use asterisks for specific emotions
  return `${systemPrompt}
7. Express emotions and actions using asterisks (e.g., *smiles*, *blushes*, *nods*). Use single words or short phrases that clearly indicate your emotional reaction or physical action.`;
}