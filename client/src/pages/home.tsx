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
  Edit2,
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
import { type CustomCharacter, type User, type Notification } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useTheme } from "@/lib/theme-context";
import { useIsMobile } from "@/hooks/use-mobile";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
        description: "Failed to mark notification as read"
      });
    }
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
  const [activeTab, setActiveTab] = useState<'home' | 'search' | 'create' | 'library' | 'profile'>('home');
  const [searchQuery, setSearchQuery] = useState("");
  
  // Complaint dialog states
  const [showComplaintDialog, setShowComplaintDialog] = useState(false);
  const [complaint, setComplaint] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Profile dialog states
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [profileForm, setProfileForm] = useState({
    fullName: user?.fullName || "",
    age: user?.age || "",
    gender: user?.gender || "",
    bio: user?.bio || ""
  });

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

      {!isMobile && <NotificationHeader />}

      {isMobile ? (
        // Mobile UI design inspired by WakuWaku Android app
        <div className="flex flex-col h-screen bg-black text-white">
          {/* Mobile header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <div className="flex items-center">
              <Search className="h-5 w-5 mr-2" />
            </div>
            <div className="flex items-center justify-center">
              <h1 className="text-lg font-semibold text-red-400">
                <span className="font-bold">Anime</span>Chat
              </h1>
            </div>
            <div className="flex items-center space-x-2">
              {/* Notification bell */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full h-8 w-8 text-gray-300 relative"
                  >
                    <Bell className="h-5 w-5" />
                    {notifications && notifications.filter(n => !n.read).length > 0 && (
                      <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                        {notifications.filter(n => !n.read).length}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-0 bg-gray-900 border-gray-700 text-white">
                  <div className="p-3 border-b border-gray-700">
                    <h3 className="font-semibold text-red-400">
                      Notifications
                    </h3>
                  </div>
                  <AnimatePresence>
                    {notifications && notifications.length > 0 ? (
                      <div className="max-h-[300px] overflow-y-auto">
                        {notifications.map((notification) => (
                          <motion.div
                            key={notification.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className={cn(
                              "p-3 border-b border-gray-700 hover:bg-gray-800 cursor-pointer transition-colors",
                              !notification.read && "bg-gray-800"
                            )}
                            onClick={() => markAsReadMutation.mutate(Number(notification.id))}
                          >
                            <h4 className="font-medium text-sm text-gray-200">
                              {notification.title}
                            </h4>
                            <p className="text-sm text-gray-400 mt-1">
                              {notification.message}
                            </p>
                            <span className="text-xs text-gray-500 mt-2 block">
                              {new Date(notification.createdAt).toLocaleDateString()}
                            </span>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 text-center text-gray-400">
                        No notifications
                      </div>
                    )}
                  </AnimatePresence>
                </PopoverContent>
              </Popover>
              
              {/* Subscription button */}
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full h-8 w-8 text-gray-300"
                onClick={() => setShowSubscription(true)}
              >
                <CreditCard className="h-5 w-5" />
              </Button>
              
              {/* User menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full h-8 w-8"
                  >
                    <UserIcon className="h-5 w-5 text-gray-300" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-gray-900 border-gray-700 text-gray-200">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-gray-700" />
                  <DropdownMenuItem disabled className="text-gray-400">
                    Email: {user?.email}
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled className="text-gray-400">
                    Username: {user?.username}
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled className="text-gray-400">
                    Status: {user?.subscriptionStatus}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-gray-700" />
                  <DropdownMenuItem
                    onClick={toggleTheme}
                    className="flex items-center"
                  >
                    {theme === 'dark' ? 
                      <Sun className="mr-2 h-4 w-4" /> : 
                      <Moon className="mr-2 h-4 w-4" />
                    }
                    {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                  </DropdownMenuItem>
                  {/* Complaint button */}
                  <DropdownMenuItem 
                    className="flex items-center"
                    onClick={() => setShowComplaintDialog(true)}
                  >
                    <AlertCircle className="mr-2 h-4 w-4" />
                    Submit Complaint
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-gray-700" />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-red-400"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Main content area based on active tab */}
          <div className="flex-1 overflow-y-auto">
            {/* Home Tab Content */}
            {activeTab === 'home' && (
              <div className="pb-20">
                {/* Featured character section */}
                <div className="px-4 pt-4">
                  <div className="relative rounded-lg overflow-hidden">
                    {characters && characters.length > 0 && (
                      <div className="relative">
                        <div className="aspect-[3/4] rounded-xl overflow-hidden relative">
                          <img 
                            src={characters[0].avatar} 
                            alt={characters[0].name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent"></div>
                        </div>
                        <div className="absolute bottom-0 left-0 p-4 w-full">
                          <div className="text-xs text-gray-300">Up on your watchlist!</div>
                          <h2 className="text-xl font-bold text-white">{characters[0].name}</h2>
                          <div className="flex items-center mt-1">
                            <span className="text-xs text-gray-400">2023</span>
                            <span className="mx-2 text-gray-500">•</span>
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((star, i) => (
                                <span key={i} className="text-yellow-500 text-xs">
                                  {i < 3 ? "★" : "☆"}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Top Rated section */}
                <div className="px-4 pt-5">
                  <h2 className="text-lg font-bold mb-3">Top Rated</h2>
                  <div className="flex overflow-x-auto pb-4 space-x-3 hide-scrollbar">
                    {characters?.slice(0, 5).map((character) => (
                      <Link key={character.id} href={`/chat/${character.id}`}>
                        <div className="w-24 shrink-0">
                          <div className="aspect-[3/4] rounded-lg overflow-hidden bg-gray-800 mb-1 relative">
                            <img
                              src={character.avatar}
                              alt={character.name}
                              className="w-full h-full object-cover"
                            />
                            {character.id.startsWith("custom_") && (
                              <button
                                className="absolute top-1 right-1 p-1 bg-red-500/90 text-white rounded-full z-10"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleDeleteCharacter(character.id);
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                          <h3 className="text-xs font-medium text-gray-300 line-clamp-1">
                            {character.name}
                          </h3>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
                
                {/* Recently Added Section */}
                <div className="px-4 pt-5">
                  <h2 className="text-lg font-bold mb-3">Recently Added</h2>
                  <div className="grid grid-cols-2 gap-3">
                    {characters?.slice(5, 9).map((character) => (
                      <Link key={character.id} href={`/chat/${character.id}`}>
                        <div className="relative">
                          <div className="aspect-[3/4] rounded-lg overflow-hidden bg-gray-800 mb-1 relative">
                            <img
                              src={character.avatar}
                              alt={character.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <h3 className="text-xs font-medium text-gray-300 line-clamp-1">
                            {character.name}
                          </h3>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Search Tab Content */}
            {activeTab === 'search' && (
              <div className="p-4 pb-20">
                <div className="relative mb-5">
                  <Input
                    type="text"
                    placeholder="Search characters..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white pr-10 rounded-full"
                  />
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                </div>
                
                <div className="grid grid-cols-2 gap-3 mt-4">
                  {characters
                    ?.filter(char => 
                      searchQuery === "" || 
                      char.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      char.description.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((character) => (
                      <Link key={character.id} href={`/chat/${character.id}`}>
                        <div className="relative">
                          <div className="aspect-[3/4] rounded-lg overflow-hidden bg-gray-800 mb-1 relative">
                            <img
                              src={character.avatar}
                              alt={character.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <h3 className="text-xs font-medium text-gray-300 line-clamp-1">
                            {character.name}
                          </h3>
                        </div>
                      </Link>
                    ))
                  }
                </div>
                
                {searchQuery !== "" && 
                 characters?.filter(char => 
                   char.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                   char.description.toLowerCase().includes(searchQuery.toLowerCase())
                 ).length === 0 && (
                  <div className="text-center mt-10 text-gray-400">
                    <Search className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p>No characters found matching "{searchQuery}"</p>
                  </div>
                )}
              </div>
            )}
            
            {/* Create Tab Content - handled by the modal, but could have a content preview */}
            {activeTab === 'create' && (
              <div className="p-4 pb-20 text-center">
                <div className="mt-10 mb-5">
                  <div className="mx-auto w-20 h-20 flex items-center justify-center rounded-full bg-red-500/10 mb-4">
                    <Plus className="h-10 w-10 text-red-400" />
                  </div>
                  <h2 className="text-xl font-bold mb-2">Create a Character</h2>
                  <p className="text-gray-400 mb-6">Create your own custom character to chat with</p>
                  
                  {user && user.isPremium ? (
                    <div className="text-sm text-gray-300 mb-4">
                      You can create unlimited characters with your premium subscription!
                    </div>
                  ) : (
                    <div className="text-sm text-gray-300 mb-4">
                      Free trial: {user?.trialCharactersCreated || 0}/3 characters created
                    </div>
                  )}
                  
                  <Button
                    onClick={handleCreateClick}
                    className="bg-red-500 hover:bg-red-600 text-white rounded-full px-8"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Create New Character
                  </Button>
                </div>
              </div>
            )}
            
            {/* Library Tab Content */}
            {activeTab === 'library' && (
              <div className="p-4 pb-20">
                <h2 className="text-lg font-bold mb-4">Your Character Library</h2>
                
                <div className="space-y-3">
                  {characters?.map((character) => (
                    <Link key={character.id} href={`/chat/${character.id}`}>
                      <div className="flex items-center bg-gray-800/60 p-3 rounded-lg border border-gray-700">
                        <img
                          src={character.avatar}
                          alt={character.name}
                          className="w-14 h-14 rounded-lg object-cover mr-3"
                        />
                        <div className="flex-1">
                          <h3 className="font-medium text-sm text-white">
                            {character.name}
                          </h3>
                          <p className="text-xs text-gray-400 line-clamp-1">
                            {character.description}
                          </p>
                        </div>
                        {character.id.startsWith("custom_") && (
                          <button
                            className="p-2 text-red-400 hover:text-red-500"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDeleteCharacter(character.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            
            {/* Profile Tab Content */}
            {activeTab === 'profile' && (
              <div className="p-4 pb-20">
                <div className="mb-5 text-center">
                  <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-3">
                    <UserIcon className="h-10 w-10 text-gray-400" />
                  </div>
                  <h2 className="text-xl font-bold">{user?.username}</h2>
                  <p className="text-gray-400">{user?.email}</p>
                </div>
                
                {/* Personal Information Section */}
                <div className="bg-gray-800/60 rounded-lg border border-gray-700 p-4 mb-5">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-bold">Personal Information</h3>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setProfileForm({
                          fullName: user?.fullName || "",
                          age: user?.age || "",
                          gender: user?.gender || "",
                          bio: user?.bio || ""
                        });
                        setShowProfileDialog(true);
                      }}
                      className="text-red-400 hover:bg-red-400/10 hover:text-red-300 p-1 h-8"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="border-b border-gray-700 pb-2">
                      <p className="text-xs text-gray-400">Full Name</p>
                      <p className="text-sm">{user?.fullName || "Not specified"}</p>
                    </div>
                    
                    <div className="border-b border-gray-700 pb-2">
                      <p className="text-xs text-gray-400">Age</p>
                      <p className="text-sm">{user?.age || "Not specified"}</p>
                    </div>
                    
                    <div className="border-b border-gray-700 pb-2">
                      <p className="text-xs text-gray-400">Gender</p>
                      <p className="text-sm">{user?.gender || "Not specified"}</p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-400">Bio</p>
                      <p className="text-sm">{user?.bio || "Not specified"}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-800/60 rounded-lg border border-gray-700 p-4 mb-5">
                  <h3 className="text-lg font-bold mb-3">Subscription Status</h3>
                  <div className={`p-3 rounded-lg mb-3 ${user?.isPremium ? 'bg-red-500/20 border border-red-500/30' : 'bg-gray-700'}`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{user?.subscriptionTier || 'Free'}</p>
                        <p className="text-sm text-gray-400">{user?.subscriptionStatus}</p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowSubscription(true)}
                        className="border-red-400 text-red-400 hover:bg-red-400/10 hover:text-red-300"
                      >
                        {user?.isPremium ? 'Manage' : 'Upgrade'}
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
                    onClick={toggleTheme}
                  >
                    {theme === 'dark' ? 
                      <Sun className="mr-2 h-4 w-4" /> : 
                      <Moon className="mr-2 h-4 w-4" />
                    }
                    {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full justify-start border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
                    onClick={() => setShowComplaintDialog(true)}
                  >
                    <AlertCircle className="mr-2 h-4 w-4" />
                    Submit Complaint
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full justify-start border-gray-700 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Bottom navigation bar */}
          <div className="mt-auto border-t border-gray-800 py-2 bg-black">
            <div className="flex justify-around items-center">
              <button
                className={`flex flex-col items-center p-2 ${
                  activeTab === 'home' ? "text-red-400" : "text-gray-400"
                }`}
                onClick={() => setActiveTab('home')}
              >
                <HomeIcon className="h-5 w-5" />
                <span className="text-xs mt-1">Home</span>
              </button>
              <button
                className={`flex flex-col items-center p-2 ${
                  activeTab === 'search' ? "text-red-400" : "text-gray-400"
                }`}
                onClick={() => setActiveTab('search')}
              >
                <Search className="h-5 w-5" />
                <span className="text-xs mt-1">Search</span>
              </button>
              <button
                className={`flex flex-col items-center p-2 ${
                  activeTab === 'create' ? "text-red-400" : "text-gray-400"
                }`}
                onClick={handleCreateClick}
              >
                <Plus className="h-5 w-5" />
                <span className="text-xs mt-1">Create</span>
              </button>
              <button
                className={`flex flex-col items-center p-2 ${
                  activeTab === 'library' ? "text-red-400" : "text-gray-400"
                }`}
                onClick={() => setActiveTab('library')}
              >
                <Library className="h-5 w-5" />
                <span className="text-xs mt-1">Library</span>
              </button>
              <button
                className={`flex flex-col items-center p-2 ${
                  activeTab === 'profile' ? "text-red-400" : "text-gray-400"
                }`}
                onClick={() => setActiveTab('profile')}
              >
                <UserIcon className="h-5 w-5" />
                <span className="text-xs mt-1">Profile</span>
              </button>
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
      )}

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className={`${isMobile ? 'max-w-[95%] rounded-xl bg-gray-900 border-gray-800 text-white' : 'sm:max-w-[425px] bg-white dark:bg-slate-900 border-2 border-yellow-500/20 dark:border-amber-500/20 rounded-3xl'}`}>
          <DialogHeader>
            <DialogTitle className={isMobile ? "text-xl font-bold text-red-400" : "text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-500 to-amber-600"}>
              Create New Character
            </DialogTitle>
            {!user?.isPremium && (
              <DialogDescription className={isMobile ? "text-gray-400" : "text-amber-600"}>
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
              className={isMobile ? "bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" : "border-yellow-200 dark:border-amber-800 focus:border-yellow-500 dark:focus:border-amber-500"}
            />
            <Input
              placeholder="Avatar URL"
              value={newCharacter.avatar}
              onChange={(e) =>
                setNewCharacter({ ...newCharacter, avatar: e.target.value })
              }
              className={isMobile ? "bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" : "border-yellow-200 dark:border-amber-800 focus:border-yellow-500 dark:focus:border-amber-500"}
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
              className={isMobile ? "bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 min-h-[100px]" : "border-yellow-200 dark:border-amber-800 focus:border-yellow-500 dark:focus:border-amber-500 min-h-[100px]"}
            />
            <Textarea
              placeholder="Character Persona"
              value={newCharacter.persona}
              onChange={(e) =>
                setNewCharacter({ ...newCharacter, persona: e.target.value })
              }
              className={isMobile ? "bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 min-h-[100px]" : "border-yellow-200 dark:border-amber-800 focus:border-yellow-500 dark:focus:border-amber-500 min-h-[100px]"}
            />
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="pt-2"
            >
              <Button
                className={isMobile ? "w-full bg-red-500 hover:bg-red-600 text-white" : "w-full bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white shadow-lg"}
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
        <DialogContent className={isMobile ? "rounded-xl bg-gray-900 border-gray-800 text-white" : "rounded-3xl"}>
          <DialogHeader>
            <DialogTitle className={isMobile ? "text-white" : ""}>Delete Character</DialogTitle>
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
        <DialogContent className={`${isMobile ? 'max-w-[95%] rounded-xl bg-gray-900 border-gray-800 text-white' : 'sm:max-w-[425px]'}`}>
          <DialogHeader>
            <DialogTitle className={isMobile ? "text-xl font-bold text-red-400" : "text-2xl font-bold"}>
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
              className={isMobile ? "bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 min-h-[120px]" : "min-h-[120px]"}
            />
            
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <label className={`text-sm font-medium ${isMobile ? "text-gray-300" : ""}`}>
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
                className={isMobile ? "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white" : ""}
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
              className={isMobile ? "text-gray-400 hover:text-white hover:bg-gray-800" : ""}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className={isMobile ? "bg-red-500 hover:bg-red-600 text-white" : ""}
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
                .then(response => {
                  if (!response.ok) {
                    throw new Error("Failed to submit complaint");
                  }
                  return response.json();
                })
                .then(() => {
                  toast({
                    title: "Complaint submitted",
                    description: "We've received your complaint and will review it shortly.",
                  });
                  setShowComplaintDialog(false);
                  setComplaint("");
                  setSelectedImage(null);
                  setImagePreview(null);
                })
                .catch(error => {
                  toast({
                    variant: "destructive",
                    title: "Error",
                    description: error.message || "Failed to submit complaint",
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
