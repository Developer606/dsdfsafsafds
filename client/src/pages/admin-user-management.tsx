import { useQuery, useMutation } from "@tanstack/react-query";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Trash2,
  Lock,
  UnlockIcon,
  Users,
  MoreHorizontal,
  X,
  ChevronDown,
  Loader2,
  Ban,
  Crown,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
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
import { setupWebSocket } from "@/lib/websocket";

// Define types for user management
interface User {
  id: number;
  username: string;
  email: string;
  isBlocked: boolean;
  isRestricted: boolean;
  isPremium: boolean;
  subscriptionTier?: string;
  trialCharactersCreated: number;
  createdAt: string;
  lastLoginAt?: string;
  countryName?: string;
  cityName?: string;
}

// Define types for subscription plans
interface SubscriptionFeature {
  id: string;
  name: string;
  description: string;
}

interface SubscriptionPlanWithFeatures {
  id: string;
  name: string;
  price: number;
  features: SubscriptionFeature[];
}

export default function AdminUserManagement() {
  const { toast } = useToast();
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
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10; // Display 10 users per page
  
  // Setup WebSocket connection when component mounts
  useEffect(() => {
    const socket = setupWebSocket();
    
    // Set up user update event listener
    socket?.on("user_update", () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    });
    
    return () => {
      if (socket) {
        socket.off("user_update");
        if (socket.connected) {
          socket.disconnect();
        }
      }
    };
  }, []);
  
  // Add polling refresh for user data
  useEffect(() => {
    const intervalId = setInterval(() => {
      // Refresh user data every 2 seconds
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    }, 2000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Fetch users
  const { data: users = [] as User[] } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });
  
  // Fetch plans for subscription dropdown
  const { data: plans = [] as SubscriptionPlanWithFeatures[] } = useQuery<SubscriptionPlanWithFeatures[]>({
    queryKey: ["/api/admin/subscription-plans"],
  });

  // Get unique subscription tiers for filter
  const getUniqueSubscriptions = (): string[] => {
    const subscriptions = users
      .map((user: User) => user.subscriptionTier || (user.isPremium ? "Premium" : "Free"))
      .filter((sub: string, index: number, self: string[]) => self.indexOf(sub) === index);
    return subscriptions;
  };
  
  // Get unique locations for filter
  const getUniqueLocations = (): string[] => {
    return users
      .map((user: User) => user.countryName || "Unknown")
      .filter((location: string, index: number, self: string[]) => self.indexOf(location) === index);
  };

  // Filter users based on search and filters
  const filteredUsers: User[] = users.filter((user: User) => {
    // Search filter
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

    // Login filter
    const matchesLogin = (() => {
      if (loginFilter === "all") return true;
      if (loginFilter === "never") return !user.lastLoginAt;
      if (!user.lastLoginAt) return false;

      const lastLogin = new Date(user.lastLoginAt);
      const now = new Date();
      const daysDiff = (now.getTime() - lastLogin.getTime()) / (1000 * 3600 * 24);

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
  });
  
  // Pagination calculations
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);

  // Add selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(filteredUsers.map((user: User) => user.id));
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

  // Clear filters function
  const clearFilters = () => {
    setStatusFilter([]);
    setSubscriptionFilter([]);
    setLocationFilter([]);
    setLoginFilter("all");
    setCharacterFilter({});
    setCurrentPage(1); // Reset to first page when filters are cleared
  };

  // User action mutations
  const deleteUser = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest("DELETE", `/api/admin/users/${userId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User deleted",
        description: "User has been permanently deleted",
      });
    },
  });

  const blockUser = useMutation({
    mutationFn: async ({ userId, blocked }: { userId: number; blocked: boolean }) => {
      const response = await apiRequest("POST", `/api/admin/users/${userId}/block`, {
        blocked,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User updated",
        description: "User block status updated successfully",
      });
    },
  });

  const restrictUser = useMutation({
    mutationFn: async ({ userId, restricted }: { userId: number; restricted: boolean }) => {
      const response = await apiRequest("POST", `/api/admin/users/${userId}/restrict`, {
        restricted,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User updated",
        description: "User restriction status updated successfully",
      });
    },
  });

  const updateSubscription = useMutation({
    mutationFn: async ({ userId, planId }: { userId: number; planId: string }) => {
      const response = await apiRequest("POST", `/api/admin/users/${userId}/subscription`, {
        planId,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Subscription updated",
        description: "User subscription plan has been updated",
      });
    },
  });

  // Bulk mutations
  const bulkDeleteUsers = useMutation({
    mutationFn: async (userIds: number[]) => {
      // Handle each user individually since there's no bulk endpoint
      const promises = userIds.map(userId =>
        apiRequest("DELETE", `/api/admin/users/${userId}`)
      );
      
      await Promise.all(promises);
      return { success: true };
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
      // Handle each user individually since there's no bulk endpoint
      const promises = userIds.map(userId =>
        apiRequest("POST", `/api/admin/users/${userId}/${action}`, {
          [action === 'block' ? 'blocked' : 'restricted']: value,
        })
      );
      
      await Promise.all(promises);
      return { success: true };
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
      // Since there's no bulk subscription endpoint, update each user individually
      const promises = userIds.map(userId => 
        apiRequest("POST", `/api/admin/users/${userId}/subscription`, {
          planId,
        })
      );
      
      await Promise.all(promises);
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "Selected users' subscriptions updated successfully",
      });
      setSelectedUsers([]);
    },
  });

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-green-500">User Management</h1>
        <p className="text-muted-foreground mt-1">Manage user accounts, permissions, and subscriptions</p>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
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

        <div className="flex items-center gap-4">
          <Input
            placeholder="Search by username or email..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1); // Reset to first page when search changes
            }}
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
          <div className="flex items-center gap-1">
            <Users className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {users.length} Users
            </span>
          </div>
        </div>
      </div>

      {selectedUsers.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              if (window.confirm(`Delete ${selectedUsers.length} selected users?`)) {
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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Crown className="h-4 w-4" />
                Subscription
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Change Plan</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() =>
                  bulkUpdateSubscription.mutate({
                    userIds: selectedUsers,
                    planId: "free",
                  })
                }
              >
                Free Plan
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  bulkUpdateSubscription.mutate({
                    userIds: selectedUsers,
                    planId: "basic",
                  })
                }
              >
                Basic Plan
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  bulkUpdateSubscription.mutate({
                    userIds: selectedUsers,
                    planId: "premium",
                  })
                }
              >
                Premium Plan
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  bulkUpdateSubscription.mutate({
                    userIds: selectedUsers,
                    planId: "pro",
                  })
                }
              >
                Pro Plan
              </DropdownMenuItem>
              {plans.filter(plan => !["free", "basic", "premium", "pro"].includes(plan.id)).map((plan: SubscriptionPlanWithFeatures) => (
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
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
      
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
                                  setCurrentPage(1); // Reset to first page when filter changes
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
                          {getUniqueSubscriptions().map((sub: string) => (
                            <CommandItem
                              key={sub}
                              onSelect={() => {
                                setSubscriptionFilter((prev) =>
                                  prev.includes(sub)
                                    ? prev.filter((s) => s !== sub)
                                    : [...prev, sub],
                                );
                                setCurrentPage(1); // Reset to first page when filter changes
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
                              onSelect={() => {
                                setLoginFilter(option.value);
                                setCurrentPage(1); // Reset to first page when filter changes
                              }}
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
                  Location
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
                        <CommandInput placeholder="Filter location..." />
                        <CommandEmpty>No location found.</CommandEmpty>
                        <CommandGroup>
                          {getUniqueLocations().map((location: string) => (
                            <CommandItem
                              key={location}
                              onSelect={() => {
                                setLocationFilter((prev) =>
                                  prev.includes(location)
                                    ? prev.filter((s) => s !== location)
                                    : [...prev, location],
                                );
                                setCurrentPage(1); // Reset to first page when filter changes
                              }}
                            >
                              <div
                                className={`mr-2 flex h-4 w-4 items-center justify-center rounded-sm border ${
                                  locationFilter.includes(location)
                                    ? "bg-primary"
                                    : "border-primary"
                                }`}
                              >
                                {locationFilter.includes(location) && "✓"}
                              </div>
                              {location}
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
                              setCurrentPage(1); // Reset to first page when filter changes
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
                              setCurrentPage(1); // Reset to first page when filter changes
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
            {currentUsers.map((user: User) => (
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
                    {user.isBlocked && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Blocked
                      </span>
                    )}
                    {user.isRestricted && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Restricted
                      </span>
                    )}
                    {!user.isBlocked && !user.isRestricted && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Active
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="h-auto flex items-center justify-start p-2 w-full hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <div className="flex flex-col items-start gap-1">
                          {user.subscriptionTier ? (
                            <>
                              <Badge className="bg-purple-500 text-white hover:bg-purple-600">
                                {user.subscriptionTier.charAt(0).toUpperCase() + user.subscriptionTier.slice(1)}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {user.subscriptionTier.toLowerCase()}
                              </span>
                            </>
                          ) : user.isPremium ? (
                            <>
                              <Badge className="bg-purple-500 text-white hover:bg-purple-600">
                                Premium
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                premium
                              </span>
                            </>
                          ) : (
                            <>
                              <Badge variant="outline" className="text-slate-500 border-slate-300">
                                Free
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                free
                              </span>
                            </>
                          )}
                        </div>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[200px]">
                      <DropdownMenuLabel>Change Plan</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() =>
                          updateSubscription.mutate({
                            userId: user.id,
                            planId: "free",
                          })
                        }
                      >
                        Free Plan
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          updateSubscription.mutate({
                            userId: user.id,
                            planId: "basic",
                          })
                        }
                      >
                        Basic Plan
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          updateSubscription.mutate({
                            userId: user.id,
                            planId: "premium",
                          })
                        }
                      >
                        Premium Plan
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          updateSubscription.mutate({
                            userId: user.id,
                            planId: "pro",
                          })
                        }
                      >
                        Pro Plan
                      </DropdownMenuItem>
                      {plans.filter(plan => !["free", "basic", "premium", "pro"].includes(plan.id)).map((plan: SubscriptionPlanWithFeatures) => (
                        <DropdownMenuItem
                          key={plan.id}
                          onClick={() =>
                            updateSubscription.mutate({
                              userId: user.id,
                              planId: plan.id,
                            })
                          }
                        >
                          {plan.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span>
                      {user.lastLoginAt
                        ? new Date(user.lastLoginAt).toLocaleDateString()
                        : "Never"}
                    </span>
                    {user.lastLoginAt && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(user.lastLoginAt).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    {user.countryName ? (
                      <>
                        <span>{user.countryName}</span>
                        {user.cityName && (
                          <span className="text-xs text-muted-foreground">
                            {user.cityName}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Unknown
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>{user.trialCharactersCreated}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(user.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={user.isBlocked}
                      onCheckedChange={(checked) =>
                        blockUser.mutate({
                          userId: user.id,
                          blocked: checked,
                        })
                      }
                      disabled={blockUser.isPending}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        restrictUser.mutate({
                          userId: user.id,
                          restricted: !user.isRestricted,
                        })
                      }
                      disabled={restrictUser.isPending}
                    >
                      {restrictUser.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : user.isRestricted ? (
                        <Lock className="h-4 w-4" />
                      ) : (
                        <UnlockIcon className="h-4 w-4" />
                      )}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="icon"
                          disabled={deleteUser.isPending}
                        >
                          {deleteUser.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete User</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this user? This
                            action cannot be undone.
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
          </TableBody>
        </Table>
      </div>
      
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-4">
          <div className="text-sm text-muted-foreground">
            Showing {indexOfFirstUser + 1} to {Math.min(indexOfLastUser, filteredUsers.length)} of {filteredUsers.length} users
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              First
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="mx-2 text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              Last
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}