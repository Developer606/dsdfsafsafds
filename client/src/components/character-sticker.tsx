import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Character } from "@shared/characters";

interface CharacterStickerProps {
  emoji: string;
  emotion: string;
  character: Character;
  size?: "small" | "medium" | "large";
  position?: "top" | "bottom";
}

/**
 * Character Sticker Component
 * This component displays character reactions as animated sticker-like elements
 * Combines character images with emojis to create more expressive reactions
 */
export function CharacterSticker({
  emoji,
  emotion,
  character,
  size = "medium",
  position = "top"
}: CharacterStickerProps) {
  // Map emotion to animation variants
  const emotionAnimations: Record<string, any> = {
    // Happy emotions with upward/bounce animations
    happy: {
      initial: { scale: 0, y: 20, opacity: 0 },
      animate: { 
        scale: 1, 
        y: 0, 
        opacity: 1,
        transition: { 
          type: "spring", 
          stiffness: 400, 
          damping: 10
        }
      }
    },
    excited: {
      initial: { scale: 0, rotate: -10, opacity: 0 },
      animate: { 
        scale: 1, 
        rotate: 0, 
        opacity: 1,
        transition: { 
          type: "spring", 
          stiffness: 500, 
          damping: 10
        }
      }
    },
    // Sad emotions with slower, gentler animations
    sad: {
      initial: { scale: 0, y: -10, opacity: 0 },
      animate: { 
        scale: 1, 
        y: 0, 
        opacity: 1,
        transition: { 
          type: "spring", 
          stiffness: 300, 
          damping: 15
        }
      }
    },
    // Surprise emotions with quick pop animations
    surprised: {
      initial: { scale: 0, opacity: 0 },
      animate: { 
        scale: [0, 1.2, 1], 
        opacity: 1,
        transition: { 
          duration: 0.4,
          times: [0, 0.7, 1]
        }
      }
    },
    // Angry emotions with sharp movements
    angry: {
      initial: { scale: 0, x: -20, opacity: 0 },
      animate: { 
        scale: 1, 
        x: 0, 
        opacity: 1,
        transition: { 
          type: "spring", 
          stiffness: 500, 
          damping: 10
        }
      }
    },
    // Default gentle fade in
    default: {
      initial: { scale: 0.8, opacity: 0 },
      animate: { 
        scale: 1, 
        opacity: 1,
        transition: { 
          duration: 0.3
        }
      }
    }
  };

  // Select animation based on emotion or fallback to default
  const getAnimationForEmotion = (emotionText: string) => {
    // Check for common emotion words in the emotion text
    if (/happy|joy|smile|grin|laugh|beam/i.test(emotionText)) {
      return emotionAnimations.happy;
    } else if (/excite|thrill|eager|enthusiastic/i.test(emotionText)) {
      return emotionAnimations.excited;
    } else if (/sad|cry|tear|unhappy|depress|upset/i.test(emotionText)) {
      return emotionAnimations.sad;
    } else if (/surprise|shock|amaze|astonish|stunned/i.test(emotionText)) {
      return emotionAnimations.surprised;
    } else if (/angry|mad|furious|rage|irritat|annoy/i.test(emotionText)) {
      return emotionAnimations.angry;
    } else {
      return emotionAnimations.default;
    }
  };

  // Size classes mapping
  const sizeClasses = {
    small: "w-10 h-10",
    medium: "w-16 h-16",
    large: "w-20 h-20"
  };

  // Position classes mapping
  const positionClasses = {
    top: "-top-12",
    bottom: "bottom-0 translate-y-1/2"
  };

  // Get the appropriate animation
  const animation = getAnimationForEmotion(emotion);

  return (
    <div className={cn(
      "absolute -left-6",
      positionClasses[position],
      "z-10"
    )}>
      <motion.div
        initial={animation.initial}
        animate={animation.animate}
        className={cn(
          "relative", 
          sizeClasses[size]
        )}
      >
        <div className="absolute inset-0 rounded-full overflow-hidden border-2 border-white dark:border-slate-700 shadow-md">
          <img 
            src={character.avatar} 
            alt={character.name} 
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute -right-1 -bottom-1 bg-white dark:bg-slate-800 rounded-full p-1 shadow-sm border border-gray-200 dark:border-slate-700">
          <span className="text-xl">{emoji}</span>
        </div>
      </motion.div>
    </div>
  );
}