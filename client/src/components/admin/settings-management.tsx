import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Save, Plus, Trash2, Key, User, Lock, Mail, RefreshCw } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

// API Key schema
const apiKeySchema = z.object({
  service: z.string().min(1, "Service name is required"),
  key: z.string().min(1, "API key is required"),
  description: z.string().optional(),
});

// Profile update schema
const profileUpdateSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Please enter a valid email address"),
});

// Password update schema
const passwordUpdateSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Please confirm your new password"),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "New passwords do not match",
  path: ["confirmPassword"],
});

export function SettingsManagement() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("apiKeys");
  const [isNewKeyDialogOpen, setIsNewKeyDialogOpen] = useState(false);

  // Define interface for API key
  interface ApiKey {
    id: number;
    service: string;
    key: string;
    description?: string;
    createdAt: string;
    updatedAt?: string;
  }
  
  // API Keys Tab
  const { data: apiKeys = [], isLoading: isLoadingApiKeys, refetch: refetchApiKeys } = useQuery<ApiKey[]>({
    queryKey: ["/api/admin/api-keys"],
    staleTime: 60000, // 1 minute
  });

  const apiKeyForm = useForm({
    resolver: zodResolver(apiKeySchema),
    defaultValues: {
      service: "",
      key: "",
      description: "",
    },
  });

  const addApiKey = useMutation({
    mutationFn: async (data: z.infer<typeof apiKeySchema>) => {
      const res = await apiRequest("POST", "/api/admin/api-keys", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/api-keys"] });
      toast({
        title: "Success",
        description: "API key added successfully",
      });
      apiKeyForm.reset();
      setIsNewKeyDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add API key",
        variant: "destructive",
      });
    },
  });

  const onSubmitApiKey = (data: z.infer<typeof apiKeySchema>) => {
    addApiKey.mutate(data);
  };

  // Define interface for admin profile
  interface AdminProfile {
    id: number;
    username: string;
    email: string;
    createdAt: string;
    updatedAt?: string;
  }
  
  // Admin Profile Tab
  const { data: adminProfile, isLoading: isLoadingProfile } = useQuery<AdminProfile>({
    queryKey: ["/api/admin/profile"],
    staleTime: 60000, // 1 minute
  });

  const profileForm = useForm({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      username: "",
      email: "",
    },
  });

  // Set form values when profile data is loaded
  useEffect(() => {
    if (adminProfile) {
      profileForm.reset({
        username: adminProfile.username,
        email: adminProfile.email,
      });
    }
  }, [adminProfile]);

  const updateProfile = useMutation({
    mutationFn: async (data: z.infer<typeof profileUpdateSchema>) => {
      const res = await apiRequest("PATCH", "/api/admin/profile", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/profile"] });
      toast({
        title: "Success",
        description: "Admin profile updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const onSubmitProfile = (data: z.infer<typeof profileUpdateSchema>) => {
    updateProfile.mutate(data);
  };

  // Password Update Tab
  const passwordForm = useForm({
    resolver: zodResolver(passwordUpdateSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const updatePassword = useMutation({
    mutationFn: async (data: z.infer<typeof passwordUpdateSchema>) => {
      const res = await apiRequest("PATCH", "/api/admin/profile", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Password updated successfully",
      });
      passwordForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update password",
        variant: "destructive",
      });
    },
  });

  const onSubmitPassword = (data: z.infer<typeof passwordUpdateSchema>) => {
    updatePassword.mutate(data);
  };

  if (isLoadingApiKeys || isLoadingProfile) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin Settings</CardTitle>
        <CardDescription>
          Manage API keys, admin credentials, and security settings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="apiKeys" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              API Keys
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Admin Profile
            </TabsTrigger>
            <TabsTrigger value="password" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Change Password
            </TabsTrigger>
          </TabsList>

          {/* API Keys Tab Content */}
          <TabsContent value="apiKeys">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">API Keys Management</h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetchApiKeys()}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </Button>
                  <Button
                    onClick={() => setIsNewKeyDialogOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add API Key
                  </Button>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>API Key</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiKeys.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4">
                        No API keys found. Add your first API key to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    apiKeys.map((apiKey) => (
                      <TableRow key={apiKey.id}>
                        <TableCell className="font-medium">{apiKey.service}</TableCell>
                        <TableCell>
                          <code className="bg-muted p-1 rounded">
                            {apiKey.key.substring(0, 8)}...
                          </code>
                        </TableCell>
                        <TableCell>{apiKey.description || "-"}</TableCell>
                        <TableCell>
                          {apiKey.updatedAt
                            ? new Date(apiKey.updatedAt).toLocaleString()
                            : new Date(apiKey.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              apiKeyForm.reset({
                                service: apiKey.service,
                                key: apiKey.key,
                                description: apiKey.description || "",
                              });
                              setIsNewKeyDialogOpen(true);
                            }}
                          >
                            Update
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Admin Profile Tab Content */}
          <TabsContent value="profile">
            <Form {...profileForm}>
              <form
                onSubmit={profileForm.handleSubmit(onSubmitProfile)}
                className="space-y-6"
              >
                <FormField
                  control={profileForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="admin" {...field} />
                      </FormControl>
                      <FormDescription>
                        This is your admin login username
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={profileForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="admin@example.com"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Your admin email address for notifications
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full md:w-auto"
                  disabled={updateProfile.isPending}
                >
                  {updateProfile.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save Profile Changes
                </Button>
              </form>
            </Form>
          </TabsContent>

          {/* Password Change Tab Content */}
          <TabsContent value="password">
            <Form {...passwordForm}>
              <form
                onSubmit={passwordForm.handleSubmit(onSubmitPassword)}
                className="space-y-6"
              >
                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Password must be at least 8 characters
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={passwordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full md:w-auto"
                  disabled={updatePassword.isPending}
                >
                  {updatePassword.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Update Password
                </Button>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Add New API Key Dialog */}
      <Dialog open={isNewKeyDialogOpen} onOpenChange={setIsNewKeyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add API Key</DialogTitle>
            <DialogDescription>
              Enter the details for the new API key.
            </DialogDescription>
          </DialogHeader>

          <Form {...apiKeyForm}>
            <form
              onSubmit={apiKeyForm.handleSubmit(onSubmitApiKey)}
              className="space-y-4"
            >
              <FormField
                control={apiKeyForm.control}
                name="service"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="GITHUB_TOKEN"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      A unique identifier for this API key (e.g., "GITHUB_TOKEN", "AZURE_API_KEY")
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={apiKeyForm.control}
                name="key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>API Key</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter the API key value"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={apiKeyForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="What this API key is used for"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="submit" disabled={addApiKey.isPending}>
                  {addApiKey.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save API Key
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}