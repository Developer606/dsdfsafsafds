import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Plus,
  Key,
  Trash2,
  RefreshCw,
  ChevronDown,
  File,
  Eye,
  EyeOff,
  Settings,
} from "lucide-react";

// Define types for API responses
interface Credential {
  id: number;
  service: string;
  key: string;
  description: string | null;
  createdAt: string;
  updatedAt: string | null;
  actualValueHidden: boolean;
}

const CredentialManager = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCredential, setSelectedCredential] = useState<string | null>(null);
  const [newCredential, setNewCredential] = useState({
    service: "",
    key: "",
    description: "",
  });
  const [showCredentialValues, setShowCredentialValues] = useState(false);

  // Fetch credentials
  const { data: credentials = [], isLoading, isError, refetch } = useQuery<Credential[]>({
    queryKey: ["/api/admin/credentials"],
    staleTime: 60000, // 1 minute
  });

  // Filter credentials based on search query
  const filteredCredentials = credentials.filter(
    (cred) =>
      cred.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cred.description &&
        cred.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Group credentials by service type
  const groupedCredentials = filteredCredentials.reduce((acc, cred) => {
    // Extract service type from the credential name (e.g., "PAYPAL_SANDBOX_CLIENT_ID" -> "PAYPAL")
    const serviceType = cred.service.split("_")[0];
    
    if (!acc[serviceType]) {
      acc[serviceType] = [];
    }
    
    acc[serviceType].push(cred);
    return acc;
  }, {} as Record<string, Credential[]>);

  // Handle adding a new credential
  const handleAddCredential = async () => {
    if (!newCredential.service || !newCredential.key) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Service name and key are required.",
      });
      return;
    }

    try {
      const response = await apiRequest("POST", "/api/admin/credentials", newCredential);
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Credential added successfully!",
        });
        setIsAddDialogOpen(false);
        setNewCredential({ service: "", key: "", description: "" });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/credentials"] });
      } else {
        const data = await response.json();
        throw new Error(data.error || "Failed to add credential");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to add credential",
      });
    }
  };

  // Handle deleting a credential
  const handleDeleteCredential = async () => {
    if (!selectedCredential) return;

    try {
      const response = await apiRequest("DELETE", `/api/admin/credentials/${selectedCredential}`);
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Credential deleted successfully!",
        });
        setIsDeleteDialogOpen(false);
        setSelectedCredential(null);
        queryClient.invalidateQueries({ queryKey: ["/api/admin/credentials"] });
      } else {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete credential");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete credential",
      });
    }
  };

  // Handle viewing a credential's actual value
  const handleViewCredential = async (service: string) => {
    try {
      const response = await apiRequest("GET", `/api/admin/credentials/${service}`);
      
      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Credential Value",
          description: (
            <div className="mt-2 p-2 bg-muted rounded-md font-mono text-xs break-all">
              {data.key}
            </div>
          ),
          duration: 10000, // Show for 10 seconds
        });
      } else {
        const data = await response.json();
        throw new Error(data.error || "Failed to view credential");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to view credential",
      });
    }
  };

  return (
    <>
      {/* Dropdown trigger in top right */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Credential Management</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Credential
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Credentials
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => setShowCredentialValues(!showCredentialValues)}
          >
            {showCredentialValues ? (
              <>
                <EyeOff className="mr-2 h-4 w-4" />
                Hide Credential Values
              </>
            ) : (
              <>
                <Eye className="mr-2 h-4 w-4" />
                Show Credential Values
              </>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Add Credential Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Credential</DialogTitle>
            <DialogDescription>
              Add a new API key or credential to the system.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="service" className="text-right">
                Service Name
              </Label>
              <Input
                id="service"
                placeholder="e.g., PAYPAL_SANDBOX_CLIENT_ID"
                className="col-span-3"
                value={newCredential.service}
                onChange={(e) => setNewCredential({ ...newCredential, service: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="key" className="text-right">
                API Key / Value
              </Label>
              <Input
                id="key"
                type="text"
                placeholder="Enter sensitive credential value"
                className="col-span-3"
                value={newCredential.key}
                onChange={(e) => setNewCredential({ ...newCredential, key: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea
                id="description"
                placeholder="Optional description of this credential"
                className="col-span-3"
                value={newCredential.description}
                onChange={(e) => setNewCredential({ ...newCredential, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCredential}>Save Credential</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Credential Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              credential and may affect services that depend on it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCredential} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Credentials Dialog */}
      <Dialog>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Credential Management</DialogTitle>
            <DialogDescription>
              View and manage all API keys and credentials for external services.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex items-center space-x-2 mb-4">
            <Search className="w-4 h-4 opacity-50" />
            <Input
              placeholder="Search credentials..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button onClick={() => refetch()} size="icon" variant="outline">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add New
            </Button>
          </div>
          
          {isLoading ? (
            <div className="text-center py-4">Loading credentials...</div>
          ) : isError ? (
            <div className="text-center py-4 text-destructive">Error loading credentials</div>
          ) : filteredCredentials.length === 0 ? (
            <div className="text-center py-4">No credentials found</div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedCredentials).map(([serviceType, creds]) => (
                <Card key={serviceType}>
                  <CardHeader className="pb-2">
                    <CardTitle>{serviceType}</CardTitle>
                    <CardDescription>
                      {serviceType === "PAYPAL" && "PayPal API credentials for payment processing"}
                      {serviceType === "SMTP" && "Email SMTP server credentials"}
                      {serviceType === "GOOGLE" && "Google OAuth credentials for authentication"}
                      {serviceType === "GITHUB" && "GitHub token for API access"}
                      {serviceType === "OPENAI" && "OpenAI API credentials for AI features"}
                      {!["PAYPAL", "SMTP", "GOOGLE", "GITHUB", "OPENAI"].includes(serviceType) && 
                        `${serviceType.toLowerCase()} service credentials`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Service</TableHead>
                          <TableHead>Value</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {creds.map((cred) => (
                          <TableRow key={cred.id}>
                            <TableCell className="font-medium">{cred.service}</TableCell>
                            <TableCell className="font-mono text-xs">
                              {showCredentialValues ? cred.key : cred.key}
                            </TableCell>
                            <TableCell>{cred.description}</TableCell>
                            <TableCell>
                              <div className="flex space-x-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleViewCredential(cred.service)}
                                  title="View full value"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setSelectedCredential(cred.service);
                                    setIsDeleteDialogOpen(true);
                                  }}
                                  title="Delete credential"
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CredentialManager;