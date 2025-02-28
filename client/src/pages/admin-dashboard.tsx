import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { User, subscriptionPlans, type SubscriptionTier, type Feedback } from "@shared/schema";
import { Ban, Lock, Trash2, UnlockIcon, UserPlus, Users, Crown, Loader2, MessageSquare, Palette, MessageCircle, AlertCircle, Plus, Pencil } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";


export default function AdminDashboard() {
  const { toast } = useToast();

  // Enhanced stats query to include more metrics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/admin/dashboard/stats"],
    refetchInterval: 30000,
  });

  // Query for users with enhanced information
  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    refetchInterval: 30000,
  });

  // New query for recent messages
  const { data: recentMessages, isLoading: messagesLoading } = useQuery({
    queryKey: ["/api/admin/messages/recent"],
    refetchInterval: 30000,
  });

  // New query for character stats
  const { data: characterStats, isLoading: charactersLoading } = useQuery({
    queryKey: ["/api/admin/characters/stats"],
    refetchInterval: 30000,
  });

  // New query for feedback
  const { data: feedback, isLoading: feedbackLoading } = useQuery<Feedback[]>({
    queryKey: ["/api/admin/feedback"],
    refetchInterval: 30000,
  });

  // Add new query for complaints
  const { data: complaints, isLoading: complaintsLoading } = useQuery<Complaint[]>({
    queryKey: ["/api/admin/complaints"],
    refetchInterval: 30000,
  });

  // New queries for analytics
  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ["/api/admin/analytics/activity"],
    refetchInterval: 30000,
  });

  const { data: messageVolume, isLoading: messageVolumeLoading } = useQuery({
    queryKey: ["/api/admin/analytics/messages"],
    refetchInterval: 30000,
  });

  const { data: characterPopularity, isLoading: characterPopularityLoading } = useQuery({
    queryKey: ["/api/admin/analytics/characters/popularity"],
    refetchInterval: 30000,
  });

  // Existing mutations...
  const blockUser = useMutation({
    mutationFn: async ({ userId, blocked }: { userId: number; blocked: boolean }) => {
      const res = await apiRequest("POST", `/api/admin/users/${userId}/block`, { blocked });
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

  // Other existing mutations remain unchanged...
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

  const restrictUser = useMutation({
    mutationFn: async ({ userId, restricted }: { userId: number; restricted: boolean }) => {
      const res = await apiRequest("POST", `/api/admin/users/${userId}/restrict`, { restricted });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "User subscription updated successfully",
      });
    },
  });

  // Enhanced data preparation for charts
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

  const [editPlanDialogOpen, setEditPlanDialogOpen] = useState(false);
  const [newPlanDialogOpen, setNewPlanDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{
    id: string;
    name: string;
    price: string;
    features: string[];
  } | null>(null);
  const [newPlan, setNewPlan] = useState({
    name: "",
    price: "$0.00",
    features: [""],
  });

  // Add the mutation for updating plans
  const updatePlan = useMutation({
    mutationFn: async (plan: typeof selectedPlan) => {
      const res = await apiRequest("PATCH", `/api/admin/subscription-plans/${plan!.id}`, plan);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Plan updated successfully",
      });
      setEditPlanDialogOpen(false);
    },
  });

  // Add the mutation for adding new plans
  const addPlan = useMutation({
    mutationFn: async (plan: typeof newPlan) => {
      const res = await apiRequest("POST", "/api/admin/subscription-plans", plan);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Plan added successfully",
      });
      setNewPlanDialogOpen(false);
      setNewPlan({ name: "", price: "$0.00", features: [""] });
    },
  });

  // Add the mutation for deleting plans
  const deletePlan = useMutation({
    mutationFn: async (planId: string) => {
      const res = await apiRequest("DELETE", `/api/admin/subscription-plans/${planId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Plan deleted successfully",
      });
    },
  });

  const handleUpdatePlan = () => {
    if (!selectedPlan) return;
    updatePlan.mutate(selectedPlan);
  };

  const handleAddPlan = () => {
    addPlan.mutate(newPlan);
  };

  const handleDeletePlan = (planId: string) => {
    deletePlan.mutate(planId);
  };

  if (
    statsLoading ||
    usersLoading ||
    messagesLoading ||
    charactersLoading ||
    feedbackLoading ||
    complaintsLoading ||
    activityLoading ||
    messageVolumeLoading ||
    characterPopularityLoading
  ) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">Admin Dashboard</h1>
        <div className="flex items-center gap-4">
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
          <div className="flex items-center gap-2">
            {(statsLoading || usersLoading) && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
            <span className="text-sm text-muted-foreground">
              Auto-refreshing every 30 seconds
            </span>
          </div>
        </div>
      </div>

      {/* Enhanced Statistics Cards */}
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

      {/* Charts Section */}
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

      {/* Activity Heatmap Section */}
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

      {/* Message Volume Analysis */}
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

      {/* Recent Messages Section */}
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


      {/* Add new subscription management section before the last closing Card */}
      {/* Subscription Plans Management Section */}
      <Card className="mt-8">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold">Subscription Plans Management</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Manage subscription plans, pricing, and features
              </p>
            </div>
            <Button
              onClick={() => {
                setNewPlanDialogOpen(true);
              }}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add New Plan
            </Button>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan Name</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Features</TableHead>
                  <TableHead>Active Users</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(subscriptionPlans).map(([id, plan]) => (
                  <TableRow key={id}>
                    <TableCell>{plan.name}</TableCell>
                    <TableCell>{plan.price}</TableCell>
                    <TableCell>
                      <div className="max-w-xs space-y-1">
                        {(() => {
                          try {
                            const featuresList = plan.features ? JSON.parse(plan.features) : [];
                            return featuresList.map((feature: string, i: number) => (
                              <div key={i} className="text-sm truncate">
                                • {feature}
                              </div>
                            ));
                          } catch (e) {
                            console.error('Error parsing features:', e);
                            return <div className="text-sm text-red-500">Invalid features data</div>;
                          }
                        })()}
                      </div>
                    </TableCell>
                    <TableCell>
                      {stats?.planStats?.[id] || 0} users
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedPlan({ id, ...plan });
                            setEditPlanDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={id === "free"}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Plan</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this plan? Users currently subscribed to this plan will be moved to the free plan.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeletePlan(id)}>
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

      {/* Plan Edit Dialog */}
      <Dialog open={editPlanDialogOpen} onOpenChange={setEditPlanDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Subscription Plan</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Plan Name</Label>
              <Input
                id="name"
                value={selectedPlan?.name || ""}
                onChange={(e) =>
                  setSelectedPlan((prev) => ({ ...prev!, name: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="price">Price ($/month)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={selectedPlan?.price.replace(/[^\d.]/g, "") || ""}
                onChange={(e) =>
                  setSelectedPlan((prev) => ({ ...prev!, price: `$${e.target.value}` }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>Features</Label>
              <div className="space-y-2">
                {selectedPlan?.features.map((feature: string, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={feature}
                      onChange={(e) => {
                        const newFeatures = [...selectedPlan.features];
                        newFeatures[index] = e.target.value;
                        setSelectedPlan((prev) => ({ ...prev!, features: newFeatures }));
                      }}
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => {
                        const newFeatures = selectedPlan.features.filter((_, i) => i !== index);
                        setSelectedPlan((prev) => ({ ...prev!, features: newFeatures }));
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedPlan((prev) => ({
                      ...prev!,
                      features: [...prev!.features, ""],
                    }));
                  }}
                >
                  Add Feature
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPlanDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdatePlan}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Plan Dialog */}
      <Dialog open={newPlanDialogOpen} onOpenChange={setNewPlanDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Subscription Plan</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="newName">Plan Name</Label>
              <Input
                id="newName"
                value={newPlan.name}
                onChange={(e) => setNewPlan((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="newPrice">Price ($/month)</Label>
              <Input
                id="newPrice"
                type="number"
                step="0.01"
                value={newPlan.price.replace(/[^\d.]/g, "")}
                onChange={(e) => setNewPlan((prev) => ({ ...prev, price: `$${e.target.value}` }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Features</Label>
              <div className="space-y-2">
                {newPlan.features.map((feature: string, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={feature}
                      onChange={(e) => {
                        const newFeatures = [...newPlan.features];
                        newFeatures[index] = e.target.value;
                        setNewPlan((prev) => ({ ...prev, features: newFeatures }));
                      }}
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => {
                        const newFeatures = newPlan.features.filter((_, i) => i !== index);
                        setNewPlan((prev) => ({ ...prev, features: newFeatures }));
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  onClick={() => {
                    setNewPlan((prev) => ({
                      ...prev,
                      features: [...prev.features, ""],
                    }));
                  }}
                >
                  Add Feature
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewPlanDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddPlan}>Add Plan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Management Section - Enhanced */}
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
                          {user.lastLoginAt
                            ? new Date(user.lastLoginAt).toLocaleDateString()
                            : "Never"}
                        </span>
                        {user.lastLoginAt && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(user.lastLoginAt).toLocaleTimeString()}
                          </span>
                        )}
                      </div>                    </TableCell>
                    <TableCell>{user.trialCharactersCreated}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>
                          {new Date(user.createdAt).toLocaleDateString()}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(user.createdAt).toLocaleTimeString()}                        </span>
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
                              <AlertDialogAction onClick={() => deleteUser.mutate(user.id)}>
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
    </div>
  );
}