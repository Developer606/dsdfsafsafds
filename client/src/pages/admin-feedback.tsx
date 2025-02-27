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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, ArrowLeft, MessageCircle, Search, Trash2, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useState } from "react";

export default function AdminFeedback() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");

  // Query for feedback data
  const { data: feedback = [], isLoading } = useQuery({
    queryKey: ["/api/admin/feedback"],
    refetchInterval: 30000,
  });

  // Delete feedback mutation
  const deleteFeedback = useMutation({
    mutationFn: async (feedbackId: number) => {
      const res = await apiRequest("DELETE", `/api/admin/feedback/${feedbackId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/feedback"] });
      toast({
        title: "Success",
        description: "Feedback deleted successfully",
      });
    },
  });

  // Filter feedback based on search term
  const filteredFeedback = feedback.filter((item: any) =>
    Object.values(item).some(
      (value) =>
        value &&
        value.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // Stats calculations
  const totalFeedback = feedback.length;
  const uniqueUsers = new Set(feedback.map((f: any) => f.email)).size;
  const recentFeedback = feedback.filter((f: any) => {
    const date = new Date(f.createdAt);
    const now = new Date();
    const daysDiff = (now.getTime() - date.getTime()) / (1000 * 3600 * 24);
    return daysDiff <= 7;
  }).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
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
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
            Feedback Management
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          <span className="text-sm text-muted-foreground">
            Auto-refreshing every 30 seconds
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/20">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium mb-2">Total Feedback</h3>
            <MessageCircle className="h-5 w-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-blue-600">{totalFeedback}</p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium mb-2">Unique Users</h3>
            <Mail className="h-5 w-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-green-600">{uniqueUsers}</p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium mb-2">Recent (7 days)</h3>
            <MessageCircle className="h-5 w-5 text-purple-500" />
          </div>
          <p className="text-3xl font-bold text-purple-600">{recentFeedback}</p>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search feedback..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Feedback Table */}
      <Card>
        <div className="p-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFeedback.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.email}</TableCell>
                    <TableCell className="max-w-md truncate">
                      {item.message}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>
                          {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(item.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="icon"
                            disabled={deleteFeedback.isPending}
                          >
                            {deleteFeedback.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Feedback</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this feedback? This action
                              cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteFeedback.mutate(item.id)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </Card>
    </div>
  );
}
