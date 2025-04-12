/**
 * Utility functions for handling emojis and text-based gestures in character responses
 */

// Common expressions that should be preserved in original form
export const COMMON_EXPRESSIONS = [
  // Gestures and actions
  'nods', 'shakes head', 'laughs', 'laughs softly', 'laughs nervously',
  'grovels', 'pleads', 'begs', 'prays', 'meditates', 'zones out',
  'presses lips together', 'grins mischievously', 'twirls mustache', 'looks innocent',
  'sighs', 'gasps', 'smiles', 'frowns', 'winks', 'blushes', 'glares',
  
  // Expressions that might be converted to emoji-like text
  'sigh', 'gasp', 'smile', 'frown', 'wink', 'blush', 'glare',
  'giggle', 'smirk', 'stare', 'shrug', 'sob', 'cry', 'angry',
  'groan', 'scoff', 'shiver', 'yawn', 'sneeze', 'hiccup'
];

// Simple helper function to detect if text might contain emojis
function containsEmojiChars(text: string): boolean {
  // Check for common emoji Unicode ranges by code point values
  for (let i = 0; i < text.length; i++) {
    const code = text.codePointAt(i);
    if (code && code > 8000) { // Simple heuristic - most emojis have high code points
      return true;
    }
  }
  return false;
}

/**
 * Checks if a string contains emojis
 * @param text The text to check for emojis
 * @returns boolean indicating whether the text contains emojis
 */
export function containsEmoji(text: string): boolean {
  return containsEmojiChars(text);
}

/**
 * Post-process AI-generated text to fix any emojis that were converted to text
 * @param text The AI-generated text to process
 * @returns The processed text with emojis properly preserved
 */
export function fixEmojiDescriptions(text: string): string {
  // Common patterns to fix
  const replacements: [RegExp, string][] = [
    // Basic emotions
    [/\*sigh\*/gi, "😌"],
    [/\*sighs\*/gi, "😌"],
    [/\*smile\*/gi, "😊"],
    [/\*smiles\*/gi, "😊"],
    [/\*laugh\*/gi, "😄"],
    [/\*laughs\*/gi, "😄"],
    [/\*giggle\*/gi, "😆"],
    [/\*giggles\*/gi, "😆"],
    [/\*blush\*/gi, "😊"],
    [/\*blushes\*/gi, "😊"],
    [/\*wink\*/gi, "😉"],
    [/\*winks\*/gi, "😉"],
    [/\*frown\*/gi, "🙁"],
    [/\*frowns\*/gi, "🙁"],
    [/\*gasp\*/gi, "😮"],
    [/\*gasps\*/gi, "😮"],
    
    // Actions and gestures
    [/\*nods\*/gi, "🙂"],
    [/\*shakes head\*/gi, "🙅"],
    [/\*waves\*/gi, "👋"],
    [/\*thumbs up\*/gi, "👍"],
    [/\*thumbs down\*/gi, "👎"],
    [/\*shrug\*/gi, "🤷"],
    [/\*shrugs\*/gi, "🤷"],
    [/\*clap\*/gi, "👏"],
    [/\*claps\*/gi, "👏"],
    [/\*high five\*/gi, "✋"],
    
    // Additional emotions
    [/\*sad\*/gi, "😢"],
    [/\*cry\*/gi, "😢"],
    [/\*cries\*/gi, "😢"],
    [/\*angry\*/gi, "😠"],
    [/\*annoyed\*/gi, "😒"],
    [/\*shocked\*/gi, "😲"],
    [/\*confused\*/gi, "😕"],
    [/\*heart\*/gi, "❤️"],
    [/\*love\*/gi, "❤️"],
    [/\*joy\*/gi, "😂"],
    [/\*excited\*/gi, "🎉"],
    [/\*happy\*/gi, "😃"],
    [/\*worried\*/gi, "😟"],
    [/\*nervous\*/gi, "😬"],
    [/\*curious\*/gi, "🤔"],
    [/\*think\*/gi, "🤔"],
    [/\*thinks\*/gi, "🤔"]
  ];

  let processedText = text;
  for (const [pattern, replacement] of replacements) {
    processedText = processedText.replace(pattern, replacement);
  }

  return processedText;
}

/**
 * Generate system instructions for emoji and gesture handling
 * @returns String containing instructions for the LLM regarding emoji handling
 */
export function getEmojiPreservationInstructions(): string {
  return `
When users send emojis, always preserve them exactly as sent.
Do not replace emojis with text descriptions like *smile* or *sigh*.
If a user sends an emoji like 😊, respond to it as an emoji, not as "*smile*".
Treat all emojis as their actual visual representations, not as text actions.
Don't use asterisks (*) to indicate emotions or gestures - use the actual emoji instead.
`;
}

/**
 * Enhances the system prompt with emoji and gesture handling instructions
 * @param systemPrompt The original system prompt
 * @returns The enhanced system prompt with emoji handling instructions
 */
export function enhanceSystemPromptWithEmojiHandling(systemPrompt: string): string {
  return systemPrompt + '\n' + getEmojiPreservationInstructions();
}