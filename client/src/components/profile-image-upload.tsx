import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Camera, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface ProfileImageUploadProps {
  currentImage?: string | null;
  username: string;
}

export function ProfileImageUpload({ currentImage, username }: ProfileImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Create initials for avatar fallback
  const initials = username
    ? username.slice(0, 2).toUpperCase()
    : "U";
  
  // Handle file selection and upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPG, PNG, GIF, or WebP image.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }
    
    // Upload the file
    try {
      setIsUploading(true);
      setUploadProgress(10);
      
      const formData = new FormData();
      formData.append('profilePicture', file);
      
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 300);
      
      const response = await fetch('/api/user/profile-picture', {
        method: 'POST',
        body: formData,
        // Don't set Content-Type here, it will be automatically set with the correct boundary by the browser
      });
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }
      
      const data = await response.json();
      
      // Update the user data in React Query cache
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      
      toast({
        title: "Profile picture updated",
        description: "Your profile picture has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload profile picture. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };
  
  return (
    <Card className="relative p-4 flex flex-col items-center">
      <div className="relative">
        <Avatar className="w-32 h-32 border-4 border-primary/20">
          <AvatarImage src={currentImage || undefined} alt={username} />
          <AvatarFallback className="text-xl bg-primary/10 text-primary">{initials}</AvatarFallback>
        </Avatar>
        
        {/* Upload progress overlay */}
        {isUploading && (
          <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
            <div className="text-white text-center">
              <Loader2 className="animate-spin h-8 w-8 mx-auto mb-2" />
              <div className="text-xs">{uploadProgress}%</div>
            </div>
          </div>
        )}
        
        {/* Upload button overlay */}
        <label 
          htmlFor="profile-pic-upload" 
          className="absolute bottom-0 right-0 p-1 rounded-full bg-primary text-white cursor-pointer"
        >
          <input
            type="file"
            id="profile-pic-upload"
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
            disabled={isUploading}
          />
          <Camera className="h-5 w-5" />
        </label>
      </div>
      
      <div className="mt-4 text-center w-full">
        <label 
          htmlFor="profile-pic-upload-btn" 
          className="w-full"
        >
          <Button 
            variant="outline" 
            className="w-full"
            disabled={isUploading}
          >
            <input
              type="file"
              id="profile-pic-upload-btn"
              className="hidden"
              accept="image/*"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                {currentImage ? "Change Picture" : "Upload Picture"}
              </>
            )}
          </Button>
        </label>
      </div>
    </Card>
  );
}