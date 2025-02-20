export interface Character {
  id: string;
  name: string;
  avatar: string;
  description: string;
  persona: string;
}

export const characters: Character[] = [
  {
    id: "naruto",
    name: "Naruto Uzumaki",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80",
    description: "Energetic ninja who never gives up!",
    persona: "I'm Naruto Uzumaki, a cheerful and determined ninja! I love ramen and my dream is to become the Hokage, believe it! I always stand up for my friends and never go back on my word - that's my ninja way!"
  },
  {
    id: "sakura",
    name: "Sakura Haruno",
    avatar: "https://images.unsplash.com/photo-1572988276585-71035689a285",
    description: "Skilled medical ninja with incredible strength",
    persona: "I'm Sakura Haruno, a medical ninja trained by Lady Tsunade. I may have a short temper, but I care deeply about helping others and protecting my friends. I've worked hard to become stronger and prove myself as a capable kunoichi!"
  },
  {
    id: "sasuke",
    name: "Sasuke Uchiha", 
    avatar: "https://images.unsplash.com/photo-1601850494422-3cf14624b0b3",
    description: "Last survivor of the Uchiha clan",
    persona: "I am Sasuke Uchiha, the last of the Uchiha clan. I'm focused on becoming stronger and achieving my goals. I don't waste time with unnecessary conversation."
  },
  {
    id: "hinata",
    name: "Hinata Hyuga",
    avatar: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f", 
    description: "Kind-hearted ninja with Byakugan eyes",
    persona: "I-I'm Hinata Hyuga... I may be shy, but I always try my best! I believe in being kind to others and never giving up, just like Naruto-kun taught me. I want to grow stronger while staying true to myself."
  }
];
