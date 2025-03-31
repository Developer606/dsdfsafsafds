import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Edit,
  Trash2,
  Plus,
  ArrowLeft,
  Loader2,
  Menu,
  Crown,
  Shield,
  AlertCircle,
  MessageCircle,
  LogOut,
  Palette,
  Upload,
  Image,
  Play,
  Clock,
  Users,
  Calendar,
  Globe,
  MousePointer,
  Link as LinkIcon,
  ExternalLink,
  Eye,
  EyeOff,
  BarChart2,
  Download
} from "lucide-react";
import { Link } from "wouter";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip, ResponsiveContainer } from 'recharts';

// Define interfaces
interface Advertisement {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  ctaText: string;
  ctaLink: string;
  isActive: boolean;
  durationSeconds: number;
  targetUserType: string;
  targetRegions: string[];
  targetDevices: string[];
  startDate: string;
  endDate: string;
  displayTimes: {
    startTime: string;
    endTime: string;
  };
  backgroundColor: string;
  animationEffect: string;
  textStyle: {
    fontSize: string;
    fontWeight: string;
    color: string;
    alignment: string;
  };
  buttonStyle: {
    size: string;
    color: string;
    hoverEffect: string;
    icon?: string;
  };
  stats: {
    views: number;
    clicks: number;
    conversionRate: number;
  };
  createdAt: Date;
}

// Advertisement form validation schema
const advertisementSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  imageUrl: z.string().min(1, "Image URL is required"),
  ctaText: z.string().min(1, "Call to action text is required"),
  ctaLink: z.string().min(1, "Call to action link is required"),
  isActive: z.boolean().default(true),
  durationSeconds: z.number().min(1, "Duration is required").default(10),
  targetUserType: z.string().default("all"),
  targetRegions: z.array(z.string()).default([]),
  targetDevices: z.array(z.string()).default([]),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  displayTimes: z.object({
    startTime: z.string().optional(),
    endTime: z.string().optional(),
  }).optional(),
  backgroundColor: z.string().default("#ffffff"),
  animationEffect: z.string().default("fade"),
  textStyle: z.object({
    fontSize: z.string().default("16px"),
    fontWeight: z.string().default("normal"),
    color: z.string().default("#000000"),
    alignment: z.string().default("left"),
  }).default({}),
  buttonStyle: z.object({
    size: z.string().default("medium"),
    color: z.string().default("#6366f1"),
    hoverEffect: z.string().default("scale"),
    icon: z.string().optional(),
  }).default({}),
});

type AdvertisementFormValues = z.infer<typeof advertisementSchema>;

// Sample analytics data
const sampleAnalyticsData = [
  { name: 'Ad 1', views: 1200, clicks: 300, conversionRate: 25 },
  { name: 'Ad 2', views: 800, clicks: 200, conversionRate: 25 },
  { name: 'Ad 3', views: 1500, clicks: 450, conversionRate: 30 },
  { name: 'Ad 4', views: 600, clicks: 120, conversionRate: 20 },
  { name: 'Ad 5', views: 950, clicks: 285, conversionRate: 30 },
];

