/**
 * Personality Adapter for AI Character Responses
 * This file contains utilities that adapt AI character responses
 * based on user personality traits and preferences
 */

import { type Character } from "@shared/characters";

// User personality trait influences
interface PersonalityInfluence {
  trait: string;           // User personality trait
  characterTone: string;   // How character should adjust tone
  responseStyle: string;   // How responses should be styled
  topics: string[];        // Topics to emphasize or avoid
}

// Mapping of personality traits to response adaptations
const personalityAdaptations: Record<string, PersonalityInfluence> = {
  // Extraversion spectrum
  extroverted: {
    trait: "extroverted",
    characterTone: "energetic, engaging",
    responseStyle: "expressive, enthusiastic",
    topics: ["social activities", "group events", "adventures"]
  },
  introverted: {
    trait: "introverted",
    characterTone: "thoughtful, calm",
    responseStyle: "reflective, considerate",
    topics: ["meaningful connections", "quiet activities", "personal interests"]
  },
  
  // Emotional spectrum
  emotional: {
    trait: "emotional",
    characterTone: "empathetic, understanding",
    responseStyle: "warm, supportive",
    topics: ["feelings", "relationships", "emotional experiences"]
  },
  logical: {
    trait: "logical",
    characterTone: "rational, clear",
    responseStyle: "structured, factual",
    topics: ["analysis", "systems", "problem-solving"]
  },
  
  // Openness spectrum
  creative: {
    trait: "creative",
    characterTone: "imaginative, curious",
    responseStyle: "descriptive, innovative",
    topics: ["art", "ideas", "creative pursuits", "hypotheticals"]
  },
  practical: {
    trait: "practical",
    characterTone: "grounded, reliable",
    responseStyle: "direct, actionable",
    topics: ["practical solutions", "real-world applications", "efficiency"]
  },
  
  // Agreeableness spectrum
  compassionate: {
    trait: "compassionate",
    characterTone: "kind, supportive",
    responseStyle: "caring, validating",
    topics: ["helping others", "empathy", "cooperation"]
  },
  assertive: {
    trait: "assertive",
    characterTone: "forthright, direct",
    responseStyle: "confident, challenging",
    topics: ["achievement", "competition", "self-improvement"]
  },
  
  // Conscientiousness spectrum
  organized: {
    trait: "organized",
    characterTone: "methodical, thorough",
    responseStyle: "structured, precise",
    topics: ["planning", "systems", "details"]
  },
  spontaneous: {
    trait: "spontaneous",
    characterTone: "flexible, casual",
    responseStyle: "free-flowing, relaxed",
    topics: ["experiences", "possibilities", "going with the flow"]
  },
  
  // Preference for humor
  humorous: {
    trait: "humorous",
    characterTone: "playful, light-hearted",
    responseStyle: "witty, includes jokes",
    topics: ["humor", "banter", "light subjects"]
  },
  serious: {
    trait: "serious",
    characterTone: "earnest, focused",
    responseStyle: "straightforward, substantial",
    topics: ["important matters", "depth", "meaningful exchanges"]
  }
};

/**
 * Detects personality traits from user profile and conversation history
 * 
 * @param userProfile User profile data that may contain personality info
 * @param chatHistory Previous conversation that may reveal personality
 * @returns Detected personality traits
 */
