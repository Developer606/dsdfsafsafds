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
  MoreHorizontal,
  Plus,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { NotificationPopover } from "@/components/admin/notification-popover";
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

interface CountryDistributionData {
  locations: Array<{
    country: string;
    count: number;
  }>;
}

export default function AdminUserManagement() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
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
    sessionStorage.setItem('isAdmin', 'true');
    console.log('Admin flag set in session storage for file uploads');
    
    // Clean up when component unmounts
    return () => {
      sessionStorage.removeItem('isAdmin');
      console.log('Admin flag removed from session storage');
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
      if (socket && socket.connected) {
        socket.disconnect();
      }
    };
  }, []);

  // Add 1-second interval refresh for user data
  useEffect(() => {
    const intervalId = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  // User data query
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    staleTime: 0, // Allow immediate refreshes for real-time chart updates
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
  
  const { data: plans = [], isLoading: plansLoading } = useQuery<SubscriptionPlanWithFeatures[]>({
    queryKey: ["/api/admin/plans"],
    staleTime: Infinity,
  });

  // User data filtering logic
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

  if (usersLoading || plansLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

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

  // Individual user actions
  const toggleUserBlocked = useMutation({
    mutationFn: async ({ userId, isBlocked }: { userId: number; isBlocked: boolean }) => {
      const res = await apiRequest("POST", `/api/admin/users/${userId}/block`, {
        isBlocked,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "User status updated successfully",
      });
    },
  });

  const toggleUserRestricted = useMutation({
    mutationFn: async ({
      userId,
      isRestricted,
    }: {
      userId: number;
      isRestricted: boolean;
    }) => {
      const res = await apiRequest(
        "POST",
        `/api/admin/users/${userId}/restrict`,
        { isRestricted },
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "User restriction status updated",
      });
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("DELETE", `/api/admin/users/${userId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    },
  });

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
            User Management
          </h1>
        </div>
        <div className="flex items-center gap-4">
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
                  <Button variant="secondary" className="w-full gap-2 justify-start">
                    <Crown className="h-4 w-4" />
                    Dashboard
                  </Button>
                </Link>
                <Link href="/admin/characters" className="w-full">
                  <Button variant="secondary" className="w-full gap-2 justify-start">
                    <Palette className="h-4 w-4" />
                    Manage Characters
                  </Button>
                </Link>
                <Link href="/admin/content-moderation" className="w-full">
                  <Button variant="secondary" className="w-full gap-2 justify-start relative">
                    <Shield className="h-4 w-4" />
                    Content Moderation
                  </Button>
                </Link>
                <Link href="/admin/dashboard/complaints" className="w-full">
                  <Button variant="secondary" className="w-full gap-2 justify-start">
                    <AlertCircle className="h-4 w-4" />
                    View Complaints
                  </Button>
                </Link>
                <Link href="/admin/dashboard/feedback" className="w-full">
                  <Button variant="secondary" className="w-full gap-2 justify-start">
                    <MessageCircle className="h-4 w-4" />
                    View Feedback
                  </Button>
                </Link>
                <Link href="/admin/advertisements" className="w-full">
                  <Button variant="secondary" className="w-full gap-2 justify-start">
                    <Newspaper className="h-4 w-4" />
                    Advertisements
                  </Button>
                </Link>
                <Link href="/admin/users" className="w-full">
                  <Button variant="default" className="w-full gap-2 justify-start">
                    <Users className="h-4 w-4" />
                    User Management
                  </Button>
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      
      <Card className="mt-8">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold">User Management</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Manage user accounts, permissions, and subscriptions
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Input
                placeholder="Search by username or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-[300px]"
              />
              {(statusFilter.length > 0 ||
                subscriptionFilter.length > 0 ||
                locationFilter.length > 0 ||
                loginFilter !== "all" ||
                characterFilter.min !== undefined ||
                characterFilter.max !== undefined) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Clear Filters
                </Button>
              )}
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>

          {/* Add bulk actions section */}
          <div className="flex items-center justify-between mb-4 pb-4 border-b">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={
                    selectedUsers.length > 0 &&
                    selectedUsers.length === filteredUsers.length
                  }
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all users"
                />
                <span className="text-sm text-muted-foreground">
                  {selectedUsers.length > 0
                    ? `Selected ${selectedUsers.length} user${selectedUsers.length === 1 ? "" : "s"}`
                    : "Select all"}
                </span>
              </div>
            </div>

            {selectedUsers.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (
                      window.confirm(
                        `Delete ${selectedUsers.length} selected users?`,
                      )
                    ) {
                      bulkDeleteUsers.mutate(selectedUsers);
                    }
                  }}
                  disabled={bulkDeleteUsers.isPending}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    bulkUpdateUsers.mutate({
                      userIds: selectedUsers,
                      action: "restrict",
                      value: true,
                    })
                  }
                  disabled={bulkUpdateUsers.isPending}
                  className="gap-2"
                >
                  <Lock className="h-4 w-4" />
                  Restrict
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    bulkUpdateUsers.mutate({
                      userIds: selectedUsers,
                      action: "restrict",
                      value: false,
                    })
                  }
                  disabled={bulkUpdateUsers.isPending}
                  className="gap-2"
                >
                  <UnlockIcon className="h-4 w-4" />
                  Unrestrict
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    bulkUpdateUsers.mutate({
                      userIds: selectedUsers,
                      action: "block",
                      value: true,
                    })
                  }
                  disabled={bulkUpdateUsers.isPending}
                  className="gap-2"
                >
                  <Ban className="h-4 w-4" />
                  Block
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    bulkUpdateUsers.mutate({
                      userIds: selectedUsers,
                      action: "block",
                      value: false,
                    })
                  }
                  disabled={bulkUpdateUsers.isPending}
                  className="gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  Unblock
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      disabled={bulkUpdateSubscription.isPending}
                    >
                      <ShoppingBag className="h-4 w-4" />
                      Subscription
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>Select Plan</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {plans.map((plan) => (
                      <DropdownMenuItem
                        key={plan.id}
                        onClick={() =>
                          bulkUpdateSubscription.mutate({
                            userIds: selectedUsers,
                            planId: plan.id,
                          })
                        }
                      >
                        {plan.name}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() =>
                        bulkUpdateSubscription.mutate({
                          userIds: selectedUsers,
                          planId: "free",
                        })
                      }
                    >
                      Downgrade to Free
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={
                        selectedUsers.length > 0 &&
                        selectedUsers.length === filteredUsers.length
                      }
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all users"
                    />
                  </TableHead>
                  <TableHead className="w-[150px]">Username</TableHead>
                  <TableHead className="w-[200px]">Email</TableHead>
                  <TableHead className="w-[100px]">
                    <div className="flex items-center gap-2">
                      Status
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[200px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Filter status..." />
                            <CommandEmpty>No status found.</CommandEmpty>
                            <CommandGroup>
                              {["Active", "Blocked", "Restricted"].map(
                                (status) => (
                                  <CommandItem
                                    key={status}
                                    onSelect={() => {
                                      setStatusFilter((prev) =>
                                        prev.includes(status)
                                          ? prev.filter((s) => s !== status)
                                          : [...prev, status],
                                      );
                                    }}
                                  >
                                    <div
                                      className={`mr-2 flex h-4 w-4 items-center justify-center rounded-sm border ${
                                        statusFilter.includes(status)
                                          ? "bg-primary"
                                          : "border-primary"
                                      }`}
                                    >
                                      {statusFilter.includes(status) && "✓"}
                                    </div>
                                    {status}
                                  </CommandItem>
                                ),
                              )}
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </TableHead>
                  <TableHead className="w-[150px]">
                    <div className="flex items-center gap-2">
                      Subscription
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[200px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Filter subscription..." />
                            <CommandEmpty>No subscription found.</CommandEmpty>
                            <CommandGroup>
                              {getUniqueSubscriptions().map((sub) => (
                                <CommandItem
                                  key={sub}
                                  onSelect={() => {
                                    setSubscriptionFilter((prev) =>
                                      prev.includes(sub)
                                        ? prev.filter((s) => s !== sub)
                                        : [...prev, sub],
                                    );
                                  }}
                                >
                                  <div
                                    className={`mr-2 flex h-4 w-4 items-center justify-center rounded-sm border ${
                                      subscriptionFilter.includes(sub)
                                        ? "bg-primary"
                                        : "border-primary"
                                    }`}
                                  >
                                    {subscriptionFilter.includes(sub) && "✓"}
                                  </div>
                                  {sub}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </TableHead>
                  <TableHead className="w-[150px]">
                    <div className="flex items-center gap-2">
                      Last Login
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[200px] p-0" align="start">
                          <Command>
                            <CommandGroup>
                              {[
                                { value: "all", label: "All time" },
                                { value: "week", label: "Last 7 days" },
                                { value: "month", label: "Last 30 days" },
                                { value: "never", label: "Never logged in" },
                              ].map((option) => (
                                <CommandItem
                                  key={option.value}
                                  onSelect={() => setLoginFilter(option.value)}
                                >
                                  <div className="flex items-center gap-2">
                                    <div
                                      className={`h-4 w-4 rounded-full border ${
                                        loginFilter === option.value
                                          ? "border-primary bg-primary"
                                          : "border-primary"
                                      } flex items-center justify-center`}
                                    >
                                      {loginFilter === option.value && (
                                        <div className="h-2 w-2 rounded-full bg-background" />
                                      )}
                                    </div>
                                    <span>{option.label}</span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </TableHead>
                  <TableHead className="w-[100px]">
                    <div className="flex items-center gap-2">
                      Characters
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[200px] p-4" align="start">
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>Minimum Characters</Label>
                              <Input
                                type="number"
                                min="0"
                                value={characterFilter.min ?? ""}
                                onChange={(e) => {
                                  const value = e.target.value
                                    ? parseInt(e.target.value)
                                    : undefined;
                                  setCharacterFilter((prev) => ({
                                    ...prev,
                                    min:
                                      value && value >= 0 ? value : undefined,
                                  }));
                                }}
                                placeholder="Min characters"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Maximum Characters</Label>
                              <Input
                                type="number"
                                min="0"
                                value={characterFilter.max ?? ""}
                                onChange={(e) => {
                                  const value = e.target.value
                                    ? parseInt(e.target.value)
                                    : undefined;
                                  setCharacterFilter((prev) => ({
                                    ...prev,
                                    max:
                                      value && value >= 0 ? value : undefined,
                                  }));
                                }}
                                placeholder="Max characters"
                              />
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </TableHead>
                  <TableHead className="w-[100px]">Created</TableHead>
                  <TableHead className="w-[150px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow
                    key={user.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors"
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedUsers.includes(user.id)}
                        onCheckedChange={(checked) =>
                          handleSelectUser(user.id, checked as boolean)
                        }
                        aria-label={`Select user ${user.username}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {user.username}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {user.isBlocked ? (
                          <Badge variant="destructive">Blocked</Badge>
                        ) : user.isRestricted ? (
                          <Badge variant="outline">Restricted</Badge>
                        ) : (
                          <Badge variant="default" className="bg-green-600 hover:bg-green-700">Active</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={user.isPremium ? "default" : "outline"}
                        className={
                          user.isPremium
                            ? "bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
                            : ""
                        }
                      >
                        {user.subscriptionTier || (user.isPremium ? "Premium" : "Free")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.lastLoginAt ? (
                        new Date(user.lastLoginAt).toLocaleString(undefined, {
                          month: "numeric",
                          day: "numeric",
                          hour: "numeric",
                          minute: "numeric",
                        })
                      ) : (
                        <span className="text-muted-foreground">Never</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.countryName || (
                        <span className="text-muted-foreground">Unknown</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.trialCharactersCreated || 0}
                    </TableCell>
                    <TableCell>
                      {new Date(user.createdAt).toLocaleString(undefined, {
                        month: "numeric",
                        day: "numeric",
                        year: "2-digit",
                        hour: "numeric",
                        minute: "numeric",
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={!user.isBlocked}
                          onCheckedChange={(checked) =>
                            toggleUserBlocked.mutate({
                              userId: user.id,
                              isBlocked: !checked,
                            })
                          }
                          aria-label={
                            user.isBlocked ? "Unblock user" : "Block user"
                          }
                          disabled={toggleUserBlocked.isPending}
                        />

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>User Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() =>
                                toggleUserRestricted.mutate({
                                  userId: user.id,
                                  isRestricted: !user.isRestricted,
                                })
                              }
                            >
                              {user.isRestricted ? (
                                <>
                                  <UnlockIcon className="h-4 w-4 mr-2" />
                                  Remove Restrictions
                                </>
                              ) : (
                                <>
                                  <Lock className="h-4 w-4 mr-2" />
                                  Restrict User
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => alert("Edit user profile")}
                            >
                              <Settings className="h-4 w-4 mr-2" />
                              Edit Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => alert("Login as user")}
                              className="text-blue-600"
                            >
                              <LogOut className="h-4 w-4 mr-2" />
                              Login as User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete User</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this user? This
                                action cannot be undone. All user data including
                                messages and custom characters will be deleted.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteUser.mutate(user.id)}
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
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={10}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No users found matching "{searchQuery}"
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </Card>
    </div>
  );
}