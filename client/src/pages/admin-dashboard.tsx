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
import { Ban, Lock, Trash2, UnlockIcon, UserPlus, Users, Crown, Loader2, MessageSquare, Palette, MessageCircle, AlertCircle } from "lucide-react";
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
} from "recharts";
import { type Complaint } from "@shared/schema";
import { Link } from "wouter";

export default function AdminDashboard() {
  const { toast } = useToast();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/admin/dashboard/stats"],
    refetchInterval: 30000,
  });

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    refetchInterval: 30000,
  });

  const { data: recentMessages, isLoading: messagesLoading } = useQuery({
    queryKey: ["/api/admin/messages/recent"],
    refetchInterval: 30000,
  });

  const { data: characterStats, isLoading: charactersLoading } = useQuery({
    queryKey: ["/api/admin/characters/stats"],
    refetchInterval: 30000,
  });

  const { data: feedback, isLoading: feedbackLoading } = useQuery<Feedback[]>({
    queryKey: ["/api/admin/feedback"],
    refetchInterval: 30000,
  });

  const { data: complaints, isLoading: complaintsLoading } = useQuery<Complaint[]>({
    queryKey: ["/api/admin/complaints"],
    refetchInterval: 30000,
  });

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

  const subscriptionData = users ? [
    { name: 'Free', value: users.filter(u => !u.isPremium).length },
    { name: 'Premium', value: users.filter(u => u.isPremium).length },
  ] : [];

  const userStatusData = users ? [
    { name: 'Active', value: users.filter(u => !u.isBlocked && !u.isRestricted).length },
    { name: 'Blocked', value: users.filter(u => u.isBlocked).length },
    { name: 'Restricted', value: users.filter(u => u.isRestricted).length },
  ] : [];

  const COLORS = ['#00f2fe', '#4facfe', '#0080ff', '#00bcd4'];

  if (statsLoading || usersLoading || messagesLoading || charactersLoading || feedbackLoading || complaintsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black/90">
        <div className="relative">
          <Loader2 className="h-12 w-12 animate-spin text-cyan-500" />
          <div className="absolute inset-0 blur-xl bg-cyan-500/20 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black/90 text-cyan-50">
      <div className="container mx-auto p-8 space-y-8">
        <div className="flex items-center justify-between p-6 border border-cyan-500/20 rounded-lg bg-black/40 backdrop-blur-xl">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 animate-pulse">
            System Control Interface
          </h1>
          <div className="flex items-center gap-4">
            <Link href="/admin/dashboard/complaints">
              <Button variant="outline" className="gap-2 border-cyan-500/50 bg-black/50 hover:bg-cyan-950/50 text-cyan-400">
                <AlertCircle className="h-4 w-4" />
                Incident Reports
                {complaints?.length ? (
                  <span className="ml-1 px-2 py-0.5 text-xs bg-red-900/50 text-red-400 rounded-full border border-red-500/50">
                    {complaints.length}
                  </span>
                ) : null}
              </Button>
            </Link>
            <Link href="/admin/dashboard/feedback">
              <Button variant="outline" className="gap-2 border-cyan-500/50 bg-black/50 hover:bg-cyan-950/50 text-cyan-400">
                <MessageCircle className="h-4 w-4" />
                User Feedback
                {feedback?.length ? (
                  <span className="ml-1 px-2 py-0.5 text-xs bg-blue-900/50 text-blue-400 rounded-full border border-blue-500/50">
                    {feedback.length}
                  </span>
                ) : null}
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6 bg-black/40 border-cyan-500/20 backdrop-blur-xl hover:bg-cyan-950/20 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium mb-2 text-cyan-400">Total Users</h3>
              <Users className="h-5 w-5 text-cyan-500 group-hover:animate-pulse" />
            </div>
            <p className="text-3xl font-bold text-cyan-400">{stats?.totalUsers ?? 0}</p>
            <div className="h-1 w-full bg-gradient-to-r from-cyan-500 to-blue-500 mt-4 rounded-full" />
          </Card>

          <Card className="p-6 bg-black/40 border-cyan-500/20 backdrop-blur-xl hover:bg-cyan-950/20 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium mb-2 text-cyan-400">Active Users (24h)</h3>
              <UserPlus className="h-5 w-5 text-cyan-500 group-hover:animate-pulse" />
            </div>
            <p className="text-3xl font-bold text-cyan-400">{stats?.activeUsers ?? 0}</p>
            <div className="h-1 w-full bg-gradient-to-r from-cyan-500 to-blue-500 mt-4 rounded-full" />
          </Card>

          <Card className="p-6 bg-black/40 border-cyan-500/20 backdrop-blur-xl hover:bg-cyan-950/20 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium mb-2 text-cyan-400">Premium Users</h3>
              <Crown className="h-5 w-5 text-cyan-500 group-hover:animate-pulse" />
            </div>
            <p className="text-3xl font-bold text-cyan-400">{stats?.premiumUsers ?? 0}</p>
            <div className="h-1 w-full bg-gradient-to-r from-cyan-500 to-blue-500 mt-4 rounded-full" />
          </Card>

          <Card className="p-6 bg-black/40 border-cyan-500/20 backdrop-blur-xl hover:bg-cyan-950/20 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium mb-2 text-cyan-400">Total Characters</h3>
              <Palette className="h-5 w-5 text-cyan-500 group-hover:animate-pulse" />
            </div>
            <p className="text-3xl font-bold text-cyan-400">{characterStats?.totalCharacters ?? 0}</p>
            <div className="h-1 w-full bg-gradient-to-r from-cyan-500 to-blue-500 mt-4 rounded-full" />
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 bg-black/40 border-cyan-500/20 backdrop-blur-xl">
            <h3 className="text-lg font-medium mb-4 text-cyan-400">Subscription Analysis</h3>
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
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(0,242,254,0.2)' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-6 bg-black/40 border-cyan-500/20 backdrop-blur-xl">
            <h3 className="text-lg font-medium mb-4 text-cyan-400">User Status Matrix</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={userStatusData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,242,254,0.1)" />
                  <XAxis dataKey="name" stroke="#00f2fe" />
                  <YAxis stroke="#00f2fe" />
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(0,242,254,0.2)' }} />
                  <Legend />
                  <Bar dataKey="value" fill="#00f2fe">
                    {userStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <Card className="bg-black/40 border-cyan-500/20 backdrop-blur-xl">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-cyan-400">Communication Log</h2>
              <MessageSquare className="h-5 w-5 text-cyan-500" />
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-cyan-500/20">
                    <TableHead className="text-cyan-400">User</TableHead>
                    <TableHead className="text-cyan-400">Character</TableHead>
                    <TableHead className="text-cyan-400">Message</TableHead>
                    <TableHead className="text-cyan-400">Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentMessages?.map((message: any) => (
                    <TableRow key={message.id} className="border-cyan-500/20 hover:bg-cyan-950/20">
                      <TableCell className="text-cyan-300">{message.username}</TableCell>
                      <TableCell className="text-cyan-300">{message.characterName}</TableCell>
                      <TableCell className="max-w-md truncate text-cyan-300">{message.content}</TableCell>
                      <TableCell className="text-cyan-300">
                        {new Date(message.timestamp).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </Card>

        <Card className="bg-black/40 border-cyan-500/20 backdrop-blur-xl">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-cyan-400">User Control Matrix</h2>
                <p className="text-sm text-cyan-500/70 mt-1">
                  Manage system access and permissions
                </p>
              </div>
              <Users className="h-5 w-5 text-cyan-500" />
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-cyan-500/20">
                    <TableHead className="text-cyan-400">Username</TableHead>
                    <TableHead className="text-cyan-400">Email</TableHead>
                    <TableHead className="text-cyan-400">Status</TableHead>
                    <TableHead className="text-cyan-400">Subscription</TableHead>
                    <TableHead className="text-cyan-400">Last Login</TableHead>
                    <TableHead className="text-cyan-400">Characters</TableHead>
                    <TableHead className="text-cyan-400">Created</TableHead>
                    <TableHead className="text-cyan-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.map((user) => (
                    <TableRow key={user.id} className="border-cyan-500/20 hover:bg-cyan-950/20">
                      <TableCell className="font-medium text-cyan-300">{user.username}</TableCell>
                      <TableCell className="text-cyan-300">{user.email}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {user.isBlocked && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-900/50 text-red-400 border border-red-500/50">
                              Blocked
                            </span>
                          )}
                          {user.isRestricted && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-900/50 text-yellow-400 border border-yellow-500/50">
                              Restricted
                            </span>
                          )}
                          {!user.isBlocked && !user.isRestricted && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/50 text-green-400 border border-green-500/50">
                              Active
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="w-full justify-start border-cyan-500/50 bg-black/50 hover:bg-cyan-950/50 text-cyan-400">
                              <div className="flex flex-col items-start gap-1">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  user.isPremium ? 'bg-purple-900/50 text-purple-400 border border-purple-500/50' : 'bg-gray-900/50 text-gray-400 border border-gray-500/50'
                                }`}>
                                  {user.isPremium ? 'Premium' : 'Free'}
                                </span>
                                {user.subscriptionTier && (
                                  <span className="text-xs text-cyan-500/70">
                                    {user.subscriptionTier}
                                  </span>
                                )}
                              </div>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[200px] bg-black/90 border-cyan-500/20">
                            <DropdownMenuLabel className="text-cyan-400">Modify Access Level</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-cyan-500/20" />
                            <DropdownMenuItem
                              onClick={() => updateSubscription.mutate({
                                userId: user.id,
                                planId: 'free'
                              })}
                            >
                              Free Plan
                            </DropdownMenuItem>
                            {(Object.keys(subscriptionPlans) as SubscriptionTier[]).map((tier) => (
                              <DropdownMenuItem
                                key={subscriptionPlans[tier].id}
                                onClick={() => updateSubscription.mutate({
                                  userId: user.id,
                                  planId: subscriptionPlans[tier].id
                                })}
                              >
                                {subscriptionPlans[tier].name}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                      <TableCell className="text-cyan-300">
                        <div className="flex flex-col">
                          <span>
                            {user.lastLoginAt
                              ? new Date(user.lastLoginAt).toLocaleDateString()
                              : "Never"}
                          </span>
                          {user.lastLoginAt && (
                            <span className="text-xs text-cyan-500/70">
                              {new Date(user.lastLoginAt).toLocaleTimeString()}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-cyan-300">{user.trialCharactersCreated}</TableCell>
                      <TableCell className="text-cyan-300">
                        <div className="flex flex-col">
                          <span>
                            {new Date(user.createdAt).toLocaleDateString()}
                          </span>
                          <span className="text-xs text-cyan-500/70">
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
                            className="data-[state=checked]:bg-red-500"
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
                            className="border-cyan-500/50 bg-black/50 hover:bg-cyan-950/50 text-cyan-400"
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
                                className="bg-red-900/50 hover:bg-red-900 border-red-500/50"
                              >
                                {deleteUser.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-black/90 border-cyan-500/20">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-cyan-400">Terminate User Access</AlertDialogTitle>
                                <AlertDialogDescription className="text-cyan-300">
                                  This action will permanently remove all user data and cannot be undone.
                                  Proceed with caution.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="bg-transparent border-cyan-500/50 text-cyan-400 hover:bg-cyan-950/50">Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteUser.mutate(user.id)}
                                  className="bg-red-900/50 hover:bg-red-900 border-red-500/50 text-red-400"
                                >
                                  Confirm Deletion
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
    </div>
  );
}