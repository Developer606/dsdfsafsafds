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
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 pb-16">
      {/* Profile Header */}
      <div className="relative bg-gradient-to-r from-purple-900 to-indigo-900 pt-16 pb-24">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJ3aGl0ZSIgZmlsbC1ydWxlPSJldmVub2RkIj48cGF0aCBkPSJNMzYgMzRoLTJ2LTRoLTR2LTJoNHYtNGgydjRoNHYyaC00djR6Ii8+PHBhdGggZD0iTTAgMGg2MHY2MEgwVjB6TTMwIDYwYzE2LjU2OSAwIDMwLTEzLjQzMSAzMC0zMCAwLTE2LjU2OS0xMy40MzEtMzAtMzAtMzBDMTMuNDMxIDAgMCAxMy40MzEgMCAzMGMwIDE2LjU2OSAxMy40MzEgMzAgMzAgMzB6IiBmaWxsLXJ1bGU9Im5vbnplcm8iLz48L2c+PC9zdmc+')]"></div>
        
        <div className="container mx-auto px-4">
          <div className="flex justify-end mb-8">
            <Button
              onClick={() => setShowProfileEditDialog(true)}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm"
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
          </div>
          
          {isLoading ? (
            <div className="flex items-center gap-4">
              <Skeleton className="h-24 w-24 rounded-full" />
              <div>
                <Skeleton className="h-8 w-48 mb-2" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          ) : user ? (
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="relative"
              >
                <Avatar className="h-24 w-24 border-4 border-white/20 shadow-lg">
                  <AvatarImage 
                    src={user.profilePicture || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`} 
                    alt={user.username} 
                  />
                  <AvatarFallback className="bg-gradient-to-br from-purple-600 to-indigo-600 text-white text-xl">
                    {user.username.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <Badge className={`absolute -bottom-2 right-0 ${getSubscriptionColor()} px-3 py-1 border border-white/10`}>
                  {getSubscriptionDisplay()}
                </Badge>
              </motion.div>
              
              <div className="text-center sm:text-left">
                <motion.h1 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  className="text-3xl font-bold text-white mb-1"
                >
                  {user.fullName || user.username}
                </motion.h1>
                
                <motion.p 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                  className="text-indigo-200 mb-4"
                >
                  @{user.username}
                </motion.p>
                
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.3 }}
                  className="flex flex-wrap gap-3 justify-center sm:justify-start"
                >
                  <Badge variant="outline" className="bg-white/10 text-white border-white/20 px-3 py-1 flex items-center">
                    <Mail className="h-3 w-3 mr-1" />
                    {user.email}
                  </Badge>
                  
                  {user.gender && (
                    <Badge variant="outline" className="bg-white/10 text-white border-white/20 px-3 py-1 flex items-center">
                      <UserIcon className="h-3 w-3 mr-1" />
                      {user.gender}
                    </Badge>
                  )}
                  
                  {user.age && (
                    <Badge variant="outline" className="bg-white/10 text-white border-white/20 px-3 py-1 flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {user.age} years old
                    </Badge>
                  )}
                </motion.div>
              </div>
            </div>
          ) : (
            <p className="text-white/80">Unable to load profile information.</p>
          )}
        </div>
      </div>
      
      {/* Profile Content */}
      <div className="container mx-auto px-4 -mt-12">
        <Tabs defaultValue="about" className="w-full">
          <TabsList className="w-full max-w-md mx-auto grid grid-cols-3 bg-gray-800/50 backdrop-blur-md border border-gray-700">
            <TabsTrigger value="about" className="data-[state=active]:bg-purple-600">About</TabsTrigger>
            <TabsTrigger value="activity" className="data-[state=active]:bg-purple-600">Activity</TabsTrigger>
            <TabsTrigger value="subscription" className="data-[state=active]:bg-purple-600">Subscription</TabsTrigger>
          </TabsList>
          
          <div className="mt-8">
            {/* About Tab */}
            <TabsContent value="about" className="space-y-6">
              <Card className="bg-gray-800/50 backdrop-blur-md border-gray-700 text-white shadow-xl">
                <CardContent className="pt-6">
                  {isLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-5 w-full" />
                      <Skeleton className="h-5 w-4/5" />
                      <Skeleton className="h-5 w-2/3" />
                    </div>
                  ) : user ? (
                    <div>
                      <h3 className="text-xl font-semibold mb-4 text-purple-300">Bio</h3>
                      <p className="text-gray-300 leading-relaxed">
                        {user.bio || 'No bio provided yet. Click the Edit Profile button to add some information about yourself.'}
                      </p>
                    </div>
                  ) : (
                    <p className="text-gray-400">Unable to load profile information.</p>
                  )}
                </CardContent>
              </Card>
              
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gray-800/50 backdrop-blur-md border-gray-700 text-white overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-center mb-2">
                      <div className="w-10 h-10 rounded-full bg-indigo-900/50 flex items-center justify-center mr-3">
                        <Users className="h-5 w-5 text-indigo-400" />
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-white">Connections</p>
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-white mt-2">12</p>
                    <p className="text-indigo-400 text-sm mt-1">+3 new this week</p>
                  </CardContent>
                </Card>
                
                <Card className="bg-gray-800/50 backdrop-blur-md border-gray-700 text-white overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-center mb-2">
                      <div className="w-10 h-10 rounded-full bg-purple-900/50 flex items-center justify-center mr-3">
                        <MessageCircle className="h-5 w-5 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-white">Messages</p>
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-white mt-2">248</p>
                    <p className="text-purple-400 text-sm mt-1">24 unread</p>
                  </CardContent>
                </Card>
                
                <Card className="bg-gray-800/50 backdrop-blur-md border-gray-700 text-white overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-center mb-2">
                      <div className="w-10 h-10 rounded-full bg-amber-900/50 flex items-center justify-center mr-3">
                        <Star className="h-5 w-5 text-amber-400" />
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-white">Favorites</p>
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-white mt-2">7</p>
                    <p className="text-amber-400 text-sm mt-1">Characters saved</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            {/* Activity Tab */}
            <TabsContent value="activity">
              <Card className="bg-gray-800/50 backdrop-blur-md border-gray-700 text-white shadow-xl">
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold mb-6 text-purple-300">Recent Activity</h3>
                  
                  <div className="space-y-6">
                    {[1, 2, 3].map((_, index) => (
                      <div key={index} className="border-l-2 border-purple-500 pl-4 pb-6 relative">
                        <div className="w-3 h-3 rounded-full bg-purple-500 absolute -left-[6.5px] top-0"></div>
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium text-white">
                              {index === 0 ? 'Chat with Sakura' : index === 1 ? 'Created a new character' : 'Updated profile'}
                            </h4>
                            <p className="text-gray-400 text-sm mt-1">
                              {index === 0 
                                ? 'You had a conversation about your favorite anime.' 
                                : index === 1 
                                ? 'You created a custom character named "Shadow Ninja".' 
                                : 'You updated your profile information.'}
                            </p>
                          </div>
                          <span className="text-xs text-gray-500">
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
              <Card className="bg-gray-800/50 backdrop-blur-md border-gray-700 text-white shadow-xl">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-semibold text-purple-300">Your Subscription</h3>
                    
                    <Link href="/plans">
                      <Button className="bg-purple-600 hover:bg-purple-700 text-white">
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
                    <div className="bg-gray-900 rounded-lg border border-gray-700 p-6">
                      <div className="flex items-center mb-4">
                        <div className={`p-3 rounded-lg ${
                          user.subscriptionTier === 'pro' 
                            ? 'bg-purple-900/30' 
                            : user.subscriptionTier === 'premium' 
                            ? 'bg-amber-900/30' 
                            : 'bg-blue-900/30'
                        } mr-4`}>
                          <Award className={`h-6 w-6 ${
                            user.subscriptionTier === 'pro' 
                              ? 'text-purple-400' 
                              : user.subscriptionTier === 'premium' 
                              ? 'text-amber-400' 
                              : 'text-blue-400'
                          }`} />
                        </div>
                        
                        <div>
                          <h4 className="text-lg font-medium text-white">
                            {user.subscriptionStatus === 'trial' 
                              ? 'Free Trial'
                              : user.subscriptionTier === 'pro' 
                              ? 'Professional Plan' 
                              : user.subscriptionTier === 'premium' 
                              ? 'Premium Plan' 
                              : 'Basic Plan'}
                          </h4>
                          
                          <div className="flex items-center mt-1">
                            <Clock className="h-4 w-4 text-gray-400 mr-1" />
                            <span className="text-sm text-gray-400">
                              {user.subscriptionExpiresAt 
                                ? `Expires ${new Date(user.subscriptionExpiresAt).toLocaleDateString()}`
                                : 'No expiration date'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-3 mt-6">
                        <div className="flex items-center">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center bg-green-500/20 text-green-500 mr-3">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <span className="text-gray-300">Access to all basic characters</span>
                        </div>
                        
                        <div className="flex items-center">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center bg-green-500/20 text-green-500 mr-3">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <span className="text-gray-300">Up to {
                            user.subscriptionTier === 'pro' 
                              ? '50' 
                              : user.subscriptionTier === 'premium' 
                              ? '25' 
                              : '15'
                          } saved conversations</span>
                        </div>
                        
                        {(user.subscriptionTier === 'premium' || user.subscriptionTier === 'pro') && (
                          <div className="flex items-center">
                            <div className="w-5 h-5 rounded-full flex items-center justify-center bg-green-500/20 text-green-500 mr-3">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <span className="text-gray-300">Advanced character customization</span>
                          </div>
                        )}
                        
                        {user.subscriptionTier === 'pro' && (
                          <div className="flex items-center">
                            <div className="w-5 h-5 rounded-full flex items-center justify-center bg-green-500/20 text-green-500 mr-3">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <span className="text-gray-300">Priority support & early access features</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-400">Unable to load subscription information.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
      
      {/* Floating action button for mobile */}
      <div className="fixed right-4 bottom-4 md:hidden">
        <Button 
          onClick={() => setShowProfileEditDialog(true)}
          className="h-14 w-14 rounded-full bg-purple-600 hover:bg-purple-700 shadow-lg"
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
            profilePicture: user.profilePicture
          }}
        />
      )}
    </div>
  );
}
