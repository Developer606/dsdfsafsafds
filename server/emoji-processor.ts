import { completeEmojiMap } from './emoji-mappings';

// Create a sorted array of [key, value] pairs for more efficient matching
// Sort by key length (descending) to prioritize longer, more specific matches
const sortedEmojiEntries = Object.entries(completeEmojiMap)
  .sort((a, b) => b[0].length - a[0].length);

/**
 * Processes the user message for AI responses
 * Per requirements, we don't modify or process user input in any way
 * This is intentionally a pass-through function
 * 
 * @param text User input message text 
 * @returns Original text without any emoji processing
 */
export function processUserInput(text: string): string {
  // Return the text as-is with no processing whatsoever
  return text;
}

/**
 * Processes the AI response to convert text expressions to emojis
 * This function handles converting expressions like *smile*, *wave*, etc.
 * Optimized version with better matching logic - used only for character responses
 * 
 * @param text Text that may contain expressions in asterisks
 * @returns Text with asterisk expressions converted to emojis
 */
export function convertAsteriskTextToEmojis(text: string): string {
  if (!text) return text;
  
  // Regular expression to match text inside asterisks: *text*
  const asteriskPattern = /\*([^*]+)\*/g;
  
  return text.replace(asteriskPattern, (match, textInsideAsterisks) => {
    // Convert to lowercase for matching
    const lowerCaseText = textInsideAsterisks.toLowerCase().trim();
    
    // Use the sorted entries to find matches - prioritizing longer expressions
    for (const [expression, emoji] of sortedEmojiEntries) {
      if (lowerCaseText.includes(expression)) {
        return emoji; // Replace with appropriate emoji
      }
    }
    
    // If no match found, keep the original text but remove asterisks
    return textInsideAsterisks;
  });
}

/**
 * Processes the AI response to ensure proper emoji display
 * This function completely replaces text expressions like *waves* with their emoji equivalents
 * Optimized version with improved matching and cleaning
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
  
  // Replace all expressions within asterisks with their corresponding emojis using a single pass
  return processedText.replace(/\*([^*]+)\*/g, (match, textInsideAsterisks) => {
    const lowerCaseText = textInsideAsterisks.toLowerCase().trim();
    
    // Use the sorted entries to prioritize longer matches
    for (const [expression, emoji] of sortedEmojiEntries) {
      if (lowerCaseText.includes(expression)) {
        return emoji; // Completely replace the asterisk expression with an emoji
      }
    }
    
    // If no match found, just return the text without asterisks
    return textInsideAsterisks;
  });
}

/**
 * Adds minimal emotion expression instructions to the AI system prompt
 * Simplified version to reduce token usage
 * 
 * @param systemPrompt The original system prompt
 * @returns Updated system prompt with minimal instructions
 */
export function addEmojiInstructions(systemPrompt: string): string {
  // Super concise instruction to just use asterisks for emotions
  // This is deliberately kept simple to minimize token usage
  return `${systemPrompt}
7. Express emotions using asterisks (*smiles*, *waves*, etc).`;
}