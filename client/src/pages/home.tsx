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
  DialogClose,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Info, Search, AlertCircle } from "lucide-react";
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

export default function Home() {
  const [location] = useLocation();
  const [showSubscription, setShowSubscription] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showComplaintDialog, setShowComplaintDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [complaintData, setComplaintData] = useState({
    subject: "",
    description: ""
  });
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

  const submitComplaint = useMutation({
    mutationFn: async (data: { subject: string; description: string }) => {
      const res = await apiRequest("POST", "/api/complaints", data);
      return res.json();
    },
    onSuccess: () => {
      setShowComplaintDialog(false);
      setComplaintData({ subject: "", description: "" });
      toast({
        title: "Complaint Submitted",
        description: "We'll review your complaint and get back to you soon."
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to submit complaint. Please try again."
      });
    }
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

  const handleSubmitComplaint = () => {
    if (!complaintData.subject || !complaintData.description) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all fields"
      });
      return;
    }
    submitComplaint.mutate(complaintData);
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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-6">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="h-[300px] bg-gray-800/50 rounded-xl animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black">
      <div className="container mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1"
          >
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 text-transparent bg-clip-text">
              Your Anime Characters
            </h1>
            <p className="mt-2 text-gray-400">
              Create and chat with your favorite characters
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4 w-full md:w-auto"
          >
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search characters..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-800/50 border-gray-700 text-gray-100"
              />
            </div>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowComplaintDialog(true)}
                    className="bg-gray-800/50 border-gray-700 hover:bg-gray-700/50"
                  >
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Raise a Complaint</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={handleCreateClick}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create Character
              </Button>
            </motion.div>
          </motion.div>
        </div>

        {!user?.isPremium && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-4 bg-gradient-to-r from-purple-900/50 to-pink-900/50 rounded-xl backdrop-blur-sm border border-purple-500/20"
          >
            <div className="flex items-center gap-3">
              <Info className="h-5 w-5 text-purple-400" />
              <p className="text-gray-300">
                <span className="font-semibold text-purple-400">{user?.trialCharactersCreated || 0}/3</span> free characters used.
                <Button
                  variant="link"
                  onClick={() => setShowSubscription(true)}
                  className="text-purple-400 hover:text-purple-300 ml-2"
                >
                  Upgrade to Premium
                </Button>
              </p>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          <AnimatePresence>
            {filteredCharacters?.map((character) => (
              <motion.div
                key={character.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileHover={{ y: -5 }}
                className="relative group"
              >
                <Link href={`/chat/${character.id}`}>
                  <div className="transform transition-all duration-300 hover:scale-[1.02]">
                    <CharacterCard character={character} />
                  </div>
                </Link>
                {character.id.startsWith('custom_') && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute top-2 right-2"
                  >
                    <Button
                      variant="destructive"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-600/90 hover:bg-red-700"
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
          <DialogContent className="sm:max-w-[425px] bg-gray-900/95 backdrop-blur-sm border-gray-800">
            <DialogHeader>
              <DialogTitle className="text-gray-100">Create New Character</DialogTitle>
              {!user?.isPremium && (
                <DialogDescription className="text-yellow-500">
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
                <label className="text-sm font-medium text-gray-300">Name</label>
                <Input
                  placeholder="Character Name"
                  value={newCharacter.name}
                  onChange={(e) => setNewCharacter({ ...newCharacter, name: e.target.value })}
                  className="bg-gray-800/50 border-gray-700 text-gray-100"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Avatar URL</label>
                <Input
                  placeholder="Avatar URL"
                  value={newCharacter.avatar}
                  onChange={(e) => setNewCharacter({ ...newCharacter, avatar: e.target.value })}
                  className="bg-gray-800/50 border-gray-700 text-gray-100"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Description</label>
                <Textarea
                  placeholder="Character Description"
                  value={newCharacter.description}
                  onChange={(e) => setNewCharacter({ ...newCharacter, description: e.target.value })}
                  className="bg-gray-800/50 border-gray-700 text-gray-100"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Persona</label>
                <Textarea
                  placeholder="Character Persona"
                  value={newCharacter.persona}
                  onChange={(e) => setNewCharacter({ ...newCharacter, persona: e.target.value })}
                  className="bg-gray-800/50 border-gray-700 text-gray-100"
                />
              </div>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button 
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                  onClick={handleSubmit}
                  disabled={createCharacter.isPending}
                >
                  {createCharacter.isPending ? "Creating..." : "Create Character"}
                </Button>
              </motion.div>
            </motion.div>
          </DialogContent>
        </Dialog>

        <Dialog open={showComplaintDialog} onOpenChange={setShowComplaintDialog}>
          <DialogContent className="sm:max-w-[425px] bg-gray-900/95 backdrop-blur-sm border-gray-800">
            <DialogHeader>
              <DialogTitle className="text-gray-100">Raise a Complaint</DialogTitle>
              <DialogDescription className="text-gray-400">
                Tell us about any issues or concerns you're experiencing.
              </DialogDescription>
            </DialogHeader>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Subject</label>
                <Input
                  placeholder="Complaint Subject"
                  value={complaintData.subject}
                  onChange={(e) => setComplaintData({ ...complaintData, subject: e.target.value })}
                  className="bg-gray-800/50 border-gray-700 text-gray-100"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Description</label>
                <Textarea
                  placeholder="Describe your complaint in detail..."
                  value={complaintData.description}
                  onChange={(e) => setComplaintData({ ...complaintData, description: e.target.value })}
                  className="bg-gray-800/50 border-gray-700 text-gray-100 min-h-[150px]"
                />
              </div>

              <div className="flex justify-end gap-3">
                <DialogClose asChild>
                  <Button variant="outline" className="bg-gray-800/50 border-gray-700 text-gray-300 hover:bg-gray-700/50">
                    Cancel
                  </Button>
                </DialogClose>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button 
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                    onClick={handleSubmitComplaint}
                    disabled={submitComplaint.isPending}
                  >
                    {submitComplaint.isPending ? "Submitting..." : "Submit Complaint"}
                  </Button>
                </motion.div>
              </div>
            </motion.div>
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