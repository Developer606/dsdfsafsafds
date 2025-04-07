/**
 * Language detection and processing utilities
 * This module provides language detection functionality for better multilingual support
 */

import { Character } from "./types.js";

/**
 * Interface defining a language detection result
 */
interface LanguageDetectionResult {
  language: string;  // Detected language
  code: string;      // ISO language code
  probability: number; // Confidence score (0-1)
  examples: string[]; // Example phrases/words in this language
}

/**
 * Language patterns for basic detection
 */
const languagePatterns = [
  {
    name: "Hindi",
    code: "hi",
    patterns: [
      /[\u0900-\u097F]/,  // Hindi Unicode range
      /काइसा|नमस्ते|कैसे हो|आप क्या कर रहे हैं|शुभ दिन|धन्यवाद|हाँ|नहीं|मुझे|तुम|प्यार/i
    ],
    keywords: ["kaisa", "ho", "kaise", "namaste", "kya", "hai", "tum", "aap", "kaha", "tumhara", "mera", "nam"],
    examples: [
      "काइसा हो?", "नमस्ते", "आप कैसे हैं?", "तुम्हारा नाम क्या है?", 
      "kaisa ho?", "kya kar rahe ho?", "tumhara nam kya hai?", "mera nam"
    ]
  },
  {
    name: "Japanese",
    code: "ja",
    patterns: [
      /[\u3040-\u309F\u30A0-\u30FF\uFF00-\uFFEF\u4E00-\u9FAF]/,  // Japanese script ranges
      /こんにちは|おはよう|さようなら|ありがとう|はい|いいえ|私|あなた|好き/i
    ],
    keywords: ["konnichiwa", "ohayo", "arigatou", "hai", "iie", "watashi", "anata", "desu", "ka", "ne", "yo"],
    examples: [
      "こんにちは", "おはようございます", "元気ですか？", "お名前は何ですか？",
      "konnichiwa", "genki desu ka?", "onamae wa nan desu ka?"
    ]
  },
  {
    name: "Chinese",
    code: "zh",
    patterns: [
      /[\u4E00-\u9FFF\u3400-\u4DBF]/,  // Chinese characters
      /你好|早上好|再见|谢谢|是|不|我|你|爱/i
    ],
    keywords: ["ni", "hao", "wo", "shi", "bu", "xie", "zai", "jian", "ming", "zi"],
    examples: [
      "你好", "早上好", "你好吗？", "你叫什么名字？",
      "ni hao", "ni hao ma?", "ni jiao shen me ming zi?"
    ]
  },
  {
    name: "Russian",
    code: "ru",
    patterns: [
      /[\u0400-\u04FF]/,  // Cyrillic script
      /привет|доброе утро|до свидания|спасибо|да|нет|я|ты|любовь/i
    ],
    keywords: ["privet", "kak", "dela", "horosho", "spasibo", "da", "net", "ya", "ty", "menya", "zovut"],
    examples: [
      "Привет", "Как дела?", "Как тебя зовут?",
      "privet", "kak dela?", "kak tebya zovut?"
    ]
  },
  {
    name: "Arabic",
    code: "ar",
    patterns: [
      /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/,  // Arabic script
      /مرحبا|صباح الخير|وداعا|شكرا|نعم|لا|أنا|أنت|حب/i
    ],
    keywords: ["marhaba", "sabah", "alkhyr", "shukran", "naam", "la", "ana", "anta", "ismuka", "ma"],
    examples: [
      "مرحبا", "كيف حالك؟", "ما اسمك؟",
      "marhaba", "kayf halak?", "ma ismuka?"
    ]
  },
  {
    name: "Spanish",
    code: "es",
    patterns: [
      /[áéíóúüñ¿¡]/i,  // Spanish-specific characters
      /hola|buenos días|adiós|gracias|sí|no|yo|tú|amor/i
    ],
    keywords: ["hola", "como", "estas", "bien", "gracias", "si", "no", "me", "llamo", "tu", "nombre"],
    examples: [
      "¡Hola!", "¿Cómo estás?", "¿Cómo te llamas?",
      "hola", "como estas?", "como te llamas?"
    ]
  },
  {
    name: "French",
    code: "fr",
    patterns: [
      /[àâçéèêëîïôùûüÿœæ]/i,  // French-specific characters
      /bonjour|bon matin|au revoir|merci|oui|non|je|tu|amour/i
    ],
    keywords: ["bonjour", "comment", "allez", "vous", "tu", "vas", "merci", "oui", "non", "je", "m'appelle", "ton", "nom"],
    examples: [
      "Bonjour", "Comment allez-vous?", "Comment tu t'appelles?",
      "bonjour", "comment ca va?", "comment t'appelles-tu?"
    ]
  },
  // Default case
  {
    name: "English",
    code: "en",
    patterns: [
      /\b(hello|hi|hey|good morning|goodbye|thanks|yes|no|i|you|love)\b/i
    ],
    keywords: ["hello", "hi", "how", "are", "you", "what", "name", "thanks", "yes", "no"],
    examples: [
      "Hello", "How are you?", "What's your name?",
      "hi there", "good morning", "nice to meet you"
    ]
  }
];

