import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
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
import { Plus, Trash2, Info, Loader2, Search } from "lucide-react";
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
  const [searchQuery, setSearchQuery] = useState("");
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

  const filteredCharacters = characters?.filter(char => 
    char.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    char.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        className="min-h-screen bg-[#211c2c] relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-purple-800/20 to-purple-900/30">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[length:20px_20px]" />
        </div>
        <div className="container mx-auto py-12 relative z-10">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-6">
              <div className="relative">
                <Loader2 className="h-16 w-16 animate-spin text-purple-500" />
                <div className="absolute inset-0 blur-xl bg-purple-500/20 rounded-full" />
              </div>
              <p className="text-xl font-medium text-purple-200">Loading your characters...</p>
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
      className="min-h-screen bg-[#211c2c] relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-purple-800/20 to-purple-900/30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[length:20px_20px]" />
      </div>

      <div className="container mx-auto py-12 px-6 relative z-10">
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="space-y-8"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <motion.div 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="space-y-2"
            >
              <h1 className="text-5xl font-bold text-purple-100">
                Your Anime Characters
              </h1>
              <p className="text-xl text-purple-300 font-medium">
                Create and chat with your favorite characters
              </p>
            </motion.div>

            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="relative flex-1 md:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-300" />
                <Input 
                  placeholder="Search characters..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-purple-800/30 border-purple-700/50 text-purple-100 placeholder:text-purple-400 w-full md:w-64 focus:ring-2 focus:ring-purple-500/50"
                />
              </div>

              {!user?.isPremium && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-800/30 backdrop-blur-sm border border-purple-700/50"
                      >
                        <Info className="h-4 w-4 text-purple-400" />
                        <span className="text-sm text-purple-200 font-medium whitespace-nowrap">
                          {user?.trialCharactersCreated || 0}/3 characters used
                        </span>
                      </motion.div>
                    </TooltipTrigger>
                    <TooltipContent className="bg-purple-900 text-purple-100 border-purple-700">
                      <p className="font-medium">Free trial: {user?.trialCharactersCreated || 0}/3 characters</p>
                      <p className="text-purple-300">Upgrade to Premium for unlimited!</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              <Button
                onClick={handleCreateClick}
                size="lg"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium shadow-xl hover:shadow-2xl transition-all duration-300 whitespace-nowrap"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create Character
              </Button>
            </div>
          </div>

          {!user?.isPremium && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="md:hidden flex items-center gap-2 p-4 rounded-lg bg-purple-800/30 backdrop-blur-sm border border-purple-700/50"
            >
              <Info className="h-5 w-5 text-purple-400 flex-shrink-0" />
              <p className="text-sm text-purple-200">
                {user?.trialCharactersCreated || 0}/3 free characters used. 
                <button 
                  onClick={() => setShowSubscription(true)}
                  className="text-pink-400 hover:text-pink-300 ml-1 font-medium"
                >
                  Upgrade to Premium!
                </button>
              </p>
            </motion.div>
          )}

          {filteredCharacters?.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center min-h-[40vh] text-center space-y-4"
            >
              <div className="text-purple-400 text-6xl">🔍</div>
              <h3 className="text-2xl font-semibold text-purple-200">No characters found</h3>
              <p className="text-purple-300">Try adjusting your search or create a new character</p>
            </motion.div>
          ) : (
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              <AnimatePresence>
                {filteredCharacters?.map((character) => (
                  <motion.div
                    key={character.id}
                    variants={item}
                    layoutId={character.id}
                    className="relative group"
                    whileHover={{ y: -5 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  >
                    <Link href={`/chat/${character.id}`}>
                      <Card className="overflow-hidden border-0 bg-purple-800/30 backdrop-blur-sm hover:shadow-2xl transition-all duration-300 hover:ring-2 hover:ring-purple-500/50 group">
                        <div className="p-4 space-y-4">
                          <div className="relative">
                            <img
                              src={character.avatar}
                              alt={character.name}
                              className="w-full h-48 object-cover rounded-lg transform group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent rounded-lg" />
                          </div>
                          <div className="relative z-10">
                            <h3 className="text-xl font-semibold text-purple-100 group-hover:text-pink-400 transition-colors drop-shadow-md">
                              {character.name}
                            </h3>
                            <p className="text-sm text-purple-300 font-medium line-clamp-2 drop-shadow">
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
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500/90 hover:bg-red-600/90 shadow-lg"
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
          )}
        </motion.div>

        {/* Create Character Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="sm:max-w-[425px] bg-purple-900/95 backdrop-blur-sm border-purple-700">
            <DialogHeader>
              <DialogTitle className="text-2xl text-purple-100">Create New Character</DialogTitle>
              {!user?.isPremium && (
                <DialogDescription className="text-purple-300">
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
                <label className="text-sm font-medium text-purple-200">Character Name</label>
                <Input
                  placeholder="Enter character name"
                  value={newCharacter.name}
                  onChange={(e) => setNewCharacter({ ...newCharacter, name: e.target.value })}
                  className="bg-purple-800/50 border-purple-700 text-purple-100 focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-purple-200">Avatar URL</label>
                <Input
                  placeholder="Enter avatar image URL"
                  value={newCharacter.avatar}
                  onChange={(e) => setNewCharacter({ ...newCharacter, avatar: e.target.value })}
                  className="bg-purple-800/50 border-purple-700 text-purple-100 focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-purple-200">Description</label>
                <Textarea
                  placeholder="Describe your character"
                  value={newCharacter.description}
                  onChange={(e) => setNewCharacter({ ...newCharacter, description: e.target.value })}
                  className="bg-purple-800/50 border-purple-700 text-purple-100 focus:ring-2 focus:ring-purple-500 min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-purple-200">Character Persona</label>
                <Textarea
                  placeholder="Define the character's personality and behavior"
                  value={newCharacter.persona}
                  onChange={(e) => setNewCharacter({ ...newCharacter, persona: e.target.value })}
                  className="bg-purple-800/50 border-purple-700 text-purple-100 focus:ring-2 focus:ring-purple-500 min-h-[100px]"
                />
              </div>

              <motion.div 
                whileHover={{ scale: 1.02 }} 
                whileTap={{ scale: 0.98 }}
                className="pt-4"
              >
                <Button 
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
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