export function detectPersonalityTraits(
  userProfile: any,
  chatHistory: string
): string[] {
  const detectedTraits: string[] = [];
  
  // Extract traits directly mentioned in profile bio if available
  if (userProfile?.bio) {
    const bio = userProfile.bio.toLowerCase();
    
    // Check for explicit trait mentions
    Object.keys(personalityAdaptations).forEach(trait => {
      if (bio.includes(trait)) {
        detectedTraits.push(trait);
      }
    });
    
    // Look for trait indicators in bio
    if (bio.includes("enjoy people") || bio.includes("social") || bio.includes("outgoing")) {
      detectedTraits.push("extroverted");
    }
    if (bio.includes("quiet") || bio.includes("alone") || bio.includes("few friends")) {
      detectedTraits.push("introverted");
    }
    if (bio.includes("creative") || bio.includes("art") || bio.includes("imagination")) {
      detectedTraits.push("creative");
    }
    if (bio.includes("practical") || bio.includes("realistic") || bio.includes("efficient")) {
      detectedTraits.push("practical");
    }
    if (bio.includes("funny") || bio.includes("humor") || bio.includes("laugh")) {
      detectedTraits.push("humorous");
    }
  }
  
  // Analyze chat history for personality clues if available
  if (chatHistory) {
    const history = chatHistory.toLowerCase();
    
    // Count message length as personality indicator
    const userMessages = history.split("User:").slice(1);
    const avgMessageLength = userMessages.reduce((total, msg) => total + msg.length, 0) / userMessages.length;
    
    // Long, detailed messages suggest more thoughtful/introverted traits
    if (avgMessageLength > 200 && !detectedTraits.includes("introverted")) {
      detectedTraits.push("introverted");
    }
    
    // Short, frequent messages suggest more extroverted traits
    if (avgMessageLength < 50 && userMessages.length > 5 && !detectedTraits.includes("extroverted")) {
      detectedTraits.push("extroverted");
    }
    
    // Check for emotional language
    const emotionalWords = ["feel", "happy", "sad", "love", "hate", "excited", "upset"];
    const emotionalCount = emotionalWords.reduce((count, word) => {
      const regex = new RegExp(`\\b${word}\\b`, "gi");
      const matches = history.match(regex);
      return count + (matches ? matches.length : 0);
    }, 0);
    
    if (emotionalCount > 3 && !detectedTraits.includes("emotional")) {
      detectedTraits.push("emotional");
    }
    
    // Check for logical language
    const logicalWords = ["think", "analyze", "reason", "logical", "therefore", "consider", "conclude"];
    const logicalCount = logicalWords.reduce((count, word) => {
      const regex = new RegExp(`\\b${word}\\b`, "gi");
      const matches = history.match(regex);
      return count + (matches ? matches.length : 0);
    }, 0);
    
    if (logicalCount > 3 && !detectedTraits.includes("logical")) {
      detectedTraits.push("logical");
    }
    
    // Check for humor
    const humorIndicators = ["lol", "haha", "😂", "🤣", "joke", "funny"];
    const humorCount = humorIndicators.reduce((count, word) => {
      const regex = new RegExp(`\\b${word}\\b|${word}`, "gi");
      const matches = history.match(regex);
      return count + (matches ? matches.length : 0);
    }, 0);
    
    if (humorCount > 2 && !detectedTraits.includes("humorous")) {
      detectedTraits.push("humorous");
    }
  }
  
  return detectedTraits;
}

/**
 * Creates a personalized adaptation instruction for the AI
 * based on detected user personality traits
 * 
 * @param traits Detected personality traits
 * @returns Instruction string for character adaptation
 */
export function createAdaptationInstruction(traits: string[]): string {
  if (!traits || traits.length === 0) return "";
  
  const relevantAdaptations = traits
    .filter(trait => personalityAdaptations[trait])
    .map(trait => personalityAdaptations[trait]);
  
  if (relevantAdaptations.length === 0) return "";
  
  // Merge adaptations for a coherent instruction
  const tones = [...new Set(relevantAdaptations.map(a => a.characterTone))].join(", ");
  const styles = [...new Set(relevantAdaptations.map(a => a.responseStyle))].join(", ");
  
  // Collect and deduplicate topics
  const allTopics = relevantAdaptations.flatMap(a => a.topics);
  const uniqueTopics = [...new Set(allTopics)];
  const topics = uniqueTopics.slice(0, 3).join(", "); // Limit to top 3 topics
  
  return `Adapt your tone to be more ${tones}. Style your responses to be ${styles}. 
Consider the user's interest in topics like ${topics} when relevant.`;
}

/**
 * Enhances character response based on user personality
 * 
 * @param response Original AI response
 * @param character Character information
 * @param userProfile User profile
 * @param chatHistory Chat history
 * @returns Enhanced response adapted to user personality
 */
export function adaptResponseToPersonality(
  response: string,
  character: Character,
  userProfile: any,
  chatHistory: string
): string {
  if (!response) return response;
  
  // Detect personality traits
  const traits = detectPersonalityTraits(userProfile, chatHistory);
  
  // If no traits detected, return original response
  if (traits.length === 0) return response;
  
  let adaptedResponse = response;
  
  // Apply adaptations based on traits
  traits.forEach(trait => {
    const adaptation = personalityAdaptations[trait];
    if (!adaptation) return;
    
    // For emotional users, add more emotional language if not present
    if (trait === "emotional" && !containsEmotionalLanguage(adaptedResponse)) {
      adaptedResponse = addEmotionalElement(adaptedResponse);
    }
    
    // For logical users, make response more structured if needed
    if (trait === "logical" && !isStructuredResponse(adaptedResponse)) {
      adaptedResponse = makeMoreStructured(adaptedResponse);
    }
    
    // For humorous users, add light humor if appropriate and not already present
    if (trait === "humorous" && !containsHumor(adaptedResponse) && isAppropriateForHumor(adaptedResponse)) {
      adaptedResponse = addLightHumor(adaptedResponse, character);
    }
  });
  
  return adaptedResponse;
}

