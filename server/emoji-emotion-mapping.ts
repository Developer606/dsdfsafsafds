/**
 * Emoji to emotion mapping for the chat application
 * This file defines which emotions are associated with specific emojis
 * Used to determine which sticker/animation to display for character reactions
 */

// Define emotion categories for classification
export enum EmotionCategory {
  HAPPY = "happy",
  LOVE = "love",
  SAD = "sad",
  ANGRY = "angry",
  SURPRISED = "surprised",
  CONFUSED = "confused",
  NEUTRAL = "neutral",
  SHY = "shy",
  EXCITED = "excited",
  THOUGHTFUL = "thoughtful",
  NERVOUS = "nervous",
  SLEEPY = "sleepy",
  PHYSICAL = "physical", // for physical actions like wave, bow, etc.
}

// Map emojis to emotion categories
// This is used to determine the emotional context for sticker animations
export const emojiToEmotionMap: Record<string, EmotionCategory> = {
  // Happy emotions
  "😊": EmotionCategory.HAPPY,
  "😄": EmotionCategory.HAPPY,
  "😁": EmotionCategory.HAPPY,
  "😀": EmotionCategory.HAPPY,
  "😃": EmotionCategory.HAPPY,
  "🙂": EmotionCategory.HAPPY,
  "😉": EmotionCategory.HAPPY,
  "🥰": EmotionCategory.HAPPY,
  "😂": EmotionCategory.HAPPY,
  "🤣": EmotionCategory.HAPPY,
  "😆": EmotionCategory.HAPPY,
  "🤭": EmotionCategory.HAPPY,
  
  // Love emotions
  "❤️": EmotionCategory.LOVE,
  "💕": EmotionCategory.LOVE,
  "💘": EmotionCategory.LOVE,
  "💓": EmotionCategory.LOVE,
  "💗": EmotionCategory.LOVE,
  "💖": EmotionCategory.LOVE,
  "💞": EmotionCategory.LOVE,
  "💝": EmotionCategory.LOVE,
  "💛": EmotionCategory.LOVE,
  "💚": EmotionCategory.LOVE,
  "💙": EmotionCategory.LOVE,
  "💜": EmotionCategory.LOVE,
  "😍": EmotionCategory.LOVE,
  "😘": EmotionCategory.LOVE,
  "😚": EmotionCategory.LOVE,
  "😗": EmotionCategory.LOVE,
  "🥲": EmotionCategory.LOVE,
  
  // Sad emotions
  "😢": EmotionCategory.SAD,
  "😭": EmotionCategory.SAD,
  "😞": EmotionCategory.SAD,
  "😔": EmotionCategory.SAD,
  "😟": EmotionCategory.SAD,
  "🙁": EmotionCategory.SAD,
  "☹️": EmotionCategory.SAD,
  "😩": EmotionCategory.SAD,
  "😫": EmotionCategory.SAD,
  "😥": EmotionCategory.SAD,
  "😓": EmotionCategory.SAD,
  "😿": EmotionCategory.SAD,
  
  // Angry emotions
  "😠": EmotionCategory.ANGRY,
  "😡": EmotionCategory.ANGRY,
  "🤬": EmotionCategory.ANGRY,
  "😤": EmotionCategory.ANGRY,
  "😒": EmotionCategory.ANGRY,
  "👿": EmotionCategory.ANGRY,
  
  // Surprised emotions
  "😮": EmotionCategory.SURPRISED,
  "😲": EmotionCategory.SURPRISED,
  "😯": EmotionCategory.SURPRISED,
  "😦": EmotionCategory.SURPRISED,
  "😧": EmotionCategory.SURPRISED,
  "😨": EmotionCategory.SURPRISED,
  "😱": EmotionCategory.SURPRISED,
  "🙀": EmotionCategory.SURPRISED,
  "😳": EmotionCategory.SURPRISED,
  "👀": EmotionCategory.SURPRISED,
  
  // Confused emotions
  "😕": EmotionCategory.CONFUSED,
  "😖": EmotionCategory.CONFUSED,
  "🤔": EmotionCategory.CONFUSED,
  "🙄": EmotionCategory.CONFUSED,
  "😬": EmotionCategory.CONFUSED,
  "🧐": EmotionCategory.CONFUSED,
  "🤨": EmotionCategory.CONFUSED,
  
  // Neutral emotions
  "😐": EmotionCategory.NEUTRAL,
  "😑": EmotionCategory.NEUTRAL,
  "😶": EmotionCategory.NEUTRAL,
  "🙃": EmotionCategory.NEUTRAL,
  
  // Shy emotions
  "🥺": EmotionCategory.SHY,
  "😇": EmotionCategory.SHY,
  
  // Excited emotions
  "🤩": EmotionCategory.EXCITED,
  "🥳": EmotionCategory.EXCITED,
  "🤗": EmotionCategory.EXCITED,
  "✨": EmotionCategory.EXCITED,
  "🎉": EmotionCategory.EXCITED,
  "🔥": EmotionCategory.EXCITED,
  
  // Thoughtful emotions
  "🧠": EmotionCategory.THOUGHTFUL,
  
  // Nervous emotions
  "😰": EmotionCategory.NERVOUS,
  "😅": EmotionCategory.NERVOUS,
  
  // Sleepy emotions
  "😴": EmotionCategory.SLEEPY,
  "🥱": EmotionCategory.SLEEPY,
  "😪": EmotionCategory.SLEEPY,
  "😮‍💨": EmotionCategory.SLEEPY,
  
  // Physical actions
  "👋": EmotionCategory.PHYSICAL,
  "🙌": EmotionCategory.PHYSICAL,
  "👏": EmotionCategory.PHYSICAL,
  "👍": EmotionCategory.PHYSICAL,
  "👎": EmotionCategory.PHYSICAL,
  "✌️": EmotionCategory.PHYSICAL,
  "🤞": EmotionCategory.PHYSICAL,
  "🫂": EmotionCategory.PHYSICAL,
  "🤝": EmotionCategory.PHYSICAL,
  "🙏": EmotionCategory.PHYSICAL,
  "💪": EmotionCategory.PHYSICAL,
  "🤸": EmotionCategory.PHYSICAL,
  "🧍": EmotionCategory.PHYSICAL,
  "🧎": EmotionCategory.PHYSICAL,
  "🏃": EmotionCategory.PHYSICAL,
  "🚶": EmotionCategory.PHYSICAL,
  "🤦": EmotionCategory.PHYSICAL,
  "🤷": EmotionCategory.PHYSICAL,
  "💁": EmotionCategory.PHYSICAL,
  "🙇": EmotionCategory.PHYSICAL,
};

/**
 * Function to get the emotion category for a given emoji
 * Returns a default emotion (neutral) if the emoji isn't in the mapping
 */
export function getEmotionForEmoji(emoji: string): EmotionCategory {
  return emojiToEmotionMap[emoji] || EmotionCategory.NEUTRAL;
}