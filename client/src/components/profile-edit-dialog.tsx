import { useState, useEffect, useRef } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle, Upload, Camera, Image } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Define form validation schema
const profileSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  fullName: z.string().min(1, "Full name is required"),
  age: z.coerce.number().min(13, "You must be at least 13 years old"),
  gender: z.string().min(1, "Gender is required"),
  bio: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface UserProfile {
  id: number;
  username: string;
  fullName: string | null;
  age: number | null;
  gender: string | null;
  bio: string | null;
  profilePicture: string | null;
  // Add other fields that might be needed
}

interface ProfileEditDialogProps {
  open: boolean;
  onClose: () => void;
  user: UserProfile;
}

export function ProfileEditDialog({
  open,
  onClose,
  user,
}: ProfileEditDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [usernameAvailable, setUsernameAvailable] = useState(true);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameChanged, setUsernameChanged] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(user?.profilePicture);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize form with user data
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: user?.username || "",
      fullName: user?.fullName || "",
      age: user?.age || 18,
      gender: user?.gender || "",
      bio: user?.bio || "",
    },
  });

  // Reset form when dialog opens/closes or user changes
  useEffect(() => {
    if (open && user) {
      console.log("Loading user data:", user);
      
      // Reset form with user data
      form.reset({
        username: user.username || "",
        fullName: user.fullName || "",
        age: user.age || 18,
        gender: user.gender || "",
        bio: user.bio || "",
      });
      
      // Reset profile picture
      setProfilePictureUrl(user.profilePicture);
      
      // Log the form values after reset
      console.log("Form values after reset:", form.getValues());
      
      setUsernameChanged(false);
      setUsernameAvailable(true);
    }
  }, [open, user, form]);
  
  // Handle uploading a profile picture
  const handleProfilePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    
    const file = e.target.files[0];
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({
        variant: "destructive",
        title: "Invalid file",
        description: "Please upload a valid image file (JPEG, PNG, GIF, or WebP).",
      });
      return;
    }
    
    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Please upload an image smaller than 5MB.",
      });
      return;
    }
    
    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append("profilePicture", file);
      
      const response = await fetch("/api/profile-picture/upload", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error("Failed to upload profile picture");
      }
      
      const data = await response.json();
      setProfilePictureUrl(data.url);
      
      // Invalidate user query to update the profile picture in the UI
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      
      toast({
        title: "Profile picture updated",
        description: "Your profile picture has been updated successfully.",
      });
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload profile picture.",
      });
    } finally {
      setUploading(false);
    }
  };
  
  // Handle profile picture from URL
  const handleProfilePictureFromUrl = async (url: string) => {
    if (!url) return;
    
    setUploading(true);
    
    try {
      const response = await fetch("/api/profile-picture/from-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageUrl: url }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to update profile picture from URL");
      }
      
      const data = await response.json();
      setProfilePictureUrl(data.url);
      
      // Invalidate user query to update the profile picture in the UI
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      
      toast({
        title: "Profile picture updated",
        description: "Your profile picture has been updated successfully.",
      });
    } catch (error) {
      console.error("Error updating profile picture from URL:", error);
      toast({
        variant: "destructive",
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update profile picture from URL.",
      });
    } finally {
      setUploading(false);
    }
  };

  // Check if username is available
  const checkUsername = async (username: string) => {
    if (username === user.username) {
      setUsernameAvailable(true);
      return true;
    }

    setCheckingUsername(true);
    try {
      const response = await fetch(`/api/auth/check-username/${username}`);
      const data = await response.json();
      setUsernameAvailable(data.available);
      setCheckingUsername(false);
      return data.available;
    } catch (error) {
      console.error("Error checking username:", error);
      setCheckingUsername(false);
      return false;
    }
  };

  // Handle username change
  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUsername = e.target.value;
    form.setValue("username", newUsername);
    
    if (newUsername !== user.username) {
      setUsernameChanged(true);
      // Debounce username check
      const timeoutId = setTimeout(() => {
        checkUsername(newUsername);
      }, 500);
      
      return () => clearTimeout(timeoutId);
    } else {
      setUsernameChanged(false);
      setUsernameAvailable(true);
    }
  };

  // Update profile mutation
  const updateProfile = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      // If username changed, verify it's available
      if (data.username !== user.username) {
        const isAvailable = await checkUsername(data.username);
        if (!isAvailable) {
          throw new Error("Username is already taken");
        }

        // Update username first
        await apiRequest("POST", "/api/user/username", {
          username: data.username,
        });
      }

      // Update other profile fields
      const response = await apiRequest("POST", "/api/user/profile", {
        fullName: data.fullName,
        age: data.age,
        gender: data.gender,
        bio: data.bio,
      });

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update profile",
      });
    },
  });

  // Form submission handler
  const onSubmit = (data: ProfileFormValues) => {
    updateProfile.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-gray-900 text-white border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-xl text-white">Edit Profile</DialogTitle>
          <DialogDescription className="text-gray-400">
            Update your profile information below.
          </DialogDescription>
        </DialogHeader>

        {/* Profile Picture Uploader */}
        <div className="mb-6 flex flex-col items-center">
          <div className="relative mb-4">
            <Avatar className="h-24 w-24 border-2 border-gray-700">
              <AvatarImage 
                src={profilePictureUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`} 
                alt={user.username} 
              />
              <AvatarFallback className="bg-gradient-to-br from-purple-600 to-indigo-600 text-white text-xl">
                {user.username.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
              disabled={uploading}
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload
            </Button>
            
            {/* Input for file upload (hidden) */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleProfilePictureUpload}
              className="hidden"
              accept="image/jpeg,image/png,image/gif,image/webp"
            />
            
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const url = prompt("Enter image URL");
                if (url) handleProfilePictureFromUrl(url);
              }}
              className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
              disabled={uploading}
            >
              <Image className="mr-2 h-4 w-4" />
              From URL
            </Button>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        className="bg-gray-800 border-gray-700"
                        onChange={handleUsernameChange}
                      />
                      {usernameChanged && (
                        <div className="absolute right-3 top-2.5">
                          {checkingUsername ? (
                            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                          ) : !usernameAvailable ? (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          ) : null}
                        </div>
                      )}
                    </div>
                  </FormControl>
                  {usernameChanged && !checkingUsername && !usernameAvailable && (
                    <p className="text-sm text-red-500 mt-1">
                      This username is already taken
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input {...field} className="bg-gray-800 border-gray-700" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="age"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Age</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      min={13}
                      className="bg-gray-800 border-gray-700"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gender</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-gray-800 border-gray-700">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="non-binary">Non-binary</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="prefer-not-to-say">
                        Prefer not to say
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      className="bg-gray-800 border-gray-700 resize-none h-24"
                      placeholder="Tell us about yourself..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  updateProfile.isPending ||
                  (usernameChanged && !usernameAvailable)
                }
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {updateProfile.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}