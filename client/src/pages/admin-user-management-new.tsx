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
  ChevronLeft,
  Loader2,
  Ban,
  Crown,
  Search,
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

export default function AdminUserManagementNew() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [subscriptionFilter, setSubscriptionFilter] = useState<string | null>(
    null
  );
  const [locationFilter, setLocationFilter] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [bulkSubscriptionPlan, setBulkSubscriptionPlan] = useState<string>("");
  const [isAllSelected, setIsAllSelected] = useState(false);

  const { toast } = useToast();

  // Fetch users data
  const {
    data: userData = [],
    isLoading,
    isError,
  } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    staleTime: 5000,
    refetchOnWindowFocus: true,
  });

  const users: User[] = userData || [];

  // Fetch subscription plans
  const { data: subscriptionPlans = [] } = useQuery<SubscriptionPlanWithFeatures[]>({
    queryKey: ["/api/admin/subscription-plans"],
    staleTime: 30000,
  });

  // Generate location options from user data
  const uniqueLocations = Array.from(
    new Set(
      users
        .map((user: User) => user.countryName || "Unknown")
        .filter((country) => country !== "Unknown")
    )
  ).sort();

  // Filter users based on filters
  const filteredUsers: User[] = users.filter((user: User) => {
    const matchesSearch =
      !searchTerm ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      !statusFilter ||
      (statusFilter === "blocked" && user.isBlocked) ||
      (statusFilter === "restricted" && user.isRestricted) ||
      (statusFilter === "active" && !user.isBlocked && !user.isRestricted);

    const matchesSubscription =
      !subscriptionFilter ||
      (subscriptionFilter === "premium" && user.isPremium) ||
      (subscriptionFilter === "free" && !user.isPremium);

    const matchesLocation =
      !locationFilter ||
      (user.countryName &&
        user.countryName.toLowerCase() === locationFilter.toLowerCase());

    return matchesSearch && matchesStatus && matchesSubscription && matchesLocation;
  });

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, subscriptionFilter, locationFilter, rowsPerPage]);

  // Handle bulk selection
  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map((user: User) => user.id));
    }
    setIsAllSelected(!isAllSelected);
  };

  const handleSelectUser = (userId: number) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter((id) => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  // Mutations
  const deleteUser = useMutation({
    mutationFn: async (userId: number) => {
      return await apiRequest("DELETE", `/api/admin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
      setSelectedUsers([]);
    },
  });

  const bulkDeleteUsers = useMutation({
    mutationFn: async (userIds: number[]) => {
      // Handle each user individually since there's no bulk endpoint
      const promises = userIds.map((userId) =>
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
      const promises = userIds.map((userId) =>
        apiRequest("POST", `/api/admin/users/${userId}/${action}`, {
          [action === "block" ? "blocked" : "restricted"]: value,
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
      const promises = userIds.map((userId) =>
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

  // Add navigation to dashboard
  const navigateToDashboard = () => {
    window.location.href = "/admin/dashboard";
  };

  return (
    <div className="container mx-auto py-6 px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-500 to-emerald-700 bg-clip-text text-transparent animate-fade-in-right">
              User Management
            </h1>
            <Badge
              variant="outline"
              className="ml-2 uppercase text-xs font-semibold bg-green-50 text-green-700 border-green-200 animate-fade-in-delay-1"
            >
              <Users className="h-3 w-3 mr-1" />
              {users.length} Users
            </Badge>
          </div>
          <p className="text-muted-foreground mt-2 text-sm animate-fade-in-delay-2">
            Manage user accounts, permissions, and subscriptions
          </p>
        </div>
        <Button
          onClick={navigateToDashboard}
          variant="outline"
          className="gap-2 transition-all hover:bg-green-50 hover:text-green-700 hover:border-green-200 animate-fade-in-left"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>

      <Card className="mb-6 overflow-hidden animate-fade-in-down">
        <div className="p-6">
          <div className="flex flex-col md:flex-row gap-4 flex-wrap">
            <div className="flex-1 min-w-[280px] animate-fade-in-delay-1">
              <Label htmlFor="search" className="mb-2 block text-sm">
                Search Users
              </Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by username or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-9"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="w-full md:w-auto flex flex-wrap gap-4 animate-fade-in-delay-2">
              <div className="w-full sm:w-auto">
                <Label htmlFor="status-filter" className="mb-2 block text-sm">
                  Status
                </Label>
                <Select
                  value={statusFilter || ""}
                  onValueChange={(value) =>
                    setStatusFilter(value === "" ? null : value)
                  }
                >
                  <SelectTrigger id="status-filter" className="min-w-[140px]">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                    <SelectItem value="restricted">Restricted</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full sm:w-auto">
                <Label
                  htmlFor="subscription-filter"
                  className="mb-2 block text-sm"
                >
                  Subscription
                </Label>
                <Select
                  value={subscriptionFilter || ""}
                  onValueChange={(value) =>
                    setSubscriptionFilter(value === "" ? null : value)
                  }
                >
                  <SelectTrigger
                    id="subscription-filter"
                    className="min-w-[140px]"
                  >
                    <SelectValue placeholder="All Plans" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Plans</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="free">Free</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full sm:w-auto">
                <Label htmlFor="location-filter" className="mb-2 block text-sm">
                  Location
                </Label>
                <Select
                  value={locationFilter || ""}
                  onValueChange={(value) =>
                    setLocationFilter(value === "" ? null : value)
                  }
                >
                  <SelectTrigger id="location-filter" className="min-w-[140px]">
                    <SelectValue placeholder="All Locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Locations</SelectItem>
                    {uniqueLocations.map((location) => (
                      <SelectItem key={location} value={location}>
                        {location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Bulk Action Section */}
      {selectedUsers.length > 0 && (
        <Card className="mb-6 bg-emerald-50 border-emerald-200 animate-pulse-scale">
          <div className="p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center">
              <Badge
                variant="outline"
                className="mr-4 bg-emerald-100 text-emerald-800 border-emerald-300"
              >
                {selectedUsers.length} Selected
              </Badge>
              <div className="flex flex-wrap gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="gap-1">
                      <Trash2 className="h-4 w-4" /> Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Selected Users</AlertDialogTitle>
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
                  className="gap-1"
                  onClick={() =>
                    bulkUpdateUsers.mutate({
                      userIds: selectedUsers,
                      action: "block",
                      value: true,
                    })
                  }
                >
                  <Lock className="h-4 w-4" /> Block
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() =>
                    bulkUpdateUsers.mutate({
                      userIds: selectedUsers,
                      action: "block",
                      value: false,
                    })
                  }
                >
                  <UnlockIcon className="h-4 w-4" /> Unblock
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="gap-1 bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      <Crown className="h-4 w-4" /> Set Subscription{" "}
                      <ChevronDown className="h-3 w-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Choose Plan</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {(subscriptionPlans || [])
                      .filter((plan) => plan && Object.hasOwn(plan, 'name'))
                      .map((plan) => (
                        <DropdownMenuItem
                          key={plan.id}
                          onClick={() =>
                            bulkUpdateSubscription.mutate({
                              userIds: selectedUsers,
                              planId: plan.id,
                            })
                          }
                        >
                          {plan.name} (${plan.price / 100}/month)
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
                      Remove Premium (Free Plan)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => setSelectedUsers([])}
            >
              <X className="h-4 w-4 mr-1" />
              Clear Selection
            </Button>
          </div>
        </Card>
      )}

      {/* Users Table */}
      <Card className="overflow-hidden animate-fade-in-delay-3">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>User Details</TableHead>
                <TableHead className="hidden md:table-cell">Location</TableHead>
                <TableHead className="hidden sm:table-cell">Status</TableHead>
                <TableHead className="hidden sm:table-cell">
                  Subscription
                </TableHead>
                <TableHead className="hidden lg:table-cell">
                  Created At
                </TableHead>
                <TableHead className="hidden lg:table-cell">
                  Last Login
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10">
                    <div className="flex justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Loading users...
                    </p>
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10">
                    <p className="text-destructive">
                      Error loading users. Please try again.
                    </p>
                  </TableCell>
                </TableRow>
              ) : currentUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10">
                    <p className="text-muted-foreground">No users found.</p>
                  </TableCell>
                </TableRow>
              ) : (
                currentUsers.map((user: User, index) => (
                  <TableRow 
                    key={user.id}
                    className={`animate-fade-in transition-all duration-300 ${
                      index % 2 === 0 ? "bg-muted/30" : ""
                    } ${
                      selectedUsers.includes(user.id)
                        ? "bg-emerald-50 hover:bg-emerald-100"
                        : ""
                    }`}
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedUsers.includes(user.id)}
                        onCheckedChange={() => handleSelectUser(user.id)}
                        aria-label={`Select ${user.username}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.username}</div>
                        <div className="text-sm text-muted-foreground">
                          {user.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {user.countryName || "Unknown"}
                      {user.cityName && `, ${user.cityName}`}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {user.isBlocked ? (
                        <Badge variant="destructive" className="gap-1">
                          <Ban className="h-3 w-3" /> Blocked
                        </Badge>
                      ) : user.isRestricted ? (
                        <Badge variant="outline" className="gap-1">
                          <Lock className="h-3 w-3" /> Restricted
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-green-50 text-green-700 border-green-200 gap-1"
                        >
                          Active
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {user.isPremium ? (
                        <Badge
                          variant="outline"
                          className="bg-amber-50 text-amber-700 border-amber-200 gap-1"
                        >
                          <Crown className="h-3 w-3 mr-1" />
                          {user.subscriptionTier || "Premium"}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Free</Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {user.lastLoginAt
                        ? new Date(user.lastLoginAt).toLocaleDateString()
                        : "Never"}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            className="h-8 w-8 p-0 hover:bg-muted"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() =>
                              bulkUpdateUsers.mutate({
                                userIds: [user.id],
                                action: "block",
                                value: !user.isBlocked,
                              })
                            }
                          >
                            {user.isBlocked ? (
                              <>
                                <UnlockIcon className="h-4 w-4 mr-2" /> Unblock
                                User
                              </>
                            ) : (
                              <>
                                <Lock className="h-4 w-4 mr-2" /> Block User
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive cursor-pointer"
                            onClick={() => deleteUser.mutate(user.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Delete User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-4 animate-fade-in-delay-4">
          <div className="flex-1 text-sm text-muted-foreground hidden sm:block">
            Showing {startIndex + 1} to{" "}
            {Math.min(endIndex, filteredUsers.length)} of{" "}
            {filteredUsers.length} users
          </div>
          <div className="flex items-center space-x-2">
            <p className="text-sm text-muted-foreground">Rows per page</p>
            <Select
              value={rowsPerPage.toString()}
              onValueChange={(value) => setRowsPerPage(Number(value))}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={rowsPerPage} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Page {currentPage} of {totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages || totalPages === 0}
                className="h-8 w-8 p-0"
              >
                <ChevronDown className="h-4 w-4 rotate-270" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}