import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { CharacterCard } from "@/components/character-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Info } from "lucide-react";
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
      delayChildren: 0.3
    }
  }
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

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
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="container mx-auto p-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              className="h-64 bg-card animate-pulse rounded-lg"
            />
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-[#efeae2] dark:bg-slate-950"
    >
      <div className="container mx-auto p-6">
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex items-center justify-between mb-8"
        >
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="flex flex-col gap-2"
          >
            <h1 className="text-4xl font-bold text-[#075e54] dark:text-[#00a884]">
              Your Characters
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Choose a character to start chatting
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
                      className="flex items-center text-sm text-[#075e54] dark:text-gray-400"
                    >
                      <Info className="h-4 w-4 mr-1" />
                      {user?.trialCharactersCreated || 0}/3 free characters used
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
                className="bg-[#00a884] hover:bg-[#008f6f] text-white shadow-lg hover:shadow-xl transition-all duration-300"
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
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        >
          <AnimatePresence>
            {characters?.map((character, index) => (
              <motion.div
                key={character.id}
                variants={item}
                layoutId={character.id}
                className="relative group"
                whileHover={{ y: -5 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                <Link href={`/chat/${character.id}`}>
                  <div className="transform transition-all duration-300 hover:scale-[1.02]">
                    <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-800">
                      <div className="absolute inset-0 bg-gradient-to-br from-[#00a884]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <CharacterCard character={character} />
                    </div>
                  </div>
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
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500/90 hover:bg-red-600"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        deleteCharacter.mutate(character.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="sm:max-w-[425px] bg-white dark:bg-slate-900 border-0">
            <DialogHeader>
              <DialogTitle className="text-[#075e54] dark:text-[#00a884]">Create New Character</DialogTitle>
              {!user?.isPremium && (
                <DialogDescription className="text-yellow-600">
                  Free Trial: {user?.trialCharactersCreated || 0}/3 characters created
                </DialogDescription>
              )}
            </DialogHeader>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <Input
                placeholder="Character Name"
                value={newCharacter.name}
                onChange={(e) => setNewCharacter({ ...newCharacter, name: e.target.value })}
                className="border-gray-200 dark:border-gray-700 focus:border-[#00a884] dark:focus:border-[#00a884]"
              />
              <Input
                placeholder="Avatar URL"
                value={newCharacter.avatar}
                onChange={(e) => setNewCharacter({ ...newCharacter, avatar: e.target.value })}
                className="border-gray-200 dark:border-gray-700 focus:border-[#00a884] dark:focus:border-[#00a884]"
              />
              <Textarea
                placeholder="Character Description"
                value={newCharacter.description}
                onChange={(e) => setNewCharacter({ ...newCharacter, description: e.target.value })}
                className="border-gray-200 dark:border-gray-700 focus:border-[#00a884] dark:focus:border-[#00a884] min-h-[100px]"
              />
              <Textarea
                placeholder="Character Persona"
                value={newCharacter.persona}
                onChange={(e) => setNewCharacter({ ...newCharacter, persona: e.target.value })}
                className="border-gray-200 dark:border-gray-700 focus:border-[#00a884] dark:focus:border-[#00a884] min-h-[100px]"
              />
              <motion.div 
                whileHover={{ scale: 1.02 }} 
                whileTap={{ scale: 0.98 }}
                className="pt-2"
              >
                <Button 
                  className="w-full bg-gradient-to-r from-[#00a884] to-[#008f6f] hover:from-[#008f6f] hover:to-[#007a5f] text-white shadow-lg"
                  onClick={handleSubmit}
                  disabled={createCharacter.isPending}
                >
                  Create Character
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