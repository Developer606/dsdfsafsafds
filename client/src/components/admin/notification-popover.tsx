import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Bell, Users, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { type User, type Notification } from "@shared/schema";

type NotificationType = 'admin_reply' | 'update' | 'feature';

export function NotificationPopover() {
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [notificationType, setNotificationType] = useState<NotificationType>("admin_reply");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  // Fetch all users for the user selector
  const { data: users = [] } = useQuery({
    queryKey: ["/api/admin/users"],
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
        variant: "default",
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

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-4">
        <div className="space-y-4">
          <h4 className="font-medium leading-none">Send Notification</h4>
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

          <Input
            placeholder="Notification Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <Textarea
            placeholder="Notification Message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-[100px]"
          />

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

          <div className="flex gap-2">
            <Button
              variant="outline"
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
              Broadcast
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
