import { completeEmojiMap } from './emoji-mappings';

/**
 * Processes the user message to ensure emojis are preserved for AI responses
 * This function ensures that emojis in user messages are handled correctly
 * 
 * @param text User input message text containing emojis
 * @returns Processed text with emojis properly formatted for AI input
 */
export function processUserInput(text: string): string {
  // Simply return the text as-is, ensuring emojis are preserved
  // The actual emoji preservation is handled by the AI model instruction
  return text;
}

/**
 * Converts text enclosed in asterisks to appropriate emojis
 * This function handles expressions like *smile*, *wave*, etc.
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
    
    // Check if there's a matching emoji in our map
    for (const [expression, emoji] of Object.entries(completeEmojiMap)) {
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
  return processedText.replace(/\*([^*]+)\*/g, (match, textInsideAsterisks) => {
    const lowerCaseText = textInsideAsterisks.toLowerCase().trim();
    
    // Try to find a matching emoji in our comprehensive map
    for (const [expression, emoji] of Object.entries(completeEmojiMap)) {
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
  return `${systemPrompt}
7. Express emotions using asterisks (*smiles*, *waves*, etc).`;
}