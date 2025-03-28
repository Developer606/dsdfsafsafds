import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { Loader2, ArrowLeft, Search, AlertTriangle, Shield, CheckCircle, AlertCircle, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

export default function AdminContentModeration() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [includeReviewed, setIncludeReviewed] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);

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

  // Filter messages by search term
  const filteredMessages = flaggedMessages.filter((message: any) => 
    message.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    message.senderUsername.toLowerCase().includes(searchTerm.toLowerCase()) ||
    message.receiverUsername.toLowerCase().includes(searchTerm.toLowerCase()) ||
    message.reason.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get reasons sorted by count
  const reasonCategories = Object.entries(stats.byReason || {})
    .sort(([, countA]: [string, number], [, countB]: [string, number]) => (countB as number) - (countA as number))
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
                </TabsContent>
                
                <TabsContent value="user" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-muted-foreground">Sender</h3>
                      <Card className="p-4">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Username:</span>
                            <span className="font-medium">{selectedMessage.senderUsername}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">ID:</span>
                            <span className="font-medium">{selectedMessage.senderId}</span>
                          </div>
                        </div>
                      </Card>
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-muted-foreground">Receiver</h3>
                      <Card className="p-4">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Username:</span>
                            <span className="font-medium">{selectedMessage.receiverUsername}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">ID:</span>
                            <span className="font-medium">{selectedMessage.receiverId}</span>
                          </div>
                        </div>
                      </Card>
                    </div>
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