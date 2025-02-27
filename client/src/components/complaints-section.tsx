import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle, Loader2, ArrowLeft, Image as ImageIcon, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Complaint } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useState } from "react";

export function ComplaintsSection() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Query for complaints
  const { data: complaints, isLoading: complaintsLoading } = useQuery<Complaint[]>({
    queryKey: ["/api/admin/complaints"],
    refetchInterval: 30000,
  });

  const getImageUrl = (path: string | null) => {
    if (!path) return null;
    // Remove leading slash if present to avoid double slashes
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${window.location.origin}/${cleanPath}`;
  };

  if (complaintsLoading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-3xl w-[95vw]">
          <DialogHeader>
            <DialogTitle>Complaint Image</DialogTitle>
            <DialogDescription>
              Image attachment for the complaint
            </DialogDescription>
          </DialogHeader>
          {selectedImage && (
            <div className="relative">
              <img
                src={selectedImage}
                alt="Complaint attachment"
                className="w-full rounded-lg max-h-[70vh] object-contain"
                onError={(e) => {
                  e.currentTarget.src = ""; // Clear the source on error
                  setSelectedImage(null); // Close dialog on error
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm"
                onClick={() => setSelectedImage(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="container mx-auto p-8 space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-600 to-pink-600">
            User Complaints
          </h1>
        </div>

        <Card className="bg-gradient-to-br from-rose-50 to-white dark:from-rose-950 dark:to-slate-900">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold">Complaint Reports</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Review and manage user-reported issues and complaints
                </p>
              </div>
              <AlertCircle className="h-5 w-5 text-rose-500" />
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">Name</TableHead>
                    <TableHead className="w-[200px]">Email</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead className="w-[150px]">Image</TableHead>
                    <TableHead className="w-[200px]">Submitted At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {complaints?.map((complaint) => (
                    <TableRow key={complaint.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                      <TableCell className="font-medium">{complaint.name}</TableCell>
                      <TableCell>{complaint.email}</TableCell>
                      <TableCell className="max-w-md">
                        <div className="truncate">{complaint.message}</div>
                      </TableCell>
                      <TableCell>
                        {complaint.imageUrl && (
                          <Button
                            variant="ghost" 
                            className="flex items-center gap-2 text-blue-500 hover:text-blue-700"
                            onClick={() => setSelectedImage(getImageUrl(complaint.imageUrl))}
                          >
                            <ImageIcon className="h-4 w-4" />
                            <span className="underline">View Image</span>
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(complaint.createdAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!complaints?.length && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No complaints submitted yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}