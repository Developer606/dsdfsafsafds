import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Ban, Lock, Trash2, UnlockIcon, UserPlus, Users, Crown, Loader2, MessageSquare, Palette, MessageCircle, AlertCircle, Settings, LogOut, Bell, ArrowLeft } from "lucide-react";
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
import { User, subscriptionPlans, type SubscriptionTier, type Feedback } from "@shared/schema";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSubscriptionPlanSchema } from "@shared/schema";
import { useLocation } from "wouter";
import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert"
import { setupWebSocket } from "@/lib/websocket";

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


export default function AdminDashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [isPlanDialogOpen, setPlanDialogOpen] = useState(false);

  // Setup WebSocket connection when component mounts
  useEffect(() => {
    const socket = setupWebSocket();
    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, []);

  // Add 1-second interval refresh for stats
  useEffect(() => {
    const intervalId = setInterval(() => {
      // Refresh critical stats every second
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/characters/stats"] });
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  // Stats queries with specific query keys for targeted updates
  const { data: stats = {} as DashboardStats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/dashboard/stats"],
    staleTime: 0, // Allow immediate refreshes
  });

  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    staleTime: Infinity,
  });

  const { data: recentMessages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ["/api/admin/messages/recent"],
    staleTime: 5 * 60 * 1000, // Stay fresh for 5 minutes
  });

  const { data: characterStats = {} as DashboardStats, isLoading: charactersLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/characters/stats"],
    staleTime: 0, // Allow immediate refreshes
  });

  const { data: feedback = [], isLoading: feedbackLoading } = useQuery<Feedback[]>({
    queryKey: ["/api/admin/feedback"],
    staleTime: Infinity,
  });

  const { data: complaints = [], isLoading: complaintsLoading } = useQuery<Complaint[]>({
    queryKey: ["/api/admin/complaints"],
    staleTime: Infinity,
  });

  const { data: activityData = { hourlyActivity: [] }, isLoading: activityLoading } = useQuery<ActivityData>({
    queryKey: ["/api/admin/analytics/activity"],
    staleTime: 15 * 60 * 1000, // Stay fresh for 15 minutes
  });

  const { data: messageVolume = { daily: [] }, isLoading: messageVolumeLoading } = useQuery<MessageVolumeData>({
    queryKey: ["/api/admin/analytics/messages"],
    staleTime: Infinity,
  });

  const { data: characterPopularity = { characters: [] }, isLoading: characterPopularityLoading } = useQuery<CharacterPopularityData>({
    queryKey: ["/api/admin/analytics/characters/popularity"],
    staleTime: Infinity,
  });

  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ["/api/admin/plans"],
    staleTime: Infinity,
  });

  const { data: notifications = [], isLoading: notificationsLoading } = useQuery<NotificationData[]>({
    queryKey: ["/api/admin/notifications/all"],
    staleTime: Infinity,
  });

  const blockUser = useMutation({
    mutationFn: async ({ userId, blocked }: { userId: number; blocked: boolean }) => {
      const res = await apiRequest("POST", `/api/admin/users/${userId}/block`, { blocked });
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
    mutationFn: async ({ userId, restricted }: { userId: number; restricted: boolean }) => {
      const res = await apiRequest("POST", `/api/admin/users/${userId}/restrict`, { restricted });
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
    mutationFn: async ({ userId, planId }: { userId: number; planId: string }) => {
      const res = await apiRequest("POST", `/api/admin/users/${userId}/subscription`, { planId });
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notifications/all"] });
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
          description: e.message || "Please ensure features is a valid JSON array of strings",
          variant: "destructive",
        });
        return;
      }

      if (editingPlan) {
        updatePlan.mutate({
          id: editingPlan.id,
          data: {
            ...data,
            features: JSON.stringify(features)
          }
        });
      } else {
        createPlan.mutate({
          ...data,
          features: JSON.stringify(features)
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save plan. Please check your input and try again.",
        variant: "destructive",
      });
    }
  };

  const subscriptionData = users ? [
    { name: "Free", value: users.filter((u) => !u.isPremium).length },
    { name: "Premium", value: users.filter((u) => u.isPremium).length },
  ] : [];

  const userStatusData = users ? [
    { name: "Active", value: users.filter((u) => !u.isBlocked && !u.isRestricted).length },
    { name: "Blocked", value: users.filter((u) => u.isBlocked).length },
    { name: "Restricted", value: users.filter((u) => u.isRestricted).length },
  ] : [];

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

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
    notificationsLoading
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
            Feedback Management
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <NotificationPopover />
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
          <Link href="/admin/dashboard/complaints">
            <Button variant="outline" className="gap-2">
              <AlertCircle className="h-4 w-4" />
              View Complaints
              {complaints?.length ? (
                <span className="ml-1 px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded-full">
                  {complaints.length}
                </span>
              ) : null}
            </Button>
          </Link>
          <Link href="/admin/dashboard/feedback">
            <Button variant="outline" className="gap-2">
              <MessageCircle className="h-4 w-4" />
              View Feedback
              {feedback?.length ? (
                <span className="ml-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                  {feedback.length}
                </span>
              ) : null}
            </Button>
          </Link>
        </div>
      </div>


      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/20 hover:border-blue-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium mb-2">Total Users</h3>
            <Users className="h-5 w-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-blue-600">{stats?.totalUsers ?? 0}</p>
        </Card>
        <Card className="p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20 hover:border-green-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium mb-2">Active Users (24h)</h3>
            <UserPlus className="h-5 w-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-green-600">{stats?.activeUsers ?? 0}</p>
        </Card>
        <Card className="p-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20 hover:border-purple-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium mb-2">Premium Users</h3>
            <Crown className="h-5 w-5 text-purple-500" />
          </div>
          <p className="text-3xl font-bold text-purple-600">{stats?.premiumUsers ?? 0}</p>
        </Card>
        <Card className="p-6 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20 hover:border-amber-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium mb-2">Total Characters</h3>
            <Palette className="h-5 w-5 text-amber-500" />
          </div>
          <p className="text-3xl font-bold text-amber-600">{characterStats?.totalCharacters ?? 0}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">Subscription Distribution</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={subscriptionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {subscriptionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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

      <Card className="mt-8">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Recent Messages</h2>
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Character</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentMessages?.map((message: any) => (
                  <TableRow key={message.id}>
                    <TableCell>{message.username}</TableCell>
                    <TableCell>{message.characterName}</TableCell>
                    <TableCell className="max-w-md truncate">{message.content}</TableCell>
                    <TableCell>
                      {new Date(message.timestamp).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </Card>

      <Card className="mt-8">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold">User Management</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Manage user accounts, permissions, and subscriptions
              </p>
            </div>
            <Users className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">Username</TableHead>
                  <TableHead className="w-[200px]">Email</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[150px]">Subscription</TableHead>
                  <TableHead className="w-[150px]">Last Login</TableHead>
                  <TableHead className="w-[100px]">Characters</TableHead>
                  <TableHead className="w-[100px]">Created</TableHead>
                  <TableHead className="w-[150px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((user) => (
                  <TableRow key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                    <TableCell className="font-medium">{user.username}</TableCell>
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
                          <Button variant="outline" className="w-full justify-start">
                            <div className="flex flex-col items-start gap-1">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                user.isPremium ? "bg-purple-100 text-purple-800" : "bg-gray-100 text-gray-800"
                              }`}>
                                {user.isPremium ? "Premium" : "Free"}
                              </span>
                              {user.subscriptionTier && (
                                <span className="text-xs text-muted-foreground">
                                  {user.subscriptionTier}
                                </span>
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
                          {(Object.keys(subscriptionPlans) as SubscriptionTier[]).map((tier) => (
                            <DropdownMenuItem
                              key={subscriptionPlans[tier].id}
                              onClick={() =>
                                updateSubscription.mutate({
                                  userId: user.id,
                                  planId: subscriptionPlans[tier].id,
                                })
                              }
                            >
                              {subscriptionPlans[tier].name}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>
                          {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : "Never"}
                        </span>
                        {user.lastLoginAt && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(user.lastLoginAt).toLocaleTimeString()}
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
                            blockUser.mutate({ userId: user.id, blocked: checked })
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
                                Are you sure you want to delete this user? This action cannot be undone.
                                All user data including messages and custom characters will be deleted.
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
        </div>
      </Card>

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
                {plans?.map((plan: any) => (
                  <TableRow key={plan.id}>
                    <TableCell>{plan.id}</TableCell>
                    <TableCell>{plan.name}</TableCell>
                    <TableCell>{plan.price}</TableCell>
                    <TableCell>
                      <ul className="list-disc list-inside">
                        {JSON.parse(plan.features).map((feature: string, index: number) => (
                          <li key={index} className="text-sm">{feature}</li>
                        ))}
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
                              features: JSON.stringify(JSON.parse(plan.features), null, 2),
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
                                Are you sure you want to delete this plan? This action cannot be undone.
                                Existing subscribers will not be affected.
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

      {/* Notification History Section */}
      <Card className="mt-8">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6"><div>
              <h2 className="text-xl font-bold">Notification History</h2>
              <p className="text-sm text-muted-foreground mt-1">
                View all sent notifications
              </p>
            </div>
            <MessageCircle className="h-5 w-5 text-muted-foreground" />
          </div>

          <div className="space-y-4">
            {notifications.map((notification) => (
              <Alert
                key={notification.id}
                variant={notification.type === 'update' ? 'default' : notification.type === 'feature' ? 'success' : 'warning'}
              >
                <Bell className="h-4 w-4" />
                <AlertTitle className="flex justify-between">
                  <span>{notification.title}</span>
                  <span className="text-sm text-gray-500">
                    {new Date(notification.createdAt).toLocaleDateString()}
                  </span>
                </AlertTitle>
                <AlertDescription className="mt-2 space-y-2">
                  <p>{notification.message}</p>
                  <p className="text-sm text-gray-500">
                    Sent to: {notification.username} ({notification.userEmail})
                  </p>
                  <div className="flex justify-end mt-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteNotification.mutate(notification.id)}
                      disabled={deleteNotification.isPending}
                    >
                      {deleteNotification.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-2" />
                      )}
                      Delete
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
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
            <form onSubmit={form.handleSubmit(onPlanSubmit)} className="space-y-4">
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
                      Enter features as a JSON array of strings. Each feature should be enclosed in quotes and separated by commas.
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