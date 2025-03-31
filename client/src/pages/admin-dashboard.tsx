import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Ban,
  Lock,
  UnlockIcon,
  Users, 
  UserPlus, 
  Crown, 
  Palette, 
  MessageSquare, 
  Shield, 
  LogOut,
  Plus,
  Loader2,
  Trash2,
  MessageCircle,
  AlertCircle,
  Settings,
  Bell,
  ArrowLeft,
  Menu as MenuIcon,
  ChevronDown, 
  X 
} from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { NotificationPopover } from "@/components/admin/notification-popover";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts";
import { type Complaint } from "@shared/schema";
import { User, type SubscriptionPlan, type Feedback } from "@shared/schema";
import { setupWebSocket } from "@/lib/websocket";
import { insertSubscriptionPlanSchema } from "@shared/schema";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Type definitions for Advertisement feature
interface Advertisement {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  backgroundColor: string;
  backgroundGradient?: string;
  backgroundImageUrl?: string;
  isActive: boolean;
  displayDuration: number;
  animation: string;
  sortOrder: number;
  expiresAt?: string;
  textColor: string;
  textAlignment: string;
  fontSize: string;
  views: number;
  clicks: number;
  createdAt: string;
  updatedAt: string;
}

interface AdButton {
  id: number;
  adId: number;
  text: string;
  url: string;
  buttonColor: string;
  textColor: string;
  size: string;
  placement: string;
  isNewTab: boolean;
  sortOrder: number;
  clicks: number;
  createdAt: string;
  updatedAt: string;
}

// Define the type for flagged message stats
interface FlaggedMessageStats {
  total: number;
  unreviewed: number;
  byReason: Record<string, number>;
}

