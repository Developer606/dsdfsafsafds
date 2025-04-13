import { Card, CardContent } from "@/components/ui/card";
import { type Character } from "@shared/characters";

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
      </div>
      <CardContent className="p-4">
        <h3 className="font-semibold text-lg">{character.name}</h3>
        <p className="text-sm text-muted-foreground">{character.description}</p>
      </CardContent>
    </Card>
  );
}
