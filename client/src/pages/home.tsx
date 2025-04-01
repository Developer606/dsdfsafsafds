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

                {/* Featured Section for Mobile UI */}
                <div className="px-4 pt-5">
                  <FeaturedSection className="mb-6 rounded-xl overflow-hidden" />
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

          {/* Bottom navigation bar - Modern Design */}
          <div className="mt-auto bg-white dark:bg-gray-800 py-2 shadow-lg z-10 border-t border-gray-100 dark:border-gray-700">
            <div className="flex justify-around items-center px-1">
              <motion.button
                whileTap={{ scale: 0.9 }}
                className={`flex flex-col items-center py-2 px-3 rounded-xl ${
                  activeTab === "home"
                    ? "text-pink-500 dark:text-pink-400"
                    : "text-gray-400 dark:text-gray-500"
                }`}
                onClick={() => setActiveTab("home")}
              >
                <HomeIcon className="h-6 w-6" />
                <span className="text-xs mt-1 font-medium">Home</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.9 }}
                className={`flex flex-col items-center py-2 px-3 rounded-xl ${
                  activeTab === "search"
                    ? "text-pink-500 dark:text-pink-400"
                    : "text-gray-400 dark:text-gray-500"
                }`}
                onClick={() => setActiveTab("search")}
              >
                <Search className="h-6 w-6" />
                <span className="text-xs mt-1 font-medium">Explore</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.9 }}
                className="flex flex-col items-center py-2 px-3 relative text-white"
                onClick={handleCreateClick}
              >
                <div className="absolute -top-6 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 p-3.5 shadow-lg">
                  <Plus className="h-6 w-6" />
                </div>
                <span className="text-xs mt-7 font-medium text-gray-400 dark:text-gray-500">
                  Create
                </span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.9 }}
                className="flex flex-col items-center py-2 px-3 rounded-xl text-gray-400 dark:text-gray-500"
                onClick={() => setLocation("/conversations")}
              >
                <MessageSquare className="h-6 w-6" />
                <span className="text-xs mt-1 font-medium">Messages</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.9 }}
                className={`flex flex-col items-center py-2 px-3 rounded-xl ${
                  activeTab === "profile"
                    ? "text-pink-500 dark:text-pink-400"
                    : "text-gray-400 dark:text-gray-500"
                }`}
                onClick={() => setActiveTab("profile")}
              >
                <UserIcon className="h-6 w-6" />
                <span className="text-xs mt-1 font-medium">Profile</span>
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

          {/* Main Content Area - Enhanced with multiple sections */}
          <div className="flex-1 p-8">
            <div className="flex flex-row max-w-6xl mx-auto gap-8">
              {/* Left Column - Main Content */}
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
                    className="bg-white dark:bg-gray-800 rounded-xl p-6 mb-8 shadow-md border border-amber-100 dark:border-amber-900/40"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <div className="flex items-center mb-4">
                      <div className="bg-amber-100 dark:bg-amber-900/30 p-3 rounded-full mr-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <h2 className="text-xl font-bold">Quick Start Guide</h2>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-start">
                        <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-full w-6 h-6 flex items-center justify-center font-bold mr-3 mt-0.5 flex-shrink-0">1</div>
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-gray-100">Choose a Character</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Browse our collection of anime characters and select one that interests you.</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start">
                        <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-full w-6 h-6 flex items-center justify-center font-bold mr-3 mt-0.5 flex-shrink-0">2</div>
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-gray-100">Start a Conversation</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Click on "Start Chat" to begin talking with your chosen character in their unique personality.</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start">
                        <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-full w-6 h-6 flex items-center justify-center font-bold mr-3 mt-0.5 flex-shrink-0">3</div>
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-gray-100">Create Your Own Character</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Want a custom experience? Create your own anime character with a personalized backstory.</p>
                        </div>
                      </div>
                    </div>
                    
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                      className="mt-6 py-2 px-4 bg-gradient-to-r from-yellow-500 to-amber-600 text-white rounded-lg shadow font-medium flex items-center justify-center w-full md:w-auto"
                      onClick={() => setLocation("/tutorial")}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Watch Tutorial
                    </motion.button>
                  </motion.div>
                  
                  {/* Trending Characters */}
                  <motion.div 
                    className="mb-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">Trending Characters</h2>
                      <Link href="/characters" className="text-sm text-amber-600 dark:text-amber-400 hover:underline flex items-center">
                        View all
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {sortedCharacters.slice(0, 3).map((character) => (
                        <motion.div
                          key={character.id}
                          whileHover={{ y: -5, transition: { duration: 0.2 } }}
                          className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-md border border-gray-100 dark:border-gray-700 cursor-pointer hover:shadow-lg transition-shadow"
                          onClick={() => setLocation(`/chat/${character.id}`)}
                        >
                          <div className="relative h-32">
                            <img
                              src={character.avatar}
                              alt={character.name}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                            <div className="absolute bottom-2 left-3 text-white">
                              <h3 className="font-bold">{character.name}</h3>
                            </div>
                            {character.isNew && (
                              <div className="absolute top-2 right-2 bg-amber-500 text-white text-xs px-2 py-1 rounded-md font-medium">
                                NEW
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                  
                  {/* Usage Stats */}
                  <motion.div 
                    className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-amber-100 dark:border-amber-900/40"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <div className="flex items-center mb-4">
                      <div className="bg-amber-100 dark:bg-amber-900/30 p-3 rounded-full mr-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <h2 className="text-xl font-bold">Your Activity</h2>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Messages</h3>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{user?.messageCount || 0}</p>
                        <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                          3% from last week
                        </div>
                      </div>
                      
                      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Characters Created</h3>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{user?.trialCharactersCreated || 0}</p>
                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          {user?.isPremium ? "Premium user" : `${3 - (user?.trialCharactersCreated || 0)} remaining in trial`}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              </div>
              
              {/* Right Column - Featured Content and Quick Actions */}
              <div className="w-96 space-y-8">
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <FeaturedSection className="mb-6 rounded-xl overflow-hidden" />
                </motion.div>
                
                {/* Quick Actions */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-amber-100 dark:border-amber-900/40"
                >
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
                  
                  <div className="space-y-3">
                    <motion.button
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center w-full p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                      onClick={handleCreateClick}
                    >
                      <div className="bg-amber-100 dark:bg-amber-800 p-2 rounded-lg mr-3">
                        <Plus className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-medium text-gray-900 dark:text-gray-100">Create Character</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Design your own anime personality</p>
                      </div>
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center w-full p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                      onClick={() => setLocation("/conversations")}
                    >
                      <div className="bg-amber-100 dark:bg-amber-800 p-2 rounded-lg mr-3">
                        <MessageSquare className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-medium text-gray-900 dark:text-gray-100">Recent Chats</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Continue your conversations</p>
                      </div>
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center w-full p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                      onClick={() => setShowSubscription(true)}
                    >
                      <div className="bg-amber-100 dark:bg-amber-800 p-2 rounded-lg mr-3">
                        <CreditCard className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-medium text-gray-900 dark:text-gray-100">Premium Features</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{user?.isPremium ? "Manage subscription" : "Upgrade your experience"}</p>
                      </div>
                    </motion.button>
                  </div>
                </motion.div>
                
                {/* Community Activity */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-amber-100 dark:border-amber-900/40"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Community</h2>
                    <span className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs px-2 py-1 rounded-full">
                      {Math.floor(Math.random() * 100) + 50} online
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                      <div className="relative mr-3">
                        <img src="https://i.pravatar.cc/100?img=1" alt="User avatar" className="w-10 h-10 rounded-full" />
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></span>
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-gray-100">New Naruto character</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">SakuraSage23 created a new character</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                      <div className="relative mr-3">
                        <img src="https://i.pravatar.cc/100?img=2" alt="User avatar" className="w-10 h-10 rounded-full" />
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></span>
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-gray-100">Join anime community</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Discuss favorite characters</p>
                      </div>
                    </div>
                  </div>
                  
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    className="mt-4 py-2 px-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium flex items-center justify-center w-full"
                    onClick={() => setLocation("/community")}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Join Community
                  </motion.button>
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
