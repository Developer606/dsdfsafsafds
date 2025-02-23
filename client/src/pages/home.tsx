import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { CharacterCard } from "@/components/character-card";
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
import { type Character } from "@shared/characters";
import { type CustomCharacter, type User } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";

export default function Home() {
  const [location] = useLocation();
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

  const { data: characters, isLoading } = useQuery<Character[]>({ 
    queryKey: ["/api/characters"]
  });

  const createCharacter = useMutation({
    mutationFn: async (data: Omit<CustomCharacter, "id" | "userId" | "createdAt">) => {
      const res = await apiRequest("POST", "/api/custom-characters", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-characters"] });
      queryClient.invalidateQueries({ queryKey: ["/api/characters"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setShowCreateDialog(false);
      setNewCharacter({
        name: "",
        avatar: "",
        description: "",
        persona: ""
      });
      toast({
        title: "Success",
        description: "Character created successfully"
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
    mutationFn: async (id: string) => {
      const numericId = id.replace('custom_', '');
      await apiRequest("DELETE", `/api/custom-characters/${numericId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-characters"] });
      queryClient.invalidateQueries({ queryKey: ["/api/characters"] });
      toast({
        title: "Success",
        description: "Character deleted successfully"
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete character"
      });
    }
  });

  const handleCreateClick = () => {
    if (!user) return;

    if (!user.isPremium && user.trialCharactersCreated >= 3) {
      setShowSubscription(true);
      return;
    }

    setShowCreateDialog(true);
  };

  const handleSubmit = () => {
    if (!newCharacter.name || !newCharacter.avatar || !newCharacter.description || !newCharacter.persona) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all fields"
      });
      return;
    }
    createCharacter.mutate(newCharacter);
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
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-500 text-transparent bg-clip-text">
            Anime Characters
          </h1>
          <Button
            onClick={handleCreateClick}
            className="bg-[#00a884] hover:bg-[#00946e] text-white"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Character
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {characters?.map((character) => (
            <div key={character.id} className="relative group">
              <Link href={`/chat/${character.id}`}>
                <CharacterCard character={character} />
              </Link>
              {character.id.startsWith('custom_') && (
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    deleteCharacter.mutate(character.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
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
                onClick={handleSubmit}
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
    </div>
  );
}