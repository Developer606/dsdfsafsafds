import { useState, useRef, useEffect } from "react";
import { Bell, AlertCircle, Image as ImageIcon, X, Wifi, WifiOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { type User, type Notification } from "@shared/schema";
import { useNotificationSocket } from "./notification-socket-provider";

export function NotificationHeader() {
  const [showComplaintDialog, setShowComplaintDialog] = useState(false);
  const [complaint, setComplaint] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { isConnected } = useNotificationSocket();

  // Query notifications from the API
  const { data: notifications = [], refetch: refetchNotifications } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
  });

  // Add mutation for marking notifications as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number | string) => {
      console.log("Marking notification as read:", notificationId);
      return await apiRequest("PATCH", `/api/notifications/${notificationId}/read`);
    },
    onSuccess: (data) => {
      console.log("Successfully marked notification as read:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      
      // Show success toast for better user feedback
      toast({
        title: "Notification marked as read",
        description: "Your notification has been updated",
        variant: "default",
        duration: 2000
      });
    },
    onError: (error) => {
      console.error("Error marking notification as read:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to mark notification as read"
      });
    }
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Image size should be less than 5MB"
        });
        return;
      }

      if (!file.type.startsWith('image/')) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please select an image file"
        });
        return;
      }

      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Add query to get user data
  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  const handleComplaintSubmit = async () => {
    if (!complaint.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter your complaint before submitting"
      });
      return;
    }

    if (!user) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You must be logged in to submit a complaint"
      });
      return;
    }

    try {
      const formData = new FormData();
      formData.append('message', complaint);
      formData.append('name', user.username);
      formData.append('email', user.email);
      if (selectedImage) {
        formData.append('image', selectedImage);
      }

      const response = await fetch("/api/complaints", {
        method: "POST",
        body: formData
      });

      if (!response.ok) throw new Error();

      toast({
        title: "Success",
        description: "Your complaint has been submitted successfully. We'll review it shortly."
      });
      setComplaint("");
      setSelectedImage(null);
      setImagePreview(null);
      setShowComplaintDialog(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to submit complaint. Please try again."
      });
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full relative z-10">
      {/* Enhanced modern header with gradient and glass effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-indigo-500/20 dark:from-pink-900/30 dark:via-purple-900/30 dark:to-indigo-900/30 backdrop-blur-md"></div>
      
      <div className="container mx-auto relative">
        <div className="flex items-center justify-between py-4 px-6">
          {/* Logo and branding section */}
          <div className="flex items-center space-x-4">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-pink-600 to-purple-600 rounded-full opacity-70 group-hover:opacity-100 blur transition duration-200"></div>
              <div className="relative flex items-center justify-center rounded-full bg-white dark:bg-gray-900 p-1.5">
                <img
                  src="/images/logo.png"
                  alt="AnimeChat"
                  className="h-8 w-8"
                />
              </div>
            </div>
            
            <div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-600 to-purple-600 dark:from-pink-500 dark:to-purple-400">
                AnimeChat
              </span>
              <div className="text-xs text-gray-600 dark:text-gray-400">Where anime characters come to life</div>
            </div>
          </div>
          
          {/* Navigation Links - Center */}
          <div className="hidden md:flex items-center space-x-1">
            <a href="/" className="px-3 py-2 rounded-md text-sm font-medium text-gray-800 dark:text-gray-200 hover:bg-white/20 dark:hover:bg-gray-800/40 transition-colors">Home</a>
            <a href="/search" className="px-3 py-2 rounded-md text-sm font-medium text-gray-800 dark:text-gray-200 hover:bg-white/20 dark:hover:bg-gray-800/40 transition-colors">Browse</a>
            <a href="/library" className="px-3 py-2 rounded-md text-sm font-medium text-gray-800 dark:text-gray-200 hover:bg-white/20 dark:hover:bg-gray-800/40 transition-colors">My Library</a>
            <a href="/conversations" className="px-3 py-2 rounded-md text-sm font-medium text-gray-800 dark:text-gray-200 hover:bg-white/20 dark:hover:bg-gray-800/40 transition-colors">Messages</a>
          </div>
          
          {/* Right side actions */}
          <div className="flex items-center space-x-3">
            {/* Search button */}
            <motion.a
              href="/search"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative p-2 rounded-full bg-white/10 dark:bg-gray-800/30 hover:bg-white/20 dark:hover:bg-gray-800/50 backdrop-blur-sm shadow-sm transition-colors"
            >
              <svg 
                className="h-5 w-5 text-gray-700 dark:text-gray-300" 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </motion.a>
            
            {/* Notifications */}
            <Popover>
              <PopoverTrigger asChild>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative p-2 rounded-full bg-white/10 dark:bg-gray-800/30 hover:bg-white/20 dark:hover:bg-gray-800/50 backdrop-blur-sm shadow-sm transition-colors"
                >
                  <Bell className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                  {unreadCount > 0 && (
                    <motion.span 
                      initial={{ scale: 0 }}
                      animate={{ 
                        scale: [1, 1.1, 1],
                        opacity: [1, 0.85, 1]
                      }}
                      transition={{ 
                        repeat: Infinity,
                        repeatType: "reverse",
                        duration: 2,
                        ease: "easeInOut"
                      }}
                      className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center shadow-md border border-white dark:border-gray-800"
                    >
                      {unreadCount}
                    </motion.span>
                  )}
                  {/* Real-time connection indicator */}
                  <motion.span 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border border-white dark:border-gray-800"
                    title={isConnected ? "Real-time notifications connected" : "Real-time notifications offline"}
                    style={{ 
                      backgroundColor: isConnected ? '#10b981' : '#6b7280',
                    }}
                  />
                </motion.button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0 bg-white dark:bg-gray-900 border-0 shadow-xl rounded-xl">
                <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    <span className="text-pink-500 dark:text-pink-400">Notifications</span>
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
                            !notification.read && "bg-pink-50 dark:bg-pink-900/20"
                          )}
                          onClick={() => markAsReadMutation.mutate(notification.id.toString())}
                        >
                          <div className="flex gap-3">
                            <div className={`h-2 w-2 mt-2 rounded-full flex-shrink-0 ${!notification.read ? 'bg-pink-500' : 'bg-gray-300 dark:bg-gray-700'}`}></div>
                            <div>
                              <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100">
                                {notification.title}
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {notification.message}
                              </p>
                              <span className="text-xs text-gray-500 dark:text-gray-500 mt-2 block">
                                {new Date(notification.createdAt).toLocaleDateString()} · {new Date(notification.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-5 text-center text-gray-500 dark:text-gray-400">
                      <div className="inline-flex rounded-full bg-pink-100 dark:bg-pink-900/30 p-3 mb-3">
                        <Bell className="h-6 w-6 text-pink-500 dark:text-pink-400" />
                      </div>
                      <p>No notifications yet</p>
                    </div>
                  )}
                </AnimatePresence>
                
                {/* Connection status footer */}
                <div className="p-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-center">
                    <span className={`inline-block h-2 w-2 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                    {isConnected ? 'Real-time notifications active' : 'Real-time notifications offline'}
                  </div>
                  <button 
                    onClick={() => window.location.reload()}
                    className="text-gray-500 hover:text-pink-500 dark:hover:text-pink-400 transition-colors"
                    title="Refresh connection"
                  >
                    {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                  </button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Report button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowComplaintDialog(true)}
              className="relative p-2 rounded-full bg-white/10 dark:bg-gray-800/30 hover:bg-white/20 dark:hover:bg-gray-800/50 backdrop-blur-sm shadow-sm transition-colors"
              aria-label="Report an issue"
              title="Report an issue"
            >
              <AlertCircle className="h-5 w-5 text-gray-700 dark:text-gray-300" />
            </motion.button>
            
            {/* Profile with dropdown menu */}
            <Popover>
              <PopoverTrigger asChild>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-white/10 dark:bg-gray-800/30 hover:bg-white/20 dark:hover:bg-gray-800/50 backdrop-blur-sm shadow-sm transition-colors"
                  aria-label="Menu"
                >
                  <div className="h-6 w-6 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                    {user?.username?.charAt(0).toUpperCase() || 'A'}
                  </div>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {user?.username || 'Account'}
                  </span>
                  <svg 
                    className="h-4 w-4 text-gray-700 dark:text-gray-300"
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </motion.button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-0 bg-white dark:bg-gray-900 border-0 shadow-xl rounded-xl">
                <div className="py-3 px-4 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center text-white text-lg font-bold">
                      {user?.username?.charAt(0).toUpperCase() || 'A'}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">{user?.username}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</div>
                    </div>
                  </div>
                </div>
                <div className="py-2">
                  <a href="/profile" className="flex items-center px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800/70 text-gray-700 dark:text-gray-300 transition-colors">
                    <svg className="w-4 h-4 mr-3 text-gray-500 dark:text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    My Profile
                  </a>
                  <a href="/settings" className="flex items-center px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800/70 text-gray-700 dark:text-gray-300 transition-colors">
                    <svg className="w-4 h-4 mr-3 text-gray-500 dark:text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    Settings
                  </a>
                  <a href="/help" className="flex items-center px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800/70 text-gray-700 dark:text-gray-300 transition-colors">
                    <svg className="w-4 h-4 mr-3 text-gray-500 dark:text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                      <path d="M12 17h.01"></path>
                    </svg>
                    Help & FAQ
                  </a>
                  <a href="/subscription" className="flex items-center px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800/70 text-gray-700 dark:text-gray-300 transition-colors">
                    <svg className="w-4 h-4 mr-3 text-gray-500 dark:text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 9a3 3 0 0 1 0-6h20a3 3 0 0 1 0 6Z"></path>
                      <path d="M2 12h20"></path>
                      <path d="M2 15h20"></path>
                      <path d="M2 18h9"></path>
                    </svg>
                    Subscription
                  </a>
                  <hr className="my-1 border-gray-100 dark:border-gray-800" />
                  <a href="/logout" className="flex items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-800/70 transition-colors">
                    <svg className="w-4 h-4 mr-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                      <polyline points="16 17 21 12 16 7"></polyline>
                      <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                    Logout
                  </a>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      <Dialog open={showComplaintDialog} onOpenChange={setShowComplaintDialog}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="text-[#075e54] dark:text-[#00a884]">Submit a Complaint</DialogTitle>
            <DialogDescription>
              Tell us about any issues you're experiencing. We'll review and respond as soon as possible.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <Textarea
              placeholder="Describe your complaint here..."
              value={complaint}
              onChange={(e) => setComplaint(e.target.value)}
              className="min-h-[150px] border-gray-200 dark:border-gray-700 focus:border-[#00a884] dark:focus:border-[#00a884]"
            />

            <div className="space-y-2">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleImageSelect}
              />

              {imagePreview ? (
                <div className="relative rounded-lg overflow-hidden">
                  <img
                    src={imagePreview}
                    alt="Selected"
                    className="w-full h-40 object-cover"
                  />
                  <button
                    onClick={removeImage}
                    className="absolute top-2 right-2 bg-red-500 rounded-full p-1 hover:bg-red-600 transition-colors"
                  >
                    <X className="h-4 w-4 text-white" />
                  </button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-dashed border-2 hover:border-[#00a884] dark:hover:border-[#00a884] text-gray-500 dark:text-gray-400"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImageIcon className="h-5 w-5 mr-2" />
                  Attach Image
                </Button>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Supported formats: JPG, PNG, GIF (max 5MB)
              </p>
            </div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                onClick={handleComplaintSubmit}
                className="w-full bg-gradient-to-r from-[#00a884] to-[#008f6f] hover:from-[#008f6f] hover:to-[#007a5f] text-white"
              >
                Submit Complaint
              </Button>
            </motion.div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}