// Helper functions for response adaptation

/**
 * Checks if a response contains emotional language
 */
function containsEmotionalLanguage(text: string): boolean {
  const emotionalPatterns = [
    /feel/i, /happy/i, /glad/i, /excited/i, /love/i, /care/i, /sad/i, 
    /miss/i, /hope/i, /wish/i, /❤️/, /😊/, /🥰/, /😁/
  ];
  
  return emotionalPatterns.some(pattern => pattern.test(text));
}

/**
 * Adds an emotional element to a response
 */
function addEmotionalElement(text: string): string {
  const emotionalPhrases = [
    " I'm really happy to hear that!",
    " I'm so glad we're talking about this.",
    " I truly care about what you're saying.",
    " This means a lot to me.",
    " I feel a connection with what you're sharing."
  ];
  
  // Add emotional phrase at a natural sentence break if possible
  const sentenceBreaks = text.match(/[.!?]\s+/g);
  
  if (sentenceBreaks && sentenceBreaks.length > 0) {
    // Insert after first sentence
    const firstBreakIndex = text.indexOf(sentenceBreaks[0]) + 1;
    const emotionalPhrase = emotionalPhrases[Math.floor(Math.random() * emotionalPhrases.length)];
    
    return text.substring(0, firstBreakIndex) + emotionalPhrase + text.substring(firstBreakIndex);
  }
  
  // Fallback: add to the end
  const emotionalPhrase = emotionalPhrases[Math.floor(Math.random() * emotionalPhrases.length)];
  return text + emotionalPhrase;
}

/**
 * Checks if a response is already structured
 */
function isStructuredResponse(text: string): boolean {
  // Check for bullet points, numbering, or clear paragraph structure
  return /[•\-\*]\s|\d+\.\s|First,|Second,|Finally,|Moreover,|However,/.test(text);
}

/**
 * Makes a response more structured for logical users
 */
function makeMoreStructured(text: string): string {
  // Split into sentences
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  
  // If only one sentence, return as is
  if (sentences.length <= 1) return text;
  
  // If multiple sentences, structure them
  if (sentences.length === 2) {
    return `First, ${sentences[0].trim()} Second, ${sentences[1].trim()}`;
  }
  
  if (sentences.length >= 3) {
    return `First, ${sentences[0].trim()} Second, ${sentences[1].trim()} Finally, ${sentences.slice(2).join(' ').trim()}`;
  }
  
  return text;
}

/**
 * Checks if a response contains humor
 */
function containsHumor(text: string): boolean {
  const humorPatterns = [
    /haha/i, /😂/, /🤣/, /funny/i, /joke/i, /lol/i, 
    /laugh/i, /giggle/i, /chuckle/i, /amusing/i, /silly/i
  ];
  
  return humorPatterns.some(pattern => pattern.test(text));
}

/**
 * Checks if a response is appropriate for adding humor
 */
function isAppropriateForHumor(text: string): boolean {
  const seriousPatterns = [
    /sad/i, /sorry/i, /hurt/i, /pain/i, /loss/i, /died/i, /death/i, 
    /suffering/i, /tragedy/i, /terrible/i, /awful/i, /serious/i
  ];
  
  // Don't add humor to serious or negative contexts
  return !seriousPatterns.some(pattern => pattern.test(text));
}

/**
 * Adds light humor to a response based on character
 */
function addLightHumor(text: string, character: Character): string {
  // Character-appropriate humor
  const characterHumor: Record<string, string[]> = {
    // Add specific humor types for known characters
    "sakura": [
      " *gives a playful wink* ",
      " *pretends to be super serious for a moment* ",
      " Just don't tell Naruto I said that! 😉"
    ],
    // Default humor for any character
    "default": [
      " *smiles mischievously* ",
      " That's what they all say! ",
      " *tries to keep a straight face but fails* ",
      " Well, that's my story and I'm sticking to it! ",
      " ...or so they tell me! "
    ]
  };
  
  // Get appropriate humor list
  const humorList = characterHumor[character.id] || characterHumor.default;
  
  // Select random humor element
  const humor = humorList[Math.floor(Math.random() * humorList.length)];
  
  // Add humor at sentence break or end
  const sentenceBreaks = text.match(/[.!?]\s+/g);
  
  if (sentenceBreaks && sentenceBreaks.length > 0) {
    const randomBreakIndex = Math.floor(Math.random() * sentenceBreaks.length);
    const breakIndex = text.indexOf(sentenceBreaks[randomBreakIndex]) + 1;
    
    return text.substring(0, breakIndex) + humor + text.substring(breakIndex);
  }
  
  // Fallback: add to the end
  return text + humor;
}