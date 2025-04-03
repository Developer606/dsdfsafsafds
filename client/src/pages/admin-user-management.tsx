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
import { Input } from "@/components/ui/input";
import {
  Ban,
  Lock,
  Trash2,
  UnlockIcon,
  UserPlus,
  Users,
  Crown,
  Palette,
  MessageCircle,
  AlertCircle,
  Bell,
  ArrowLeft,
  Shield,
  Newspaper,
  Megaphone,
  Menu,
  X,
  MoreHorizontal,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { NotificationPopover } from "@/components/admin/notification-popover";
import { Link } from "wouter";
import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { setupWebSocket } from "@/lib/websocket";

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

  const { data: users = [], isLoading: usersLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
    staleTime: 10000, // Refresh every 10 seconds
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
        {
          restricted,
        }
      );
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User restrictions updated successfully",
      });
    },
  });

  // Connect to WebSocket for real-time updates
  const socket = setupWebSocket();

  useEffect(() => {
    // Re-fetch users data when WebSocket sends an update
    const handleUserUpdate = () => {
      console.log("User update received via WebSocket");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    };

    if (socket) {
      socket.on("user_updated", handleUserUpdate);
      socket.on("user_deleted", handleUserUpdate);
      socket.on("user_created", handleUserUpdate);
    }

    return () => {
      if (socket) {
        socket.off("user_updated", handleUserUpdate);
        socket.off("user_deleted", handleUserUpdate);
        socket.off("user_created", handleUserUpdate);
      }
    };
  }, [socket, queryClient]);

  // Filter users based on search query and selected filters
  const filteredUsers = users?.filter((user) => {
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
        user.subscriptionTier || (user.isPremium ? "Premium" : "Free")
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
  }) ?? [];

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
                <Link href="/admin/moderation" className="w-full">
                  <Button variant="secondary" className="w-full gap-2 justify-start">
                    <Shield className="h-4 w-4" />
                    Content Moderation
                  </Button>
                </Link>
                <Link href="/admin/complaints" className="w-full">
                  <Button variant="secondary" className="w-full gap-2 justify-start">
                    <AlertCircle className="h-4 w-4" />
                    View Complaints
                  </Button>
                </Link>
                <Link href="/admin/feedback" className="w-full">
                  <Button variant="secondary" className="w-full gap-2 justify-start">
                    <MessageCircle className="h-4 w-4" />
                    View Feedback
                  </Button>
                </Link>
                <Link href="/admin/advertisements" className="w-full">
                  <Button variant="secondary" className="w-full gap-2 justify-start">
                    <Megaphone className="h-4 w-4" />
                    Advertisements
                  </Button>
                </Link>
                <Link href="/admin/user-management" className="w-full">
                  <Button variant="secondary" className="w-full gap-2 justify-start bg-blue-100 dark:bg-blue-900">
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
          
          {/* Bulk Actions */}
          <div className="flex items-center gap-4 mb-6">
            {selectedUsers.length > 0 && (
              <>
                <span className="text-sm">
                  Selected {selectedUsers.length} of {filteredUsers.length} users
                </span>
                <Checkbox
                  checked={
                    selectedUsers.length === filteredUsers.length &&
                    filteredUsers.length > 0
                  }
                  onCheckedChange={handleSelectAll}
                />
                <div className="flex-1" />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="gap-2">
                      <Trash2 className="h-4 w-4" />
                      Delete Selected
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete {selectedUsers.length}{" "}
                        selected users? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => bulkDeleteUsers.mutate(selectedUsers)}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() =>
                    bulkUpdateUsers.mutate({
                      userIds: selectedUsers,
                      action: "restrict",
                      value: true,
                    })
                  }
                >
                  <Ban className="h-4 w-4" />
                  Restrict Selected
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() =>
                    bulkUpdateUsers.mutate({
                      userIds: selectedUsers,
                      action: "block",
                      value: true,
                    })
                  }
                >
                  <Lock className="h-4 w-4" />
                  Block Selected
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() =>
                    bulkUpdateUsers.mutate({
                      userIds: selectedUsers,
                      action: "unrestrict",
                      value: true,
                    })
                  }
                >
                  <UnlockIcon className="h-4 w-4" />
                  Unrestrict Selected
                </Button>
              </>
            )}
          </div>
          
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-between w-full">
                  Status {statusFilter.length > 0 && `(${statusFilter.length})`}
                  <span className="sr-only">Toggle status filter</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56">
                <div className="space-y-2">
                  <h4 className="font-medium">Filter by status</h4>
                  {["Active", "Blocked", "Restricted"].map((status) => (
                    <div className="flex items-center space-x-2" key={status}>
                      <Checkbox
                        checked={statusFilter.includes(status)}
                        onCheckedChange={(checked) => {
                          setStatusFilter((prev) =>
                            checked
                              ? [...prev, status]
                              : prev.filter((s) => s !== status)
                          );
                        }}
                        id={`status-${status}`}
                      />
                      <label
                        htmlFor={`status-${status}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 select-none"
                      >
                        {status}
                      </label>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
          
          {/* Users Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={
                      selectedUsers.length === filteredUsers.length &&
                      filteredUsers.length > 0
                    }
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="cursor-pointer">
                  Status
                </TableHead>
                <TableHead className="cursor-pointer">
                  Subscription
                </TableHead>
                <TableHead className="cursor-pointer">
                  Last Login
                </TableHead>
                <TableHead className="cursor-pointer">
                  Characters
                </TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={(checked) =>
                        handleSelectUser(user.id, !!checked)
                      }
                    />
                  </TableCell>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {user.isBlocked ? (
                        <Badge variant="destructive">Blocked</Badge>
                      ) : user.isRestricted ? (
                        <Badge variant="outline">Restricted</Badge>
                      ) : (
                        <Badge variant="secondary">Active</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          user.subscriptionTier
                            ? "secondary"
                            : user.isPremium
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {user.subscriptionTier ||
                          (user.isPremium ? "Premium" : "Free")}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.lastLoginAt
                      ? format(new Date(user.lastLoginAt), "dd/MM/yyyy HH:mm")
                      : "Never"}
                  </TableCell>
                  <TableCell>{user.trialCharactersCreated || 0}</TableCell>
                  <TableCell>
                    {user.countryName || user.countryCode || "Unknown"}
                    {user.cityName && `, ${user.cityName}`}
                  </TableCell>
                  <TableCell>
                    {format(new Date(user.createdAt), "dd/MM/yyyy HH:mm")}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {/* Toggle user blocked status */}
                      <Switch
                        checked={!user.isBlocked}
                        onCheckedChange={(checked) =>
                          blockUser.mutate({
                            userId: user.id,
                            blocked: !checked,
                          })
                        }
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          
                          <DropdownMenuItem
                            onClick={() =>
                              restrictUser.mutate({
                                userId: user.id,
                                restricted: !user.isRestricted,
                              })
                            }
                          >
                            {user.isRestricted ? (
                              <>
                                <UnlockIcon className="mr-2 h-4 w-4" />
                                Remove Restrictions
                              </>
                            ) : (
                              <>
                                <Ban className="mr-2 h-4 w-4" />
                                Restrict User
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => deleteUser.mutate(user.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
      </Card>
    </div>
  );
}