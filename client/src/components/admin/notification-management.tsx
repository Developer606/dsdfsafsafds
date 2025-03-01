import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Bell, Users, Send, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

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

  // Fetch all users for the user selector
  const { data: users = [] } = useQuery({
    queryKey: ["/api/admin/users"],
  });

  // Fetch notification history
  const { data: notifications = [] } = useQuery<NotificationWithUser[]>({
    queryKey: ["/api/admin/notifications/all"],
  });

  // Mutation for sending notification to specific user
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
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notifications/all"] });
      setTitle("");
      setMessage("");
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send notification"
      });
    },
  });

  // Mutation for broadcasting to all users
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
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notifications/all"] });
      setTitle("");
      setMessage("");
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to broadcast notification"
      });
    },
  });

  const handleSendToUser = () => {
    if (!selectedUser) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a user"
      });
      return;
    }
    if (!title || !message) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all fields"
      });
      return;
    }
    sendToUserMutation.mutate();
  };

  const handleBroadcast = () => {
    if (!title || !message) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all fields"
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
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Search className="w-4 h-4 text-gray-500" />
            <Input
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="space-y-4">
            {filteredNotifications.map((notification) => (
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
                </AlertDescription>
              </Alert>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}