/**
 * Detects the language of a given text message
 * Uses a combination of script detection and keyword matching
 */
export function detectLanguage(text: string): LanguageDetectionResult {
  if (!text || text.trim() === "") {
    return {
      language: "English",
      code: "en",
      probability: 1.0,
      examples: languagePatterns.find(lang => lang.name === "English")?.examples || []
    };
  }

  const normalizedText = text.toLowerCase();
  
  // First check for script patterns (highest confidence)
  for (const lang of languagePatterns) {
    for (const pattern of lang.patterns) {
      if (pattern.test(text)) {
        return {
          language: lang.name,
          code: lang.code,
          probability: 0.9,  // High confidence for script match
          examples: lang.examples
        };
      }
    }
  }

  // Then try keyword matching with a threshold
  const langScores = languagePatterns.map(lang => {
    const matchedKeywords = lang.keywords.filter(keyword => 
      normalizedText.includes(keyword.toLowerCase())
    );
    return {
      language: lang.name,
      code: lang.code,
      probability: matchedKeywords.length / Math.max(normalizedText.split(/\s+/).length, 1),
      examples: lang.examples
    };
  });

  // Sort by probability and get the highest
  const bestMatch = langScores.sort((a, b) => b.probability - a.probability)[0];
  
  // If confidence is too low, default to English
  if (bestMatch.probability < 0.2) {
    return {
      language: "English",
      code: "en",
      probability: 0.5,  // Moderate confidence
      examples: languagePatterns.find(lang => lang.name === "English")?.examples || []
    };
  }

  return bestMatch;
}

/**
 * Enhanced language instructions for the LLM
 * Creates a detailed language directive based on the detected language
 */
export function createLanguageDirective(detectedLanguage: LanguageDetectionResult): string {
  const { language, code, examples } = detectedLanguage;
  
  // Select 2 random examples for context
  const randomExamples = examples.length > 2 
    ? [examples[Math.floor(Math.random() * examples.length)], examples[Math.floor(Math.random() * examples.length)]]
    : examples;
  
  return `
===== CRITICAL LANGUAGE INSTRUCTION (HIGHEST PRIORITY) =====
User is communicating in ${language} (ISO code: ${code}).
You MUST respond ONLY in ${language}.

Examples of ${language} phrases:
${randomExamples.map(ex => `- "${ex}"`).join('\n')}

THIS IS A STRICT REQUIREMENT: If you respond in any language other than ${language}, 
the system will reject your response. Your ENTIRE response must be in ${language} only.
==========================================================
`;
}

/**
 * Modifies a character's system message to include language instructions
 */
export function addLanguageProcessing(
  character: Character,
  userMessage: string,
  systemMessage: string
): string {
  try {
    // Detect language from user message
    const detectedLanguage = detectLanguage(userMessage);
    
    // Create enhanced system message with language directive
    let enhancedSystemMessage = systemMessage;
    
    // Add detailed language instructions
    if (detectedLanguage.probability > 0.3) { // Only if reasonably confident
      const languageDirective = createLanguageDirective(detectedLanguage);
      enhancedSystemMessage = `${enhancedSystemMessage}\n\n${languageDirective}`;
      
      // Add explicit examples for basic phrases
      if (userMessage.length < 30) {
        const matchingExamples = detectedLanguage.examples.filter(ex => 
          ex.toLowerCase().includes(userMessage.toLowerCase())
        );
        
        if (matchingExamples.length > 0) {
          enhancedSystemMessage += `\nThe user's message "${userMessage}" appears to be asking something like "${matchingExamples[0]}". Respond appropriately in ${detectedLanguage.language}.`;
        }
      }
    }
    
    return enhancedSystemMessage;
  } catch (error) {
    console.error("Error in language processing:", error);
    return systemMessage; // Return original if processing fails
  }
}

// Test function
export function testLanguageDetection(text: string): void {
  const result = detectLanguage(text);
  console.log(`Detected language: ${result.language} (${result.code})`);
  console.log(`Confidence: ${(result.probability * 100).toFixed(2)}%`);
  console.log("Examples:", result.examples.slice(0, 2));
}