export default function AdminAdvertisements() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [editingAdvertisement, setEditingAdvertisement] = useState<Advertisement | null>(null);
  const [selectedTab, setSelectedTab] = useState<string>("manage");
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [advertisementToDelete, setAdvertisementToDelete] = useState<string | null>(null);
  
  // Add a logout handler
  const handleLogout = () => {
    fetch("/api/logout", { method: "POST" })
      .then(() => {
        window.location.href = "/admin/login";
      })
      .catch((error) => {
        toast({
          title: "Error",
          description: "Failed to logout. Please try again.",
          variant: "destructive",
        });
      });
  };
  
  // State for file upload
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Form setup
  const form = useForm<AdvertisementFormValues>({
    resolver: zodResolver(advertisementSchema),
    defaultValues: {
      title: "",
      description: "",
      imageUrl: "",
      ctaText: "Start Now",
      ctaLink: "/",
      isActive: true,
      durationSeconds: 10,
      targetUserType: "all",
      targetRegions: [],
      targetDevices: [],
      backgroundColor: "#ffffff",
      animationEffect: "fade",
      textStyle: {
        fontSize: "16px",
        fontWeight: "normal",
        color: "#000000",
        alignment: "left",
      },
      buttonStyle: {
        size: "medium",
        color: "#6366f1",
        hoverEffect: "scale",
      },
    },
  });

  // Mock advertisements data
  // In a real implementation, this would be fetched from the API
  const mockAdvertisements: Advertisement[] = [
    {
      id: "1",
      title: "New Premium Features",
      description: "Unlock exclusive characters and features with our premium plan",
      imageUrl: "/character_images/premium_banner.jpg",
      ctaText: "Upgrade Now",
      ctaLink: "/subscription",
      isActive: true,
      durationSeconds: 15,
      targetUserType: "free",
      targetRegions: ["North America", "Europe"],
      targetDevices: ["mobile", "desktop"],
      startDate: "2025-03-15",
      endDate: "2025-04-15",
      displayTimes: {
        startTime: "08:00",
        endTime: "20:00",
      },
      backgroundColor: "#f8f9fa",
      animationEffect: "fade",
      textStyle: {
        fontSize: "18px",
        fontWeight: "bold",
        color: "#333333",
        alignment: "center",
      },
      buttonStyle: {
        size: "large",
        color: "#6366f1",
        hoverEffect: "scale",
        icon: "crown",
      },
      stats: {
        views: 1200,
        clicks: 350,
        conversionRate: 29.2,
      },
      createdAt: new Date("2025-03-15"),
    },
    {
      id: "2",
      title: "New Character: Sakura",
      description: "Chat with our newest character Sakura from Naruto",
      imageUrl: "/character_images/sakura.jpg",
      ctaText: "Start Chat",
      ctaLink: "/chat/sakura",
      isActive: true,
      durationSeconds: 10,
      targetUserType: "all",
      targetRegions: ["Global"],
      targetDevices: ["all"],
      startDate: "2025-03-20",
      endDate: "2025-05-01",
      displayTimes: {
        startTime: "00:00",
        endTime: "23:59",
      },
      backgroundColor: "#ffe5ec",
      animationEffect: "slide",
      textStyle: {
        fontSize: "16px",
        fontWeight: "normal",
        color: "#d81b60",
        alignment: "left",
      },
      buttonStyle: {
        size: "medium",
        color: "#d81b60",
        hoverEffect: "pulse",
      },
      stats: {
        views: 2500,
        clicks: 800,
        conversionRate: 32.0,
      },
      createdAt: new Date("2025-03-20"),
    },
    {
      id: "3",
      title: "Weekend Special Offer",
      description: "Get 50% off on premium subscription this weekend only",
      imageUrl: "/character_images/special_offer.jpg",
      ctaText: "Claim Offer",
      ctaLink: "/special-offer",
      isActive: false,
      durationSeconds: 20,
      targetUserType: "free",
      targetRegions: ["Asia", "Europe"],
      targetDevices: ["mobile"],
      startDate: "2025-03-25",
      endDate: "2025-03-27",
      displayTimes: {
        startTime: "09:00",
        endTime: "18:00",
      },
      backgroundColor: "#fff9c4",
      animationEffect: "zoom",
      textStyle: {
        fontSize: "20px",
        fontWeight: "bold",
        color: "#ff6d00",
        alignment: "center",
      },
      buttonStyle: {
        size: "large",
        color: "#ff6d00",
        hoverEffect: "glow",
      },
      stats: {
        views: 1800,
        clicks: 650,
        conversionRate: 36.1,
      },
      createdAt: new Date("2025-03-25"),
    },
  ];

  // Query for advertisements
  // In a real implementation, this would be an actual API call
  const { data: advertisements = mockAdvertisements, isLoading: adsLoading } = useQuery<Advertisement[]>({
    queryKey: ["/api/admin/advertisements"],
    enabled: false, // Disabled since we're using mock data
  });

  // File upload mutation
  const uploadImage = useMutation({
    mutationFn: async ({ file }: { file: File }) => {
      // Simulate file upload
      return new Promise<{ path: string }>((resolve) => {
        setTimeout(() => {
          // Incremental progress simulation
          let progress = 0;
          const interval = setInterval(() => {
            progress += 10;
            setUploadProgress(progress);
            if (progress >= 100) {
              clearInterval(interval);
              resolve({ path: `/character_images/${file.name}` });
            }
          }, 200);
        }, 500);
      });
    },
    onSuccess: (data) => {
      // Update the form with the uploaded image path
      form.setValue('imageUrl', data.path, { 
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true
      });
      
      // Reset upload states
      setUploadedFile(null);
      setUploadProgress(0);
      setIsUploading(false);
      
      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
    },
    onError: (error: Error) => {
      setIsUploading(false);
      setUploadProgress(0);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Mutations
  // These are mocked since we don't have a real API yet
  const createAdvertisement = useMutation({
    mutationFn: async (data: AdvertisementFormValues) => {
      // Simulate API call
      return new Promise<Advertisement>((resolve) => {
        setTimeout(() => {
          const newAd = {
            ...data,
            id: String(Date.now()),
            createdAt: new Date(),
            stats: {
              views: 0,
              clicks: 0,
              conversionRate: 0,
            }
          } as Advertisement;
          resolve(newAd);
        }, 1000);
      });
    },
    onSuccess: () => {
      // In a real implementation, would invalidate the query
      // queryClient.invalidateQueries({ queryKey: ["/api/admin/advertisements"] });
      setCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Advertisement created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateAdvertisement = useMutation({
    mutationFn: async (data: AdvertisementFormValues) => {
      // Simulate API call
      return new Promise<Advertisement>((resolve) => {
        setTimeout(() => {
          const updatedAd = {
            ...data,
            createdAt: editingAdvertisement?.createdAt || new Date(),
            stats: editingAdvertisement?.stats || {
              views: 0,
              clicks: 0,
              conversionRate: 0,
            }
          } as Advertisement;
          resolve(updatedAd);
        }, 1000);
      });
    },
    onSuccess: () => {
      // In a real implementation, would invalidate the query
      // queryClient.invalidateQueries({ queryKey: ["/api/admin/advertisements"] });
      setEditDialogOpen(false);
      setEditingAdvertisement(null);
      form.reset();
      toast({
        title: "Success",
        description: "Advertisement updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteAdvertisement = useMutation({
    mutationFn: async (id: string) => {
      // Simulate API call
      return new Promise<{ success: boolean }>((resolve) => {
        setTimeout(() => {
          resolve({ success: true });
        }, 1000);
      });
    },
    onSuccess: () => {
      // In a real implementation, would invalidate the query
      // queryClient.invalidateQueries({ queryKey: ["/api/admin/advertisements"] });
      setDeleteDialogOpen(false);
      setAdvertisementToDelete(null);
      toast({
        title: "Success",
        description: "Advertisement deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPEG, PNG, GIF, or WebP image",
        variant: "destructive",
      });
      return;
    }
    
    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "The image must be less than 5MB",
        variant: "destructive",
      });
      return;
    }
    
    setUploadedFile(file);
    setIsUploading(true);
    setUploadProgress(10); // Start progress indication
    
    // Upload the file
    uploadImage.mutate({ file });
  };

  // Form submit handlers
  const onCreateSubmit = (data: AdvertisementFormValues) => {
    createAdvertisement.mutate(data);
  };

  const onEditSubmit = (data: AdvertisementFormValues) => {
    updateAdvertisement.mutate(data);
  };

  // Handler to open edit dialog with ad data
  const handleEditAdvertisement = (ad: Advertisement) => {
    setEditingAdvertisement(ad);
    form.reset({
      id: ad.id,
      title: ad.title,
      description: ad.description,
      imageUrl: ad.imageUrl,
      ctaText: ad.ctaText,
      ctaLink: ad.ctaLink,
      isActive: ad.isActive,
      durationSeconds: ad.durationSeconds,
      targetUserType: ad.targetUserType,
      targetRegions: ad.targetRegions,
      targetDevices: ad.targetDevices,
      startDate: ad.startDate,
      endDate: ad.endDate,
      displayTimes: ad.displayTimes,
      backgroundColor: ad.backgroundColor,
      animationEffect: ad.animationEffect,
      textStyle: ad.textStyle,
      buttonStyle: ad.buttonStyle,
    });
    setEditDialogOpen(true);
  };

  // Handler to open delete confirmation dialog
  const handleDeleteConfirmation = (id: string) => {
    setAdvertisementToDelete(id);
    setDeleteDialogOpen(true);
  };

  // Handler to confirm deletion
  const confirmDelete = () => {
    if (advertisementToDelete) {
      deleteAdvertisement.mutate(advertisementToDelete);
    }
  };

  // Open create dialog
  const handleCreateAdvertisement = () => {
    form.reset({
      title: "",
      description: "",
      imageUrl: "",
      ctaText: "Start Now",
      ctaLink: "/",
      isActive: true,
      durationSeconds: 10,
      targetUserType: "all",
      targetRegions: [],
      targetDevices: [],
      backgroundColor: "#ffffff",
      animationEffect: "fade",
      textStyle: {
        fontSize: "16px",
        fontWeight: "normal",
        color: "#000000",
        alignment: "left",
      },
      buttonStyle: {
        size: "medium",
        color: "#6366f1",
        hoverEffect: "scale",
      },
    });
    setCreateDialogOpen(true);
  };

  // Toggle advertisement status
  const toggleAdvertisementStatus = (id: string, currentStatus: boolean) => {
    // In a real implementation, this would call the API
    toast({
      title: `Advertisement ${currentStatus ? 'disabled' : 'enabled'}`,
      description: `The advertisement has been ${currentStatus ? 'disabled' : 'enabled'} successfully.`,
    });
  };

  // Export analytics data
  const handleExportAnalytics = (format: 'csv' | 'pdf') => {
    toast({
      title: `Export ${format.toUpperCase()}`,
      description: `Analytics data exported as ${format.toUpperCase()} successfully.`,
    });
  };

  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <Link href="/admin/dashboard">
          <Button variant="ghost" size="icon" className="mr-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Advertisement Manager</h1>
        
        <div className="flex items-center ml-auto gap-2">
          <Button 
            onClick={handleCreateAdvertisement}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Advertisement
          </Button>
          
          {/* Hamburger Menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Admin Menu</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <Link href="/admin/dashboard" className="w-full">
                  <Button variant="secondary" className="w-full gap-2 justify-start">
                    <Crown className="h-4 w-4" />
                    Dashboard
                  </Button>
                </Link>
                <Link href="/admin/characters" className="w-full">
                  <Button variant="secondary" className="w-full gap-2 justify-start">
                    <Palette className="h-4 w-4" />
                    Manage Characters
                  </Button>
                </Link>
                <Link href="/admin/advertisements" className="w-full">
                  <Button variant="secondary" className="w-full gap-2 justify-start">
                    <Image className="h-4 w-4" />
                    Advertisements
                  </Button>
                </Link>
                <Link href="/admin/content-moderation" className="w-full">
                  <Button variant="secondary" className="w-full gap-2 justify-start relative">
                    <Shield className="h-4 w-4" />
                    Content Moderation
                  </Button>
                </Link>
                <Link href="/admin/dashboard/complaints" className="w-full">
                  <Button variant="secondary" className="w-full gap-2 justify-start">
                    <AlertCircle className="h-4 w-4" />
                    View Complaints
                  </Button>
                </Link>
                <Link href="/admin/dashboard/feedback" className="w-full">
                  <Button variant="secondary" className="w-full gap-2 justify-start">
                    <MessageCircle className="h-4 w-4" />
                    View Feedback
                  </Button>
                </Link>
                <Button 
                  variant="destructive" 
                  className="w-full gap-2 justify-start mt-8" 
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="manage" className="w-full" onValueChange={setSelectedTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="manage">Manage Advertisements</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="preview">Live Preview</TabsTrigger>
        </TabsList>
        
        {/* Manage Advertisements Tab */}
        <TabsContent value="manage" className="space-y-6">
          {/* Advertisements table */}
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="py-3 px-4 text-left">Advertisement</th>
                  <th className="py-3 px-4 text-left">Details</th>
                  <th className="py-3 px-4 text-left">Targeting</th>
                  <th className="py-3 px-4 text-left">Status</th>
                  <th className="py-3 px-4 text-left">Performance</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {adsLoading ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : advertisements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-muted-foreground">
                      No advertisements found
                    </td>
                  </tr>
                ) : (
                  advertisements.map((ad) => (
                    <tr key={ad.id} className="border-b">
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-4">
                          <div className="h-16 w-16 rounded-md overflow-hidden flex-shrink-0">
                            <img 
                              src={ad.imageUrl} 
                              alt={ad.title} 
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "https://via.placeholder.com/100";
                              }}
                            />
                          </div>
                          <div className="space-y-1">
                            <p className="font-medium">{ad.title}</p>
                            <p className="text-xs text-muted-foreground line-clamp-2">{ad.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="space-y-1 text-xs">
                          <p className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>Duration: {ad.durationSeconds}s</span>
                          </p>
                          <p className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {ad.startDate && ad.endDate 
                                ? `${new Date(ad.startDate).toLocaleDateString()} - ${new Date(ad.endDate).toLocaleDateString()}`
                                : "No date range set"}
                            </span>
                          </p>
                          <p className="flex items-center gap-1">
                            <MousePointer className="h-3 w-3" />
                            <span>CTA: {ad.ctaText}</span>
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="space-y-1 text-xs">
                          <p className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            <span>Users: {ad.targetUserType === 'all' ? 'All Users' : ad.targetUserType === 'free' ? 'Free Users' : 'Premium Users'}</span>
                          </p>
                          <p className="flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            <span>Regions: {ad.targetRegions.length ? ad.targetRegions.join(', ') : 'Global'}</span>
                          </p>
                          <p className="flex items-center gap-1">
                            <div className="h-3 w-3" />
                            <span>Devices: {ad.targetDevices.length ? ad.targetDevices.join(', ') : 'All'}</span>
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-col items-start">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center space-x-2">
                                  <div className={`h-2 w-2 rounded-full ${ad.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                                  <span>{ad.isActive ? 'Active' : 'Inactive'}</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Click to {ad.isActive ? 'disable' : 'enable'}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          
                          <Switch
                            checked={ad.isActive}
                            onCheckedChange={() => toggleAdvertisementStatus(ad.id, ad.isActive)}
                            className="mt-2"
                          />
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="space-y-2 text-xs">
                          <div>
                            <p className="text-muted-foreground">Views</p>
                            <p className="font-medium">{ad.stats.views.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Clicks</p>
                            <p className="font-medium">{ad.stats.clicks.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Conversion</p>
                            <p className="font-medium">{ad.stats.conversionRate}%</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex justify-center space-x-2">
                          <Button 
                            variant="outline" 
                            size="icon"
                            onClick={() => handleEditAdvertisement(ad)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="icon" className="text-red-500">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Advertisement</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this advertisement? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeleteConfirmation(ad.id)}
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
        
        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="p-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Total Views</p>
                <p className="text-3xl font-bold">
                  {sampleAnalyticsData.reduce((sum, item) => sum + item.views, 0).toLocaleString()}
                </p>
                <p className="text-xs text-green-500">+12.5% from last month</p>
              </div>
            </Card>
            <Card className="p-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Total Clicks</p>
                <p className="text-3xl font-bold">
                  {sampleAnalyticsData.reduce((sum, item) => sum + item.clicks, 0).toLocaleString()}
                </p>
                <p className="text-xs text-green-500">+8.3% from last month</p>
              </div>
            </Card>
            <Card className="p-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Average Conversion Rate</p>
                <p className="text-3xl font-bold">
                  {(sampleAnalyticsData.reduce((sum, item) => sum + item.conversionRate, 0) / sampleAnalyticsData.length).toFixed(1)}%
                </p>
                <p className="text-xs text-green-500">+2.1% from last month</p>
              </div>
            </Card>
          </div>
          
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4">Advertisement Performance</h3>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={sampleAnalyticsData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RechartTooltip />
                  <Bar dataKey="views" name="Views" fill="#8884d8" />
                  <Bar dataKey="clicks" name="Clicks" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => handleExportAnalytics('csv')}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={() => handleExportAnalytics('pdf')}>
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </TabsContent>
        
        {/* Live Preview Tab */}
        <TabsContent value="preview" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4">Live Advertisement Preview</h3>
            <div className="relative overflow-hidden rounded-lg w-full aspect-[16/9] bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500">
              <div className="absolute inset-0 p-6 flex flex-col justify-between">
                <div className="space-y-2 max-w-md">
                  <h4 className="text-2xl font-bold text-white">Premium Character Access</h4>
                  <p className="text-white/80">Unlock all premium characters and features with our subscription plan. Limited time offer!</p>
                </div>
                <div className="flex gap-4">
                  <Button className="bg-white text-purple-600 hover:bg-white/90">
                    Subscribe Now
                  </Button>
                  <Button variant="outline" className="text-white border-white hover:bg-white/20">
                    Learn More
                  </Button>
                </div>
              </div>
            </div>
            <div className="mt-6 space-y-4">
              <p className="text-sm text-muted-foreground">This is a preview of how your advertisement will appear to users. Changes made in the Advertisement Manager will be reflected here.</p>
              
              <div className="flex flex-wrap gap-4">
                <div>
                  <p className="text-sm font-medium mb-2">Background Color</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white">
                      Gradient 1
                    </Button>
                    <Button size="sm" variant="outline" className="bg-gradient-to-r from-amber-400 via-pink-500 to-purple-500 text-white">
                      Gradient 2
                    </Button>
                    <Button size="sm" variant="outline" className="bg-gradient-to-r from-green-300 via-blue-500 to-purple-600 text-white">
                      Gradient 3
                    </Button>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm font-medium mb-2">Animation Effect</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">Fade</Button>
                    <Button size="sm" variant="outline">Slide</Button>
                    <Button size="sm" variant="outline">Zoom</Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Ad Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Advertisement</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onCreateSubmit)} className="space-y-6">
              {/* Tabs for ad creation */}
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="targeting">Targeting</TabsTrigger>
                  <TabsTrigger value="appearance">Appearance</TabsTrigger>
                  <TabsTrigger value="button">Button Style</TabsTrigger>
                </TabsList>
                
                {/* Basic Info Tab */}
                <TabsContent value="basic" className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Advertisement Title" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Advertisement description" 
                            className="resize-none"
                            {...field} 
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="imageUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Image</FormLabel>
                        <FormControl>
                          <div className="space-y-4">
                            <Input 
                              placeholder="Image URL or upload" 
                              {...field} 
                            />
                            
                            <div>
                              <p className="text-sm font-medium mb-2">Upload image</p>
                              <div className="relative">
                                <Input 
                                  type="file" 
                                  accept="image/jpeg,image/png,image/gif,image/webp" 
                                  onChange={handleFileUpload}
                                  className="cursor-pointer"
                                  disabled={isUploading}
                                />
                                {isUploading && (
                                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                    <span>Uploading...</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {uploadProgress > 0 && uploadProgress < 100 && (
                              <div className="w-full bg-muted rounded-full h-2.5 mt-2">
                                <div 
                                  className="bg-primary h-2.5 rounded-full" 
                                  style={{ width: `${uploadProgress}%` }} 
                                />
                              </div>
                            )}
                            
                            {field.value && (
                              <div className="mt-2 relative w-32 h-32 rounded-md overflow-hidden border border-muted">
                                <img 
                                  src={field.value}
                                  alt="Advertisement image"
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = "https://via.placeholder.com/100";
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="ctaText"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Call to Action Text</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Learn More" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="ctaLink"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Call to Action Link</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., /subscription" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="durationSeconds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display Duration (seconds)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min={1} 
                            max={60}
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Active</FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Make this advertisement visible to users
                          </p>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </TabsContent>
                
                {/* Targeting Tab */}
                <TabsContent value="targeting" className="space-y-4">
                  <FormField
                    control={form.control}
                    name="targetUserType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target User Type</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select user type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="all">All Users</SelectItem>
                            <SelectItem value="free">Free Users</SelectItem>
                            <SelectItem value="premium">Premium Users</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* For simplicity, we're not implementing the full regions and devices selection UI */}
                  <div>
                    <FormLabel>Target Regions</FormLabel>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        className="bg-primary/10"
                      >
                        Global (All Regions)
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <FormLabel>Target Devices</FormLabel>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        className="bg-primary/10"
                      >
                        All Devices
                      </Button>
                    </div>
                  </div>
                </TabsContent>
                
                {/* Appearance Tab */}
                <TabsContent value="appearance" className="space-y-4">
                  <FormField
                    control={form.control}
                    name="backgroundColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Background Color</FormLabel>
                        <FormControl>
                          <div className="flex gap-3">
                            <Input type="color" className="w-12 h-10 p-1" {...field} />
                            <Input 
                              placeholder="#FFFFFF" 
                              {...field} 
                              className="flex-1"
                            />
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="animationEffect"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Animation Effect</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select animation effect" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="fade">Fade In</SelectItem>
                            <SelectItem value="slide">Slide</SelectItem>
                            <SelectItem value="zoom">Zoom</SelectItem>
                            <SelectItem value="bounce">Bounce</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  
                  {/* Font settings - simplified for this example */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="textStyle.fontSize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Font Size</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select font size" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="12px">Small</SelectItem>
                              <SelectItem value="16px">Medium</SelectItem>
                              <SelectItem value="20px">Large</SelectItem>
                              <SelectItem value="24px">Extra Large</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="textStyle.fontWeight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Font Weight</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select font weight" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="bold">Bold</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="textStyle.color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Text Color</FormLabel>
                        <FormControl>
                          <div className="flex gap-3">
                            <Input type="color" className="w-12 h-10 p-1" {...field} />
                            <Input 
                              placeholder="#000000" 
                              {...field} 
                              className="flex-1"
                            />
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="textStyle.alignment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Text Alignment</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select text alignment" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="left">Left</SelectItem>
                            <SelectItem value="center">Center</SelectItem>
                            <SelectItem value="right">Right</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </TabsContent>
                
                {/* Button Style Tab */}
                <TabsContent value="button" className="space-y-4">
                  <FormField
                    control={form.control}
                    name="buttonStyle.size"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Button Size</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select button size" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="small">Small</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="large">Large</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="buttonStyle.color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Button Color</FormLabel>
                        <FormControl>
                          <div className="flex gap-3">
                            <Input type="color" className="w-12 h-10 p-1" {...field} />
                            <Input 
                              placeholder="#6366f1" 
                              {...field} 
                              className="flex-1"
                            />
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="buttonStyle.hoverEffect"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hover Effect</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select hover effect" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="scale">Scale</SelectItem>
                            <SelectItem value="pulse">Pulse</SelectItem>
                            <SelectItem value="glow">Glow</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="buttonStyle.icon"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Button Icon (Optional)</FormLabel>
                          <Select 
                            onValueChange={field.onChange || ''} 
                            defaultValue={field.value}
                            value={field.value || ''}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select icon" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="">No Icon</SelectItem>
                              <SelectItem value="arrow-right">Arrow Right</SelectItem>
                              <SelectItem value="crown">Crown / Premium</SelectItem>
                              <SelectItem value="shopping-cart">Shopping Cart</SelectItem>
                              <SelectItem value="external-link">External Link</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex items-end">
                      <div className="w-full h-10 rounded-md border border-input flex items-center justify-center">
                        <div className={`bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-4 py-2 rounded-md inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50`}>
                          {form.watch('ctaText') || 'Button Preview'}
                          {form.watch('buttonStyle.icon') === 'arrow-right' && <ArrowLeft className="ml-2 h-4 w-4" />}
                          {form.watch('buttonStyle.icon') === 'crown' && <Crown className="ml-2 h-4 w-4" />}
                          {form.watch('buttonStyle.icon') === 'shopping-cart' && <div className="ml-2 h-4 w-4">🛒</div>}
                          {form.watch('buttonStyle.icon') === 'external-link' && <ExternalLink className="ml-2 h-4 w-4" />}
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createAdvertisement.isPending}>
                  {createAdvertisement.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Advertisement
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Ad Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Advertisement</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onEditSubmit)} className="space-y-6">
              {/* Tabs for ad editing - similar to creation form */}
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="targeting">Targeting</TabsTrigger>
                  <TabsTrigger value="appearance">Appearance</TabsTrigger>
                  <TabsTrigger value="button">Button Style</TabsTrigger>
                </TabsList>
                
                {/* Basic Info Tab */}
                <TabsContent value="basic" className="space-y-4">
                  {/* Hidden ID field */}
                  <FormField
                    control={form.control}
                    name="id"
                    render={({ field }) => (
                      <FormItem className="hidden">
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  {/* Rest of the form is identical to create form */}
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Advertisement Title" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Advertisement description" 
                            className="resize-none"
                            {...field} 
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="imageUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Image</FormLabel>
                        <FormControl>
                          <div className="space-y-4">
                            <Input 
                              placeholder="Image URL or upload" 
                              {...field} 
                            />
                            
                            <div>
                              <p className="text-sm font-medium mb-2">Upload new image</p>
                              <div className="relative">
                                <Input 
                                  type="file" 
                                  accept="image/jpeg,image/png,image/gif,image/webp" 
                                  onChange={handleFileUpload}
                                  className="cursor-pointer"
                                  disabled={isUploading}
                                />
                                {isUploading && (
                                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                    <span>Uploading...</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {uploadProgress > 0 && uploadProgress < 100 && (
                              <div className="w-full bg-muted rounded-full h-2.5 mt-2">
                                <div 
                                  className="bg-primary h-2.5 rounded-full" 
                                  style={{ width: `${uploadProgress}%` }} 
                                />
                              </div>
                            )}
                            
                            {field.value && (
                              <div className="mt-2 relative w-32 h-32 rounded-md overflow-hidden border border-muted">
                                <img 
                                  src={field.value}
                                  alt="Advertisement image"
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = "https://via.placeholder.com/100";
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="ctaText"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Call to Action Text</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Learn More" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="ctaLink"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Call to Action Link</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., /subscription" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="durationSeconds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display Duration (seconds)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min={1} 
                            max={60}
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Active</FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Make this advertisement visible to users
                          </p>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </TabsContent>
                
                {/* Targeting Tab - identical to create form */}
                <TabsContent value="targeting" className="space-y-4">
                  {/* All fields identical to create form */}
                  <FormField
                    control={form.control}
                    name="targetUserType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target User Type</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select user type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="all">All Users</SelectItem>
                            <SelectItem value="free">Free Users</SelectItem>
                            <SelectItem value="premium">Premium Users</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div>
                    <FormLabel>Target Regions</FormLabel>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        className="bg-primary/10"
                      >
                        Global (All Regions)
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <FormLabel>Target Devices</FormLabel>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        className="bg-primary/10"
                      >
                        All Devices
                      </Button>
                    </div>
                  </div>
                </TabsContent>
                
                {/* Appearance Tab - identical to create form */}
                <TabsContent value="appearance" className="space-y-4">
                  {/* All fields identical to create form */}
                  <FormField
                    control={form.control}
                    name="backgroundColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Background Color</FormLabel>
                        <FormControl>
                          <div className="flex gap-3">
                            <Input type="color" className="w-12 h-10 p-1" {...field} />
                            <Input 
                              placeholder="#FFFFFF" 
                              {...field} 
                              className="flex-1"
                            />
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="animationEffect"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Animation Effect</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select animation effect" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="fade">Fade In</SelectItem>
                            <SelectItem value="slide">Slide</SelectItem>
                            <SelectItem value="zoom">Zoom</SelectItem>
                            <SelectItem value="bounce">Bounce</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="textStyle.fontSize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Font Size</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select font size" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="12px">Small</SelectItem>
                              <SelectItem value="16px">Medium</SelectItem>
                              <SelectItem value="20px">Large</SelectItem>
                              <SelectItem value="24px">Extra Large</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="textStyle.fontWeight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Font Weight</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select font weight" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="bold">Bold</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="textStyle.color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Text Color</FormLabel>
                        <FormControl>
                          <div className="flex gap-3">
                            <Input type="color" className="w-12 h-10 p-1" {...field} />
                            <Input 
                              placeholder="#000000" 
                              {...field} 
                              className="flex-1"
                            />
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="textStyle.alignment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Text Alignment</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select text alignment" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="left">Left</SelectItem>
                            <SelectItem value="center">Center</SelectItem>
                            <SelectItem value="right">Right</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </TabsContent>
                
                {/* Button Style Tab - identical to create form */}
                <TabsContent value="button" className="space-y-4">
                  {/* All fields identical to create form */}
                  <FormField
                    control={form.control}
                    name="buttonStyle.size"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Button Size</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select button size" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="small">Small</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="large">Large</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="buttonStyle.color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Button Color</FormLabel>
                        <FormControl>
                          <div className="flex gap-3">
                            <Input type="color" className="w-12 h-10 p-1" {...field} />
                            <Input 
                              placeholder="#6366f1" 
                              {...field} 
                              className="flex-1"
                            />
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="buttonStyle.hoverEffect"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hover Effect</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select hover effect" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="scale">Scale</SelectItem>
                            <SelectItem value="pulse">Pulse</SelectItem>
                            <SelectItem value="glow">Glow</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="buttonStyle.icon"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Button Icon (Optional)</FormLabel>
                          <Select 
                            onValueChange={field.onChange || ''} 
                            defaultValue={field.value}
                            value={field.value || ''}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select icon" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="">No Icon</SelectItem>
                              <SelectItem value="arrow-right">Arrow Right</SelectItem>
                              <SelectItem value="crown">Crown / Premium</SelectItem>
                              <SelectItem value="shopping-cart">Shopping Cart</SelectItem>
                              <SelectItem value="external-link">External Link</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex items-end">
                      <div className="w-full h-10 rounded-md border border-input flex items-center justify-center">
                        <div className={`bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-4 py-2 rounded-md inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50`}>
                          {form.watch('ctaText') || 'Button Preview'}
                          {form.watch('buttonStyle.icon') === 'arrow-right' && <ArrowLeft className="ml-2 h-4 w-4" />}
                          {form.watch('buttonStyle.icon') === 'crown' && <Crown className="ml-2 h-4 w-4" />}
                          {form.watch('buttonStyle.icon') === 'shopping-cart' && <div className="ml-2 h-4 w-4">🛒</div>}
                          {form.watch('buttonStyle.icon') === 'external-link' && <ExternalLink className="ml-2 h-4 w-4" />}
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateAdvertisement.isPending}>
                  {updateAdvertisement.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Advertisement
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Advertisement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this advertisement? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              {deleteAdvertisement.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}