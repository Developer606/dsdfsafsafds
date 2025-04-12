import { Card, CardContent } from "@/components/ui/card";
import { type Character } from "@shared/characters";
import { Bell } from "lucide-react";
import { motion } from "framer-motion";

interface CharacterCardProps {
  character: Character;
}

export function CharacterCard({ character }: CharacterCardProps) {
  return (
    <Card className="overflow-hidden">
      <div className="relative pb-[100%]">
        <img
          src={character.avatar}
          alt={character.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
        {character.isNew && (
          <div className="absolute top-2 right-2 bg-primary text-primary-foreground px-2 py-1 rounded-md text-xs font-bold">
            New
          </div>
        )}
        {character.hasUnreadMessage && (
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute top-2 left-2 bg-pink-500 text-white p-1.5 rounded-full shadow-md"
            title={`${character.name} has sent you a message`}
          >
            <Bell className="h-3.5 w-3.5" />
          </motion.div>
        )}
      </div>
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold text-lg">{character.name}</h3>
            <p className="text-sm text-muted-foreground">{character.description}</p>
          </div>
          {character.hasUnreadMessage && (
            <motion.div 
              initial={{ y: -5 }}
              animate={{ y: 0 }}
              transition={{ 
                repeat: Infinity, 
                repeatType: "reverse", 
                duration: 1 
              }}
              className="w-2 h-2 bg-pink-500 rounded-full"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
