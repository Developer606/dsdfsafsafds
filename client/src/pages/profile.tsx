import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Edit, 
  Mail, 
  Calendar, 
  Clock, 
  User, 
  Info, 
  CreditCard, 
  ShieldCheck, 
  ShieldAlert,
  Sparkles
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ProfileEditDialog } from "@/components/profile-edit-dialog";
import { ProfileImageUpload } from "@/components/profile-image-upload";
import { useToast } from "@/hooks/use-toast";
import type { UserProfile } from "@/components/profile-edit-dialog";

export default function ProfilePage() {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();
  
  // Fetch user data
  const { data: user, isLoading, error } = useQuery<UserProfile>({
    queryKey: ["/api/user"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-red-500 text-xl mb-4">Unable to load profile</div>
        <p className="text-muted-foreground mb-4">
          Please try refreshing the page or login again.
        </p>
        <Button onClick={() => window.location.href = "/login"}>
          Go to Login
        </Button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-xl mb-4">Please log in to view your profile</div>
        <Button onClick={() => window.location.href = "/login"}>
          Go to Login
        </Button>
      </div>
    );
  }

  // Format subscription expiry date if exists
  const formattedExpiryDate = user.subscriptionExpiresAt 
    ? new Date(user.subscriptionExpiresAt).toLocaleDateString() 
    : "N/A";

  // Generate user initials for avatar fallback
  const userInitials = user.fullName 
    ? user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
    : user.username.substring(0, 2).toUpperCase();

  // Helper function to determine subscription badge color
  const getSubscriptionBadgeColor = (status?: string) => {
    switch(status) {
      case "active":
        return "bg-green-500 hover:bg-green-600";
      case "trial":
        return "bg-blue-500 hover:bg-blue-600";
      case "cancelled":
        return "bg-yellow-500 hover:bg-yellow-600";
      case "expired":
        return "bg-red-500 hover:bg-red-600";
      default:
        return "bg-gray-500 hover:bg-gray-600";
    }
  };

  return (
    <div className="container max-w-5xl py-6 space-y-6">
      {/* Profile Header */}
      <div className="relative w-full bg-gradient-to-r from-primary/20 via-primary/10 to-primary/5 rounded-lg p-6 mb-6">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10 opacity-50 rounded-lg" />
        <div className="relative flex flex-col sm:flex-row items-center gap-6">
          <div className="w-full sm:w-auto">
            <ProfileImageUpload 
              currentImage={user.profilePicture} 
              username={user.username}
            />
          </div>
          
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-3xl font-bold">{user.fullName || user.username}</h1>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>{user.email}</span>
              </div>
              {user.subscriptionTier && (
                <Badge className={`${getSubscriptionBadgeColor(user.subscriptionStatus)}`}>
                  <Sparkles className="h-3 w-3 mr-1" />
                  {user.subscriptionTier.charAt(0).toUpperCase() + user.subscriptionTier.slice(1)}
                </Badge>
              )}
            </div>
            <p className="mt-4 max-w-2xl">
              {user.bio || "No bio provided yet. Click the edit button to add information about yourself."}
            </p>
          </div>
          
          <Button 
            className="sm:absolute sm:top-4 sm:right-4"
            onClick={() => setIsEditDialogOpen(true)}
            variant="outline"
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit Profile
          </Button>
        </div>
      </div>
      
      {/* Profile Tabs */}
      <Tabs defaultValue="about" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="about">About</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
        </TabsList>
        
        {/* About Tab */}
        <TabsContent value="about" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Your basic account details and personal information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    Username
                  </span>
                  <p className="text-lg">{user.username}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    Email
                  </span>
                  <p className="text-lg">{user.email}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    Full Name
                  </span>
                  <p className="text-lg">{user.fullName || "Not provided"}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    Age
                  </span>
                  <p className="text-lg">{user.age || "Not provided"}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    Gender
                  </span>
                  <p className="text-lg">
                    {user.gender 
                      ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1) 
                      : "Not provided"}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-muted-foreground" />
                    Profile Status
                  </span>
                  <div className="flex items-center gap-2">
                    {user.profileCompleted ? (
                      <>
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 hover:bg-green-500/20 hover:text-green-700">
                          Complete
                        </Badge>
                        <ShieldCheck className="h-4 w-4 text-green-600" />
                      </>
                    ) : (
                      <>
                        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 hover:text-yellow-700">
                          Incomplete
                        </Badge>
                        <ShieldAlert className="h-4 w-4 text-yellow-600" />
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  About Me
                </h3>
                <p className="text-muted-foreground">
                  {user.bio || "No bio provided yet. Click the edit button to add information about yourself."}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Account Activity</CardTitle>
              <CardDescription>Your recent account activity and usage statistics.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    Account Created
                  </span>
                  <p className="text-lg">
                    {user.createdAt ? formatDistanceToNow(new Date(user.createdAt), { addSuffix: true }) : "Unknown"}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    Last Login
                  </span>
                  <p className="text-lg">
                    {user.lastLoginAt ? formatDistanceToNow(new Date(user.lastLoginAt), { addSuffix: true }) : "Unknown"}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    Email Verified
                  </span>
                  <div className="flex items-center gap-2">
                    {user.isEmailVerified ? (
                      <>
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 hover:bg-green-500/20 hover:text-green-700">
                          Verified
                        </Badge>
                        <ShieldCheck className="h-4 w-4 text-green-600" />
                      </>
                    ) : (
                      <>
                        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 hover:text-yellow-700">
                          Not Verified
                        </Badge>
                        <ShieldAlert className="h-4 w-4 text-yellow-600" />
                      </>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    Message Count
                  </span>
                  <p className="text-lg">{user.messageCount || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Subscription Tab */}
        <TabsContent value="subscription" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Subscription Details</CardTitle>
              <CardDescription>Your current subscription plan and payment information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    Current Plan
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {user.subscriptionTier 
                        ? `${user.subscriptionTier.charAt(0).toUpperCase() + user.subscriptionTier.slice(1)} Plan`
                        : "Free Plan"}
                    </span>
                    {user.subscriptionTier && (
                      <Badge variant="secondary">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Premium
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    Status
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge className={`${getSubscriptionBadgeColor(user.subscriptionStatus)}`}>
                      {user.subscriptionStatus 
                        ? user.subscriptionStatus.charAt(0).toUpperCase() + user.subscriptionStatus.slice(1) 
                        : "N/A"}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    Expiry Date
                  </span>
                  <p className="text-lg">{formattedExpiryDate}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    Characters Created
                  </span>
                  <p className="text-lg">{user.trialCharactersCreated || 0} / {user.subscriptionTier ? "Unlimited" : "5"}</p>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex justify-center pt-4">
                <Button size="lg" className="w-full md:w-auto">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Manage Subscription
                </Button>
              </div>
            </CardContent>
            <CardFooter className="bg-primary/5 text-sm text-muted-foreground">
              <p>
                Need help with your subscription? Contact our support team at support@example.com
              </p>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Profile Edit Dialog */}
      <ProfileEditDialog 
        user={user}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      />
    </div>
  );
}