import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { CharacterCard } from "@/components/character-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { NotificationHeader } from "@/components/notification-header";
import { BackgroundSlideshow } from "@/components/background-slideshow";
import { FeaturedSection } from "@/components/advertisement/featured-section";
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
  Home as HomeIcon,
  Search,
  MessageSquare,
  Settings,
  Library,
  Bell,
  AlertCircle,
  CreditCard,
  Users,
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
import {
  type CustomCharacter,
  type User,
  type Notification,
} from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useTheme } from "@/lib/theme-context";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

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
  
  // Characters should already be sorted by the server, but we'll sort them here just in case
  const sortedCharacters = [...characters].sort((a, b) => {
    // If one has isNew and the other doesn't, the one with isNew comes first
    if (a.isNew && !b.isNew) return -1;
    if (!a.isNew && b.isNew) return 1;
    // Otherwise, maintain the original order
    return 0;
  });

  // Query notifications from the API
  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
  });

  // Add mutation for marking notifications as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      await apiRequest("PATCH", `/api/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to mark notification as read",
      });
    },
  });

  // Use theme context instead of local state
  const { theme, toggleTheme } = useTheme();

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

  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<
    "home" | "search" | "create" | "library" | "profile"
  >("home");
  const [searchQuery, setSearchQuery] = useState("");

  // Complaint dialog states
  const [showComplaintDialog, setShowComplaintDialog] = useState(false);
  const [complaint, setComplaint] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      {/* Background slideshow only for desktop */}
      {!isMobile && (
        <BackgroundSlideshow
          interval={8000}
          opacity={0.35}
          fadeTime={1.5}
          darkMode={theme === "dark"}
        />
      )}

      {!isMobile && <NotificationHeader />}

      {isMobile ? (
        // Combined UI design from both references
        <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
          {/* Gradient background header */}
          <div className="bg-gradient-to-r from-amber-400 via-pink-500 to-purple-500 pt-3 pb-8 px-4 relative">
            {/* Top navigation bar */}
            <div className="flex items-center justify-between mb-4">
              <motion.div
                whileTap={{ scale: 0.9 }}
                className="p-2 rounded-full bg-white/10 backdrop-blur-sm shadow-sm"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-white"
                >
                  <line x1="4" x2="20" y1="12" y2="12"></line>
                  <line x1="4" x2="20" y1="6" y2="6"></line>
                  <line x1="4" x2="20" y1="18" y2="18"></line>
                </svg>
              </motion.div>

              <div className="flex items-center">
                <h1 className="text-lg font-semibold text-white">
                  <span className="font-bold">Anime</span>
                  <span>Chat</span>
                </h1>
              </div>

              <div className="flex items-center space-x-1">
                {/* Notification bell */}
                <Popover>
                  <PopoverTrigger asChild>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      className="p-2 rounded-full relative flex items-center justify-center"
                    >
                      <Bell className="h-5 w-5 text-white" />
                      {notifications &&
                        notifications.filter((n) => !n.read).length > 0 && (
                          <span className="absolute top-0 right-0 h-5 w-5 bg-white text-pink-500 rounded-full text-xs flex items-center justify-center shadow-sm font-medium">
                            {notifications.filter((n) => !n.read).length}
                          </span>
                        )}
                    </motion.button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-0 bg-white dark:bg-gray-800 border-0 rounded-xl shadow-xl text-gray-800 dark:text-white">
                    <div className="p-3 border-b border-gray-100 dark:border-gray-700">
                      <h3 className="font-semibold text-pink-500 dark:text-pink-400">
                        Notifications
                      </h3>
                    </div>
                    <AnimatePresence>
                      {notifications && notifications.length > 0 ? (
                        <div className="max-h-[400px] overflow-y-auto">
                          {notifications.map((notification) => (
                            <motion.div
                              key={notification.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              whileTap={{
                                backgroundColor: "rgba(236, 72, 153, 0.08)",
                              }}
                              className={cn(
                                "p-4 border-b border-gray-100 dark:border-gray-700 cursor-pointer transition-all",
                                !notification.read
                                  ? "bg-pink-50 dark:bg-pink-900/20"
                                  : "hover:bg-gray-50 dark:hover:bg-gray-800/50",
                              )}
                              onClick={() =>
                                markAsReadMutation.mutate(
                                  Number(notification.id),
                                )
                              }
                            >
                              <h4 className="font-medium text-sm text-gray-800 dark:text-white">
                                {notification.title}
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                {notification.message}
                              </p>
                              <span className="text-xs text-gray-400 mt-2 block">
                                {new Date(
                                  notification.createdAt,
                                ).toLocaleDateString()}
                              </span>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-5 text-center text-gray-500 dark:text-gray-400">
                          <div className="inline-flex rounded-full bg-pink-100 dark:bg-pink-900/30 p-3 mb-3">
                            <Bell className="h-6 w-6 text-pink-500 dark:text-pink-400" />
                          </div>
                          <p>No notifications yet</p>
                        </div>
                      )}
                    </AnimatePresence>
                  </PopoverContent>
                </Popover>

                {/* User menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      className="p-2 rounded-full flex items-center justify-center"
                    >
                      <UserIcon className="h-5 w-5 text-white" />
                    </motion.button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-64 bg-white dark:bg-gray-800 border-0 rounded-xl shadow-xl text-gray-800 dark:text-white p-1"
                  >
                    <div className="p-3 mb-1 flex items-center">
                      <div className="w-10 h-10 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center mr-3">
                        <UserIcon className="h-5 w-5 text-pink-500 dark:text-pink-400" />
                      </div>
                      <div>
                        <p className="font-medium">{user?.username}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {user?.email}
                        </p>
                      </div>
                    </div>
                    <DropdownMenuSeparator className="bg-gray-100 dark:bg-gray-700" />
                    <DropdownMenuItem
                      className="text-gray-500 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:bg-gray-50 dark:focus:bg-gray-700 my-1 p-3"
                      disabled
                    >
                      Status:{" "}
                      <span className="ml-1 font-medium text-gray-800 dark:text-white">
                        {user?.subscriptionStatus}
                      </span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-gray-100 dark:bg-gray-700" />
                    <DropdownMenuItem
                      onClick={toggleTheme}
                      className="flex items-center rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:bg-gray-50 dark:focus:bg-gray-700 my-1 p-3"
                    >
                      {theme === "dark" ? (
                        <Sun className="mr-3 h-5 w-5 text-amber-500" />
                      ) : (
                        <Moon className="mr-3 h-5 w-5 text-indigo-500" />
                      )}
                      {theme === "dark" ? "Light Mode" : "Dark Mode"}
                    </DropdownMenuItem>
                    {/* Subscription button */}
                    <DropdownMenuItem
                      className="flex items-center rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:bg-gray-50 dark:focus:bg-gray-700 my-1 p-3"
                      onClick={() => setShowSubscription(true)}
                    >
                      <CreditCard className="mr-3 h-5 w-5 text-green-500" />
                      Manage Subscription
                    </DropdownMenuItem>
                    {/* Complaint button */}
                    <DropdownMenuItem
                      className="flex items-center rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:bg-gray-50 dark:focus:bg-gray-700 my-1 p-3"
                      onClick={() => setShowComplaintDialog(true)}
                    >
                      <AlertCircle className="mr-3 h-5 w-5 text-amber-500" />
                      Report an Issue
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-gray-100 dark:bg-gray-700" />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="flex items-center rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 focus:bg-red-50 dark:focus:bg-red-900/20 text-red-500 my-1 p-3"
                    >
                      <LogOut className="mr-3 h-5 w-5" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative z-10 mb-4">
              <div className="bg-white dark:bg-gray-800 rounded-full flex items-center pl-4 pr-3 py-3 shadow-lg">
                <Search className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-3" />
                <Input
                  type="text"
                  placeholder="Search characters..."
                  className="bg-transparent border-0 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0 px-0 py-0 h-auto text-base"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Wave effect at bottom of header */}
            <div className="absolute bottom-0 left-0 right-0 h-8 overflow-hidden">
              <div className="bg-gray-50 dark:bg-gray-900 h-16 w-full rounded-t-[50%]"></div>
            </div>
          </div>

          {/* Main content area based on active tab */}
          <div className="flex-1 overflow-y-auto">
            {/* Home Tab Content */}
            {activeTab === "home" && (
              <div className="pb-20">
                {/* Horizontal character avatars */}
                <div className="px-4 pt-4">
                  <div className="flex overflow-x-auto pb-4 space-x-4 hide-scrollbar">
                    {/* Add user status button */}
                    <div className="flex flex-col items-center w-16 flex-shrink-0">
                      <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-pink-500 bg-gradient-to-br from-pink-200 to-pink-300 dark:from-pink-900 dark:to-purple-900 flex items-center justify-center">
                        <Plus className="h-8 w-8 text-pink-500 dark:text-pink-400" />
                      </div>
                      <span className="text-xs mt-1 font-medium">Status</span>
                    </div>

                    {/* Character avatars */}
                    {sortedCharacters?.slice(0, 8).map((character) => (
                      <Link key={character.id} href={`/chat/${character.id}`}>
                        <div className="flex flex-col items-center w-16 flex-shrink-0">
                          <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                            <img
                              src={character.avatar}
                              alt={character.name}
                              className="w-full h-full object-cover"
                            />
                            {character.id.startsWith("custom_") && (
                              <div className="absolute bottom-0 right-0 bg-green-500 rounded-full w-4 h-4 border-2 border-white dark:border-gray-800"></div>
                            )}
                          </div>
                          <span className="text-xs mt-1 font-medium truncate w-full text-center">
                            {character.name.split(" ")[0]}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Category Grid */}
                <div className="px-4 pt-2 pb-4">
                  <h2 className="text-lg font-bold mb-3">Categories</h2>
                  <div className="grid grid-cols-4 gap-3">
                    <Link href="/search">
                      <div className="flex flex-col items-center">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center shadow-md">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-white"
                          >
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                          </svg>
                        </div>
                        <span className="text-xs mt-1 font-medium">Chat</span>
                      </div>
                    </Link>
                    <div className="flex flex-col items-center">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-white"
                        >
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                        </svg>
                      </div>
                      <span className="text-xs mt-1 font-medium">Top</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-400 to-teal-500 flex items-center justify-center shadow-md">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-white"
                        >
                          <circle cx="12" cy="12" r="10"></circle>
                          <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                      </div>
                      <span className="text-xs mt-1 font-medium">Recent</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-md">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-white"
                        >
                          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                          <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                      </div>
                      <span className="text-xs mt-1 font-medium">Custom</span>
                    </div>
                  </div>
                </div>

                {/* Enhanced Featured Section for Mobile UI */}
                <div className="px-4 pt-5">
                  <div className="flex justify-between items-center mb-3">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-pink-500" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.8-2.034c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      Featured
                    </h2>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="text-xs px-3 py-1 rounded-full bg-pink-500/10 text-pink-500 font-medium"
                    >
                      View All
                    </motion.button>
                  </div>
                  <FeaturedSection className="mb-6 rounded-xl overflow-hidden shadow-md" />
                  
                  {/* Quick tips carousel for mobile */}
                  <div className="mt-4 mb-6">
                    <div className="bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20 rounded-xl p-4 shadow-sm border border-pink-100 dark:border-pink-800/30">
                      <h3 className="font-bold text-pink-700 dark:text-pink-400 mb-2 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        Pro Tips
                      </h3>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Upgrade to premium for unlimited characters and ad-free experience! Use tags to find characters that match your interests.
                      </p>
                      <div className="flex mt-3">
                        <motion.button
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          className="text-xs bg-pink-500 text-white font-medium py-1.5 px-3 rounded-full flex items-center"
                          onClick={() => setShowSubscription(true)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                          </svg>
                          Upgrade
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Top Rated section - Material Design Carousel */}
                <div className="px-4 pt-5">
                  <div className="flex justify-between items-center mb-3">
                    <h2 className="text-lg font-bold">Top Rated</h2>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      className="text-xs font-medium text-[#03DAC6]"
                    >
                      See all
                    </motion.button>
                  </div>
                  <div className="flex overflow-x-auto pb-4 space-x-4 hide-scrollbar -mx-1 px-1">
                    {sortedCharacters?.slice(0, 5).map((character) => (
                      <Link key={character.id} href={`/chat/${character.id}`}>
                        <motion.div
                          whileTap={{ scale: 0.95 }}
                          className="w-28 shrink-0"
                        >
                          <div className="aspect-[3/4] rounded-xl overflow-hidden bg-[#333333] mb-2 relative shadow-md">
                            <img
                              src={character.avatar}
                              alt={character.name}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#121212]/60 to-transparent"></div>
                            {character.id.startsWith("custom_") && (
                              <motion.button
                                whileTap={{ scale: 0.9 }}
                                className="absolute top-2 right-2 p-1.5 bg-[#CF6679] text-white rounded-full z-10 shadow-sm"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleDeleteCharacter(character.id);
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </motion.button>
                            )}
                            <div className="absolute bottom-0 left-0 w-full p-2">
                              <div className="flex">
                                {[1, 2, 3, 4, 5]
                                  .slice(0, Math.ceil(Math.random() * 5))
                                  .map((_, i) => (
                                    <span
                                      key={i}
                                      className="text-[#BB86FC] text-xs"
                                    >
                                      ★
                                    </span>
                                  ))}
                              </div>
                            </div>
                          </div>
                          <h3 className="text-sm font-medium text-white line-clamp-1">
                            {character.name}
                          </h3>
                          <p className="text-xs text-[#BBBBBB] line-clamp-1">
                            Popular character
                          </p>
                        </motion.div>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Recently Added Section - Material Design Grid */}
                <div className="px-4 pt-5">
                  <div className="flex justify-between items-center mb-3">
                    <h2 className="text-lg font-bold">Recently Added</h2>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      className="text-xs font-medium text-[#03DAC6]"
                    >
                      See all
                    </motion.button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {sortedCharacters?.slice(5, 9).map((character) => (
                      <Link key={character.id} href={`/chat/${character.id}`}>
                        <motion.div
                          whileTap={{ scale: 0.95 }}
                          className="relative"
                        >
                          <div className="aspect-[3/4] rounded-xl overflow-hidden bg-[#333333] mb-2 relative shadow-md">
                            <img
                              src={character.avatar}
                              alt={character.name}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-[#121212] to-transparent">
                              <h3 className="text-sm font-medium text-white line-clamp-1">
                                {character.name}
                              </h3>
                              <p className="text-xs text-[#BBBBBB] mt-1 line-clamp-1">
                                New arrival
                              </p>
                            </div>
                            {character.id.startsWith("custom_") && (
                              <motion.button
                                whileTap={{ scale: 0.9 }}
                                className="absolute top-2 right-2 p-1.5 bg-[#CF6679] text-white rounded-full z-10 shadow-sm"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleDeleteCharacter(character.id);
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </motion.button>
                            )}
                          </div>
                        </motion.div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Search Tab Content - Material Design Search */}
            {activeTab === "search" && (
              <div className="p-4 pb-20">
                <div className="relative mb-5">
                  <div className="bg-[#2A2A2A] rounded-full flex items-center pl-4 pr-3 py-2 shadow-md">
                    <Search className="h-5 w-5 text-[#BB86FC] mr-3" />
                    <Input
                      type="text"
                      placeholder="Search characters..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-transparent border-0 text-white placeholder-[#888888] focus-visible:ring-0 focus-visible:ring-offset-0 px-0 text-base font-medium"
                    />
                    {searchQuery && (
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setSearchQuery("")}
                        className="ml-2 p-1 rounded-full text-[#888888] hover:text-white"
                      >
                        <AlertCircle className="h-4 w-4" />
                      </motion.button>
                    )}
                  </div>
                </div>

                {searchQuery && (
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[#BBBBBB] text-sm">
                      Results for "{searchQuery}"
                    </p>
                    <span className="text-xs px-2 py-1 rounded-full bg-[#333333] text-[#BBBBBB]">
                      {
                        sortedCharacters?.filter(
                          (char) =>
                            char.name
                              .toLowerCase()
                              .includes(searchQuery.toLowerCase()) ||
                            char.description
                              .toLowerCase()
                              .includes(searchQuery.toLowerCase()),
                        ).length
                      }{" "}
                      found
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 mt-4">
                  {sortedCharacters
                    ?.filter(
                      (char) =>
                        searchQuery === "" ||
                        char.name
                          .toLowerCase()
                          .includes(searchQuery.toLowerCase()) ||
                        char.description
                          .toLowerCase()
                          .includes(searchQuery.toLowerCase()),
                    )
                    .map((character) => (
                      <Link key={character.id} href={`/chat/${character.id}`}>
                        <motion.div
                          whileTap={{ scale: 0.95 }}
                          className="relative"
                        >
                          <div className="aspect-[3/4] rounded-xl overflow-hidden bg-[#2A2A2A] mb-2 relative shadow-md">
                            <img
                              src={character.avatar}
                              alt={character.name}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#121212]/90 via-[#121212]/30 to-transparent"></div>

                            <div className="absolute bottom-0 left-0 right-0 p-3">
                              <h3 className="text-sm font-medium text-white line-clamp-1">
                                {character.name}
                              </h3>
                              <p className="text-xs text-[#BBBBBB] mt-1 line-clamp-2">
                                {character.description.substring(0, 50)}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      </Link>
                    ))}
                </div>

                {searchQuery !== "" &&
                  sortedCharacters?.filter(
                    (char) =>
                      char.name
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase()) ||
                      char.description
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase()),
                  ).length === 0 && (
                    <div className="text-center mt-16 p-6">
                      <div className="bg-[#333333] rounded-full p-5 inline-flex mb-4">
                        <Search className="h-10 w-10 text-[#888888]" />
                      </div>
                      <h3 className="text-lg font-medium text-white mb-2">
                        No results found
                      </h3>
                      <p className="text-[#BBBBBB]">
                        No characters matched your search for "{searchQuery}"
                      </p>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSearchQuery("")}
                        className="mt-4 px-4 py-2 bg-[#2A2A2A] text-[#BB86FC] rounded-full font-medium text-sm inline-flex items-center"
                      >
                        Clear search
                      </motion.button>
                    </div>
                  )}
              </div>
            )}

            {/* Create Tab Content - Material Design Create UI */}
            {activeTab === "create" && (
              <div className="p-4 pb-20 text-center">
                <div className="mt-8 mb-5">
                  <motion.div
                    className="mx-auto w-24 h-24 flex items-center justify-center rounded-full bg-[#BB86FC]/10 mb-6 shadow-lg"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <Plus className="h-12 w-12 text-[#BB86FC]" />
                  </motion.div>
                  <h2 className="text-2xl font-bold mb-3">
                    Create a Character
                  </h2>
                  <p className="text-[#BBBBBB] mb-8 max-w-xs mx-auto">
                    Design your own custom anime character with a unique
                    personality
                  </p>

                  {user && user.isPremium ? (
                    <div className="mb-5 bg-[#2A2A2A] rounded-xl p-4 max-w-xs mx-auto">
                      <div className="flex items-center justify-center mb-2">
                        <div className="w-8 h-8 rounded-full bg-[#BB86FC]/20 flex items-center justify-center mr-2">
                          <CreditCard className="h-4 w-4 text-[#BB86FC]" />
                        </div>
                        <span className="font-medium text-[#BB86FC]">
                          Premium Subscription
                        </span>
                      </div>
                      <p className="text-sm text-[#BBBBBB]">
                        You can create unlimited characters with your premium
                        subscription!
                      </p>
                    </div>
                  ) : (
                    <div className="mb-5 bg-[#2A2A2A] rounded-xl p-4 max-w-xs mx-auto">
                      <div className="flex items-center justify-center mb-2">
                        <div className="w-8 h-8 rounded-full bg-[#03DAC6]/20 flex items-center justify-center mr-2">
                          <Settings className="h-4 w-4 text-[#03DAC6]" />
                        </div>
                        <span className="font-medium text-white">
                          Free Trial
                        </span>
                      </div>
                      <p className="text-sm text-[#BBBBBB] mb-3">
                        You have created {user?.trialCharactersCreated || 0} out
                        of 3 available characters
                      </p>
                      <div className="w-full bg-[#333333] rounded-full h-2">
                        <div
                          className="bg-[#03DAC6] h-2 rounded-full"
                          style={{
                            width: `${((user?.trialCharactersCreated || 0) / 3) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  )}

                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleCreateClick}
                    className="bg-[#BB86FC] hover:bg-[#BB86FC]/90 text-black font-medium rounded-full px-8 py-3 text-base shadow-lg"
                  >
                    <Plus className="h-5 w-5 mr-2 inline-block" />
                    Create New Character
                  </motion.button>
                </div>
              </div>
            )}

            {/* Library Tab Content - Material Design Library */}
            {activeTab === "library" && (
              <div className="p-4 pb-20">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl font-bold">Character Library</h2>
                  <div className="flex items-center">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      className="ml-2 text-xs font-medium text-[#03DAC6] flex items-center"
                    >
                      <Settings className="h-3.5 w-3.5 mr-1" />
                      Sort
                    </motion.button>
                  </div>
                </div>

                {sortedCharacters && sortedCharacters.length > 0 ? (
                  <div className="space-y-3">
                    <AnimatePresence>
                      {sortedCharacters.map((character, index) => (
                        <motion.div
                          key={character.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <Link href={`/chat/${character.id}`}>
                            <motion.div
                              whileTap={{ scale: 0.98 }}
                              className="flex items-center bg-[#2A2A2A] p-4 rounded-xl shadow-md"
                            >
                              <div className="relative">
                                <img
                                  src={character.avatar}
                                  alt={character.name}
                                  className="w-16 h-16 rounded-xl object-cover mr-4 border-2 border-[#333333]"
                                />
                                {character.id.startsWith("custom_") && (
                                  <div className="absolute -top-1.5 -right-1.5 bg-[#BB86FC] rounded-full p-0.5 border-2 border-[#1E1E1E]">
                                    <div className="flex items-center justify-center">
                                      <span className="text-[8px] font-bold px-1.5 text-black">
                                        CUSTOM
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="flex-1">
                                <h3 className="font-medium text-white mb-1">
                                  {character.name}
                                </h3>
                                <p className="text-xs text-[#BBBBBB] line-clamp-2">
                                  {character.description}
                                </p>
                              </div>
                              <div className="flex flex-col items-end">
                                {character.id.startsWith("custom_") && (
                                  <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    className="p-2 text-[#CF6679] hover:bg-[#CF6679]/10 rounded-full"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleDeleteCharacter(character.id);
                                    }}
                                  >
                                    <Trash2 className="h-5 w-5" />
                                  </motion.button>
                                )}
                                <motion.button
                                  whileTap={{ scale: 0.9 }}
                                  className="p-2 text-[#03DAC6] hover:bg-[#03DAC6]/10 rounded-full mt-auto"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setLocation(`/chat/${character.id}`);
                                  }}
                                >
                                  <MessageSquare className="h-5 w-5" />
                                </motion.button>
                              </div>
                            </motion.div>
                          </Link>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                ) : (
                  <div className="text-center mt-10 p-6">
                    <div className="bg-[#333333] rounded-full p-5 inline-flex mb-4">
                      <Library className="h-10 w-10 text-[#888888]" />
                    </div>
                    <h3 className="text-lg font-medium text-white mb-2">
                      No characters
                    </h3>
                    <p className="text-[#BBBBBB] mb-4">
                      Your library is empty. Add some characters to chat with!
                    </p>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={handleCreateClick}
                      className="px-5 py-2 bg-[#BB86FC] text-black rounded-full font-medium text-sm inline-flex items-center"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Character
                    </motion.button>
                  </div>
                )}
              </div>
            )}

            {/* Profile Tab Content - Material Design Profile */}
            {activeTab === "profile" && (
              <div className="p-4 pb-20">
                <div className="mb-6 text-center">
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-24 h-24 rounded-full bg-[#BB86FC]/10 flex items-center justify-center mx-auto mb-4 border-4 border-[#BB86FC]/20"
                  >
                    <UserIcon className="h-12 w-12 text-[#BB86FC]" />
                  </motion.div>
                  <h2 className="text-2xl font-bold text-white">
                    {user?.username}
                  </h2>
                  <p className="text-[#BBBBBB]">{user?.email}</p>

                  <div className="mt-4 flex justify-center">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      className="px-4 py-1.5 rounded-full bg-[#333333] flex items-center text-sm font-medium text-[#BB86FC]"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Edit Profile
                    </motion.button>
                  </div>
                </div>

                <div className="bg-[#2A2A2A] rounded-xl p-4 mb-5 shadow-md">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold">Subscription</h3>
                    {user?.isPremium ? (
                      <span className="px-2 py-1 bg-[#BB86FC]/20 rounded-full text-xs font-medium text-[#BB86FC]">
                        Premium
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-[#333333] rounded-full text-xs font-medium text-white">
                        Free
                      </span>
                    )}
                  </div>

                  <div
                    className={`p-4 rounded-xl mb-3 ${
                      user?.isPremium
                        ? "bg-gradient-to-br from-[#BB86FC]/30 to-[#BB86FC]/10 border border-[#BB86FC]/30"
                        : "bg-[#333333]"
                    }`}
                  >
                    <div className="flex items-center mb-2">
                      <div
                        className={`w-10 h-10 rounded-full ${
                          user?.isPremium ? "bg-[#BB86FC]/20" : "bg-[#444444]"
                        } flex items-center justify-center mr-3`}
                      >
                        <CreditCard
                          className={`h-5 w-5 ${
                            user?.isPremium ? "text-[#BB86FC]" : "text-white"
                          }`}
                        />
                      </div>
                      <div>
                        <p className="font-medium text-white">
                          {user?.subscriptionTier || "Free Tier"}
                        </p>
                        <p className="text-sm text-[#BBBBBB]">
                          {user?.subscriptionStatus || "Basic access"}
                        </p>
                      </div>
                    </div>

                    {user?.isPremium ? (
                      <p className="text-xs text-[#BBBBBB] mb-3">
                        Your premium plan gives you access to all features
                        including unlimited character creation.
                      </p>
                    ) : (
                      <p className="text-xs text-[#BBBBBB] mb-3">
                        Upgrade to Premium for unlimited character creation and
                        exclusive features.
                      </p>
                    )}

                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowSubscription(true)}
                      className={`w-full py-2 rounded-lg text-sm font-medium ${
                        user?.isPremium
                          ? "bg-[#BB86FC] text-black"
                          : "bg-[#03DAC6] text-black"
                      }`}
                    >
                      {user?.isPremium
                        ? "Manage Subscription"
                        : "Upgrade to Premium"}
                    </motion.button>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-bold mb-3">Settings</h3>

                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    className="w-full flex items-center justify-between p-3 bg-[#2A2A2A] rounded-xl shadow-md hover:bg-[#333333] transition-colors"
                    onClick={toggleTheme}
                  >
                    <div className="flex items-center">
                      {theme === "dark" ? (
                        <Sun className="mr-3 h-5 w-5 text-[#03DAC6]" />
                      ) : (
                        <Moon className="mr-3 h-5 w-5 text-[#03DAC6]" />
                      )}
                      <div>
                        <p className="font-medium text-white">
                          {theme === "dark" ? "Light Mode" : "Dark Mode"}
                        </p>
                        <p className="text-xs text-[#BBBBBB]">
                          Change app appearance
                        </p>
                      </div>
                    </div>
                    <div
                      className={`w-10 h-6 rounded-full ${theme === "dark" ? "bg-[#333333]" : "bg-[#03DAC6]/30"} flex items-center ${theme === "dark" ? "justify-start" : "justify-end"} p-0.5`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full ${theme === "dark" ? "bg-[#666666]" : "bg-[#03DAC6]"}`}
                      ></div>
                    </div>
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    className="w-full flex items-center p-3 bg-[#2A2A2A] rounded-xl shadow-md hover:bg-[#333333] transition-colors"
                    onClick={() => setShowComplaintDialog(true)}
                  >
                    <AlertCircle className="mr-3 h-5 w-5 text-[#03DAC6]" />
                    <div>
                      <p className="font-medium text-white">Submit Feedback</p>
                      <p className="text-xs text-[#BBBBBB]">
                        Help us improve the app
                      </p>
                    </div>
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    className="w-full flex items-center p-3 bg-[#2A2A2A] rounded-xl shadow-md hover:bg-[#333333] transition-colors"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-3 h-5 w-5 text-[#CF6679]" />
                    <div>
                      <p className="font-medium text-[#CF6679]">Logout</p>
                      <p className="text-xs text-[#BBBBBB]">
                        Sign out of your account
                      </p>
                    </div>
                  </motion.button>
                </div>
              </div>
            )}
          </div>

          {/* Enhanced Bottom navigation bar with animations and indicators */}
          <div className="mt-auto bg-gradient-to-b from-gray-800/0 via-gray-900/80 to-gray-900 backdrop-blur-md py-3 shadow-lg z-10 fixed bottom-0 left-0 right-0 border-t border-gray-800/30">
            <div className="flex justify-around items-center px-1">
              <motion.button
                whileTap={{ scale: 0.9 }}
                initial={false}
                animate={activeTab === "home" ? 
                  { y: -5, transition: { type: "spring", stiffness: 500 } } : 
                  { y: 0 }
                }
                className={`flex flex-col items-center py-1.5 px-3 rounded-xl relative ${
                  activeTab === "home"
                    ? "text-pink-400"
                    : "text-gray-400"
                }`}
                onClick={() => setActiveTab("home")}
              >
                {activeTab === "home" && (
                  <motion.div
                    className="absolute -top-1 w-1 h-1 bg-pink-400 rounded-full"
                    layoutId="navIndicator"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <HomeIcon className="h-5 w-5" />
                <span className="text-[10px] mt-1 font-medium">Home</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.9 }}
                initial={false}
                animate={activeTab === "search" ? 
                  { y: -5, transition: { type: "spring", stiffness: 500 } } : 
                  { y: 0 }
                }
                className={`flex flex-col items-center py-1.5 px-3 rounded-xl relative ${
                  activeTab === "search"
                    ? "text-pink-400"
                    : "text-gray-400"
                }`}
                onClick={() => setActiveTab("search")}
              >
                {activeTab === "search" && (
                  <motion.div
                    className="absolute -top-1 w-1 h-1 bg-pink-400 rounded-full"
                    layoutId="navIndicator"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <Search className="h-5 w-5" />
                <span className="text-[10px] mt-1 font-medium">Explore</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.1 }}
                className="flex flex-col items-center py-1.5 px-3 relative"
                onClick={handleCreateClick}
              >
                <div className="absolute -top-7 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 p-3.5 shadow-lg border-2 border-gray-900">
                  <Plus className="h-5 w-5 text-white" />
                </div>
                <span className="text-[10px] mt-7 font-medium text-gray-400">
                  Create
                </span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.9 }}
                className="flex flex-col items-center py-1.5 px-3 rounded-xl text-gray-400 relative"
                onClick={() => setLocation("/conversations")}
              >
                <div className="relative">
                  <MessageSquare className="h-5 w-5" />
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-pink-500 rounded-full" />
                </div>
                <span className="text-[10px] mt-1 font-medium">Messages</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.9 }}
                initial={false}
                animate={activeTab === "profile" ? 
                  { y: -5, transition: { type: "spring", stiffness: 500 } } : 
                  { y: 0 }
                }
                className={`flex flex-col items-center py-1.5 px-3 rounded-xl relative ${
                  activeTab === "profile"
                    ? "text-pink-400"
                    : "text-gray-400"
                }`}
                onClick={() => setActiveTab("profile")}
              >
                {activeTab === "profile" && (
                  <motion.div
                    className="absolute -top-1 w-1 h-1 bg-pink-400 rounded-full"
                    layoutId="navIndicator"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <UserIcon className="h-5 w-5" />
                <span className="text-[10px] mt-1 font-medium">Profile</span>
              </motion.button>
            </div>
          </div>
        </div>
      ) : (
        // Desktop UI (unchanged)
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

            <div className="mb-4">
              <Link href="/search">
                <Button className="w-full bg-gradient-to-br from-purple-400/90 to-pink-500/90 hover:from-purple-400 hover:to-pink-500 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group">
                  <MessageSquare className="h-5 w-5 mr-2" />
                  Chat
                </Button>
              </Link>
            </div>

            <div className="mb-4">
              <Link href="/user-messages/search">
                <Button className="w-full bg-gradient-to-br from-blue-400/90 to-indigo-500/90 hover:from-blue-400 hover:to-indigo-500 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group">
                  <Users className="h-5 w-5 mr-2" />
                  Messages
                </Button>
              </Link>
            </div>

            <AnimatePresence>
              {sortedCharacters?.map((character) => (
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

          {/* Main Content Area - Enhanced with two columns and extra features */}
          <div className="flex-1 p-8">
            <div className="flex flex-row max-w-6xl mx-auto gap-8">
              {/* Left Column - Enhanced Main Content */}
              <div className="flex-1">
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-left"
                >
                  <h1 className="text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-yellow-500 to-amber-600">
                    Immerse in Anime & Manga
                  </h1>
                  <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
                    Chat with your favorite characters and bring your anime world to
                    life
                  </p>
                  
                  {/* Quick Start Guide */}
                  <motion.div 
                    className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 p-6 rounded-xl mb-6 shadow-sm border border-amber-100 dark:border-amber-800/30"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <h2 className="text-xl font-bold mb-3 text-amber-700 dark:text-amber-400 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                      </svg>
                      Quick Start Guide
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <div className="flex flex-col items-center text-center p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                        <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-3">
                          <span className="text-amber-600 dark:text-amber-400 text-xl font-bold">1</span>
                        </div>
                        <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-1">Choose a Character</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Select from our collection of anime characters</p>
                      </div>
                      
                      <div className="flex flex-col items-center text-center p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                        <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-3">
                          <span className="text-amber-600 dark:text-amber-400 text-xl font-bold">2</span>
                        </div>
                        <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-1">Start Chatting</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Engage in AI-powered conversations</p>
                      </div>
                      
                      <div className="flex flex-col items-center text-center p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                        <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-3">
                          <span className="text-amber-600 dark:text-amber-400 text-xl font-bold">3</span>
                        </div>
                        <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-1">Create Your Own</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Build custom anime characters</p>
                      </div>
                    </div>
                    
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                      className="mt-5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-medium py-2 px-5 rounded-full shadow-md w-full md:w-auto flex items-center justify-center"
                      onClick={() => window.scrollTo({ top: document.getElementById('characters-list')?.offsetTop, behavior: 'smooth' })}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
                      </svg>
                      Browse Characters
                    </motion.button>
                  </motion.div>
                  
                  {/* Popular Tags Cloud */}
                  <motion.div 
                    className="mb-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <h2 className="text-xl font-bold mb-3 text-gray-800 dark:text-gray-200 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                      </svg>
                      Popular Tags
                    </h2>
                    
                    <div className="flex flex-wrap gap-2">
                      {['Action', 'Romance', 'Fantasy', 'Adventure', 'Isekai', 'Shonen', 'Magic', 'Ninja', 'School', 'Mecha'].map((tag) => (
                        <motion.span 
                          key={tag}
                          whileHover={{ scale: 1.05, backgroundColor: '#fdba74' }}
                          whileTap={{ scale: 0.98 }}
                          className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded-full text-sm font-medium cursor-pointer"
                        >
                          {tag}
                        </motion.span>
                      ))}
                    </div>
                  </motion.div>
                </motion.div>
              </div>
              
              {/* Right Column - Featured Content with enhancements */}
              <div className="w-96">
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <div className="sticky top-24">
                    <div className="mb-4 flex justify-between items-center">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.8-2.034c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        Featured
                      </h2>
                      <a href="#" className="text-sm text-amber-600 dark:text-amber-400 hover:underline">All features</a>
                    </div>
                  
                    <FeaturedSection className="mb-6 rounded-xl overflow-hidden shadow-lg" />
                    
                    {/* Subscription Promo Card */}
                    <motion.div 
                      className="mt-6 bg-gradient-to-br from-purple-500 to-pink-500 p-5 rounded-xl text-white shadow-xl overflow-hidden relative"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      whileHover={{ y: -5, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}
                    >
                      <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 blur-2xl"></div>
                      <h3 className="font-bold text-xl mb-2">Upgrade to Premium</h3>
                      <p className="text-purple-100 text-sm mb-4">Unlock unlimited characters, conversations, and exclusive features!</p>
                      
                      <ul className="space-y-2 mb-5 text-sm">
                        <li className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-purple-200" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Create up to 45 custom characters
                        </li>
                        <li className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-purple-200" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Access to private conversations
                        </li>
                        <li className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-purple-200" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          No ads or limitations
                        </li>
                      </ul>
                      
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="w-full py-2 bg-white text-purple-600 font-medium rounded-lg flex items-center justify-center shadow-md"
                        onClick={() => setShowSubscription(true)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                        </svg>
                        Get Premium Now
                      </motion.button>
                    </motion.div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      )}

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent
          className={`${isMobile ? "max-w-[95%] rounded-xl bg-gray-900 border-gray-800 text-white" : "sm:max-w-[425px] bg-white dark:bg-slate-900 border-2 border-yellow-500/20 dark:border-amber-500/20 rounded-3xl"}`}
        >
          <DialogHeader>
            <DialogTitle
              className={
                isMobile
                  ? "text-xl font-bold text-red-400"
                  : "text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-500 to-amber-600"
              }
            >
              Create New Character
            </DialogTitle>
            {!user?.isPremium && (
              <DialogDescription
                className={isMobile ? "text-gray-400" : "text-amber-600"}
              >
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
              className={
                isMobile
                  ? "bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                  : "border-yellow-200 dark:border-amber-800 focus:border-yellow-500 dark:focus:border-amber-500"
              }
            />
            <Input
              placeholder="Avatar URL"
              value={newCharacter.avatar}
              onChange={(e) =>
                setNewCharacter({ ...newCharacter, avatar: e.target.value })
              }
              className={
                isMobile
                  ? "bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                  : "border-yellow-200 dark:border-amber-800 focus:border-yellow-500 dark:focus:border-amber-500"
              }
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
              className={
                isMobile
                  ? "bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 min-h-[100px]"
                  : "border-yellow-200 dark:border-amber-800 focus:border-yellow-500 dark:focus:border-amber-500 min-h-[100px]"
              }
            />
            <Textarea
              placeholder="Character Persona"
              value={newCharacter.persona}
              onChange={(e) =>
                setNewCharacter({ ...newCharacter, persona: e.target.value })
              }
              className={
                isMobile
                  ? "bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 min-h-[100px]"
                  : "border-yellow-200 dark:border-amber-800 focus:border-yellow-500 dark:focus:border-amber-500 min-h-[100px]"
              }
            />
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="pt-2"
            >
              <Button
                className={
                  isMobile
                    ? "w-full bg-red-500 hover:bg-red-600 text-white"
                    : "w-full bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white shadow-lg"
                }
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
        <DialogContent
          className={
            isMobile
              ? "rounded-xl bg-gray-900 border-gray-800 text-white"
              : "rounded-3xl"
          }
        >
          <DialogHeader>
            <DialogTitle className={isMobile ? "text-white" : ""}>
              Delete Character
            </DialogTitle>
            <DialogDescription className={isMobile ? "text-gray-400" : ""}>
              Are you sure you want to delete this character? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 mt-4">
            <Button
              variant={isMobile ? "ghost" : "outline"}
              onClick={() => {
                setShowDeleteConfirm(false);
                setCharacterToDelete(null);
              }}
              className={isMobile ? "text-gray-300" : ""}
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
        isMobile={isMobile}
      />

      {/* Complaint Dialog */}
      <Dialog open={showComplaintDialog} onOpenChange={setShowComplaintDialog}>
        <DialogContent
          className={`${isMobile ? "max-w-[95%] rounded-xl bg-gray-900 border-gray-800 text-white" : "sm:max-w-[425px]"}`}
        >
          <DialogHeader>
            <DialogTitle
              className={
                isMobile
                  ? "text-xl font-bold text-red-400"
                  : "text-2xl font-bold"
              }
            >
              Submit Complaint
            </DialogTitle>
            <DialogDescription className={isMobile ? "text-gray-400" : ""}>
              Tell us what went wrong. We'll look into it right away.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Textarea
              placeholder="Describe your issue in detail..."
              value={complaint}
              onChange={(e) => setComplaint(e.target.value)}
              className={
                isMobile
                  ? "bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 min-h-[120px]"
                  : "min-h-[120px]"
              }
            />

            <div className="grid w-full max-w-sm items-center gap-1.5">
              <label
                className={`text-sm font-medium ${isMobile ? "text-gray-300" : ""}`}
              >
                Attach screenshot (optional)
              </label>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setSelectedImage(file);
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      setImagePreview(event.target?.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
              <Button
                type="button"
                variant={isMobile ? "outline" : "secondary"}
                className={
                  isMobile
                    ? "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white"
                    : ""
                }
                onClick={() => fileInputRef.current?.click()}
              >
                Select Image
              </Button>

              {imagePreview && (
                <div className="mt-2 relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-auto max-h-[150px] object-contain rounded border border-gray-300 dark:border-gray-700"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6 rounded-full"
                    onClick={() => {
                      setSelectedImage(null);
                      setImagePreview(null);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowComplaintDialog(false);
                setComplaint("");
                setSelectedImage(null);
                setImagePreview(null);
              }}
              className={
                isMobile
                  ? "text-gray-400 hover:text-white hover:bg-gray-800"
                  : ""
              }
            >
              Cancel
            </Button>
            <Button
              type="button"
              className={
                isMobile ? "bg-red-500 hover:bg-red-600 text-white" : ""
              }
              onClick={() => {
                // Submit the complaint
                const formData = new FormData();
                formData.append("content", complaint);
                if (selectedImage) {
                  formData.append("image", selectedImage);
                }

                fetch("/api/complaints", {
                  method: "POST",
                  body: formData,
                })
                  .then((response) => {
                    if (!response.ok) {
                      throw new Error("Failed to submit complaint");
                    }
                    return response.json();
                  })
                  .then(() => {
                    toast({
                      title: "Complaint submitted",
                      description:
                        "We've received your complaint and will review it shortly.",
                    });
                    setShowComplaintDialog(false);
                    setComplaint("");
                    setSelectedImage(null);
                    setImagePreview(null);
                  })
                  .catch((error) => {
                    toast({
                      variant: "destructive",
                      title: "Error",
                      description:
                        error.message || "Failed to submit complaint",
                    });
                  });
              }}
            >
              Submit
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
