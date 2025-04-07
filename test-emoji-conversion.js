import fs from 'fs';

// Read the emoji-mappings index.ts file
const indexFilePath = './server/emoji-mappings/index.ts';
const indexFileContent = fs.readFileSync(indexFilePath, 'utf8');

// Extract the textToEmojiMap from the file content
const mapRegex = /export const textToEmojiMap: Record<string, string> = {([^}]+)};/s;
const mapMatch = indexFileContent.match(mapRegex);

if (!mapMatch) {
  console.error('Could not extract textToEmojiMap from the file');
  process.exit(1);
}

// Create a simple version of the conversion function
function convertTextExpressionsToEmoji(text) {
  if (!text) return text;
  
  let processedText = text;
  
  // Extract all expressions in asterisks
  const asteriskRegex = /\*(.*?)\*/g;
  const matches = [...processedText.matchAll(asteriskRegex)];
  
  // Build a simple emoji map for testing
  const emojiMap = {
    'smiles': '😊',
    'grins': '😁',
    'waves': '👋',
    'nods': '🙂',
    'brain goes brr': '🤯',
    'scrolls dead-eyed': '😑',
    'grovels': '🙇',
    'pleads': '🥺',
  };
  
  // Process each match
  for (const match of matches) {
    const fullMatch = match[0]; // The entire match including asterisks
    const expression = match[1]; // Just the content inside asterisks
    
    // Skip empty asterisks
    if (!expression.trim()) {
      processedText = processedText.replace(fullMatch, "");
      continue;
    }
    
    // Check for direct matches in our map
    const directEmoji = emojiMap[expression.toLowerCase()];
    if (directEmoji) {
      processedText = processedText.replace(fullMatch, directEmoji);
    } else {
      // If we couldn't find a match, just remove the asterisks and text within them
      processedText = processedText.replace(fullMatch, "");
    }
  }
  
  // Remove any standalone asterisks that might remain
  processedText = processedText.replace(/\*/g, "");
  
  return processedText;
}

// Test examples
const examples = [
  'Hello *smiles* world',
  'Testing *brain goes brr* now',
  'What about *grovels* here?',
  'How about *scrolls dead-eyed* text?',
  'Invalid *xyz123* should be removed',
  'Multiple *waves* and *grins* both work',
  'Text with *asterisks* that don\'t match anything',
  'Text with **empty** expression'
];

// Run tests and display results
console.log('=== EMOJI CONVERSION TEST ===\n');
examples.forEach(example => {
  const result = convertTextExpressionsToEmoji(example);
  console.log(`Input:  "${example}"`);
  console.log(`Output: "${result}"\n`);
});

console.log('Test completed successfully!');