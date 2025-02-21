import { Card, CardContent } from "@/components/ui/card";
import { type Character } from "@shared/characters";

interface CharacterCardProps {
  character: Character;
}

export function CharacterCard({ character }: CharacterCardProps) {
  return (
    <Card className="overflow-hidden h-full hover:shadow-lg transition-shadow">
      <div className="relative pb-[100%]">
        <img
          src={character.avatar}
          alt={character.name}
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src = "https://api.dicebear.com/7.x/avatars/svg?seed=fallback";
          }}
        />
      </div>
      <CardContent className="p-4">
        <h3 className="font-semibold text-lg mb-2">{character.name}</h3>
        <p className="text-sm text-muted-foreground">{character.description}</p>
      </CardContent>
    </Card>
  );
}