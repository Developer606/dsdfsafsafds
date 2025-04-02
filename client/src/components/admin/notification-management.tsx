import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
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
import { format } from "date-fns";
import { Bell, Search, Trash2, RefreshCw, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";

// Type definition for notification data
interface NotificationData {
  id: number;
  userId: number;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  username?: string;
  userEmail?: string;
}

// Create type map outside component to avoid recreation
const TYPE_COLORS = {
  admin_reply: "bg-blue-100 text-blue-800",
  update: "bg-green-100 text-green-800",
  feature: "bg-purple-100 text-purple-800",
  default: "bg-gray-100 text-gray-800"
};

// Date format constant
const DATE_FORMAT = "MMM d, yyyy h:mm a";

export function NotificationManagement() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTab, setSelectedTab] = useState("all");
  const [notificationToDelete, setNotificationToDelete] = useState<number | null>(null);

  // Query to fetch all notifications with their user details
  // Ultra-optimized refresh settings to minimize resource usage
  const { 
    data: notifications = [], 
    isLoading,
    isError, 
    refetch 
  } = useQuery<NotificationData[]>({
    queryKey: ["/api/admin/notifications/all"],
    refetchInterval: 30000, // Increased to 30 seconds to significantly reduce network load
    staleTime: 20000, // Increased stale time to 20 seconds to prevent excessive refetches
    refetchOnWindowFocus: false, // Disable automatic refetch on window focus to save resources
    gcTime: 1800000, // Set GC time to 30 minutes to improve memory efficiency (similar to old cacheTime)
  });

  // Mutation for deleting notification
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      await apiRequest("DELETE", `/api/admin/notifications/${notificationId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Notification deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notifications/all"] });
      setNotificationToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete notification",
        variant: "destructive",
      });
    },
  });

  // Filter notifications with memoization to avoid recomputation
  const filteredNotifications = useMemo(() => {
    if (!notifications.length) return [];
    
    const lowerSearchTerm = searchTerm.toLowerCase();
    const needsSearch = lowerSearchTerm.length > 0;
    
    // Fast path for no filters
    if (!needsSearch && selectedTab === "all") return notifications;
    
    // Optimized filtering with early returns
    return notifications.filter(notification => {
      // Only check search term if it exists
      if (needsSearch) {
        const titleMatch = notification.title.toLowerCase().includes(lowerSearchTerm);
        const messageMatch = notification.message.toLowerCase().includes(lowerSearchTerm);
        const usernameMatch = notification.username?.toLowerCase().includes(lowerSearchTerm) || false;
        const emailMatch = notification.userEmail?.toLowerCase().includes(lowerSearchTerm) || false;
        
        if (!(titleMatch || messageMatch || usernameMatch || emailMatch)) {
          return false;
        }
      }
      
      // Filter by read status
      if (selectedTab === "read" && !notification.read) return false;
      if (selectedTab === "unread" && notification.read) return false;
      
      return true;
    });
  }, [notifications, searchTerm, selectedTab]);

  // Handle notification deletion with useCallback to avoid recreation
  const handleDeleteNotification = useCallback((id: number) => {
    setNotificationToDelete(id);
  }, []);

  // Confirm deletion with useCallback
  const confirmDelete = useCallback(() => {
    if (notificationToDelete) {
      deleteNotificationMutation.mutate(notificationToDelete);
    }
  }, [notificationToDelete, deleteNotificationMutation]);

  // Get badge color based on notification type - optimized with lookup
  const getTypeColor = useCallback((type: string) => {
    return TYPE_COLORS[type as keyof typeof TYPE_COLORS] || TYPE_COLORS.default;
  }, []);

  // Format date for display - implemented with useCallback
  const formatDate = useCallback((dateString: string) => {
    try {
      return format(new Date(dateString), DATE_FORMAT);
    } catch (e) {
      return "Invalid date";
    }
  }, []);

  return (
    <Card className="w-full">
      <CardHeader className="border-b pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">Notification Management</CardTitle>
            <CardDescription>
              View and manage all system notifications
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="flex flex-col space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full md:w-auto">
              <TabsList className="grid w-full grid-cols-3 md:w-[300px]">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="read">Read</TabsTrigger>
                <TabsTrigger value="unread">Unread</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {isLoading ? (
            <div className="w-full py-20 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <Bell className="h-8 w-8 animate-pulse text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading notifications...</p>
              </div>
            </div>
          ) : isError ? (
            <div className="w-full py-20 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <Info className="h-8 w-8 text-destructive" />
                <p className="text-sm text-muted-foreground">Failed to load notifications</p>
                <Button size="sm" variant="outline" onClick={() => refetch()}>
                  Try Again
                </Button>
              </div>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="w-full py-20 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <Bell className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No notifications found</p>
              </div>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredNotifications.map((notification) => (
                    <TableRow key={notification.id}>
                      <TableCell>
                        <Badge className={getTypeColor(notification.type)}>
                          {notification.type === "admin_reply" ? "Admin Reply" :
                           notification.type === "update" ? "Update" :
                           notification.type === "feature" ? "New Feature" : notification.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="max-w-[200px] truncate" title={notification.title}>
                          {notification.title}
                        </div>
                        <div className="text-xs text-muted-foreground max-w-[200px] truncate" title={notification.message}>
                          {notification.message}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{notification.username || "Unknown"}</div>
                        <div className="text-xs text-muted-foreground">{notification.userEmail || "No email"}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={notification.read ? "outline" : "default"}>
                          {notification.read ? "Read" : "Unread"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatDate(notification.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleDeleteNotification(notification.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Notification</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this notification? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={confirmDelete}
                                className="bg-destructive text-destructive-foreground"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}