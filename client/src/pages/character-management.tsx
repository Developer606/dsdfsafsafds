import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";
import { SubscriptionDialog } from "@/components/subscription-dialog";
import { type CustomCharacter, type User } from "@shared/schema";

export default function CharacterManagement() {
  const [showSubscription, setShowSubscription] = useState(false);
  const { toast } = useToast();

  const { data: user } = useQuery<User>({ 
    queryKey: ["/api/user"]
  });

  const { data: customCharacters } = useQuery<CustomCharacter[]>({ 
    queryKey: ["/api/custom-characters"]
  });

  const createCharacter = useMutation({
    mutationFn: async (data: Omit<CustomCharacter, "id" | "userId" | "createdAt">) => {
      const res = await fetch("/api/custom-characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Failed to create character");
      return res.json();
    }
  });

  const deleteCharacter = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/custom-characters/${id}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Failed to delete character");
    }
  });

  const handleCreateCharacter = () => {
    if (!user) return;

    if (!user.isPremium && user.trialCharactersCreated >= 2) {
      setShowSubscription(true);
      return;
    }

    // TODO: Add form for character creation
    createCharacter.mutate({
      name: "New Character",
      avatar: "https://api.dicebear.com/7.x/avatars/svg?seed=custom",
      description: "A custom character",
      persona: "Character personality and background"
    });
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Character Management</h1>
        <Button onClick={handleCreateCharacter}>
          <Plus className="h-4 w-4 mr-2" />
          Create Character
        </Button>
      </div>

      {!user?.isPremium && (
        <Card className="mb-6 bg-accent">
          <CardContent className="p-4">
            <p className="text-sm">
              Free trial: Created {user?.trialCharactersCreated || 0}/2 characters.
              Upgrade to premium for unlimited characters!
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {customCharacters?.map((character) => (
          <Card key={character.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg">{character.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {character.description}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteCharacter.mutate(character.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <SubscriptionDialog
        open={showSubscription}
        onClose={() => setShowSubscription(false)}
      />
    </div>
  );
}
