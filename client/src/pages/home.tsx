import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { CharacterCard } from "@/components/character-card";
import { type Character } from "@shared/characters";

export default function Home() {
  const { data: characters, isLoading } = useQuery<Character[]>({ 
    queryKey: ["/api/characters"]
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-64 bg-card animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4">
        <div className="mb-6">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-500 text-transparent bg-clip-text">
            Anime Characters
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {characters?.map((character) => (
            <Link key={character.id} href={`/chat/${character.id}`}>
              <CharacterCard character={character} />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}