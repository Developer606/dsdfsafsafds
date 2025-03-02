import { useState, useRef } from "react";
import { Bell, AlertCircle, Image as ImageIcon, X } from "lucide-react";
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

interface Notification {
  id: string;
  type: 'admin_reply' | 'update' | 'feature';
  title: string;
  message: string;
  createdAt: Date; // Changed timestamp to createdAt
  read: boolean;
}

export function NotificationHeader() {
  const [showComplaintDialog, setShowComplaintDialog] = useState(false);
  const [complaint, setComplaint] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Query notifications from the API
  const { data: notifications = [], refetch: refetchNotifications } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
  });

  // Add mutation for marking notifications as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => { // Changed to string
      await apiRequest("PATCH", `/api/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
    onError: () => {
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
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
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

  // Add query to get user data with proper type
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
      formData.append('name', user.username); // Now properly typed
      formData.append('email', user.email); // Now properly typed
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

          <div className="flex items-center gap-4">
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
                          onClick={() => markAsReadMutation.mutate(notification.id)}
                        >
                          <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100">
                            {notification.title}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {notification.message}
                          </p>
                          <span className="text-xs text-gray-500 dark:text-gray-500 mt-2 block">
                            {new Date(notification.createdAt).toLocaleDateString()}
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

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowComplaintDialog(true)}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-2 text-[#075e54] dark:text-[#00a884]"
            >
              <AlertCircle className="h-6 w-6" />
            </motion.button>
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