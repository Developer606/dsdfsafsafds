import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Loader2, ArrowLeft, Search, AlertTriangle, Shield, CheckCircle, 
  AlertCircle, MessageSquare, Plus, X, Filter, Ban, Save, Check,
  Lock, Unlock, MessageSquareOff, Trash2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

interface UserDetails {
  id: number;
  username: string;
  email: string;
  isBlocked: boolean;
  isRestricted: boolean;
}

interface ConversationDetails {
  user1Id: number;
  user2Id: number;
  isBlocked: boolean;
  lastMessageId: number;
  lastMessageTimestamp: string;
}

export default function AdminContentModeration() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [includeReviewed, setIncludeReviewed] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);
  
  // Word management states
  const [wordToAdd, setWordToAdd] = useState("");
  const [categoryForNewWord, setCategoryForNewWord] = useState("violence");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showAddCategoryDialog, setShowAddCategoryDialog] = useState(false);
  
  // Add state for conversation details
  const queryClient = useQueryClient();

  // Query for flagged messages data
  const { 
    data: flaggedMessages = [], 
    isLoading: isLoadingMessages,
    refetch: refetchMessages
  } = useQuery({
    queryKey: ["/api/admin/flagged-messages", includeReviewed],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/admin/flagged-messages?includeReviewed=${includeReviewed}`);
      return res.json();
    },
    refetchInterval: 30000,
  });
  
  // Query for statistics
  const { 
    data: stats = { total: 0, unreviewed: 0, byReason: {} }, 
    isLoading: isLoadingStats,
    refetch: refetchStats
  } = useQuery({
    queryKey: ["/api/admin/flagged-messages/stats"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/flagged-messages/stats");
      return res.json();
    },
    refetchInterval: 30000,
  });
  
  // Query for prohibited words
  const {
    data: prohibitedWords = { defaultWords: {}, customWords: {} },
    isLoading: isLoadingWords,
    refetch: refetchWords
  } = useQuery({
    queryKey: ["/api/admin/content-moderation/prohibited-words"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/content-moderation/prohibited-words");
      return res.json();
    }
  });
  
  // Mutation for adding a prohibited word
  const addProhibitedWord = useMutation({
    mutationFn: async ({ category, word }: { category: string; word: string }) => {
      const res = await apiRequest("POST", "/api/admin/content-moderation/prohibited-words", { category, word });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/content-moderation/prohibited-words"] });
      setWordToAdd("");
      toast({
        title: "Success",
        description: "Prohibited word added successfully",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to add prohibited word",
      });
    }
  });
  
  // Mutation for removing a prohibited word
  const removeProhibitedWord = useMutation({
    mutationFn: async ({ category, word }: { category: string; word: string }) => {
      const res = await apiRequest("DELETE", "/api/admin/content-moderation/prohibited-words", { category, word });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/content-moderation/prohibited-words"] });
      toast({
        title: "Success",
        description: "Prohibited word removed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to remove prohibited word",
      });
    }
  });
  
  // Mutation for adding a new category
  const addCategory = useMutation({
    mutationFn: async ({ category }: { category: string }) => {
      const res = await apiRequest("POST", "/api/admin/content-moderation/prohibited-categories", { category });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/content-moderation/prohibited-words"] });
      setNewCategoryName("");
      setShowAddCategoryDialog(false);
      toast({
        title: "Success",
        description: "Category added successfully",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to add category",
      });
    }
  });

  // Mutation for marking a message as reviewed
  const markAsReviewed = useMutation({
    mutationFn: async ({ id, reviewed }: { id: number; reviewed: boolean }) => {
      const res = await apiRequest("PUT", `/api/admin/flagged-messages/${id}/review`, { reviewed });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/flagged-messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/flagged-messages/stats"] });
      toast({
        title: "Success",
        description: "Message review status updated",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update message review status",
      });
    },
  });
  
  // Query for message conversation history
  const messageConversation = useMutation({
    mutationFn: async ({ senderId, receiverId }: { senderId: number; receiverId: number }) => {
      const res = await apiRequest("GET", `/api/admin/conversations/${senderId}/${receiverId}/messages?limit=20`);
      return res.json();
    }
  });
  
  // Query for user details
  const userDetails = useMutation({
    mutationFn: async ({ senderId, receiverId }: { senderId: number; receiverId: number }) => {
      const [senderRes, receiverRes] = await Promise.all([
        apiRequest("GET", `/api/admin/users/${senderId}`),
        apiRequest("GET", `/api/admin/users/${receiverId}`)
      ]);
      
      const [senderDetails, receiverDetails] = await Promise.all([
        senderRes.json(),
        receiverRes.json()
      ]);
      
      return { senderDetails, receiverDetails };
    }
  });
  
  // Mutation for toggling user block status
  const toggleBlockUser = useMutation({
    mutationFn: async ({ userId, blocked }: { userId: number; blocked: boolean }) => {
      const res = await apiRequest("POST", `/api/admin/users/${userId}/block`, { blocked });
      return res.json();
    },
    onSuccess: () => {
      if (selectedMessage) {
        userDetails.mutate({
          senderId: selectedMessage.senderId,
          receiverId: selectedMessage.receiverId
        });
      }
      toast({
        title: "Success",
        description: "User block status updated",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update user block status",
      });
    }
  });
  
  // Mutation for toggling user restriction status
  const toggleRestrictUser = useMutation({
    mutationFn: async ({ userId, restricted }: { userId: number; restricted: boolean }) => {
      const res = await apiRequest("POST", `/api/admin/users/${userId}/restrict`, { restricted });
      return res.json();
    },
    onSuccess: () => {
      if (selectedMessage) {
        userDetails.mutate({
          senderId: selectedMessage.senderId,
          receiverId: selectedMessage.receiverId
        });
      }
      toast({
        title: "Success",
        description: "User restriction status updated",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update user restriction status",
      });
    }
  });
  
  // Query for conversation details
  const [conversationUsers, setConversationUsers] = useState<{ user1Id?: number, user2Id?: number }>({});
  
  // Query for conversation details
  const conversationDetails = useQuery({
    queryKey: ["/api/admin/conversations", conversationUsers.user1Id, conversationUsers.user2Id],
    queryFn: async () => {
      if (!conversationUsers.user1Id || !conversationUsers.user2Id) return null;
      const res = await apiRequest("GET", `/api/admin/conversations/${conversationUsers.user1Id}/${conversationUsers.user2Id}`);
      return res.json();
    },
    enabled: !!(conversationUsers.user1Id && conversationUsers.user2Id),
  });
  
  // Mutation for blocking a conversation
  const blockConversation = useMutation({
    mutationFn: async ({ user1Id, user2Id, blocked }: { user1Id: number; user2Id: number; blocked: boolean }) => {
      const res = await apiRequest("POST", `/api/admin/conversations/${user1Id}/${user2Id}/block`, { blocked });
      return res.json();
    },
    onSuccess: () => {
      if (selectedMessage) {
        // Update conversation users to trigger a refetch
        setConversationUsers({
          user1Id: selectedMessage.senderId,
          user2Id: selectedMessage.receiverId
        });
        // Invalidate the query cache
        queryClient.invalidateQueries({ 
          queryKey: ["/api/admin/conversations", selectedMessage.senderId, selectedMessage.receiverId] 
        });
      }
      toast({
        title: "Success",
        description: "Conversation block status updated",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update conversation block status",
      });
    }
  });
  
  // Mutation for clearing conversation history
  const clearConversation = useMutation({
    mutationFn: async ({ user1Id, user2Id }: { user1Id: number; user2Id: number }) => {
      const res = await apiRequest("DELETE", `/api/admin/conversations/${user1Id}/${user2Id}/messages`);
      return res.json();
    },
    onSuccess: () => {
      if (selectedMessage) {
        messageConversation.mutate({
          senderId: selectedMessage.senderId,
          receiverId: selectedMessage.receiverId
        });
      }
      toast({
        title: "Success",
        description: "Conversation history cleared",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to clear conversation history",
      });
    }
  });

  // Filter messages by search term
  const filteredMessages = flaggedMessages.filter((message: any) => 
    message.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    message.senderUsername.toLowerCase().includes(searchTerm.toLowerCase()) ||
    message.receiverUsername.toLowerCase().includes(searchTerm.toLowerCase()) ||
    message.reason.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get reasons sorted by count
  const reasonCategories = Object.entries(stats.byReason || {})
    .sort(([, countA]: any, [, countB]: any) => (countB as number) - (countA as number))
    .map(([category]) => category);

  if (isLoadingMessages && isLoadingStats) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-600 to-purple-600">
            Content Moderation
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {(isLoadingMessages || isLoadingStats) && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          <span className="text-sm text-muted-foreground">
            Auto-refreshing every 30 seconds
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-gradient-to-br from-red-500/10 to-purple-500/10 border-red-500/20">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium mb-2">Total Flagged Messages</h3>
            <MessageSquare className="h-5 w-5 text-red-500" />
          </div>
          <p className="text-3xl font-bold text-red-600">{stats.total}</p>
        </Card>
        
        <Card className="p-6 bg-gradient-to-br from-amber-500/10 to-red-500/10 border-amber-500/20">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium mb-2">Pending Review</h3>
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          </div>
          <p className="text-3xl font-bold text-amber-600">{stats.unreviewed}</p>
        </Card>
        
        <Card className="p-6 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-500/20">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium mb-2">Review Rate</h3>
            <Shield className="h-5 w-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-blue-600">
            {stats.total ? Math.round((stats.total - stats.unreviewed) / stats.total * 100) : 0}%
          </p>
        </Card>
      </div>

      {/* Category Stats */}
      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">Flagged Content by Category</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reasonCategories.map((category) => (
            <div key={category} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="font-medium capitalize">{category}</span>
              </div>
              <Badge variant="outline" className="bg-background">
                {stats.byReason[category] || 0}
              </Badge>
            </div>
          ))}
        </div>
      </Card>
      
      {/* Prohibited Words Management */}
      <Tabs defaultValue="flagged-messages" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="flagged-messages">Flagged Messages</TabsTrigger>
          <TabsTrigger value="prohibited-words">Prohibited Words</TabsTrigger>
        </TabsList>
        
        <TabsContent value="flagged-messages" className="space-y-4">
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search messages..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch 
                id="show-reviewed" 
                checked={includeReviewed} 
                onCheckedChange={setIncludeReviewed}
              />
              <label htmlFor="show-reviewed" className="text-sm cursor-pointer">
                Include reviewed messages
              </label>
            </div>
            <Button onClick={() => {
              refetchMessages();
              refetchStats();
            }}>
              Refresh
            </Button>
          </div>
          
          {/* Flagged Messages Table */}
          <Card className="overflow-hidden border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead>Sender</TableHead>
                  <TableHead>Receiver</TableHead>
                  <TableHead className="max-w-[300px]">Content</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMessages.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No flagged messages found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMessages.map((message: any) => (
                    <TableRow key={message.id}>
                      <TableCell>
                        {message.reviewed ? (
                          <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-200">
                            Reviewed
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-200">
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{message.senderUsername}</TableCell>
                      <TableCell>{message.receiverUsername}</TableCell>
                      <TableCell className="max-w-[300px] truncate">
                        {message.content}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-red-500/10 text-red-700 border-red-200">
                          {message.reason.split(':')[0]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {message.timestamp ? format(new Date(message.timestamp), 'MMM d, yyyy HH:mm') : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedMessage(message);
                              setShowDetails(true);
                              
                              // Load conversation history
                              messageConversation.mutate({
                                senderId: message.senderId,
                                receiverId: message.receiverId
                              });
                              
                              // Load user details
                              userDetails.mutate({
                                senderId: message.senderId,
                                receiverId: message.receiverId
                              });
                              
                              // Load conversation details
                              setConversationUsers({
                                user1Id: message.senderId,
                                user2Id: message.receiverId
                              });
                            }}
                          >
                            View
                          </Button>
                          <Button
                            variant={message.reviewed ? "outline" : "default"}
                            size="sm"
                            onClick={() => markAsReviewed.mutate({ id: message.id, reviewed: !message.reviewed })}
                            disabled={markAsReviewed.isPending}
                          >
                            {markAsReviewed.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : message.reviewed ? (
                              "Unmark"
                            ) : (
                              "Mark Reviewed"
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
        
        <TabsContent value="prohibited-words" className="space-y-4">
          <div className="flex flex-col gap-6">
            {/* Add new prohibited word */}
            <Card className="p-6 border border-blue-200 bg-blue-50/30 dark:bg-blue-950/10">
              <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                <Ban className="h-5 w-5 text-blue-500" />
                Add Prohibited Word
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2 col-span-1">
                  <Label htmlFor="category-select">Category</Label>
                  <Select value={categoryForNewWord} onValueChange={setCategoryForNewWord}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys({...prohibitedWords.defaultWords, ...prohibitedWords.customWords}).map((category) => (
                        <SelectItem key={category} value={category}>
                          {category.replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-1.5"
                    onClick={() => setShowAddCategoryDialog(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    New Category
                  </Button>
                </div>
                
                <div className="space-y-2 col-span-1 md:col-span-2">
                  <Label htmlFor="word-input">Word or Phrase</Label>
                  <div className="flex gap-2">
                    <Input
                      id="word-input"
                      placeholder="Enter prohibited word or phrase"
                      value={wordToAdd}
                      onChange={(e) => setWordToAdd(e.target.value)}
                    />
                    <Button 
                      onClick={() => {
                        if (wordToAdd.trim()) {
                          addProhibitedWord.mutate({
                            category: categoryForNewWord,
                            word: wordToAdd.trim()
                          });
                        } else {
                          toast({
                            variant: "destructive",
                            title: "Error",
                            description: "Word cannot be empty",
                          });
                        }
                      }}
                      disabled={addProhibitedWord.isPending || !wordToAdd.trim()}
                    >
                      {addProhibitedWord.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Plus className="h-4 w-4 mr-2" />
                      )}
                      Add
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
            
            {/* Display existing prohibited words by category */}
            <Card className="p-6">
              <h3 className="text-lg font-medium mb-4">Prohibited Words by Category</h3>
              
              <Tabs defaultValue="default" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="default">Default Words</TabsTrigger>
                  <TabsTrigger value="custom">Custom Words</TabsTrigger>
                </TabsList>
                
                <TabsContent value="default">
                  {Object.keys(prohibitedWords.defaultWords).length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No default prohibited words defined
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {Object.entries(prohibitedWords.defaultWords).map(([category, words]: [string, any]) => (
                        <div key={category} className="space-y-2">
                          <h4 className="font-medium text-md capitalize flex items-center gap-2">
                            <Filter className="h-4 w-4 text-indigo-500" />
                            {category.replace('_', ' ')}
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {(words as string[]).map((word: string) => (
                              <Badge key={word} variant="secondary" className="py-1.5">
                                {word}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="custom">
                  {Object.keys(prohibitedWords.customWords).length === 0 || 
                   Object.values(prohibitedWords.customWords).flat().length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No custom prohibited words added yet
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {Object.entries(prohibitedWords.customWords).map(([category, words]: [string, any]) => {
                        if ((words as string[]).length === 0) return null;
                        return (
                          <div key={category} className="space-y-2">
                            <h4 className="font-medium text-md capitalize flex items-center gap-2">
                              <Filter className="h-4 w-4 text-purple-500" />
                              {category.replace('_', ' ')}
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {(words as string[]).map((word: string) => (
                                <Badge key={word} variant="secondary" className="py-1.5 pr-1.5 flex items-center">
                                  {word}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 w-5 p-0 ml-1"
                                    onClick={() => {
                                      removeProhibitedWord.mutate({
                                        category,
                                        word
                                      });
                                    }}
                                    disabled={removeProhibitedWord.isPending}
                                  >
                                    {removeProhibitedWord.isPending ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <X className="h-3 w-3" />
                                    )}
                                  </Button>
                                </Badge>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add New Category Dialog */}
      <Dialog open={showAddCategoryDialog} onOpenChange={setShowAddCategoryDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
            <DialogDescription>
              Create a new category for prohibited words
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-category">Category Name</Label>
              <Input 
                id="new-category"
                placeholder="Enter category name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddCategoryDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (newCategoryName.trim()) {
                  addCategory.mutate({
                    category: newCategoryName.trim()
                  });
                } else {
                  toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Category name cannot be empty",
                  });
                }
              }}
              disabled={addCategory.isPending || !newCategoryName.trim()}
            >
              {addCategory.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Add Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Message Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Flagged Message Details</DialogTitle>
            <DialogDescription>
              Review the complete message content and context
            </DialogDescription>
          </DialogHeader>
          
          {selectedMessage && (
            <div className="space-y-6">
              <Tabs defaultValue="message" className="w-full">
                <TabsList className="grid grid-cols-2">
                  <TabsTrigger value="message">Message</TabsTrigger>
                  <TabsTrigger value="user">User Information</TabsTrigger>
                </TabsList>
                
                <TabsContent value="message" className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground">Content</h3>
                    <Card className="p-4">
                      <p className="whitespace-pre-wrap">{selectedMessage.content}</p>
                    </Card>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground">Reason for Flagging</h3>
                    <Card className="p-4 bg-red-50 dark:bg-red-950/20">
                      <div className="flex gap-2 items-start">
                        <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                        <p className="text-red-800 dark:text-red-300">{selectedMessage.reason}</p>
                      </div>
                    </Card>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-muted-foreground">Message ID</h3>
                      <Card className="p-3">
                        <code className="text-sm">{selectedMessage.messageId}</code>
                      </Card>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-muted-foreground">Timestamp</h3>
                      <Card className="p-3">
                        <p className="text-sm">
                          {selectedMessage.timestamp 
                            ? format(new Date(selectedMessage.timestamp), 'PPpp') 
                            : 'Not available'}
                        </p>
                      </Card>
                    </div>
                  </div>
                  
                  {/* Recent Conversation History */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-muted-foreground">Recent Conversation History</h3>
                      {messageConversation.isPending && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                    <Card className="p-0 overflow-hidden">
                      {messageConversation.isPending ? (
                        <div className="flex items-center justify-center p-6">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : !messageConversation.data?.messages || messageConversation.data.messages.length === 0 ? (
                        <div className="text-center p-6 text-muted-foreground">
                          No previous messages found
                        </div>
                      ) : (
                        <div className="max-h-[250px] overflow-y-auto">
                          <div className="divide-y">
                            {messageConversation.data.messages.map((msg: any) => (
                              <div 
                                key={msg.id} 
                                className={`p-3 ${msg.id === selectedMessage.messageId ? 'bg-amber-50 dark:bg-amber-950/20' : ''}`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className={msg.senderId === selectedMessage.senderId ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'}>
                                      {msg.senderId === selectedMessage.senderId ? selectedMessage.senderUsername : selectedMessage.receiverUsername}
                                    </Badge>
                                    {msg.id === selectedMessage.messageId && (
                                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                        Flagged
                                      </Badge>
                                    )}
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(msg.timestamp), 'MMM d, HH:mm')}
                                  </span>
                                </div>
                                <p className="text-sm whitespace-pre-wrap truncate line-clamp-3">
                                  {msg.content}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </Card>
                  </div>
                </TabsContent>
                
                <TabsContent value="user" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-muted-foreground">Sender</h3>
                      <Card className="p-4">
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Username:</span>
                            <span className="font-medium">{selectedMessage.senderUsername}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">ID:</span>
                            <span className="font-medium">{selectedMessage.senderId}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Status:</span>
                            <div className="flex gap-1.5">
                              {userDetails.isPending && selectedMessage.senderId ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  {userDetails.data?.senderDetails?.isBlocked && (
                                    <Badge variant="destructive">Blocked</Badge>
                                  )}
                                  {userDetails.data?.senderDetails?.isRestricted && (
                                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                      Restricted
                                    </Badge>
                                  )}
                                  {!userDetails.data?.senderDetails?.isBlocked && !userDetails.data?.senderDetails?.isRestricted && (
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                      Active
                                    </Badge>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                          <div className="pt-2 border-t mt-2">
                            <div className="flex flex-wrap gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="h-8"
                                onClick={() => toggleBlockUser.mutate({
                                  userId: selectedMessage.senderId,
                                  blocked: !userDetails.data?.senderDetails?.isBlocked
                                })}
                                disabled={toggleBlockUser.isPending}
                              >
                                {toggleBlockUser.isPending ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                                ) : userDetails.data?.senderDetails?.isBlocked ? (
                                  <Check className="h-3.5 w-3.5 mr-2" />
                                ) : (
                                  <Ban className="h-3.5 w-3.5 mr-2" />
                                )}
                                {userDetails.data?.senderDetails?.isBlocked ? 'Unblock User' : 'Block User'}
                              </Button>
                              
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="h-8"
                                onClick={() => toggleRestrictUser.mutate({
                                  userId: selectedMessage.senderId,
                                  restricted: !userDetails.data?.senderDetails?.isRestricted
                                })}
                                disabled={toggleRestrictUser.isPending}
                              >
                                {toggleRestrictUser.isPending ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                                ) : userDetails.data?.senderDetails?.isRestricted ? (
                                  <Unlock className="h-3.5 w-3.5 mr-2" />
                                ) : (
                                  <Lock className="h-3.5 w-3.5 mr-2" />
                                )}
                                {userDetails.data?.senderDetails?.isRestricted ? 'Remove Restriction' : 'Restrict User'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-muted-foreground">Receiver</h3>
                      <Card className="p-4">
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Username:</span>
                            <span className="font-medium">{selectedMessage.receiverUsername}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">ID:</span>
                            <span className="font-medium">{selectedMessage.receiverId}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Status:</span>
                            <div className="flex gap-1.5">
                              {userDetails.isPending && selectedMessage.receiverId ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  {userDetails.data?.receiverDetails?.isBlocked && (
                                    <Badge variant="destructive">Blocked</Badge>
                                  )}
                                  {userDetails.data?.receiverDetails?.isRestricted && (
                                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                      Restricted
                                    </Badge>
                                  )}
                                  {!userDetails.data?.receiverDetails?.isBlocked && !userDetails.data?.receiverDetails?.isRestricted && (
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                      Active
                                    </Badge>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                          <div className="pt-2 border-t mt-2">
                            <div className="flex flex-wrap gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="h-8"
                                onClick={() => toggleBlockUser.mutate({
                                  userId: selectedMessage.receiverId,
                                  blocked: !userDetails.data?.receiverDetails?.isBlocked
                                })}
                                disabled={toggleBlockUser.isPending}
                              >
                                {toggleBlockUser.isPending ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                                ) : userDetails.data?.receiverDetails?.isBlocked ? (
                                  <Check className="h-3.5 w-3.5 mr-2" />
                                ) : (
                                  <Ban className="h-3.5 w-3.5 mr-2" />
                                )}
                                {userDetails.data?.receiverDetails?.isBlocked ? 'Unblock User' : 'Block User'}
                              </Button>
                              
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="h-8"
                                onClick={() => toggleRestrictUser.mutate({
                                  userId: selectedMessage.receiverId,
                                  restricted: !userDetails.data?.receiverDetails?.isRestricted
                                })}
                                disabled={toggleRestrictUser.isPending}
                              >
                                {toggleRestrictUser.isPending ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                                ) : userDetails.data?.receiverDetails?.isRestricted ? (
                                  <Unlock className="h-3.5 w-3.5 mr-2" />
                                ) : (
                                  <Lock className="h-3.5 w-3.5 mr-2" />
                                )}
                                {userDetails.data?.receiverDetails?.isRestricted ? 'Remove Restriction' : 'Restrict User'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </div>
                  </div>
                  
                  {/* Conversation Actions */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground">Conversation Actions</h3>
                    <Card className="p-4 border border-amber-200 bg-amber-50/30 dark:bg-amber-950/10">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                          <AlertTriangle className="h-5 w-5" />
                          <p className="text-sm font-medium">
                            These actions affect the conversation between {selectedMessage.senderUsername} and {selectedMessage.receiverUsername}
                          </p>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                          <Button 
                            variant="default" 
                            className="bg-amber-600 hover:bg-amber-700"
                            onClick={() => blockConversation.mutate({
                              user1Id: selectedMessage.senderId,
                              user2Id: selectedMessage.receiverId,
                              blocked: !conversationDetails.data?.isBlocked
                            })}
                            disabled={blockConversation.isPending}
                          >
                            {blockConversation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : conversationDetails.data?.isBlocked ? (
                              <MessageSquare className="h-4 w-4 mr-2" />
                            ) : (
                              <MessageSquareOff className="h-4 w-4 mr-2" />
                            )}
                            {conversationDetails.data?.isBlocked ? 'Allow Conversation' : 'Block Conversation'}
                          </Button>
                          
                          <Button 
                            variant="destructive"
                            onClick={() => clearConversation.mutate({
                              user1Id: selectedMessage.senderId,
                              user2Id: selectedMessage.receiverId
                            })}
                            disabled={clearConversation.isPending}
                          >
                            {clearConversation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <Trash2 className="h-4 w-4 mr-2" />
                            )}
                            Clear Conversation History
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
          
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button variant="outline" onClick={() => setShowDetails(false)}>
              Close
            </Button>
            {selectedMessage && (
              <Button
                variant={selectedMessage.reviewed ? "outline" : "default"}
                onClick={() => {
                  markAsReviewed.mutate(
                    { id: selectedMessage.id, reviewed: !selectedMessage.reviewed },
                    {
                      onSuccess: () => {
                        setShowDetails(false);
                      },
                    }
                  );
                }}
                disabled={markAsReviewed.isPending}
              >
                {markAsReviewed.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : selectedMessage.reviewed ? (
                  "Mark as Unreviewed"
                ) : (
                  "Mark as Reviewed"
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}