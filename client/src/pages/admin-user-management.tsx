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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Link } from "wouter";

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
  const [usersPerPage, setUsersPerPage] = useState(10); // Display 10 users per page by default
  const pageSizeOptions = [5, 10, 25, 50, 100];
  
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
  
  // Add polling refresh for user data with optimized interval
  useEffect(() => {
    const intervalId = setInterval(() => {
      // Refresh user data every 10 seconds instead of 2 seconds to reduce server load
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    }, 10000);
    
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
      {/* Dashboard redirect button */}
      <div className="mb-4">
        <Link href="/admin-dashboard">
          <Button variant="outline" className="gap-2" size="sm">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
              <path d="M7.07926 0.222253C7.31275 -0.007434 7.6873 -0.007434 7.92079 0.222253L14.6708 6.86227C14.907 7.09465 14.9101 7.47453 14.6778 7.71076C14.4454 7.947 14.0655 7.95012 13.8293 7.71773L13 6.90201V12.5C13 12.7761 12.7762 13 12.5 13H2.50002C2.22388 13 2.00002 12.7761 2.00002 12.5V6.90201L1.17079 7.71773C0.934558 7.95012 0.554672 7.947 0.32229 7.71076C0.0899079 7.47453 0.0930283 7.09465 0.32926 6.86227L7.07926 0.222253ZM7.50002 1.49163L12 5.91831V12H10V8.49999C10 8.22385 9.77617 7.99999 9.50002 7.99999H5.50002C5.22388 7.99999 5.00002 8.22385 5.00002 8.49999V12H3.00002V5.91831L7.50002 1.49163ZM6.00002 12H9.00002V8.99999H6.00002V12Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
            </svg>
            Back to Dashboard
          </Button>
        </Link>
      </div>
      
      <div className="mb-6 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 p-4 rounded-lg shadow-sm border border-green-200 dark:border-green-800">
        <h1 className="text-2xl font-bold text-green-600 dark:text-green-400">User Management</h1>
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
      
      <div className="overflow-x-auto rounded-md border shadow-sm">
        <Table className="bg-white dark:bg-zinc-950">
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
      <div className="py-4 px-6 bg-white dark:bg-zinc-950 border-t">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="text-sm text-muted-foreground bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-md">
              Showing <span className="font-medium text-foreground">{indexOfFirstUser + 1}</span> to <span className="font-medium text-foreground">{Math.min(indexOfLastUser, filteredUsers.length)}</span> of <span className="font-medium text-foreground">{filteredUsers.length}</span> users
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Rows per page:</span>
              <Select 
                value={usersPerPage.toString()} 
                onValueChange={(value) => {
                  setUsersPerPage(Number(value));
                  setCurrentPage(1); // Reset to first page when changing the number of rows
                }}
              >
                <SelectTrigger className="w-[80px] h-8 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                  <SelectValue placeholder="10" />
                </SelectTrigger>
                <SelectContent>
                  {pageSizeOptions.map(size => (
                    <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {totalPages > 1 && (
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 p-1 rounded-md">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="h-8 w-8"
              >
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
                  <path d="M8.84182 3.13514C9.04327 3.32401 9.05348 3.64042 8.86462 3.84188L5.43521 7.49991L8.86462 11.1579C9.05348 11.3594 9.04327 11.6758 8.84182 11.8647C8.64036 12.0535 8.32394 12.0433 8.13508 11.8419L4.38508 7.84188C4.20477 7.64955 4.20477 7.35027 4.38508 7.15794L8.13508 3.15794C8.32394 2.95648 8.64036 2.94628 8.84182 3.13514Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                </svg>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="h-8 w-8"
              >
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
                  <path d="M6.85355 3.14645C7.04882 3.34171 7.04882 3.65829 6.85355 3.85355L3.70711 7L6.85355 10.1464C7.04882 10.3417 7.04882 10.6583 6.85355 10.8536C6.65829 11.0488 6.34171 11.0488 6.14645 10.8536L2.64645 7.35355C2.45118 7.15829 2.45118 6.84171 2.64645 6.64645L6.14645 3.14645C6.34171 2.95118 6.65829 2.95118 6.85355 3.14645Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                </svg>
              </Button>
              
              <div className="flex items-center gap-1 px-2">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  // Calculate page numbers to show, centered on current page
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={i}
                      variant={currentPage === pageNum ? "default" : "ghost"}
                      size="icon"
                      onClick={() => setCurrentPage(pageNum)}
                      className="h-8 w-8"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="h-8 w-8"
              >
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
                  <path d="M8.14645 3.14645C8.34171 2.95118 8.65829 2.95118 8.85355 3.14645L12.3536 6.64645C12.5488 6.84171 12.5488 7.15829 12.3536 7.35355L8.85355 10.8536C8.65829 11.0488 8.34171 11.0488 8.14645 10.8536C7.95118 10.6583 7.95118 10.3417 8.14645 10.1464L11.2929 7L8.14645 3.85355C7.95118 3.65829 7.95118 3.34171 8.14645 3.14645Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                </svg>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="h-8 w-8"
              >
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
                  <path d="M6.1584 3.13508C5.95694 3.32394 5.94673 3.64036 6.1356 3.84182L9.56499 7.49991L6.1356 11.158C5.94673 11.3594 5.95694 11.6759 6.1584 11.8647C6.35986 12.0536 6.67627 12.0434 6.86514 11.8419L10.6151 7.84182C10.7954 7.64949 10.7954 7.35021 10.6151 7.15788L6.86514 3.15788C6.67627 2.95642 6.35986 2.94621 6.1584 3.13508Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                </svg>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}