// Featured Advertisements Manager Component
function FeaturedAdsManager() {
  const { toast } = useToast();
  const [selectedAd, setSelectedAd] = useState<Advertisement | null>(null);
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("advertisements");
  const [draggedAdId, setDraggedAdId] = useState<number | null>(null);
  const [dragOverAdId, setDragOverAdId] = useState<number | null>(null);
  const [draggedButtonId, setDraggedButtonId] = useState<number | null>(null);
  const [dragOverButtonId, setDragOverButtonId] = useState<number | null>(null);
  const [adFormData, setAdFormData] = useState({
    title: "",
    description: "",
    imageUrl: "",
    backgroundColor: "#ffffff",
    backgroundGradient: "",
    backgroundImageUrl: "",
    isActive: true,
    displayDuration: 10,
    animation: "fade",
    sortOrder: 0,
    expiresAt: "",
    textColor: "#000000",
    textAlignment: "center",
    fontSize: "medium"
  });
  const [buttonFormData, setButtonFormData] = useState({
    text: "",
    url: "",
    buttonColor: "#3b82f6",
    textColor: "#ffffff",
    size: "medium",
    placement: "bottom",
    isNewTab: true,
    sortOrder: 0
  });
  
  // Query to fetch all advertisements
  const { data: advertisements = [], isLoading: adsLoading, refetch: refetchAds } = useQuery<Advertisement[]>({
    queryKey: ['/api/admin/advertisements'],
    staleTime: 10000, // 10 seconds
  });

  // Query to fetch buttons for the selected ad
  const { data: adButtons = [], isLoading: buttonsLoading, refetch: refetchButtons } = useQuery<AdButton[]>({
    queryKey: ['/api/admin/advertisements', selectedAd?.id, 'buttons'],
    enabled: !!selectedAd,
    staleTime: 10000, // 10 seconds
  });

  // Mutations for ads
  const createAd = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/admin/advertisements", data);
      return res.json();
    },
    onSuccess: () => {
      setCreateDialogOpen(false);
      refetchAds();
      toast({
        title: "Success",
        description: "Advertisement created successfully",
      });
      setAdFormData({
        title: "",
        description: "",
        imageUrl: "",
        backgroundColor: "#ffffff",
        backgroundGradient: "",
        backgroundImageUrl: "",
        isActive: true,
        displayDuration: 10,
        animation: "fade",
        sortOrder: 0,
        expiresAt: "",
        textColor: "#000000",
        textAlignment: "center",
        fontSize: "medium"
      });
    },
  });

  const updateAd = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PUT", `/api/admin/advertisements/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      setEditDialogOpen(false);
      refetchAds();
      toast({
        title: "Success",
        description: "Advertisement updated successfully",
      });
    },
  });

  const deleteAd = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/admin/advertisements/${id}`);
      return res.json();
    },
    onSuccess: () => {
      setDeleteDialogOpen(false);
      setSelectedAd(null);
      refetchAds();
      toast({
        title: "Success",
        description: "Advertisement deleted successfully",
      });
    },
  });

  const toggleAdStatus = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const res = await apiRequest("PUT", `/api/admin/advertisements/${id}`, { isActive });
      return res.json();
    },
    onSuccess: () => {
      refetchAds();
      toast({
        title: "Success",
        description: "Advertisement status updated",
      });
    },
  });

  const updateAdOrder = useMutation({
    mutationFn: async ({ id, sortOrder }: { id: number; sortOrder: number }) => {
      const res = await apiRequest("PUT", `/api/admin/advertisements/${id}`, { sortOrder });
      return res.json();
    },
    onSuccess: () => {
      refetchAds();
    },
  });

  // Mutations for buttons
  const createButton = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/admin/advertisements/${selectedAd?.id}/buttons`, data);
      return res.json();
    },
    onSuccess: () => {
      refetchButtons();
      toast({
        title: "Success",
        description: "Button added successfully",
      });
      setButtonFormData({
        text: "",
        url: "",
        buttonColor: "#3b82f6",
        textColor: "#ffffff",
        size: "medium",
        placement: "bottom",
        isNewTab: true,
        sortOrder: 0
      });
    },
  });

  const updateButton = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PUT", `/api/admin/ad-buttons/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      refetchButtons();
      toast({
        title: "Success",
        description: "Button updated successfully",
      });
    },
  });

  const deleteButton = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/admin/ad-buttons/${id}`);
      return res.json();
    },
    onSuccess: () => {
      refetchButtons();
      toast({
        title: "Success",
        description: "Button deleted successfully",
      });
    },
  });

  const updateButtonOrder = useMutation({
    mutationFn: async ({ id, sortOrder }: { id: number; sortOrder: number }) => {
      const res = await apiRequest("PUT", `/api/admin/ad-buttons/${id}`, { sortOrder });
      return res.json();
    },
    onSuccess: () => {
      refetchButtons();
    },
  });

  // Handle drag and drop for advertisements
  const handleDragStart = (adId: number) => {
    setDraggedAdId(adId);
  };

  const handleDragOver = (e: React.DragEvent, adId: number) => {
    e.preventDefault();
    if (draggedAdId !== adId) {
      setDragOverAdId(adId);
    }
  };

  const handleDrop = (e: React.DragEvent, targetAdId: number) => {
    e.preventDefault();
    if (draggedAdId === null || draggedAdId === targetAdId) return;

    const draggedAd = advertisements.find(ad => ad.id === draggedAdId);
    const targetAd = advertisements.find(ad => ad.id === targetAdId);
    
    if (draggedAd && targetAd) {
      // Swap the sort orders
      updateAdOrder.mutate({ id: draggedAd.id, sortOrder: targetAd.sortOrder });
      updateAdOrder.mutate({ id: targetAd.id, sortOrder: draggedAd.sortOrder });
    }

    setDraggedAdId(null);
    setDragOverAdId(null);
  };

  // Handle drag and drop for buttons
  const handleButtonDragStart = (buttonId: number) => {
    setDraggedButtonId(buttonId);
  };

  const handleButtonDragOver = (e: React.DragEvent, buttonId: number) => {
    e.preventDefault();
    if (draggedButtonId !== buttonId) {
      setDragOverButtonId(buttonId);
    }
  };

  const handleButtonDrop = (e: React.DragEvent, targetButtonId: number) => {
    e.preventDefault();
    if (draggedButtonId === null || draggedButtonId === targetButtonId) return;

    const draggedButton = adButtons.find(button => button.id === draggedButtonId);
    const targetButton = adButtons.find(button => button.id === targetButtonId);
    
    if (draggedButton && targetButton) {
      // Swap the sort orders
      updateButtonOrder.mutate({ id: draggedButton.id, sortOrder: targetButton.sortOrder });
      updateButtonOrder.mutate({ id: targetButton.id, sortOrder: draggedButton.sortOrder });
    }

    setDraggedButtonId(null);
    setDragOverButtonId(null);
  };

  // Handle opening the edit dialog and populating form data
  const handleEditAd = (ad: Advertisement) => {
    setSelectedAd(ad);
    setAdFormData({
      title: ad.title,
      description: ad.description,
      imageUrl: ad.imageUrl,
      backgroundColor: ad.backgroundColor,
      backgroundGradient: ad.backgroundGradient || "",
      backgroundImageUrl: ad.backgroundImageUrl || "",
      isActive: ad.isActive,
      displayDuration: ad.displayDuration,
      animation: ad.animation,
      sortOrder: ad.sortOrder,
      expiresAt: ad.expiresAt ? new Date(ad.expiresAt).toISOString().slice(0, 16) : "",
      textColor: ad.textColor,
      textAlignment: ad.textAlignment,
      fontSize: ad.fontSize
    });
    setEditDialogOpen(true);
  };

  const handleCreateAd = () => {
    setAdFormData({
      title: "",
      description: "",
      imageUrl: "",
      backgroundColor: "#ffffff",
      backgroundGradient: "",
      backgroundImageUrl: "",
      isActive: true,
      displayDuration: 10,
      animation: "fade",
      sortOrder: advertisements.length, // Default to end of list
      expiresAt: "",
      textColor: "#000000",
      textAlignment: "center",
      fontSize: "medium"
    });
    setCreateDialogOpen(true);
  };

  const handleAddButton = () => {
    if (!selectedAd) return;
    
    createButton.mutate({
      ...buttonFormData,
      adId: selectedAd.id,
      sortOrder: adButtons.length // Default to end of list
    });
  };

  // Render ad stats (views and clicks)
  const renderAdStats = (ad: Advertisement) => {
    return (
      <div className="flex gap-3 text-xs text-muted-foreground mt-2">
        <div className="flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span>{ad.views} views</span>
        </div>
        <div className="flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          <span>{ad.clicks} clicks</span>
        </div>
        {ad.expiresAt && (
          <div className="flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>Expires: {new Date(ad.expiresAt).toLocaleDateString()}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="advertisements" className="flex-1">Advertisements</TabsTrigger>
          <TabsTrigger value="buttons" className="flex-1" disabled={!selectedAd}>Button Customization</TabsTrigger>
          <TabsTrigger value="preview" className="flex-1" disabled={!selectedAd}>Live Preview</TabsTrigger>
        </TabsList>
        
        <TabsContent value="advertisements" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Featured Advertisements</h3>
            <Button onClick={handleCreateAd} className="gap-2">
              <Plus className="h-4 w-4" />
              Add New
            </Button>
          </div>
          
          {adsLoading ? (
            <div className="flex justify-center p-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : advertisements.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground border border-dashed rounded-md">
              No advertisements found. Create one to get started.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {advertisements.sort((a, b) => a.sortOrder - b.sortOrder).map((ad) => (
                <Card 
                  key={ad.id} 
                  className={`overflow-hidden cursor-move ${dragOverAdId === ad.id ? 'border-2 border-primary' : ''} ${ad.isActive ? '' : 'opacity-60'}`}
                  draggable
                  onDragStart={() => handleDragStart(ad.id)}
                  onDragOver={(e) => handleDragOver(e, ad.id)}
                  onDrop={(e) => handleDrop(e, ad.id)}
                  onDragEnd={() => {
                    setDraggedAdId(null);
                    setDragOverAdId(null);
                  }}
                >
                  <div className="relative">
                    <div 
                      className="p-4"
                      style={{
                        backgroundColor: ad.backgroundColor,
                        backgroundImage: ad.backgroundGradient || (ad.backgroundImageUrl ? `url(${ad.backgroundImageUrl})` : 'none'),
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        color: ad.textColor,
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold truncate" style={{maxWidth: '200px'}}>{ad.title}</h4>
                        <div className="flex gap-2">
                          <Switch 
                            checked={ad.isActive} 
                            onCheckedChange={(checked) => toggleAdStatus.mutate({ id: ad.id, isActive: checked })}
                          />
                        </div>
                      </div>
                      
                      {ad.imageUrl && (
                        <div className="my-2 flex justify-center">
                          <img 
                            src={ad.imageUrl} 
                            alt={ad.title} 
                            className="max-h-20 object-contain"
                          />
                        </div>
                      )}
                      
                      <p className="text-sm line-clamp-2">{ad.description}</p>
                      
                      {renderAdStats(ad)}
                    </div>
                    
                    <div className="bg-background p-3 flex justify-between items-center">
                      <div className="flex items-center gap-1">
                        <Badge variant={ad.animation === 'fade' ? 'default' : (ad.animation === 'slide' ? 'secondary' : 'outline')}>
                          {ad.animation} animation
                        </Badge>
                        <Badge variant="outline">{ad.displayDuration}s</Badge>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="6" r="1" />
                              <circle cx="12" cy="12" r="1" />
                              <circle cx="12" cy="18" r="1" />
                            </svg>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setSelectedAd(ad);
                            setActiveTab("buttons");
                          }}>
                            Manage Buttons
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setSelectedAd(ad);
                            setActiveTab("preview");
                          }}>
                            Preview
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditAd(ad)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => {
                              setSelectedAd(ad);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="buttons" className="space-y-4 mt-4">
          {!selectedAd ? (
            <div className="text-center p-8 text-muted-foreground">
              Select an advertisement first to manage its buttons
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Buttons for "{selectedAd.title}"</h3>
                <Button variant="default" onClick={() => setActiveTab("advertisements")}>
                  Back to Advertisements
                </Button>
              </div>
              
              <Card className="p-6">
                <h4 className="font-medium mb-4">Add New Button</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="buttonText">Button Text</Label>
                      <Input 
                        id="buttonText"
                        value={buttonFormData.text}
                        onChange={(e) => setButtonFormData({...buttonFormData, text: e.target.value})}
                        placeholder="Click me!"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="buttonUrl">URL</Label>
                      <Input 
                        id="buttonUrl"
                        value={buttonFormData.url}
                        onChange={(e) => setButtonFormData({...buttonFormData, url: e.target.value})}
                        placeholder="https://example.com"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="buttonColor">Button Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="buttonColor"
                          type="color"
                          value={buttonFormData.buttonColor}
                          onChange={(e) => setButtonFormData({...buttonFormData, buttonColor: e.target.value})}
                          className="w-12 h-10"
                        />
                        <Input
                          value={buttonFormData.buttonColor}
                          onChange={(e) => setButtonFormData({...buttonFormData, buttonColor: e.target.value})}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="textColor">Text Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="textColor"
                          type="color"
                          value={buttonFormData.textColor}
                          onChange={(e) => setButtonFormData({...buttonFormData, textColor: e.target.value})}
                          className="w-12 h-10"
                        />
                        <Input
                          value={buttonFormData.textColor}
                          onChange={(e) => setButtonFormData({...buttonFormData, textColor: e.target.value})}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Button Size</Label>
                      <div className="flex gap-2">
                        {["small", "medium", "large"].map((size) => (
                          <Button
                            key={size}
                            type="button"
                            variant={buttonFormData.size === size ? "default" : "outline"}
                            onClick={() => setButtonFormData({...buttonFormData, size})}
                            className="flex-1"
                          >
                            {size.charAt(0).toUpperCase() + size.slice(1)}
                          </Button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Button Placement</Label>
                      <div className="flex gap-2">
                        {["top", "bottom", "left", "right"].map((placement) => (
                          <Button
                            key={placement}
                            type="button"
                            variant={buttonFormData.placement === placement ? "default" : "outline"}
                            onClick={() => setButtonFormData({...buttonFormData, placement})}
                            className="flex-1"
                          >
                            {placement.charAt(0).toUpperCase() + placement.slice(1)}
                          </Button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 mt-4">
                      <Checkbox
                        id="isNewTab"
                        checked={buttonFormData.isNewTab}
                        onCheckedChange={(checked) => 
                          setButtonFormData({...buttonFormData, isNewTab: checked === true})
                        }
                      />
                      <Label htmlFor="isNewTab">Open in new tab</Label>
                    </div>
                    
                    <Button 
                      onClick={handleAddButton} 
                      className="w-full mt-4"
                      disabled={!buttonFormData.text || !buttonFormData.url}
                    >
                      Add Button
                    </Button>
                  </div>
                </div>
              </Card>
              
              {buttonsLoading ? (
                <div className="flex justify-center p-6">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : adButtons.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground border border-dashed rounded-md">
                  No buttons found for this advertisement. Add one above.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  {adButtons.sort((a, b) => a.sortOrder - b.sortOrder).map((button) => (
                    <Card 
                      key={button.id} 
                      className={`overflow-hidden cursor-move ${dragOverButtonId === button.id ? 'border-2 border-primary' : ''}`}
                      draggable
                      onDragStart={() => handleButtonDragStart(button.id)}
                      onDragOver={(e) => handleButtonDragOver(e, button.id)}
                      onDrop={(e) => handleButtonDrop(e, button.id)}
                      onDragEnd={() => {
                        setDraggedButtonId(null);
                        setDragOverButtonId(null);
                      }}
                    >
                      <div className="p-6">
                        <div className="flex justify-center mb-4">
                          <a
                            href={button.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded px-4 py-2 cursor-pointer"
                            style={{
                              backgroundColor: button.buttonColor,
                              color: button.textColor,
                              fontSize: button.size === 'small' ? '0.875rem' : button.size === 'large' ? '1.125rem' : '1rem',
                              padding: button.size === 'small' ? '0.25rem 0.5rem' : button.size === 'large' ? '0.5rem 1rem' : '0.375rem 0.75rem'
                            }}
                            onClick={(e) => e.preventDefault()}
                          >
                            {button.text}
                          </a>
                        </div>
                        
                        <div className="flex flex-col text-sm gap-1 text-muted-foreground">
                          <div className="flex justify-between">
                            <span>URL:</span>
                            <span className="truncate max-w-[150px]">{button.url}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Size:</span>
                            <span>{button.size}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Placement:</span>
                            <span>{button.placement}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Open in new tab:</span>
                            <span>{button.isNewTab ? 'Yes' : 'No'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Clicks:</span>
                            <span>{button.clicks}</span>
                          </div>
                        </div>
                        
                        <div className="flex justify-end mt-4">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteButton.mutate(button.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>
        
        <TabsContent value="preview" className="space-y-4 mt-4">
          {!selectedAd ? (
            <div className="text-center p-8 text-muted-foreground">
              Select an advertisement first to preview
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Preview of "{selectedAd.title}"</h3>
                <Button variant="default" onClick={() => setActiveTab("advertisements")}>
                  Back to Advertisements
                </Button>
              </div>
              
              <div className="flex flex-col items-center justify-center p-6 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <div className="max-w-md w-full">
                  <Card className="overflow-hidden">
                    <div 
                      className="p-4"
                      style={{
                        backgroundColor: selectedAd.backgroundColor,
                        backgroundImage: selectedAd.backgroundGradient || (selectedAd.backgroundImageUrl ? `url(${selectedAd.backgroundImageUrl})` : 'none'),
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        color: selectedAd.textColor,
                        textAlign: selectedAd.textAlignment as 'left' | 'center' | 'right',
                      }}
                    >
                      <div className={`${selectedAd.fontSize === 'small' ? 'text-sm' : selectedAd.fontSize === 'large' ? 'text-lg' : 'text-base'}`}>
                        <h3 className="font-bold mb-1">{selectedAd.title}</h3>
                        
                        {selectedAd.imageUrl && (
                          <div className="my-2 flex justify-center">
                            <img 
                              src={selectedAd.imageUrl} 
                              alt={selectedAd.title} 
                              className="max-w-full max-h-32 object-contain"
                            />
                          </div>
                        )}
                        
                        <p className="mb-3">{selectedAd.description}</p>
                        
                        {adButtons.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2 justify-center">
                            {adButtons
                              .sort((a, b) => a.sortOrder - b.sortOrder)
                              .map((button) => (
                                <a
                                  key={button.id}
                                  href="#"
                                  onClick={(e) => e.preventDefault()}
                                  className="rounded inline-block text-center no-underline"
                                  style={{
                                    backgroundColor: button.buttonColor,
                                    color: button.textColor,
                                    fontSize: button.size === 'small' ? '0.875rem' : button.size === 'large' ? '1.125rem' : '1rem',
                                    padding: button.size === 'small' ? '0.25rem 0.5rem' : button.size === 'large' ? '0.5rem 1rem' : '0.375rem 0.75rem'
                                  }}
                                >
                                  {button.text}
                                </a>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                </div>
                
                <div className="mt-6 text-center">
                  <p className="text-muted-foreground mb-2">This is how your advertisement will appear to users</p>
                  <p className="text-xs text-muted-foreground">The ad will rotate after {selectedAd.displayDuration} seconds if multiple ads are active</p>
                </div>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Create Advertisement Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Advertisement</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input 
                  id="title"
                  value={adFormData.title}
                  onChange={(e) => setAdFormData({...adFormData, title: e.target.value})}
                  placeholder="Your advertisement title"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description"
                  value={adFormData.description}
                  onChange={(e) => setAdFormData({...adFormData, description: e.target.value})}
                  placeholder="Advertisement description"
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="imageUrl">Image URL</Label>
                <Input 
                  id="imageUrl"
                  value={adFormData.imageUrl}
                  onChange={(e) => setAdFormData({...adFormData, imageUrl: e.target.value})}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="displayDuration">Display Duration (seconds)</Label>
                <Input 
                  id="displayDuration"
                  type="number"
                  min="1"
                  max="60"
                  value={adFormData.displayDuration}
                  onChange={(e) => setAdFormData({...adFormData, displayDuration: parseInt(e.target.value) || 10})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="expiresAt">Expiration Date (optional)</Label>
                <Input 
                  id="expiresAt"
                  type="datetime-local"
                  value={adFormData.expiresAt}
                  onChange={(e) => setAdFormData({...adFormData, expiresAt: e.target.value})}
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="backgroundColor">Background Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="backgroundColor"
                    type="color"
                    value={adFormData.backgroundColor}
                    onChange={(e) => setAdFormData({...adFormData, backgroundColor: e.target.value})}
                    className="w-12 h-10"
                  />
                  <Input
                    value={adFormData.backgroundColor}
                    onChange={(e) => setAdFormData({...adFormData, backgroundColor: e.target.value})}
                    className="flex-1"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="backgroundGradient">Background Gradient (optional)</Label>
                <Input 
                  id="backgroundGradient"
                  value={adFormData.backgroundGradient}
                  onChange={(e) => setAdFormData({...adFormData, backgroundGradient: e.target.value})}
                  placeholder="linear-gradient(to right, #ff0000, #0000ff)"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="backgroundImageUrl">Background Image URL (optional)</Label>
                <Input 
                  id="backgroundImageUrl"
                  value={adFormData.backgroundImageUrl}
                  onChange={(e) => setAdFormData({...adFormData, backgroundImageUrl: e.target.value})}
                  placeholder="https://example.com/background.jpg"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="textColor">Text Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="textColor"
                    type="color"
                    value={adFormData.textColor}
                    onChange={(e) => setAdFormData({...adFormData, textColor: e.target.value})}
                    className="w-12 h-10"
                  />
                  <Input
                    value={adFormData.textColor}
                    onChange={(e) => setAdFormData({...adFormData, textColor: e.target.value})}
                    className="flex-1"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Text Alignment</Label>
                <div className="flex gap-2">
                  {["left", "center", "right"].map((alignment) => (
                    <Button
                      key={alignment}
                      type="button"
                      variant={adFormData.textAlignment === alignment ? "default" : "outline"}
                      onClick={() => setAdFormData({...adFormData, textAlignment: alignment})}
                      className="flex-1"
                    >
                      {alignment.charAt(0).toUpperCase() + alignment.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Font Size</Label>
                <div className="flex gap-2">
                  {["small", "medium", "large"].map((size) => (
                    <Button
                      key={size}
                      type="button"
                      variant={adFormData.fontSize === size ? "default" : "outline"}
                      onClick={() => setAdFormData({...adFormData, fontSize: size})}
                      className="flex-1"
                    >
                      {size.charAt(0).toUpperCase() + size.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Animation</Label>
                <div className="flex gap-2">
                  {["fade", "slide", "zoom"].map((animation) => (
                    <Button
                      key={animation}
                      type="button"
                      variant={adFormData.animation === animation ? "default" : "outline"}
                      onClick={() => setAdFormData({...adFormData, animation})}
                      className="flex-1"
                    >
                      {animation.charAt(0).toUpperCase() + animation.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                createAd.mutate({
                  ...adFormData,
                  expiresAt: adFormData.expiresAt ? new Date(adFormData.expiresAt).toISOString() : null
                });
              }}
              disabled={!adFormData.title || !adFormData.description || !adFormData.imageUrl}
            >
              Create Advertisement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Advertisement Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Advertisement</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title</Label>
                <Input 
                  id="edit-title"
                  value={adFormData.title}
                  onChange={(e) => setAdFormData({...adFormData, title: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea 
                  id="edit-description"
                  value={adFormData.description}
                  onChange={(e) => setAdFormData({...adFormData, description: e.target.value})}
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-imageUrl">Image URL</Label>
                <Input 
                  id="edit-imageUrl"
                  value={adFormData.imageUrl}
                  onChange={(e) => setAdFormData({...adFormData, imageUrl: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-displayDuration">Display Duration (seconds)</Label>
                <Input 
                  id="edit-displayDuration"
                  type="number"
                  min="1"
                  max="60"
                  value={adFormData.displayDuration}
                  onChange={(e) => setAdFormData({...adFormData, displayDuration: parseInt(e.target.value) || 10})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-expiresAt">Expiration Date (optional)</Label>
                <Input 
                  id="edit-expiresAt"
                  type="datetime-local"
                  value={adFormData.expiresAt}
                  onChange={(e) => setAdFormData({...adFormData, expiresAt: e.target.value})}
                />
              </div>
              
              <div className="flex items-center space-x-2 mt-4">
                <Checkbox
                  id="edit-isActive"
                  checked={adFormData.isActive}
                  onCheckedChange={(checked) => 
                    setAdFormData({...adFormData, isActive: checked === true})
                  }
                />
                <Label htmlFor="edit-isActive">Active</Label>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-backgroundColor">Background Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="edit-backgroundColor"
                    type="color"
                    value={adFormData.backgroundColor}
                    onChange={(e) => setAdFormData({...adFormData, backgroundColor: e.target.value})}
                    className="w-12 h-10"
                  />
                  <Input
                    value={adFormData.backgroundColor}
                    onChange={(e) => setAdFormData({...adFormData, backgroundColor: e.target.value})}
                    className="flex-1"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-backgroundGradient">Background Gradient (optional)</Label>
                <Input 
                  id="edit-backgroundGradient"
                  value={adFormData.backgroundGradient}
                  onChange={(e) => setAdFormData({...adFormData, backgroundGradient: e.target.value})}
                  placeholder="linear-gradient(to right, #ff0000, #0000ff)"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-backgroundImageUrl">Background Image URL (optional)</Label>
                <Input 
                  id="edit-backgroundImageUrl"
                  value={adFormData.backgroundImageUrl}
                  onChange={(e) => setAdFormData({...adFormData, backgroundImageUrl: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-textColor">Text Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="edit-textColor"
                    type="color"
                    value={adFormData.textColor}
                    onChange={(e) => setAdFormData({...adFormData, textColor: e.target.value})}
                    className="w-12 h-10"
                  />
                  <Input
                    value={adFormData.textColor}
                    onChange={(e) => setAdFormData({...adFormData, textColor: e.target.value})}
                    className="flex-1"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Text Alignment</Label>
                <div className="flex gap-2">
                  {["left", "center", "right"].map((alignment) => (
                    <Button
                      key={alignment}
                      type="button"
                      variant={adFormData.textAlignment === alignment ? "default" : "outline"}
                      onClick={() => setAdFormData({...adFormData, textAlignment: alignment})}
                      className="flex-1"
                    >
                      {alignment.charAt(0).toUpperCase() + alignment.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Font Size</Label>
                <div className="flex gap-2">
                  {["small", "medium", "large"].map((size) => (
                    <Button
                      key={size}
                      type="button"
                      variant={adFormData.fontSize === size ? "default" : "outline"}
                      onClick={() => setAdFormData({...adFormData, fontSize: size})}
                      className="flex-1"
                    >
                      {size.charAt(0).toUpperCase() + size.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Animation</Label>
                <div className="flex gap-2">
                  {["fade", "slide", "zoom"].map((animation) => (
                    <Button
                      key={animation}
                      type="button"
                      variant={adFormData.animation === animation ? "default" : "outline"}
                      onClick={() => setAdFormData({...adFormData, animation})}
                      className="flex-1"
                    >
                      {animation.charAt(0).toUpperCase() + animation.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!selectedAd) return;
                updateAd.mutate({
                  id: selectedAd.id,
                  data: {
                    ...adFormData,
                    expiresAt: adFormData.expiresAt ? new Date(adFormData.expiresAt).toISOString() : null
                  }
                });
              }}
              disabled={!adFormData.title || !adFormData.description || !adFormData.imageUrl}
            >
              Update Advertisement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the advertisement and all associated buttons.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => {
                if (selectedAd) {
                  deleteAd.mutate(selectedAd.id);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Flagged Messages Counter Component
function FlaggedMessagesCounter() {
  const { data: flaggedStats = { total: 0, unreviewed: 0, byReason: {} } } = useQuery<FlaggedMessageStats>({
    queryKey: ["/api/admin/flagged-messages/stats"],
    staleTime: 5000, // Refresh every 5 seconds
  });

  if (!flaggedStats || flaggedStats.unreviewed === 0) {
    return null;
  }

  return (
    <Badge variant="destructive" className="ml-2 absolute -top-2 -right-2">
      {flaggedStats.unreviewed}
    </Badge>
  );
}

// Define types for dashboard stats
interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  premiumUsers: number;
  totalCharacters: number;
}

// Define types for character stats
interface CharacterStats {
  totalCharacters: number;
  customCharactersCount: number;
  predefinedCharactersCount: number;
}

// Define types for activity data
interface ActivityData {
  hourlyActivity: Array<{
    hour: number;
    activeUsers: number;
  }>;
}

// Define types for message volume data
interface MessageVolumeData {
  daily: Array<{
    date: string;
    messages: number;
  }>;
}

// Define types for character popularity data
interface CharacterPopularityData {
  characters: Array<{
    name: string;
    messageCount: number;
    userCount: number;
  }>;
}

// Define types for country distribution data
interface CountryDistributionData {
  locations: Array<{
    country: string;
    count: number;
  }>;
}

export default function AdminDashboard() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [subscriptionFilter, setSubscriptionFilter] = useState<string[]>([]);
  const [locationFilter, setLocationFilter] = useState<string[]>([]);
  const [loginFilter, setLoginFilter] = useState("all");
  const [characterFilter, setCharacterFilter] = useState<{
    min?: number;
    max?: number;
  }>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [userSort, setUserSort] = useState("newest");
  
  // Data fetching with TanStack Query
  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/dashboard/stats"],
  });

  const { data: characterStats } = useQuery<CharacterStats>({
    queryKey: ["/api/admin/characters/stats"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: activityData } = useQuery<ActivityData>({
    queryKey: ["/api/admin/analytics/activity"],
  });

  const { data: messageVolume } = useQuery<MessageVolumeData>({
    queryKey: ["/api/admin/analytics/messages"],
  });

  const { data: characterPopularity } = useQuery<CharacterPopularityData>({
    queryKey: ["/api/admin/analytics/characters/popularity"],
  });

  const { data: countryDistribution } = useQuery<CountryDistributionData>({
    queryKey: ["/api/admin/analytics/user-locations"],
  });

  const { data: complaints } = useQuery<Complaint[]>({
    queryKey: ["/api/admin/complaints"],
  });

  const { data: feedback } = useQuery<Feedback[]>({
    queryKey: ["/api/admin/feedback"],
  });

  const { data: plans = [] } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/admin/subscription-plans"],
  });

  // Query for recent messages
  const { data: recentMessages = [] } = useQuery({
    queryKey: ["/api/admin/messages/recent"],
  });

  // Query for flagged messages
  const { data: flaggedMessages = [], isLoading: flaggedMessagesLoading } = useQuery({
    queryKey: ["/api/admin/flagged-messages"],
  });

  // Animation setup for theme
  const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#0088FE", "#00C49F"];

  // Derived data
  const userStatusData = [
    { name: "Online", value: users.filter((u) => u.status === "online").length },
    { name: "Away", value: users.filter((u) => u.status === "away").length },
    { name: "Offline", value: users.filter((u) => u.status === "offline").length },
  ];

  const subscriptionData = [
    {
      name: "Free",
      value: users.filter((u) => !u.subscriptionPlan).length,
    },
    {
      name: "Basic",
      value: users.filter((u) => u.subscriptionPlan === "basic").length,
    },
    {
      name: "Premium",
      value: users.filter((u) => u.subscriptionPlan === "premium").length,
    },
    {
      name: "Pro",
      value: users.filter((u) => u.subscriptionPlan === "pro").length,
    },
  ];

  // Handle logout
  const handleLogout = () => {
    fetch("/api/auth/logout", { method: "POST" })
      .then(() => {
        window.location.href = "/login";
      })
      .catch(() => {
        toast({
          title: "Error",
          description: "Failed to logout. Please try again.",
          variant: "destructive",
        });
      });
  };

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <NotificationPopover />
        </div>

        <div className="hidden md:flex items-center gap-4">
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => setLocation("/admin/characters")}
          >
            <Palette className="h-4 w-4" />
            Manage Characters
          </Button>
          <Button 
            variant="outline" 
            className="gap-2 relative"
            onClick={() => setLocation("/admin/content-moderation")}
          >
            <Shield className="h-4 w-4" />
            Content Moderation
            <FlaggedMessagesCounter />
          </Button>
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => setLocation("/admin/user-management")}
          >
            <Users className="h-4 w-4" />
            User Management
          </Button>
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => setLocation("/admin/subscription-plans")}
          >
            <Crown className="h-4 w-4" />
            Subscription Plans
          </Button>
          <Button
            variant="destructive"
            className="gap-2"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>

        <div className="md:hidden">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <MenuIcon className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Admin Menu</SheetTitle>
              </SheetHeader>
              <div className="py-4 flex flex-col gap-3">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => {
                    setLocation("/admin/characters");
                    setMobileMenuOpen(false);
                  }}
                >
                  <Palette className="h-4 w-4" />
                  Manage Characters
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 relative"
                  onClick={() => {
                    setLocation("/admin/content-moderation");
                    setMobileMenuOpen(false);
                  }}
                >
                  <Shield className="h-4 w-4" />
                  Content Moderation
                  {flaggedMessages && flaggedMessages.length > 0 ? (
                    <span className="ml-1 px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded-full">
                      {flaggedMessages.length}
                    </span>
                  ) : null}
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => {
                    setLocation("/admin/user-management");
                    setMobileMenuOpen(false);
                  }}
                >
                  <Users className="h-4 w-4" />
                  User Management
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => {
                    setLocation("/admin/subscription-plans");
                    setMobileMenuOpen(false);
                  }}
                >
                  <Crown className="h-4 w-4" />
                  Subscription Plans
                  {plans?.length > 0 ? (
                    <span className="ml-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                      {plans.length}
                    </span>
                  ) : null}
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => {
                    setLocation("/admin/feedback");
                    setMobileMenuOpen(false);
                  }}
                >
                  <MessageCircle className="h-4 w-4" />
                  User Feedback
                  {feedback?.length > 0 ? (
                    <span className="ml-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                      {feedback.length}
                    </span>
                  ) : null}
                </Button>
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

      {/* Featured Advertisements Manager */}
      <Card className="p-6 bg-gradient-to-br from-pink-500/10 to-purple-500/10 border-purple-500/20 hover:border-purple-500/40 transition-colors">
        <CardHeader className="p-0 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <span className="bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
                  Featured Advertisements
                </span>
                <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200">
                  Premium
                </Badge>
              </CardTitle>
              <CardDescription>
                Customize promotional content shown to users on the home page
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={() => setLocation("/admin/advertisements")}
            >
              Manage All Advertisements
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <FeaturedAdsManager />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/20 hover:border-blue-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium mb-2">Total Users</h3>
            <Users className="h-5 w-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-blue-600">
            {stats?.totalUsers ?? 0}
          </p>
        </Card>
        <Card className="p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20 hover:border-green-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium mb-2">Active Users (24h)</h3>
            <UserPlus className="h-5 w-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-green-600">
            {stats?.activeUsers ?? 0}
          </p>
        </Card>
        <Card className="p-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20 hover:border-purple-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium mb-2">Premium Users</h3>
            <Crown className="h-5 w-5 text-purple-500" />
          </div>
          <p className="text-3xl font-bold text-purple-600">
            {stats?.premiumUsers ?? 0}
          </p>
        </Card>
        <Card className="p-6 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20 hover:border-amber-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium mb-2">Total Characters</h3>
            <Palette className="h-5 w-5 text-amber-500" />
          </div>
          <p className="text-3xl font-bold text-amber-600">
            {characterStats?.totalCharacters ?? 0}
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">
            Subscription Distribution
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={subscriptionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {subscriptionData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">User Status Distribution</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={userStatusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#8884d8">
                  {userStatusData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">User Activity Heatmap</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={activityData?.hourlyActivity || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="activeUsers"
                stroke="#8884d8"
                fill="#8884d8"
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">Message Volume Trend</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={messageVolume?.daily || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="messages"
                  stroke="#8884d8"
                  name="Messages"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">Character Popularity</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={characterPopularity?.characters || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="messageCount" fill="#8884d8" name="Messages" />
                <Bar dataKey="userCount" fill="#82ca9d" name="Users" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">
            User Distribution by Country
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={countryDistribution?.locations.slice(0, 10) || []}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="country" width={120} />
                <Tooltip formatter={(value) => [`${value} users`, "Count"]} />
                <Legend />
                <Bar dataKey="count" fill="#8884d8" name="Users">
                  {countryDistribution?.locations
                    .slice(0, 10)
                    .map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">Geographic Distribution</h3>
          <div className="h-[300px] flex flex-col justify-center">
            <div className="text-center mb-4">
              <p className="text-lg font-medium">Top Countries by User Count</p>
            </div>
            <div className="overflow-auto max-h-[220px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Country</TableHead>
                    <TableHead className="text-right">Users</TableHead>
                    <TableHead className="text-right">Percentage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {countryDistribution?.locations
                    .slice(0, 15)
                    .map((location, index) => {
                      const totalUsers = countryDistribution.locations.reduce(
                        (sum, loc) => sum + loc.count,
                        0,
                      );
                      const percentage =
                        totalUsers > 0
                          ? ((location.count / totalUsers) * 100).toFixed(1)
                          : "0.0";

                      return (
                        <TableRow key={index}>
                          <TableCell>{location.country}</TableCell>
                          <TableCell className="text-right">
                            {location.count}
                          </TableCell>
                          <TableCell className="text-right">
                            {percentage}%
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
          </div>
        </Card>
      </div>

      <Card className="mt-8">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Recent Messages</h2>
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Character</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentMessages?.map((message: any) => (
                  <TableRow key={message.id}>
                    <TableCell>{message.username}</TableCell>
                    <TableCell>{message.characterName}</TableCell>
                    <TableCell className="max-w-md truncate">
                      {message.content}
                    </TableCell>
                    <TableCell>
                      {new Date(message.timestamp).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </Card>
      
      {/* Flagged Messages Section */}
      <Card className="mt-8">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Flagged Messages</h2>
            <Shield className="h-5 w-5 text-red-500" />
          </div>
          {flaggedMessagesLoading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : flaggedMessages.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              No flagged messages found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sender</TableHead>
                    <TableHead>Receiver</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {flaggedMessages.map((message: any) => (
                    <TableRow key={message.id} className="bg-red-50 dark:bg-red-950/10">
                      <TableCell>{message.senderUsername}</TableCell>
                      <TableCell>{message.receiverUsername}</TableCell>
                      <TableCell className="max-w-md">
                        <div className="line-clamp-2">{message.content}</div>
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                          {message.reason}
                        </span>
                      </TableCell>
                      <TableCell>
                        {new Date(message.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              apiRequest("POST", `/api/admin/flagged-messages/${message.id}/reviewed`, {
                                reviewed: true
                              })
                                .then(() => {
                                  queryClient.invalidateQueries({ queryKey: ["/api/admin/flagged-messages"] });
                                  queryClient.invalidateQueries({ queryKey: ["/api/admin/flagged-messages/stats"] });
                                  toast({
                                    title: "Success",
                                    description: "Message marked as reviewed",
                                  });
                                })
                                .catch(() => {
                                  toast({
                                    title: "Error",
                                    description: "Failed to mark message as reviewed",
                                    variant: "destructive",
                                  });
                                });
                            }}
                          >
                            Mark Reviewed
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              <div className="mt-4 text-right">
                <Link href="/admin/content-moderation">
                  <Button variant="default">
                    View All Flagged Messages
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}