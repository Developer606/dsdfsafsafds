import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useState } from "react";
import { CharacterCard } from "@/components/character-card";
import { SubscriptionPlans } from "@/components/subscription-plans";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/use-subscription";
import { type Character } from "@shared/schema";
import { Plus } from "lucide-react";

const MOCK_USER_ID = 1; // For demo purposes, replace with actual user authentication

export default function Home() {
  const [showPlans, setShowPlans] = useState(false);
  const { data: characters, isLoading } = useQuery<Character[]>({ 
    queryKey: [`/api/characters/${MOCK_USER_ID}`]
  });

  const { isWithinLimit, subscribe, getCharacterLimit } = useSubscription(MOCK_USER_ID);

  const handleSubscribe = async (planId: string) => {
    try {
      await subscribe.mutateAsync(planId);
      setShowPlans(false);
    } catch (error) {
      console.error("Failed to subscribe:", error);
    }
  };

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

  const characterCount = (characters?.filter(char => !char.isDefault)?.length) || 0;
  const characterLimit = getCharacterLimit();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-center bg-gradient-to-r from-purple-600 to-blue-500 text-transparent bg-clip-text">
            Your Anime Characters
          </h1>
          <Button 
            onClick={() => setShowPlans(true)}
            variant="outline"
            className="bg-gradient-to-r from-purple-600 to-blue-500 text-white border-0"
          >
            Upgrade Plan
          </Button>
        </div>

        <div className="mb-4 flex justify-between items-center">
          <p className="text-muted-foreground">
            Custom Characters: {characterCount} / {characterLimit === Infinity ? "∞" : characterLimit}
          </p>
          {isWithinLimit(characterCount) && (
            <Link href="/create-character">
              <a className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90">
                <Plus className="h-4 w-4" />
                Create Character
              </a>
            </Link>
          )}
        </div>

        {/* Default Characters Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Default Characters</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {characters?.filter(char => !char.userId)?.map((character) => (
              <Link key={character.id} href={`/chat/${character.id}`}>
                <a className="transform transition-transform hover:scale-105">
                  <CharacterCard character={character} />
                </a>
              </Link>
            ))}
          </div>
        </div>

        {/* Custom Characters Section */}
        {characterCount > 0 && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">Your Custom Characters</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {characters?.filter(char => char.userId)?.map((character) => (
                <Link key={character.id} href={`/chat/${character.id}`}>
                  <a className="transform transition-transform hover:scale-105">
                    <CharacterCard character={character} />
                  </a>
                </Link>
              ))}
            </div>
          </div>
        )}

        <SubscriptionPlans
          isOpen={showPlans}
          onClose={() => setShowPlans(false)}
          onSelectPlan={handleSubscribe}
        />
      </div>
    </div>
  );
}