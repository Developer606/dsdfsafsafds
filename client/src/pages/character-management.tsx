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
import { type CustomCharacter, type User, type SubscriptionPlan } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";

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

  const { data: customCharacters, isLoading: isLoadingCharacters } = useQuery<CustomCharacter[]>({ 
    queryKey: ["/api/custom-characters"]
  });
  
  const { data: plans, isLoading: isLoadingPlans } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/plans"]
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
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/custom-characters/${id}`);
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

  // Get character limit based on subscription
  const getCharacterLimit = () => {
    if (!user) return 3;
    if (!user.isPremium) return 3;
    if (!plans) return 3;

    const userPlan = plans.find(plan => plan.id === user.subscriptionTier);
    
    if (!userPlan) return 3;
    
    // Parse features to find character limit
    try {
      const features = JSON.parse(userPlan.features);
      // Look for a feature containing "character" and a number
      const characterLimitFeature = features.find((feature: string) => 
        feature.toLowerCase().includes('character') && /\d+/.test(feature)
      );
      
      if (characterLimitFeature) {
        const limitMatch = characterLimitFeature.match(/\d+/);
        if (limitMatch) return parseInt(limitMatch[0], 10);
      }
      
      // Default limits based on tier if not found in features
      if (user.subscriptionTier === "pro") return "∞";
      if (user.subscriptionTier === "premium") return 45;
      if (user.subscriptionTier === "basic") return 15;
      
      return 3;
    } catch (e) {
      // Fallback to defaults if JSON parsing fails
      if (user.subscriptionTier === "pro") return "∞";
      if (user.subscriptionTier === "premium") return 45;
      if (user.subscriptionTier === "basic") return 15;
      return 3;
    }
  };

  // Get remaining character slots
  const getRemainingSlots = () => {
    const limit = getCharacterLimit();
    if (limit === "∞") return "unlimited";
    return limit - (customCharacters?.length || 0);
  };

  const getPlanMessage = () => {
    if (!user?.isPremium) {
      return `Free trial: Created ${user?.trialCharactersCreated || 0}/3 characters. Upgrade to premium for more characters!`;
    }

    const remaining = getRemainingSlots();
    const userPlan = plans?.find(plan => plan.id === user.subscriptionTier);
    const planName = userPlan?.name || 'Basic Plan';

    return remaining === "unlimited" 
      ? `${planName}: Create unlimited characters!`
      : `${planName}: ${remaining} character slot${remaining !== 1 ? 's' : ''} remaining`;
  };


  const isLoading = isLoadingCharacters || isLoadingPlans;
  
  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-card animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Character Management</h1>
        <Button onClick={handleCreateClick}>
          <Plus className="h-4 w-4 mr-2" />
          Create Character
        </Button>
      </div>

      <Card className="mb-6 bg-accent">
        <CardContent className="p-4">
          <p className="text-sm">
            {getPlanMessage()}
            {user?.subscriptionTier === "basic" && (
              <span className="block mt-1 text-xs">
                {plans && plans.find(p => p.id === "premium") ? 
                  `Upgrade to ${plans.find(p => p.id === "premium")?.name} for more characters!` :
                  "Upgrade to Premium for more characters!"}
              </span>
            )}
          </p>
        </CardContent>
      </Card>

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
                  disabled={deleteCharacter.isPending}
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
  );
}