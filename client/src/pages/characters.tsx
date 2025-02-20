import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { CharacterCard } from "@/components/character-card";
import { SubscriptionModal } from "@/components/subscription-modal";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { type CustomCharacter } from "@shared/schema";

export default function Characters() {
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const { toast } = useToast();

  const { data: customCharacters, isLoading } = useQuery<CustomCharacter[]>({
    queryKey: ["/api/custom-characters"],
  });

  const { data: user } = useQuery({
    queryKey: ["/api/user"],
  });

  const deleteCharacter = useMutation({
    mutationFn: async (characterId: number) => {
      const res = await fetch(`/api/custom-characters/${characterId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete character");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-characters"] });
      toast({
        title: "Success",
        description: "Character deleted successfully",
      });
    },
  });

  const handleCreateCharacter = () => {
    if (user?.subscriptionStatus === "free" && (customCharacters?.length || 0) >= 2) {
      setShowSubscriptionModal(true);
      return;
    }
    // Navigate to character creation page
    // You'll implement this in the next step
  };

  const handleSubscribe = async (plan: string) => {
    // Implement subscription logic
    // For now, we'll just show a toast
    toast({
      title: "Coming Soon",
      description: "Subscription functionality will be available soon!",
    });
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-500 text-transparent bg-clip-text">
            Your Custom Characters
          </h1>
          <Button onClick={handleCreateCharacter}>
            <Plus className="h-4 w-4 mr-2" />
            Create Character
          </Button>
        </div>

        {customCharacters?.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              You haven't created any custom characters yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {customCharacters?.map((character) => (
              <div key={character.id} className="relative group">
                <CharacterCard character={character} />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => deleteCharacter.mutate(character.id)}
                >
                  Delete
                </Button>
              </div>
            ))}
          </div>
        )}

        {user?.subscriptionStatus === "free" && (customCharacters?.length || 0) >= 2 && (
          <div className="mt-8 p-4 border rounded-lg bg-secondary/10">
            <p className="text-center text-muted-foreground">
              You've reached the limit of free custom characters.{" "}
              <Button
                variant="link"
                className="text-primary font-semibold"
                onClick={() => setShowSubscriptionModal(true)}
              >
                Upgrade to Premium
              </Button>{" "}
              to create unlimited characters!
            </p>
          </div>
        )}

        <SubscriptionModal
          open={showSubscriptionModal}
          onClose={() => setShowSubscriptionModal(false)}
          onSubscribe={handleSubscribe}
        />
      </div>
    </div>
  );
}
