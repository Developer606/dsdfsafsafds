import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { 
  Settings, 
  User as UserIcon, 
  Calendar, 
  Mail, 
  Star, 
  Edit, 
  Award,
  Clock,
  UserPlus,
  MessageCircle,
  Users
} from "lucide-react";
import { ProfileEditDialog } from "@/components/profile-edit-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { type User } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ProfilePage() {
  const [showProfileEditDialog, setShowProfileEditDialog] = useState(false);

  // Fetch user data from API
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  // Get subscription tier display name
  const getSubscriptionDisplay = () => {
    if (!user) return "Basic";
    if (user.subscriptionStatus === 'trial') return 'Free Trial';
    
    switch (user.subscriptionTier) {
      case 'premium':
        return 'Premium';
      case 'pro':
        return 'Professional';
      default:
        return 'Basic';
    }
  };

  // Get subscription badge color
  const getSubscriptionColor = () => {
    if (!user) return "bg-gray-700";
    if (user.subscriptionStatus === 'trial') return 'bg-blue-900 text-blue-300';
    
    switch (user.subscriptionTier) {
      case 'premium':
        return 'bg-amber-900 text-amber-300';
      case 'pro':
        return 'bg-purple-900 text-purple-300';
      default:
        return 'bg-gray-700 text-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 pb-16">
      {/* Profile Header */}
      <div className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto py-8 px-4">
          {isLoading ? (
            <div className="flex items-center gap-4">
              <Skeleton className="h-20 w-20 rounded-full" />
              <div>
                <Skeleton className="h-7 w-48 mb-2" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          ) : user ? (
            <div className="flex items-center">
              <div className="mr-6">
                <div className="relative">
                  <Avatar className="h-20 w-20 border-2 border-gray-200 dark:border-gray-700 shadow-md">
                    <AvatarImage 
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName || user.username)}&background=random&color=fff`} 
                      alt={user.username} 
                    />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xl">
                      {user.username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <Badge className={`absolute -bottom-2 right-0 ${getSubscriptionColor()} px-2 py-0.5 text-xs`}>
                    {getSubscriptionDisplay()}
                  </Badge>
                </div>
              </div>
              
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {user.fullName || user.username}
                    </h1>
                    
                    <p className="text-gray-500 dark:text-gray-400">
                      @{user.username}
                    </p>
                  </div>
                  
                  <Button
                    onClick={() => setShowProfileEditDialog(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    size="sm"
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Profile
                  </Button>
                </div>
                
                <div className="flex flex-wrap gap-2 mt-3">
                  {user.email && (
                    <Badge variant="outline" className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-2 py-1 flex items-center text-xs">
                      <Mail className="h-3 w-3 mr-1" />
                      {user.email}
                    </Badge>
                  )}
                  
                  {user.gender && (
                    <Badge variant="outline" className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-2 py-1 flex items-center text-xs">
                      <UserIcon className="h-3 w-3 mr-1" />
                      {user.gender}
                    </Badge>
                  )}
                  
                  {user.age && (
                    <Badge variant="outline" className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-2 py-1 flex items-center text-xs">
                      <Calendar className="h-3 w-3 mr-1" />
                      {user.age} years old
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">Unable to load profile information.</p>
          )}
        </div>
      </div>
      
      {/* Profile Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="about" className="w-full">
          <TabsList className="w-full max-w-md mx-auto mb-6 flex border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
            <TabsTrigger value="about" className="flex-1 py-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">About</TabsTrigger>
            <TabsTrigger value="activity" className="flex-1 py-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">Activity</TabsTrigger>
            <TabsTrigger value="subscription" className="flex-1 py-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">Subscription</TabsTrigger>
          </TabsList>
          
          {/* About Tab */}
          <TabsContent value="about" className="space-y-6">
            <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-sm">
              <CardContent className="pt-6">
                {isLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-4/5" />
                    <Skeleton className="h-5 w-2/3" />
                  </div>
                ) : user ? (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Bio</h3>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                      {user.bio || 'No bio provided yet. Click the Edit Profile button to add some information about yourself.'}
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400">Unable to load profile information.</p>
                )}
              </CardContent>
            </Card>
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center mb-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mr-3">
                      <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <p className="text-base font-medium text-gray-900 dark:text-white">Connections</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">12</p>
                  <p className="text-blue-600 dark:text-blue-400 text-sm mt-1">+3 new this week</p>
                </CardContent>
              </Card>
              
              <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center mb-3">
                    <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mr-3">
                      <MessageCircle className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <p className="text-base font-medium text-gray-900 dark:text-white">Messages</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">248</p>
                  <p className="text-purple-600 dark:text-purple-400 text-sm mt-1">24 unread</p>
                </CardContent>
              </Card>
              
              <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center mb-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mr-3">
                      <Star className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <p className="text-base font-medium text-gray-900 dark:text-white">Favorites</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">7</p>
                  <p className="text-amber-600 dark:text-amber-400 text-sm mt-1">Characters saved</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
            
            {/* Activity Tab */}
            <TabsContent value="activity">
              <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-sm">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-6 text-gray-900 dark:text-white">Recent Activity</h3>
                  
                  <div className="space-y-6">
                    {[1, 2, 3].map((_, index) => (
                      <div key={index} className="border-l-2 border-blue-500 pl-4 pb-6 relative">
                        <div className="w-3 h-3 rounded-full bg-blue-500 absolute -left-[6.5px] top-0"></div>
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {index === 0 ? 'Chat with Sakura' : index === 1 ? 'Created a new character' : 'Updated profile'}
                            </h4>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                              {index === 0 
                                ? 'You had a conversation about your favorite anime.' 
                                : index === 1 
                                ? 'You created a custom character named "Shadow Ninja".' 
                                : 'You updated your profile information.'}
                            </p>
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {index === 0 ? '2 hours ago' : index === 1 ? 'Yesterday' : '3 days ago'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Subscription Tab */}
            <TabsContent value="subscription">
              <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Your Subscription</h3>
                    
                    <Link href="/plans">
                      <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                        Upgrade Plan
                      </Button>
                    </Link>
                  </div>
                  
                  {isLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-8 w-48 mb-2" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-4/5" />
                    </div>
                  ) : user ? (
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                      <div className="flex items-center mb-4">
                        <div className={`p-3 rounded-lg ${
                          user.subscriptionTier === 'pro' 
                            ? 'bg-purple-100 dark:bg-purple-900/30' 
                            : user.subscriptionTier === 'premium' 
                            ? 'bg-amber-100 dark:bg-amber-900/30' 
                            : 'bg-blue-100 dark:bg-blue-900/30'
                        } mr-4`}>
                          <Award className={`h-6 w-6 ${
                            user.subscriptionTier === 'pro' 
                              ? 'text-purple-600 dark:text-purple-400' 
                              : user.subscriptionTier === 'premium' 
                              ? 'text-amber-600 dark:text-amber-400' 
                              : 'text-blue-600 dark:text-blue-400'
                          }`} />
                        </div>
                        
                        <div>
                          <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                            {user.subscriptionStatus === 'trial' 
                              ? 'Free Trial'
                              : user.subscriptionTier === 'pro' 
                              ? 'Professional Plan' 
                              : user.subscriptionTier === 'premium' 
                              ? 'Premium Plan' 
                              : 'Basic Plan'}
                          </h4>
                          
                          <div className="flex items-center mt-1">
                            <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-1" />
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {user.subscriptionExpiresAt 
                                ? `Expires ${new Date(user.subscriptionExpiresAt).toLocaleDateString()}`
                                : 'No expiration date'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-3 mt-6">
                        <div className="flex items-center">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 mr-3">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <span className="text-gray-700 dark:text-gray-300">Access to all basic characters</span>
                        </div>
                        
                        <div className="flex items-center">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 mr-3">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <span className="text-gray-700 dark:text-gray-300">Up to {
                            user.subscriptionTier === 'pro' 
                              ? '50' 
                              : user.subscriptionTier === 'premium' 
                              ? '25' 
                              : '15'
                          } saved conversations</span>
                        </div>
                        
                        {(user.subscriptionTier === 'premium' || user.subscriptionTier === 'pro') && (
                          <div className="flex items-center">
                            <div className="w-5 h-5 rounded-full flex items-center justify-center bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 mr-3">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <span className="text-gray-700 dark:text-gray-300">Advanced character customization</span>
                          </div>
                        )}
                        
                        {user.subscriptionTier === 'pro' && (
                          <div className="flex items-center">
                            <div className="w-5 h-5 rounded-full flex items-center justify-center bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 mr-3">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <span className="text-gray-700 dark:text-gray-300">Priority support & early access features</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400">Unable to load subscription information.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
        </Tabs>
      </div>
      
      {/* Floating action button for mobile */}
      <div className="fixed right-4 bottom-4 md:hidden">
        <Button 
          onClick={() => setShowProfileEditDialog(true)}
          className="h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg"
          size="icon"
        >
          <Edit className="h-6 w-6" />
        </Button>
      </div>
      
      {/* Profile Edit Dialog */}
      {!isLoading && user && (
        <ProfileEditDialog
          open={showProfileEditDialog}
          onClose={() => setShowProfileEditDialog(false)}
          user={{
            id: user.id,
            username: user.username,
            fullName: user.fullName,
            age: user.age,
            gender: user.gender,
            bio: user.bio,
          }}
        />
      )}
    </div>
  );
}
