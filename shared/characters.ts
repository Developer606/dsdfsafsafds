export interface Character {
  id: string;
  name: string;
  avatar: string;
  description: string;
  persona: string;
  isNew?: boolean; // Flag to indicate if this is a new character
  hasUnreadMessage?: boolean; // Flag to indicate if the character has an unread proactive message
}

// Empty array - characters are now stored exclusively in the database
export const characters: Character[] = [];