import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";
import { SubscriptionDialog } from "@/components/subscription-dialog";
import { type CustomCharacter, type User } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";

export default function CharacterManagement() {
  const [showSubscription, setShowSubscription] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newCharacter, setNewCharacter] = useState({
    name: "",
    avatar: "",
    description: "",
    persona: ""
  });

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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-characters"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setShowCreateDialog(false);
      setNewCharacter({
        name: "",
        avatar: "",
        description: "",
        persona: ""
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create character"
      });
    }
  });

  const deleteCharacter = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/custom-characters/${id}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Failed to delete character");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-characters"] });
    }
  });

  const handleCreateClick = () => {
    if (!user) return;

    if (!user.isPremium && user.trialCharactersCreated >= 2) {
      setShowSubscription(true);
      return;
    }

    setShowCreateDialog(true);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Character Management</h1>
        <Button onClick={handleCreateClick}>
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
                  <p className="text-sm text-muted-foreground mb-2">
                    {character.description}
                  </p>
                  <p className="text-sm">{character.persona}</p>
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

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Character</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Character Name"
              value={newCharacter.name}
              onChange={(e) => setNewCharacter({ ...newCharacter, name: e.target.value })}
            />
            <Input
              placeholder="Avatar URL"
              value={newCharacter.avatar}
              onChange={(e) => setNewCharacter({ ...newCharacter, avatar: e.target.value })}
            />
            <Textarea
              placeholder="Character Description"
              value={newCharacter.description}
              onChange={(e) => setNewCharacter({ ...newCharacter, description: e.target.value })}
            />
            <Textarea
              placeholder="Character Persona"
              value={newCharacter.persona}
              onChange={(e) => setNewCharacter({ ...newCharacter, persona: e.target.value })}
            />
            <Button 
              className="w-full"
              onClick={() => createCharacter.mutate(newCharacter)}
              disabled={createCharacter.isPending}
            >
              Create Character
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <SubscriptionDialog
        open={showSubscription}
        onClose={() => setShowSubscription(false)}
      />
    </div>
  );
}