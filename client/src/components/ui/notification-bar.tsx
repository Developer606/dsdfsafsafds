import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { type Notification } from '@shared/schema';

export function NotificationBar() {
  const { data: notifications } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
    refetchInterval: 5000, // Poll every 5 seconds
  });

  const markAsRead = useMutation({
    mutationFn: async (notificationId: number) => {
      const res = await apiRequest(
        'POST',
        `/api/notifications/${notificationId}/read`
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
  });

  const unreadCount = notifications?.filter(n => !n.isRead).length ?? 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] font-medium text-white flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        {notifications?.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No notifications
          </div>
        ) : (
          notifications?.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className={`flex flex-col items-start gap-1 p-4 ${
                !notification.isRead ? 'bg-accent' : ''
              }`}
              onClick={() => {
                if (!notification.isRead) {
                  markAsRead.mutate(notification.id);
                }
              }}
            >
              <div className="flex items-center gap-2">
                <span className="font-medium">{notification.title}</span>
                {!notification.isRead && (
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                )}
              </div>
              <p className="text-sm text-muted-foreground">{notification.message}</p>
              <span className="text-xs text-muted-foreground">
                {new Date(notification.createdAt).toLocaleString()}
              </span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
