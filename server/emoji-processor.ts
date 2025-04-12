import { completeEmojiMap } from './emoji-mappings';

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
 * @returns The best matching emoji or null if no good match
 */
function findBestEmojiMatch(text: string): string | null {
  if (!text) return null;
  
  const lowerCaseText = text.toLowerCase().trim();
  
  // First, try exact matches for complete phrases
  for (const [expression, emoji] of sortedEmojiEntries) {
    // Check if the expression is the same as the full text or almost the same
    if (lowerCaseText === expression || 
        lowerCaseText === expression + 's' ||
        lowerCaseText === expression + 'ing') {
      return emoji;
    }
  }
  
  // Next, check for expressions that make up a significant portion of the text
  for (const [expression, emoji] of sortedEmojiEntries) {
    // Only match expressions that are standalone actions/emotions
    if (expression.length >= 4 && 
        (lowerCaseText.includes(` ${expression} `) || 
         lowerCaseText.startsWith(`${expression} `) || 
         lowerCaseText.endsWith(` ${expression}`))) {
      return emoji;
    }
  }
  
  // For shorter texts, handle full-text partial matches
  if (lowerCaseText.length < 30) {
    for (const [expression, emoji] of sortedEmojiEntries) {
      // For short expressions, they should be more significant parts of the text
      if (expression.length >= 4 && lowerCaseText.includes(expression)) {
        return emoji;
      }
    }
  }
  
  return null;
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
    const emoji = findBestEmojiMatch(textInsideAsterisks);
    
    // If we found a good match, use it
    if (emoji) {
      return emoji;
    }
    
    // If no match found, keep the original text but remove asterisks
    return textInsideAsterisks;
  });
}

/**
 * Processes the AI response to ensure proper emoji display
 * This function replaces text expressions like *waves* with their emoji equivalents
 * Enhanced with better context-aware matching
 * 
 * @param text AI generated response text
 * @returns Processed text with asterisk expressions converted to emojis
 */
export function processAIResponse(text: string): string {
  if (!text) return text;
  
  // Clean up prefix patterns like "Character:" or "Assistant:"
  let processedText = text.replace(/^(Assistant|Character|[^:]+):\s*/i, "");
  
  // Remove starting and ending quotes if present
  processedText = processedText.replace(/^['"]|['"]$/g, "");
  
  // Replace all expressions within asterisks with their corresponding emojis
  // Using our improved context-aware matching
  return processedText.replace(/\*([^*]+)\*/g, (match, textInsideAsterisks) => {
    // Get the best matching emoji using our improved context-aware function
    const emoji = findBestEmojiMatch(textInsideAsterisks);
    
    // If we found a good match, use it
    if (emoji) {
      return emoji;
    }
    
    // If no match found, just return the text without asterisks
    return textInsideAsterisks;
  });
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