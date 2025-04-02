import { useState, useCallback, memo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Bell, Users, Send, Calendar } from "lucide-react";
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
import { format } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type NotificationType = 'admin_reply' | 'update' | 'feature';

// Types to ensure proper typing for broadcasts and reduce unknown types
interface ScheduledBroadcast {
  id: number;
  title: string;
  message: string;
  type: string;
  scheduledFor: string;
}

interface UserBasicInfo {
  id: number;
  username: string;
  email: string;
}

// Memoized user selector component to prevent re-renders
const MemoizedUserSelector = memo(({ 
  users = [] as UserBasicInfo[],
  value = "", 
  onChange 
}: { 
  users: UserBasicInfo[];
  value: string;
  onChange: (value: string) => void;
}) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger>
      <SelectValue placeholder="Select user (optional)" />
    </SelectTrigger>
    <SelectContent>
      {users.map((user) => (
        <SelectItem key={user.id} value={String(user.id)}>
          {user.username} ({user.email})
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
));

MemoizedUserSelector.displayName = "MemoizedUserSelector";

// Memory-optimized notification popover
export function NotificationPopover() {
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [notificationType, setNotificationType] = useState<NotificationType>("admin_reply");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState("");

  // Memory-optimized user query with proper type and caching settings
  const { data: users = [] } = useQuery<UserBasicInfo[]>({
    queryKey: ["/api/admin/users"],
    staleTime: 60000, // Cache for 1 minute 
    select: (data) => 
      // Only extract the fields we need to reduce memory footprint
      data.map(({ id, username, email }) => ({ id, username, email })),
    refetchOnWindowFocus: false,
  });

  // Memory-optimized scheduled broadcasts query with proper type
  const { data: scheduledBroadcasts = [] } = useQuery<ScheduledBroadcast[]>({
    queryKey: ["/api/admin/broadcasts/scheduled"],
    staleTime: 30000,
    refetchInterval: 60000, // Reduced from 30s to 60s
    refetchOnWindowFocus: false,
  });

  // Cleanup function to reset form - extracted to avoid recreating on every render
  const resetForm = useCallback(() => {
    setTitle("");
    setMessage("");
  }, []);
  
  const resetScheduleForm = useCallback(() => {
    setTitle("");
    setMessage("");
    setDate(undefined);
    setTime("");
  }, []);

  // Memory-optimized mutation with reduced closure scope
  const sendToUserMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUser || !title || !message) return;
      
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
      resetForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send notification",
        variant: "destructive",
      });
    },
  });

  // Memory-optimized broadcast mutation
  const broadcastMutation = useMutation({
    mutationFn: async () => {
      if (!title || !message) return;
      
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
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to broadcast notification",
        variant: "destructive",
      });
    },
  });

  // Memory-optimized schedule broadcast mutation
  const scheduleBroadcastMutation = useMutation({
    mutationFn: async () => {
      if (!date || !time || !title || !message) {
        throw new Error("All fields are required");
      }

      const [hours, minutes] = time.split(':');
      const scheduledDate = new Date(date);
      scheduledDate.setHours(parseInt(hours, 10));
      scheduledDate.setMinutes(parseInt(minutes, 10));

      await apiRequest(
        "POST",
        "/api/admin/broadcasts/schedule",
        {
          title,
          message,
          type: notificationType,
          scheduledFor: scheduledDate.toISOString()
        }
      );
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Broadcast scheduled successfully",
        variant: "default"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/broadcasts/scheduled"] });
      resetScheduleForm();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to schedule broadcast",
        variant: "destructive",
      });
    },
  });

  // Optimized delete broadcast mutation with minimal state
  const deleteScheduledBroadcastMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/broadcasts/scheduled/${id}`),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Scheduled broadcast deleted successfully",
        variant: "default"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/broadcasts/scheduled"] });
    },
  });

  // Memoized handlers to prevent recreation on every render
  const handleSendToUser = useCallback(() => {
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
  }, [selectedUser, title, message, sendToUserMutation, toast]);

  const handleBroadcast = useCallback(() => {
    if (!title || !message) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    broadcastMutation.mutate();
  }, [title, message, broadcastMutation, toast]);

  const handleScheduleBroadcast = useCallback(() => {
    if (!title || !message || !date || !time) {
      toast({
        title: "Error",
        description: "Please fill in all fields including date and time",
        variant: "destructive",
      });
      return;
    }
    scheduleBroadcastMutation.mutate();
  }, [title, message, date, time, scheduleBroadcastMutation, toast]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {scheduledBroadcasts.length > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] font-medium text-white flex items-center justify-center">
              {scheduledBroadcasts.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-4">
        <Tabs defaultValue="send">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="send">Send Now</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
          </TabsList>

          <TabsContent value="send" className="space-y-4">
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

            <MemoizedUserSelector
              users={users}
              value={selectedUser}
              onChange={setSelectedUser}
            />

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
          </TabsContent>

          <TabsContent value="schedule" className="space-y-4">
            <div>
              <h4 className="font-medium leading-none mb-4">Schedule Broadcast</h4>

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
                className="mt-4"
              />

              <Textarea
                placeholder="Notification Message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[100px] mt-4"
              />

              <div className="flex gap-4 mt-4">
                <div className="flex-1">
                  <CalendarComponent
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    className="rounded-md border"
                  />
                </div>
                <div className="flex-1">
                  <Input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>

              <Button
                className="w-full mt-4"
                onClick={handleScheduleBroadcast}
                disabled={scheduleBroadcastMutation.isPending}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Schedule Broadcast
              </Button>
            </div>

            {scheduledBroadcasts.length > 0 && (
              <div className="mt-6">
                <h5 className="font-medium mb-2">Scheduled Broadcasts</h5>
                <div className="space-y-2">
                  {scheduledBroadcasts.map((broadcast: ScheduledBroadcast) => (
                    <div
                      key={broadcast.id}
                      className="flex items-center justify-between p-2 bg-secondary rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{broadcast.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(broadcast.scheduledFor), 'PPp')}
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteScheduledBroadcastMutation.mutate(broadcast.id)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}