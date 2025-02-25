import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { CharacterCard } from "@/components/character-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Info, Loader2 } from "lucide-react";
import { SubscriptionDialog } from "@/components/subscription-dialog";
import { type Character } from "@shared/characters";
import { type CustomCharacter, type User } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

export default function Home() {
  const [, setLocation] = useLocation();
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
        title: "Success! 🎉",
        description: "Your new character has been created and is ready to chat!",
        variant: "default"
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Character Creation Failed",
        description: "Unable to create character. Please try again."
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
        title: "Character Deleted",
        description: "The character has been removed successfully.",
        variant: "default"
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: "Unable to delete character. Please try again."
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
        title: "Missing Information",
        description: "Please fill in all required fields."
      });
      return;
    }
    createCharacter.mutate(newCharacter);
  };

  if (isLoading) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6"
      >
        <div className="container mx-auto">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-lg text-muted-foreground">Loading characters...</p>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white"
    >
      <div className="container mx-auto p-6">
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex items-center justify-between mb-10"
        >
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="space-y-2"
          >
            <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-transparent bg-clip-text">
              Choose Your Character
            </h1>
            <p className="text-slate-400">
              Select a character to start your conversation adventure
            </p>
          </motion.div>

          <div className="flex items-center gap-4">
            {!user?.isPremium && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/50 backdrop-blur-sm border border-slate-700"
                    >
                      <Info className="h-4 w-4 text-primary" />
                      <span className="text-sm text-slate-300">
                        {user?.trialCharactersCreated || 0}/3 free characters
                      </span>
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Free users can create up to 3 custom characters.</p>
                    <p>Upgrade to premium for unlimited characters!</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                onClick={handleCreateClick}
                size="lg"
                className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white shadow-xl hover:shadow-2xl transition-all duration-300"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create Character
              </Button>
            </motion.div>
          </div>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          <AnimatePresence>
            {characters?.map((character) => (
              <motion.div
                key={character.id}
                variants={item}
                layoutId={character.id}
                className="relative group"
                whileHover={{ y: -5 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                <Link href={`/chat/${character.id}`}>
                  <Card className="overflow-hidden border-0 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm hover:shadow-2xl transition-all duration-300 hover:ring-2 hover:ring-primary/50 group">
                    <div className="p-4 space-y-4">
                      <div className="relative">
                        <img
                          src={character.avatar}
                          alt={character.name}
                          className="w-full h-48 object-cover rounded-lg transform group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent rounded-lg" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-white group-hover:text-primary transition-colors">
                          {character.name}
                        </h3>
                        <p className="text-sm text-slate-400 line-clamp-2">
                          {character.description}
                        </p>
                      </div>
                    </div>
                  </Card>
                </Link>
                {character.id.startsWith('custom_') && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        deleteCharacter.mutate(character.id);
                      }}
                      disabled={deleteCharacter.isPending}
                    >
                      {deleteCharacter.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-2xl">Create New Character</DialogTitle>
              {!user?.isPremium && (
                <DialogDescription className="text-yellow-600">
                  Free Trial: {user?.trialCharactersCreated || 0}/3 characters created
                </DialogDescription>
              )}
            </DialogHeader>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <label className="text-sm font-medium">Character Name</label>
                <Input
                  placeholder="Enter character name"
                  value={newCharacter.name}
                  onChange={(e) => setNewCharacter({ ...newCharacter, name: e.target.value })}
                  className="focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Avatar URL</label>
                <Input
                  placeholder="Enter avatar image URL"
                  value={newCharacter.avatar}
                  onChange={(e) => setNewCharacter({ ...newCharacter, avatar: e.target.value })}
                  className="focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  placeholder="Describe your character"
                  value={newCharacter.description}
                  onChange={(e) => setNewCharacter({ ...newCharacter, description: e.target.value })}
                  className="focus:ring-2 focus:ring-primary min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Character Persona</label>
                <Textarea
                  placeholder="Define the character's personality and behavior"
                  value={newCharacter.persona}
                  onChange={(e) => setNewCharacter({ ...newCharacter, persona: e.target.value })}
                  className="focus:ring-2 focus:ring-primary min-h-[100px]"
                />
              </div>

              <motion.div 
                whileHover={{ scale: 1.02 }} 
                whileTap={{ scale: 0.98 }}
                className="pt-4"
              >
                <Button 
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white"
                  onClick={handleSubmit}
                  disabled={createCharacter.isPending}
                >
                  {createCharacter.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Creating...
                    </>
                  ) : (
                    'Create Character'
                  )}
                </Button>
              </motion.div>
            </motion.div>
          </DialogContent>
        </Dialog>

        <SubscriptionDialog
          open={showSubscription}
          onClose={() => setShowSubscription(false)}
        />
      </div>
    </motion.div>
  );
}