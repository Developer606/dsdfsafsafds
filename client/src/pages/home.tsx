import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { CharacterCard } from "@/components/character-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { NotificationHeader } from "@/components/notification-header";
import { BackgroundSlideshow } from "@/components/background-slideshow";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Trash2,
  User as UserIcon,
  Moon,
  Sun,
  LogOut,
} from "lucide-react";
import { SubscriptionDialog } from "@/components/subscription-dialog";
import { SubscriptionManagement } from "@/components/subscription-management";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type Character } from "@shared/characters";
import { type CustomCharacter, type User } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

const item = {
  hidden: { x: -20, opacity: 0 },
  show: {
    x: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
    },
  },
};

export default function Home() {
  const [location, setLocation] = useLocation();
  const [showSubscription, setShowSubscription] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [characterToDelete, setCharacterToDelete] = useState<string | null>(
    null,
  );
  const [newCharacter, setNewCharacter] = useState({
    name: "",
    avatar: "",
    description: "",
    persona: "",
  });

  const { toast } = useToast();

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  const { data: characters = [], isLoading } = useQuery<Character[]>({
    queryKey: ["/api/characters"],
  });

  // Theme toggle function
  // Keep track of current theme
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark")
        ? "dark"
        : "dark";
    }
    return "dark";
  });

  const toggleTheme = () => {
    const doc = document.documentElement;
    const isDark = doc.classList.contains("dark");

    if (isDark) {
      doc.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setTheme("light");
    } else {
      doc.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setTheme("dark");
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });

      // Clear all queries from the cache
      queryClient.clear();

      // Navigate to landing page
      setLocation("/");

      toast({
        title: "Logged out successfully",
        description: "Come back soon!",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to logout. Please try again.",
      });
    }
  };

  const createCharacter = useMutation({
    mutationFn: async (
      data: Omit<CustomCharacter, "id" | "userId" | "createdAt">,
    ) => {
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
        persona: "",
      });
      toast({
        title: "Success",
        description: "Character created successfully",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create character",
      });
    },
  });

  const deleteCharacter = useMutation({
    mutationFn: async (characterId: string) => {
      if (!characterId || !characterId.startsWith("custom_")) {
        throw new Error("Cannot delete pre-defined characters");
      }

      const numericId = parseInt(characterId.replace("custom_", ""), 10);
      if (isNaN(numericId)) {
        throw new Error("Invalid character ID");
      }

      await apiRequest("DELETE", `/api/custom-characters/${numericId}`);
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/characters"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Success",
        description: "Character deleted successfully",
      });
      setShowDeleteConfirm(false);
      setCharacterToDelete(null);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to delete character",
      });
      setShowDeleteConfirm(false);
      setCharacterToDelete(null);
    },
  });

  const handleDeleteCharacter = (characterId: string) => {
    if (!characterId.startsWith("custom_")) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Cannot delete pre-defined characters",
      });
      return;
    }
    setCharacterToDelete(characterId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (characterToDelete) {
      deleteCharacter.mutate(characterToDelete);
    }
  };

  const handleCreateClick = () => {
    if (!user) return;

    if (!user.isPremium && user.trialCharactersCreated >= 3) {
      setShowSubscription(true);
      return;
    }

    setShowCreateDialog(true);
  };

  const handleSubmit = () => {
    if (
      !newCharacter.name ||
      !newCharacter.avatar ||
      !newCharacter.description ||
      !newCharacter.persona
    ) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all fields",
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
    <div className="min-h-screen bg-[#FFFDFA] dark:bg-slate-950">
      <BackgroundSlideshow
        interval={8000}
        opacity={0.35}
        fadeTime={1.5}
        darkMode={theme === "dark"}
      />

      <NotificationHeader />

      <div className="flex h-[calc(100vh-64px)]">
        {/* Left Sidebar */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="w-80 border-r border-yellow-200 dark:border-amber-800 overflow-y-auto p-4 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
        >
          {/* User Profile and Settings Section */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-yellow-200 dark:border-amber-800">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="rounded-full h-8 w-8"
              >
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
              {user && <SubscriptionManagement user={user} />}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full h-8 w-8 bg-yellow-500/10 hover:bg-yellow-500/20 dark:bg-amber-500/10 dark:hover:bg-amber-500/20"
                  >
                    <UserIcon className="h-4 w-4 text-yellow-600 dark:text-amber-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled>
                    Email: {user?.email}
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled>
                    Username: {user?.username}
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled>
                    Status: {user?.subscriptionStatus}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-red-600"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="mb-4">
            <Button
              onClick={handleCreateClick}
              className="w-full bg-gradient-to-br from-yellow-400/90 to-amber-500/90 hover:from-yellow-400 hover:to-amber-500 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group"
            >
              <Plus className="h-5 w-5 mr-2 group-hover:rotate-90 transition-transform duration-300" />
              Create Character
            </Button>
          </div>

          <AnimatePresence>
            {characters?.map((character) => (
              <motion.div
                key={character.id}
                variants={item}
                layoutId={character.id}
                className="relative group mb-3"
              >
                <Link href={`/chat/${character.id}`}>
                  <div className="transform transition-all duration-300">
                    <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900 shadow-md hover:shadow-lg border border-yellow-500/20 dark:border-amber-500/20 hover:border-yellow-500/40 dark:hover:border-amber-500/40 p-3">
                      <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="flex items-center gap-3">
                        <img
                          src={character.avatar}
                          alt={character.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <div>
                          <h3 className="font-medium text-sm">
                            {character.name}
                          </h3>
                          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
                            {character.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
                {character.id.startsWith("custom_") && (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute top-2 right-2 p-1.5 bg-red-500/90 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDeleteCharacter(character.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </motion.button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Main Content Area */}
        <div className="flex-1 p-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-2xl mx-auto"
          >
            <h1 className="text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-yellow-500 to-amber-600">
              Immerse in Anime & Manga
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Chat with your favorite characters and bring your anime world to
              life
            </p>
          </motion.div>
        </div>
      </div>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-slate-900 border-2 border-yellow-500/20 dark:border-amber-500/20 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-500 to-amber-600">
              Create New Character
            </DialogTitle>
            {!user?.isPremium && (
              <DialogDescription className="text-amber-600">
                Free Trial: {user?.trialCharactersCreated || 0}/3 characters
                created
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
              onChange={(e) =>
                setNewCharacter({ ...newCharacter, name: e.target.value })
              }
              className="border-yellow-200 dark:border-amber-800 focus:border-yellow-500 dark:focus:border-amber-500"
            />
            <Input
              placeholder="Avatar URL"
              value={newCharacter.avatar}
              onChange={(e) =>
                setNewCharacter({ ...newCharacter, avatar: e.target.value })
              }
              className="border-yellow-200 dark:border-amber-800 focus:border-yellow-500 dark:focus:border-amber-500"
            />
            <Textarea
              placeholder="Character Description"
              value={newCharacter.description}
              onChange={(e) =>
                setNewCharacter({
                  ...newCharacter,
                  description: e.target.value,
                })
              }
              className="border-yellow-200 dark:border-amber-800 focus:border-yellow-500 dark:focus:border-amber-500 min-h-[100px]"
            />
            <Textarea
              placeholder="Character Persona"
              value={newCharacter.persona}
              onChange={(e) =>
                setNewCharacter({ ...newCharacter, persona: e.target.value })
              }
              className="border-yellow-200 dark:border-amber-800 focus:border-yellow-500 dark:focus:border-amber-500 min-h-[100px]"
            />
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="pt-2"
            >
              <Button
                className="w-full bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white shadow-lg"
                onClick={handleSubmit}
                disabled={createCharacter.isPending}
              >
                Create Character
              </Button>
            </motion.div>
          </motion.div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Delete Character</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this character? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteConfirm(false);
                setCharacterToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteCharacter.isPending}
            >
              Delete
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
