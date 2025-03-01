import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Bell, Users, Send, Search, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { type User, type Notification } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type NotificationType = 'admin_reply' | 'update' | 'feature';

interface NotificationWithUser {
  id: number;
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  username: string;
  userEmail: string;
}

export function NotificationManagement() {
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [notificationType, setNotificationType] = useState<NotificationType>("admin_reply");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: users = [] } = useQuery({
    queryKey: ["/api/admin/users"],
  });

  const { data: notifications = [] } = useQuery<NotificationWithUser[]>({
    queryKey: ["/api/admin/notifications/all"],
  });

  const { data: rawNotifications = [] } = useQuery({
    queryKey: ["/api/admin/notifications/raw"],
  });

  const { data: scheduledBroadcasts = [] } = useQuery({
    queryKey: ["/api/admin/broadcasts/raw"],
  });

  const { data: tableSchema = [] } = useQuery({
    queryKey: ["/api/admin/notifications/schema"],
  });

  const sendToUserMutation = useMutation({
    mutationFn: async () => {
      await apiRequest(
        "POST",
        `/api/admin/notifications/user/${selectedUser}`,
        { title, message, type: notificationType }
      );
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Notification sent successfully",
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notifications/all"] });
      setTitle("");
      setMessage("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send notification",
        variant: "destructive",
      });
    },
  });

  const broadcastMutation = useMutation({
    mutationFn: async () => {
      await apiRequest(
        "POST",
        "/api/admin/notifications/broadcast",
        { title, message, type: notificationType }
      );
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Notification broadcasted to all users",
        variant: "default"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notifications/all"] });
      setTitle("");
      setMessage("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to broadcast notification",
        variant: "destructive",
      });
    },
  });

  const deleteNotification = useMutation({
    mutationFn: async (notificationId: number) => {
      await apiRequest("DELETE", `/api/admin/notifications/${notificationId}`);
    },
    onSuccess: () => {
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

  const handleSendToUser = () => {
    if (!selectedUser) {
      toast({
        title: "Error",
        description: "Please select a user",
        variant: "destructive",
      });
      return;
    }
    if (!title || !message) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    sendToUserMutation.mutate();
  };

  const handleBroadcast = () => {
    if (!title || !message) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    broadcastMutation.mutate();
  };

  const filteredNotifications = notifications.filter(
    (n) =>
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Send Notification</CardTitle>
          <CardDescription>Send notifications to specific users or broadcast to all users</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Select
              value={notificationType}
              onValueChange={(value) => setNotificationType(value as NotificationType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select notification type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin_reply">Admin Reply</SelectItem>
                <SelectItem value="update">Update</SelectItem>
                <SelectItem value="feature">New Feature</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Input
              placeholder="Notification Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Textarea
              placeholder="Notification Message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Select
              value={selectedUser}
              onValueChange={setSelectedUser}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select user (optional)" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user: any) => (
                  <SelectItem key={user.id} value={String(user.id)}>
                    {user.username} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-4">
            <Button
              variant="default"
              className="flex-1"
              onClick={handleSendToUser}
              disabled={!selectedUser || sendToUserMutation.isPending}
            >
              <Send className="w-4 h-4 mr-2" />
              Send to User
            </Button>
            <Button
              variant="default"
              className="flex-1"
              onClick={handleBroadcast}
              disabled={broadcastMutation.isPending}
            >
              <Users className="w-4 h-4 mr-2" />
              Broadcast to All
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notification History</CardTitle>
          <CardDescription>View all sent notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Search className="w-4 h-4 text-gray-500" />
            <Input
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="space-y-4">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className="border rounded-lg p-4 space-y-2 bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      notification.type === 'update' ? 'bg-blue-100 text-blue-800' :
                      notification.type === 'feature' ? 'bg-green-100 text-green-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {notification.type}
                    </span>
                    <h3 className="text-lg font-semibold">{notification.title}</h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteNotification.mutate(notification.id)}
                    className="hover:bg-destructive/10"
                  >
                    <Bell className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">{notification.message}</p>
                <div className="flex justify-between items-center text-sm text-muted-foreground">
                  <span>Sent to: {notification.username} ({notification.userEmail})</span>
                  <span>{new Date(notification.createdAt).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Database Information</CardTitle>
          <CardDescription>View raw notification data and database structure</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Created At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rawNotifications.map((notification: any) => (
                <TableRow key={notification.id}>
                  <TableCell>{notification.id}</TableCell>
                  <TableCell>{notification.type}</TableCell>
                  <TableCell>{notification.title}</TableCell>
                  <TableCell>{notification.user_id}</TableCell>
                  <TableCell>{notification.formatted_date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}