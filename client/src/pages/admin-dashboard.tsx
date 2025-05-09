import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Ban,
  Lock,
  Trash2,
  UnlockIcon,
  UserPlus,
  Users,
  Crown,
  Loader2,
  MessageSquare,
  Palette,
  MessageCircle,
  AlertCircle,
  Settings,
  LogOut,
  Bell,
  ArrowLeft,
  Shield,
  Newspaper,
  ShoppingBag,
  Megaphone,
  Library,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { NotificationPopover } from "@/components/admin/notification-popover";
import CredentialManager from "@/components/admin/CredentialManager";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts";
import { type Complaint } from "@shared/schema";
import { Link } from "wouter";
import { User, type SubscriptionPlan, type Feedback } from "@shared/schema";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSubscriptionPlanSchema } from "@shared/schema";
import { useLocation } from "wouter";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { setupWebSocket } from "@/lib/websocket";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDown, X, Menu } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

// Define the type for flagged message stats
interface FlaggedMessageStats {
  total: number;
  unreviewed: number;
  byReason: Record<string, number>;
}

// Flagged Messages Counter Component
function FlaggedMessagesCounter() {
  const { data: flaggedStats = { total: 0, unreviewed: 0, byReason: {} } } =
    useQuery<FlaggedMessageStats>({
      queryKey: ["/api/admin/flagged-messages/stats"],
      staleTime: 5000, // Refresh every 5 seconds
    });

  if (!flaggedStats || flaggedStats.unreviewed === 0) {
    return null;
  }

  return (
    <Badge variant="destructive" className="ml-2 absolute -top-2 -right-2">
      {flaggedStats.unreviewed}
    </Badge>
  );
}

// Type definitions for stats and analytics data
interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  premiumUsers: number;
  totalCharacters: number;
}

interface ActivityData {
  hourlyActivity: Array<{
    hour: number;
    activeUsers: number;
  }>;
}

interface MessageVolumeData {
  daily: Array<{
    date: string;
    messages: number;
  }>;
}

interface CharacterPopularityData {
  characters: Array<{
    name: string;
    messageCount: number;
    userCount: number;
  }>;
}

interface NotificationData {
  id: string;
  type: string;
  title: string;
  message: string;
  username: string;
  userEmail: string;
  createdAt: string;
}

interface CountryDistributionData {
  locations: Array<{
    country: string;
    count: number;
  }>;
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [isPlanDialogOpen, setPlanDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [subscriptionFilter, setSubscriptionFilter] = useState<string[]>([]);
  const [locationFilter, setLocationFilter] = useState<string[]>([]);
  const [loginFilter, setLoginFilter] = useState<string>("all");
  const [characterFilter, setCharacterFilter] = useState<{
    min?: number;
    max?: number;
  }>({});
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);

  // Set admin flag in sessionStorage for file uploads
  useEffect(() => {
    // Mark user as admin in session storage
    sessionStorage.setItem("isAdmin", "true");
    console.log("Admin flag set in session storage for file uploads");

    // Clean up when component unmounts
    return () => {
      sessionStorage.removeItem("isAdmin");
      console.log("Admin flag removed from session storage");
    };
  }, []);

  // Add bulk action mutations
  const bulkDeleteUsers = useMutation({
    mutationFn: async (userIds: number[]) => {
      const res = await apiRequest("POST", "/api/admin/users/bulk-delete", {
        userIds,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "Selected users deleted successfully",
      });
      setSelectedUsers([]);
    },
  });

  const bulkUpdateUsers = useMutation({
    mutationFn: async ({
      userIds,
      action,
      value,
    }: {
      userIds: number[];
      action: string;
      value: boolean;
    }) => {
      const res = await apiRequest("POST", `/api/admin/users/bulk-${action}`, {
        userIds,
        value,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "Selected users updated successfully",
      });
      setSelectedUsers([]);
    },
  });

