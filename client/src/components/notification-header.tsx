import { useState } from "react";
import { Bell } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: 'admin_reply' | 'update' | 'feature';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

export function NotificationHeader() {
  // This would typically come from an API/database
  const [notifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'update',
      title: 'New App Update',
      message: "We've added new character customization features!",
      timestamp: new Date(),
      read: false
    },
    {
      id: '2',
      type: 'feature',
      title: 'New Feature Available',
      message: 'Try out our new multilingual chat support',
      timestamp: new Date(Date.now() - 86400000),
      read: false
    }
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="w-full bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-gray-800">
      <div className="container mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img 
              src="/images/logo.png" 
              alt="AnimeChat" 
              className="h-8 w-8"
            />
            <span className="text-lg font-semibold text-[#075e54] dark:text-[#00a884]">
              AnimeChat
            </span>
          </div>
          
          <Popover>
            <PopoverTrigger asChild>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <Bell className="h-6 w-6 text-[#075e54] dark:text-[#00a884]" />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 h-5 w-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </motion.button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-[#075e54] dark:text-[#00a884]">
                  Notifications
                </h3>
              </div>
              <AnimatePresence>
                {notifications.length > 0 ? (
                  <div className="max-h-[300px] overflow-y-auto">
                    {notifications.map((notification) => (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className={cn(
                          "p-4 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors",
                          !notification.read && "bg-blue-50 dark:bg-blue-900/10"
                        )}
                      >
                        <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100">
                          {notification.title}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {notification.message}
                        </p>
                        <span className="text-xs text-gray-500 dark:text-gray-500 mt-2 block">
                          {new Date(notification.timestamp).toLocaleDateString()}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                    No notifications
                  </div>
                )}
              </AnimatePresence>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}