  const bulkUpdateSubscription = useMutation({
    mutationFn: async ({
      userIds,
      planId,
    }: {
      userIds: number[];
      planId: string;
    }) => {
      const res = await apiRequest(
        "POST",
        "/api/admin/users/bulk-subscription",
        { userIds, planId },
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "Subscription updated for selected users",
      });
      setSelectedUsers([]);
    },
  });

  // Add selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(filteredUsers.map((user) => user.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleSelectUser = (userId: number, checked: boolean) => {
    if (checked) {
      setSelectedUsers((prev) => [...prev, userId]);
    } else {
      setSelectedUsers((prev) => prev.filter((id) => id !== userId));
    }
  };

  // Setup WebSocket connection when component mounts
  useEffect(() => {
    const socket = setupWebSocket();
    return () => {
      if (socket && socket.readyState === 1) {
        // 1 is equivalent to WebSocket.OPEN
        socket.close();
      }
    };
  }, []);

  // Add 1-second interval refresh for stats and charts
  useEffect(() => {
    const intervalId = setInterval(() => {
      // Refresh critical stats every second
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/dashboard/stats"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/characters/stats"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] }); // For subscription and user status charts
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/analytics/activity"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/analytics/messages"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/analytics/characters/popularity"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/analytics/user-locations"],
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  // Stats queries with specific query keys for targeted updates
  const { data: stats = {} as DashboardStats, isLoading: statsLoading } =
    useQuery<DashboardStats>({
      queryKey: ["/api/admin/dashboard/stats"],
      staleTime: 0, // Allow immediate refreshes
    });

  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    staleTime: 0, // Allow immediate refreshes for real-time chart updates
  });

  // Define type for recent messages
  interface RecentMessage {
    id: number;
    username: string;
    characterName: string;
    content: string;
    timestamp: string;
  }

  const { data: recentMessages = [], isLoading: messagesLoading } = useQuery<
    RecentMessage[]
  >({
    queryKey: ["/api/admin/messages/recent"],
    staleTime: 0, // Allow immediate refreshes
  });

  const {
    data: characterStats = {} as DashboardStats,
    isLoading: charactersLoading,
  } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/characters/stats"],
    staleTime: 0, // Allow immediate refreshes
  });

  const { data: feedback = [], isLoading: feedbackLoading } = useQuery<
    Feedback[]
  >({
    queryKey: ["/api/admin/feedback"],
    staleTime: Infinity,
  });

  const { data: complaints = [], isLoading: complaintsLoading } = useQuery<
    Complaint[]
  >({
    queryKey: ["/api/admin/complaints"],
    staleTime: Infinity,
  });

  // Define type for flagged messages
  interface FlaggedMessage {
    id: number;
    senderId: number;
    receiverId: number;
    messageId: number;
    content: string;
    reason: string;
    timestamp: string;
    reviewed: boolean;
    senderUsername: string;
    receiverUsername: string;
  }

  // Query for flagged messages
  const { data: flaggedMessages = [], isLoading: flaggedMessagesLoading } =
    useQuery<FlaggedMessage[]>({
      queryKey: ["/api/admin/flagged-messages"],
      staleTime: 10000, // Refresh every 10 seconds
    });

  const {
    data: activityData = { hourlyActivity: [] },
    isLoading: activityLoading,
  } = useQuery<ActivityData>({
    queryKey: ["/api/admin/analytics/activity"],
    staleTime: 0, // Allow immediate refreshes
  });

  const {
    data: messageVolume = { daily: [] },
    isLoading: messageVolumeLoading,
  } = useQuery<MessageVolumeData>({
    queryKey: ["/api/admin/analytics/messages"],
    staleTime: 0, // Allow immediate refreshes
  });

  const {
    data: characterPopularity = { characters: [] },
    isLoading: characterPopularityLoading,
  } = useQuery<CharacterPopularityData>({
    queryKey: ["/api/admin/analytics/characters/popularity"],
    staleTime: 0, // Allow immediate refreshes
  });

  // Extend the existing SubscriptionPlan type with parsed features
  interface SubscriptionPlanWithFeatures {
    id: string;
    name: string;
    createdAt: Date;
    price: string;
    features: string; // Raw JSON string from database
    parsedFeatures?: string[]; // Optional parsed features for display
    updatedAt: Date;
  }

  const { data: plans = [], isLoading: plansLoading } = useQuery<
    SubscriptionPlanWithFeatures[]
  >({
    queryKey: ["/api/admin/plans"],
    staleTime: Infinity,
  });

  const { data: notifications = [], isLoading: notificationsLoading } =
    useQuery<NotificationData[]>({
      queryKey: ["/api/admin/notifications/all"],
      staleTime: Infinity,
    });

  const {
    data: countryDistribution = { locations: [] },
    isLoading: countryDistributionLoading,
  } = useQuery<CountryDistributionData>({
    queryKey: ["/api/admin/analytics/user-locations"],
    staleTime: 60000, // Refresh every minute as location data doesn't change frequently
  });

  const blockUser = useMutation({
    mutationFn: async ({
      userId,
      blocked,
    }: {
      userId: number;
      blocked: boolean;
    }) => {
      const res = await apiRequest("POST", `/api/admin/users/${userId}/block`, {
        blocked,
      });
      return res.json();
    },
    onSuccess: () => {
      // WebSocket will handle the updates
      toast({
        title: "Success",
        description: "User status updated successfully",
      });
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("DELETE", `/api/admin/users/${userId}`);
      return res.json();
    },
    onSuccess: () => {
      // WebSocket will handle the updates
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    },
  });

  const restrictUser = useMutation({
    mutationFn: async ({
      userId,
      restricted,
    }: {
      userId: number;
      restricted: boolean;
    }) => {
      const res = await apiRequest(
        "POST",
        `/api/admin/users/${userId}/restrict`,
        { restricted },
      );
      return res.json();
    },
    onSuccess: () => {
      // WebSocket will handle the updates
      toast({
        title: "Success",
        description: "User restrictions updated successfully",
      });
    },
  });

  const updateSubscription = useMutation({
    mutationFn: async ({
      userId,
      planId,
    }: {
      userId: number;
      planId: string;
    }) => {
      const res = await apiRequest(
        "POST",
        `/api/admin/users/${userId}/subscription`,
        { planId },
      );
      return res.json();
    },
    onSuccess: () => {
      // WebSocket will handle the updates
      toast({
        title: "Success",
        description: "User subscription updated successfully",
      });
    },
  });

  const createPlan = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/admin/plans", data);
      return res.json();
    },
    onSuccess: () => {
      // WebSocket will handle the updates
      queryClient.invalidateQueries({ queryKey: ["/api/admin/plans"] });
      setPlanDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Plan created successfully",
      });
    },
  });

  const updatePlan = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/admin/plans/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      // WebSocket will handle the updates
      queryClient.invalidateQueries({ queryKey: ["/api/admin/plans"] });
      setPlanDialogOpen(false);
      setEditingPlan(null);
      form.reset();
      toast({
        title: "Success",
        description: "Plan updated successfully",
      });
    },
  });

  const deletePlan = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/plans/${id}`);
      return res.json();
    },
    onSuccess: () => {
      // WebSocket will handle the updates
      queryClient.invalidateQueries({ queryKey: ["/api/admin/plans"] });
      toast({
        title: "Success",
        description: "Plan deleted successfully",
      });
    },
  });

  const deleteNotification = useMutation({
    mutationFn: async (notificationId: string) => {
      await apiRequest("DELETE", `/api/admin/notifications/${notificationId}`);
    },
    onSuccess: () => {
      // WebSocket will handle the updates
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/notifications/all"],
      });
      toast({
        title: "Success",
        description: "Notification deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete notification",
        variant: "destructive",
      });
    },
  });

  const form = useForm({
    resolver: zodResolver(insertSubscriptionPlanSchema),
    defaultValues: {
      id: "",
      name: "",
      price: "",
      features: "[]",
    },
  });

  const onPlanSubmit = (data: any) => {
    try {
      // Validate features as JSON array
      let features;
      try {
        features = JSON.parse(data.features);
        if (!Array.isArray(features)) {
          throw new Error("Features must be a valid JSON array");
        }
        // Validate each feature is a string
        if (!features.every((f: any) => typeof f === "string")) {
          throw new Error("Each feature must be a text string");
        }
      } catch (e: any) {
        toast({
          title: "Invalid Features Format",
          description:
            e.message ||
            "Please ensure features is a valid JSON array of strings",
          variant: "destructive",
        });
        return;
      }

      if (editingPlan) {
        updatePlan.mutate({
          id: editingPlan.id,
          data: {
            ...data,
            features: JSON.stringify(features),
          },
        });
      } else {
        createPlan.mutate({
          ...data,
          features: JSON.stringify(features),
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description:
          "Failed to save plan. Please check your input and try again.",
        variant: "destructive",
      });
    }
  };

  // Update subscription data calculation for real-time updates
  const subscriptionData = users
    ? [
        { name: "Free", value: users.filter((u) => !u.isPremium).length },
        { name: "Premium", value: users.filter((u) => u.isPremium).length },
      ]
    : [];

  // Update user status data calculation for real-time updates
  const userStatusData = users
    ? [
        {
          name: "Active",
          value: users.filter((u) => !u.isBlocked && !u.isRestricted).length,
        },
        { name: "Blocked", value: users.filter((u) => u.isBlocked).length },
        {
          name: "Restricted",
          value: users.filter((u) => u.isRestricted).length,
        },
      ]
    : [];

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

  const clearFilters = () => {
    setStatusFilter([]);
    setSubscriptionFilter([]);
    setLocationFilter([]);
    setLoginFilter("all");
    setCharacterFilter({});
  };

  const getUniqueLocations = () => {
    const locations = users?.map((user) => user.countryName || "Unknown") || [];
    return Array.from(new Set(locations));
  };

  const getUniqueSubscriptions = () => {
    const subs =
      users?.map(
        (user) =>
          user.subscriptionTier || (user.isPremium ? "Premium" : "Free"),
      ) || [];
    return Array.from(new Set(subs));
  };

  const filteredUsers =
    users?.filter((user) => {
      // Existing search filter
      const matchesSearch =
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase());

      // Status filter
      const matchesStatus =
        statusFilter.length === 0 ||
        statusFilter.some((status) => {
          if (status === "Active") return !user.isBlocked && !user.isRestricted;
          if (status === "Blocked") return user.isBlocked;
          if (status === "Restricted") return user.isRestricted;
          return false;
        });

      // Subscription filter
      const matchesSubscription =
        subscriptionFilter.length === 0 ||
        subscriptionFilter.includes(
          user.subscriptionTier || (user.isPremium ? "Premium" : "Free"),
        );

      // Location filter
      const matchesLocation =
        locationFilter.length === 0 ||
        locationFilter.includes(user.countryName || "Unknown");

      // Updated login filter logic
      const matchesLogin = (() => {
        if (loginFilter === "all") return true;

        // Handle "never logged in" case
        if (loginFilter === "never") {
          return !user.lastLoginAt;
        }

        // If user has never logged in and we're not checking for 'never', they don't match
        if (!user.lastLoginAt) return false;

        const lastLogin = new Date(user.lastLoginAt);
        const now = new Date();
        const daysDiff =
          (now.getTime() - lastLogin.getTime()) / (1000 * 3600 * 24);

        if (loginFilter === "week") return daysDiff <= 7;
        if (loginFilter === "month") return daysDiff <= 30;

        return true;
      })();

      // Characters filter
      const matchesCharacters = (() => {
        if (!characterFilter.min && !characterFilter.max) return true;
        const count = user.trialCharactersCreated;
        if (characterFilter.min && count < characterFilter.min) return false;
        if (characterFilter.max && count > characterFilter.max) return false;
        return true;
      })();

      return (
        matchesSearch &&
        matchesStatus &&
        matchesSubscription &&
        matchesLocation &&
        matchesLogin &&
        matchesCharacters
      );
    }) ?? [];

  if (
    statsLoading ||
    usersLoading ||
    messagesLoading ||
    charactersLoading ||
    feedbackLoading ||
    complaintsLoading ||
    activityLoading ||
    messageVolumeLoading ||
    characterPopularityLoading ||
    plansLoading ||
    notificationsLoading ||
    countryDistributionLoading
  ) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const handleLogout = async () => {
    try {
      const res = await apiRequest("POST", "/api/admin/logout");
      if (res.ok) {
        queryClient.setQueryData(["/api/user"], null);
        toast({
          title: "Success",
          description: "Logged out successfully",
        });
        setLocation("/admin/login");
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to logout",
      });
    }
  };

  return (
    <div className="container mx-auto p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
            Admin Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <CredentialManager />
          <NotificationPopover />

          {/* Hamburger Menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Admin Menu</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <Link href="/admin/dashboard" className="w-full">
                  <Button
                    variant="secondary"
                    className="w-full gap-2 justify-start"
                  >
                    <Crown className="h-4 w-4" />
                    Dashboard
                  </Button>
                </Link>
                <Link href="/admin/characters" className="w-full">
                  <Button
                    variant="secondary"
                    className="w-full gap-2 justify-start"
                  >
                    <Palette className="h-4 w-4" />
                    Manage Characters
                  </Button>
                </Link>
                <Link href="/admin/content-moderation" className="w-full">
                  <Button
                    variant="secondary"
                    className="w-full gap-2 justify-start relative"
                  >
                    <Shield className="h-4 w-4" />
                    Content Moderation
                    <FlaggedMessagesCounter />
                  </Button>
                </Link>
                <Link href="/admin/dashboard/complaints" className="w-full">
                  <Button
                    variant="secondary"
                    className="w-full gap-2 justify-start"
                  >
                    <AlertCircle className="h-4 w-4" />
                    View Complaints
                    {complaints?.length ? (
                      <span className="ml-1 px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded-full">
                        {complaints.length}
                      </span>
                    ) : null}
                  </Button>
                </Link>
                <Link href="/admin/dashboard/feedback" className="w-full">
                  <Button
                    variant="secondary"
                    className="w-full gap-2 justify-start"
                  >
                    <MessageCircle className="h-4 w-4" />
                    View Feedback
                    {feedback?.length ? (
                      <span className="ml-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                        {feedback.length}
                      </span>
                    ) : null}
                  </Button>
                </Link>
                <Link href="/admin/advertisements" className="w-full">
                  <Button
                    variant="secondary"
                    className="w-full gap-2 justify-start"
                  >
                    <Newspaper className="h-4 w-4" />
                    Advertisements
                  </Button>
                </Link>
                <Link href="/admin/library" className="w-full">
                  <Button
                    variant="secondary"
                    className="w-full gap-2 justify-start"
                  >
                    <Library className="h-4 w-4" />
                    Library Management
                  </Button>
                </Link>
                <Link href="/admin/users" className="w-full">
                  <Button
                    variant="secondary"
                    className="w-full gap-2 justify-start"
                  >
                    <Users className="h-4 w-4" />
                    User Management
                  </Button>
                </Link>
                <Button
                  variant="destructive"
                  className="w-full gap-2 justify-start mt-8"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/20 hover:border-blue-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium mb-2">Total Users</h3>
            <Users className="h-5 w-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-blue-600">
            {stats?.totalUsers ?? 0}
          </p>
        </Card>
        <Card className="p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20 hover:border-green-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium mb-2">Active Users (24h)</h3>
            <UserPlus className="h-5 w-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-green-600">
            {stats?.activeUsers ?? 0}
          </p>
        </Card>
        <Card className="p-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20 hover:border-purple-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium mb-2">Premium Users</h3>
            <Crown className="h-5 w-5 text-purple-500" />
          </div>
          <p className="text-3xl font-bold text-purple-600">
            {stats?.premiumUsers ?? 0}
          </p>
        </Card>
        <Card className="p-6 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20 hover:border-amber-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium mb-2">Total Characters</h3>
            <Palette className="h-5 w-5 text-amber-500" />
          </div>
          <p className="text-3xl font-bold text-amber-600">
            {characterStats?.totalCharacters ?? 0}
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">
            Subscription Distribution
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={subscriptionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {subscriptionData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">User Status Distribution</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={userStatusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#8884d8">
                  {userStatusData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">User Activity Heatmap</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={activityData?.hourlyActivity || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="activeUsers"
                stroke="#8884d8"
                fill="#8884d8"
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">Message Volume Trend</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={messageVolume?.daily || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="messages"
                  stroke="#8884d8"
                  name="Messages"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">Character Popularity</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={characterPopularity?.characters || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="messageCount" fill="#8884d8" name="Messages" />
                <Bar dataKey="userCount" fill="#82ca9d" name="Users" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">
            User Distribution by Country
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={countryDistribution?.locations.slice(0, 10) || []}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="country" width={120} />
                <Tooltip formatter={(value) => [`${value} users`, "Count"]} />
                <Legend />
                <Bar dataKey="count" fill="#8884d8" name="Users">
                  {countryDistribution?.locations
                    .slice(0, 10)
                    .map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">Geographic Distribution</h3>
          <div className="h-[300px] flex flex-col justify-center">
            <div className="text-center mb-4">
              <p className="text-lg font-medium">Top Countries by User Count</p>
            </div>
            <div className="overflow-auto max-h-[220px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Country</TableHead>
                    <TableHead className="text-right">Users</TableHead>
                    <TableHead className="text-right">Percentage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {countryDistribution?.locations
                    .slice(0, 15)
                    .map((location, index) => {
                      const totalUsers = countryDistribution.locations.reduce(
                        (sum, loc) => sum + loc.count,
                        0,
                      );
                      const percentage =
                        totalUsers > 0
                          ? ((location.count / totalUsers) * 100).toFixed(1)
                          : "0.0";

                      return (
                        <TableRow key={index}>
                          <TableCell>{location.country}</TableCell>
                          <TableCell className="text-right">
                            {location.count}
                          </TableCell>
                          <TableCell className="text-right">
                            {percentage}%
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
          </div>
        </Card>
      </div>

      <Card className="mt-8">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold">Subscription Plans</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Manage subscription plans and their features
              </p>
            </div>
            <Button
              onClick={() => {
                setEditingPlan(null);
                form.reset({
                  id: "",
                  name: "",
                  price: "",
                  features: "[]",
                });
                setPlanDialogOpen(true);
              }}
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
              Add New Plan
            </Button>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Features</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans?.map((plan: SubscriptionPlanWithFeatures) => (
                  <TableRow key={plan.id}>
                    <TableCell>{plan.id}</TableCell>
                    <TableCell>{plan.name}</TableCell>
                    <TableCell>{plan.price}</TableCell>
                    <TableCell>
                      <ul className="list-disc list-inside">
                        {JSON.parse(plan.features).map(
                          (feature: string, index: number) => (
                            <li key={index} className="text-sm">
                              {feature}
                            </li>
                          ),
                        )}
                      </ul>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingPlan(plan);
                            form.reset({
                              ...plan,
                              features: JSON.stringify(
                                JSON.parse(plan.features),
                                null,
                                2,
                              ),
                            });
                            setPlanDialogOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={deletePlan.isPending}
                            >
                              {deletePlan.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Plan</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this plan? This
                                action cannot be undone. Existing subscribers
                                will not be affected.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deletePlan.mutate(plan.id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </Card>

      <Dialog open={isPlanDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPlan ? "Edit Plan" : "Create New Plan"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onPlanSubmit)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plan ID</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., basic, premium, pro"
                        {...field}
                        disabled={!!editingPlan}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plan Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Basic Plan" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., $9.99" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="features"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Features</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={`[
                          "Feature 1",
                          "Feature 2",
                          "Feature 3"
                        ]`}
                        className="font-mono h-[200px]"
                        {...field}
                      />
                    </FormControl>
                    <p className="text-sm text-muted-foreground mt-2">
                      Enter features as a JSON array of strings. Each feature
                      should be enclosed in quotes and separated by commas.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setPlanDialogOpen(false);
                    setEditingPlan(null);
                    form.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createPlan.isPending || updatePlan.isPending}
                >
                  {createPlan.isPending || updatePlan.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {editingPlan ? "Save Changes" : "Create Plan"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
