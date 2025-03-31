import React, { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash, Edit, BarChart, Eye, EyeOff, ExternalLink } from "lucide-react";
import { format } from "date-fns";

// Ad type definitions
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

interface Advertisement {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  backgroundColor: string;
  backgroundGradient: string | null;
  backgroundImageUrl: string | null;
  isActive: boolean;
  displayDuration: number;
  animation: string;
  sortOrder: number;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  textColor: string;
  textAlignment: string;
  fontSize: string;
  views: number;
  clicks: number;
  buttons?: AdButton[];
}

// Form type for creating/editing ads
interface AdFormData {
  title: string;
  description: string;
  imageUrl: string;
  backgroundColor: string;
  backgroundGradient: string | null;
  backgroundImageUrl: string | null;
  isActive: boolean;
  displayDuration: number;
  animation: string;
  sortOrder: number;
  expiresAt: string | null;
  textColor: string;
  textAlignment: string;
  fontSize: string;
}

// Form type for creating/editing buttons
interface ButtonFormData {
  text: string;
  url: string;
  buttonColor: string;
  textColor: string;
  size: string;
  placement: string;
  isNewTab: boolean;
  sortOrder: number;
}

const defaultAdForm: AdFormData = {
  title: "",
  description: "",
  imageUrl: "",
  backgroundColor: "#ffffff",
  backgroundGradient: null,
  backgroundImageUrl: null,
  isActive: true,
  displayDuration: 10,
  animation: "fade",
  sortOrder: 0,
  expiresAt: null,
  textColor: "#000000",
  textAlignment: "left",
  fontSize: "medium",
};

const defaultButtonForm: ButtonFormData = {
  text: "Learn More",
  url: "https://",
  buttonColor: "#3b82f6",
  textColor: "#ffffff",
  size: "medium",
  placement: "bottom",
  isNewTab: true,
  sortOrder: 0,
};

const AdminAdvertisements: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for ad forms
  const [adFormOpen, setAdFormOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<Advertisement | null>(null);
  const [adForm, setAdForm] = useState<AdFormData>(defaultAdForm);
  
  // State for button forms
  const [buttonFormOpen, setButtonFormOpen] = useState(false);
  const [editingButton, setEditingButton] = useState<AdButton | null>(null);
  const [selectedAdForButton, setSelectedAdForButton] = useState<number | null>(null);
  const [buttonForm, setButtonForm] = useState<ButtonFormData>(defaultButtonForm);
  
  // State for delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [adToDelete, setAdToDelete] = useState<number | null>(null);
  const [buttonToDelete, setButtonToDelete] = useState<number | null>(null);
  
  // Fetch all advertisements
  const { data: advertisements, isLoading, error } = useQuery({
    queryKey: ['/api/admin/advertisements'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });
  
  // Create advertisement mutation
  const createAdMutation = useMutation({
    mutationFn: (data: AdFormData) => apiRequest('/api/admin/advertisements', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/advertisements'] });
      toast({
        title: "Advertisement created",
        description: "The advertisement has been created successfully.",
      });
      setAdFormOpen(false);
      setAdForm(defaultAdForm);
    },
    onError: (error) => {
      toast({
        title: "Error creating advertisement",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    },
  });
  
  // Update advertisement mutation
  const updateAdMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: AdFormData }) => 
      apiRequest(`/api/admin/advertisements/${id}`, 'PUT', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/advertisements'] });
      toast({
        title: "Advertisement updated",
        description: "The advertisement has been updated successfully.",
      });
      setAdFormOpen(false);
      setEditingAd(null);
    },
    onError: (error) => {
      toast({
        title: "Error updating advertisement",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    },
  });
  
  // Delete advertisement mutation
  const deleteAdMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/admin/advertisements/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/advertisements'] });
      toast({
        title: "Advertisement deleted",
        description: "The advertisement has been deleted successfully.",
      });
      setDeleteDialogOpen(false);
      setAdToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Error deleting advertisement",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    },
  });
  
  // Create button mutation
  const createButtonMutation = useMutation({
    mutationFn: ({ adId, data }: { adId: number; data: ButtonFormData }) => 
      apiRequest(`/api/admin/advertisements/${adId}/buttons`, 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/advertisements'] });
      toast({
        title: "Button created",
        description: "The button has been created successfully.",
      });
      setButtonFormOpen(false);
      setButtonForm(defaultButtonForm);
      setSelectedAdForButton(null);
    },
    onError: (error) => {
      toast({
        title: "Error creating button",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    },
  });
  
  // Update button mutation
  const updateButtonMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ButtonFormData }) => 
      apiRequest(`/api/admin/ad-buttons/${id}`, 'PUT', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/advertisements'] });
      toast({
        title: "Button updated",
        description: "The button has been updated successfully.",
      });
      setButtonFormOpen(false);
      setEditingButton(null);
    },
    onError: (error) => {
      toast({
        title: "Error updating button",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    },
  });
  
  // Delete button mutation
  const deleteButtonMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/admin/ad-buttons/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/advertisements'] });
      toast({
        title: "Button deleted",
        description: "The button has been deleted successfully.",
      });
      setDeleteDialogOpen(false);
      setButtonToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Error deleting button",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    },
  });
  
  // Toggle advertisement active status
  const toggleAdActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => 
      apiRequest(`/api/admin/advertisements/${id}`, 'PUT', { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/advertisements'] });
      toast({
        title: "Advertisement updated",
        description: "The advertisement status has been updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating advertisement",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    },
  });
  
  // Handle ad form submission
  const handleAdSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingAd) {
      updateAdMutation.mutate({ id: editingAd.id, data: adForm });
    } else {
      createAdMutation.mutate(adForm);
    }
  };
  
  // Handle button form submission
  const handleButtonSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingButton) {
      updateButtonMutation.mutate({ id: editingButton.id, data: buttonForm });
    } else if (selectedAdForButton) {
      createButtonMutation.mutate({ adId: selectedAdForButton, data: buttonForm });
    }
  };
  
  // Open ad form for editing
  const openEditAdForm = (ad: Advertisement) => {
    setEditingAd(ad);
    setAdForm({
      title: ad.title,
      description: ad.description,
      imageUrl: ad.imageUrl,
      backgroundColor: ad.backgroundColor,
      backgroundGradient: ad.backgroundGradient,
      backgroundImageUrl: ad.backgroundImageUrl,
      isActive: ad.isActive,
      displayDuration: ad.displayDuration,
      animation: ad.animation,
      sortOrder: ad.sortOrder,
      expiresAt: ad.expiresAt,
      textColor: ad.textColor,
      textAlignment: ad.textAlignment,
      fontSize: ad.fontSize,
    });
    setAdFormOpen(true);
  };
  
  // Open button form for editing
  const openEditButtonForm = (button: AdButton) => {
    setEditingButton(button);
    setButtonForm({
      text: button.text,
      url: button.url,
      buttonColor: button.buttonColor,
      textColor: button.textColor,
      size: button.size,
      placement: button.placement,
      isNewTab: button.isNewTab,
      sortOrder: button.sortOrder,
    });
    setButtonFormOpen(true);
  };
  
  // Open button form for creating
  const openCreateButtonForm = (adId: number) => {
    setSelectedAdForButton(adId);
    setEditingButton(null);
    setButtonForm(defaultButtonForm);
    setButtonFormOpen(true);
  };
  
  // Reset ad form
  const resetAdForm = () => {
    setEditingAd(null);
    setAdForm(defaultAdForm);
    setAdFormOpen(true);
  };
  
  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return format(new Date(dateString), "MMM d, yyyy h:mm a");
  };
  
  // Toggle ad active status
  const toggleAdActive = (ad: Advertisement) => {
    toggleAdActiveMutation.mutate({
      id: ad.id,
      isActive: !ad.isActive,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/20 p-4 rounded-lg">
        <h2 className="text-lg font-bold text-destructive">Error loading advertisements</h2>
        <p className="text-destructive/80">
          {error instanceof Error ? error.message : "An unknown error occurred"}
        </p>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Advertisement Management</h1>
          <p className="text-muted-foreground">Manage advertisements displayed in the app</p>
        </div>
        <Button onClick={resetAdForm}>
          <Plus className="w-4 h-4 mr-2" />
          Create Advertisement
        </Button>
      </div>

      <Tabs defaultValue="active">
        <TabsList className="mb-4">
          <TabsTrigger value="active">Active Ads</TabsTrigger>
          <TabsTrigger value="inactive">Inactive Ads</TabsTrigger>
          <TabsTrigger value="all">All Ads</TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {advertisements
              ?.filter((ad: Advertisement) => ad.isActive)
              .map((ad: Advertisement) => (
                <AdCard 
                  key={ad.id} 
                  ad={ad} 
                  onEdit={() => openEditAdForm(ad)}
                  onDelete={() => {
                    setAdToDelete(ad.id);
                    setDeleteDialogOpen(true);
                  }}
                  onToggleActive={() => toggleAdActive(ad)}
                  onAddButton={() => openCreateButtonForm(ad.id)}
                  onEditButton={(button) => openEditButtonForm(button)}
                  onDeleteButton={(buttonId) => {
                    setButtonToDelete(buttonId);
                    setDeleteDialogOpen(true);
                  }}
                />
              ))}
            {advertisements?.filter((ad: Advertisement) => ad.isActive).length === 0 && (
              <p className="col-span-full text-center text-muted-foreground py-8">
                No active advertisements found.
              </p>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="inactive" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {advertisements
              ?.filter((ad: Advertisement) => !ad.isActive)
              .map((ad: Advertisement) => (
                <AdCard 
                  key={ad.id} 
                  ad={ad} 
                  onEdit={() => openEditAdForm(ad)}
                  onDelete={() => {
                    setAdToDelete(ad.id);
                    setDeleteDialogOpen(true);
                  }}
                  onToggleActive={() => toggleAdActive(ad)}
                  onAddButton={() => openCreateButtonForm(ad.id)}
                  onEditButton={(button) => openEditButtonForm(button)}
                  onDeleteButton={(buttonId) => {
                    setButtonToDelete(buttonId);
                    setDeleteDialogOpen(true);
                  }}
                />
              ))}
            {advertisements?.filter((ad: Advertisement) => !ad.isActive).length === 0 && (
              <p className="col-span-full text-center text-muted-foreground py-8">
                No inactive advertisements found.
              </p>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="all" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {advertisements?.map((ad: Advertisement) => (
              <AdCard 
                key={ad.id} 
                ad={ad} 
                onEdit={() => openEditAdForm(ad)}
                onDelete={() => {
                  setAdToDelete(ad.id);
                  setDeleteDialogOpen(true);
                }}
                onToggleActive={() => toggleAdActive(ad)}
                onAddButton={() => openCreateButtonForm(ad.id)}
                onEditButton={(button) => openEditButtonForm(button)}
                onDeleteButton={(buttonId) => {
                  setButtonToDelete(buttonId);
                  setDeleteDialogOpen(true);
                }}
              />
            ))}
            {advertisements?.length === 0 && (
              <p className="col-span-full text-center text-muted-foreground py-8">
                No advertisements found.
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Ad Form Dialog */}
      <Dialog open={adFormOpen} onOpenChange={setAdFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingAd ? "Edit Advertisement" : "Create Advertisement"}
            </DialogTitle>
            <DialogDescription>
              Fill in the details for the advertisement.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleAdSubmit} className="space-y-4">
            <Tabs defaultValue="basic">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="display">Display</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>
              
              <TabsContent value="basic" className="space-y-4 pt-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={adForm.title}
                      onChange={(e) => setAdForm({ ...adForm, title: e.target.value })}
                      placeholder="Advertisement Title"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="imageUrl">Image URL</Label>
                    <Input
                      id="imageUrl"
                      value={adForm.imageUrl}
                      onChange={(e) => setAdForm({ ...adForm, imageUrl: e.target.value })}
                      placeholder="https://example.com/image.jpg"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={adForm.description}
                    onChange={(e) => setAdForm({ ...adForm, description: e.target.value })}
                    placeholder="Advertisement description"
                    rows={3}
                    required
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={adForm.isActive}
                    onCheckedChange={(checked) => setAdForm({ ...adForm, isActive: checked })}
                  />
                  <Label htmlFor="isActive">Active</Label>
                </div>
              </TabsContent>
              
              <TabsContent value="display" className="space-y-4 pt-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="backgroundColor">Background Color</Label>
                    <div className="flex">
                      <Input
                        id="backgroundColor"
                        type="color"
                        value={adForm.backgroundColor}
                        onChange={(e) => setAdForm({ ...adForm, backgroundColor: e.target.value })}
                        className="w-12 h-9 p-1"
                      />
                      <Input
                        value={adForm.backgroundColor}
                        onChange={(e) => setAdForm({ ...adForm, backgroundColor: e.target.value })}
                        className="flex-1 ml-2"
                        placeholder="#ffffff"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="textColor">Text Color</Label>
                    <div className="flex">
                      <Input
                        id="textColor"
                        type="color"
                        value={adForm.textColor}
                        onChange={(e) => setAdForm({ ...adForm, textColor: e.target.value })}
                        className="w-12 h-9 p-1"
                      />
                      <Input
                        value={adForm.textColor}
                        onChange={(e) => setAdForm({ ...adForm, textColor: e.target.value })}
                        className="flex-1 ml-2"
                        placeholder="#000000"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="textAlignment">Text Alignment</Label>
                    <select
                      id="textAlignment"
                      value={adForm.textAlignment}
                      onChange={(e) => setAdForm({ ...adForm, textAlignment: e.target.value })}
                      className="w-full rounded-md border border-input bg-background px-3 py-2"
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="fontSize">Font Size</Label>
                    <select
                      id="fontSize"
                      value={adForm.fontSize}
                      onChange={(e) => setAdForm({ ...adForm, fontSize: e.target.value })}
                      className="w-full rounded-md border border-input bg-background px-3 py-2"
                    >
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="animation">Animation</Label>
                    <select
                      id="animation"
                      value={adForm.animation}
                      onChange={(e) => setAdForm({ ...adForm, animation: e.target.value })}
                      className="w-full rounded-md border border-input bg-background px-3 py-2"
                    >
                      <option value="none">None</option>
                      <option value="fade">Fade</option>
                      <option value="slide">Slide</option>
                      <option value="zoom">Zoom</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="displayDuration">Display Duration (seconds)</Label>
                    <Input
                      id="displayDuration"
                      type="number"
                      min="1"
                      max="60"
                      value={adForm.displayDuration}
                      onChange={(e) => setAdForm({ ...adForm, displayDuration: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="backgroundImageUrl">Background Image URL (optional)</Label>
                  <Input
                    id="backgroundImageUrl"
                    value={adForm.backgroundImageUrl || ""}
                    onChange={(e) => setAdForm({ ...adForm, backgroundImageUrl: e.target.value || null })}
                    placeholder="https://example.com/background.jpg"
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="advanced" className="space-y-4 pt-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="sortOrder">Sort Order</Label>
                    <Input
                      id="sortOrder"
                      type="number"
                      min="0"
                      value={adForm.sortOrder}
                      onChange={(e) => setAdForm({ ...adForm, sortOrder: parseInt(e.target.value) })}
                      placeholder="0"
                    />
                    <p className="text-xs text-muted-foreground">
                      Lower numbers appear first.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="expiresAt">Expiration Date (optional)</Label>
                    <Input
                      id="expiresAt"
                      type="datetime-local"
                      value={adForm.expiresAt || ""}
                      onChange={(e) => setAdForm({ ...adForm, expiresAt: e.target.value || null })}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="backgroundGradient">Background Gradient (optional)</Label>
                  <Input
                    id="backgroundGradient"
                    value={adForm.backgroundGradient || ""}
                    onChange={(e) => setAdForm({ ...adForm, backgroundGradient: e.target.value || null })}
                    placeholder="linear-gradient(45deg, #ff9a9e, #fad0c4)"
                  />
                  <p className="text-xs text-muted-foreground">
                    CSS gradient value, e.g. 'linear-gradient(45deg, #ff9a9e, #fad0c4)'
                  </p>
                </div>
              </TabsContent>
            </Tabs>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setAdFormOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createAdMutation.isPending || updateAdMutation.isPending}>
                {(createAdMutation.isPending || updateAdMutation.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {editingAd ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Button Form Dialog */}
      <Dialog open={buttonFormOpen} onOpenChange={setButtonFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingButton ? "Edit Button" : "Add Button"}
            </DialogTitle>
            <DialogDescription>
              Configure the button for this advertisement.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleButtonSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="buttonText">Button Text</Label>
                <Input
                  id="buttonText"
                  value={buttonForm.text}
                  onChange={(e) => setButtonForm({ ...buttonForm, text: e.target.value })}
                  placeholder="Learn More"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="buttonUrl">URL</Label>
                <Input
                  id="buttonUrl"
                  value={buttonForm.url}
                  onChange={(e) => setButtonForm({ ...buttonForm, url: e.target.value })}
                  placeholder="https://example.com"
                  required
                />
              </div>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="buttonColor">Button Color</Label>
                <div className="flex">
                  <Input
                    id="buttonColor"
                    type="color"
                    value={buttonForm.buttonColor}
                    onChange={(e) => setButtonForm({ ...buttonForm, buttonColor: e.target.value })}
                    className="w-12 h-9 p-1"
                  />
                  <Input
                    value={buttonForm.buttonColor}
                    onChange={(e) => setButtonForm({ ...buttonForm, buttonColor: e.target.value })}
                    className="flex-1 ml-2"
                    placeholder="#3b82f6"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="buttonTextColor">Text Color</Label>
                <div className="flex">
                  <Input
                    id="buttonTextColor"
                    type="color"
                    value={buttonForm.textColor}
                    onChange={(e) => setButtonForm({ ...buttonForm, textColor: e.target.value })}
                    className="w-12 h-9 p-1"
                  />
                  <Input
                    value={buttonForm.textColor}
                    onChange={(e) => setButtonForm({ ...buttonForm, textColor: e.target.value })}
                    className="flex-1 ml-2"
                    placeholder="#ffffff"
                  />
                </div>
              </div>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="buttonSize">Size</Label>
                <select
                  id="buttonSize"
                  value={buttonForm.size}
                  onChange={(e) => setButtonForm({ ...buttonForm, size: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="buttonPlacement">Placement</Label>
                <select
                  id="buttonPlacement"
                  value={buttonForm.placement}
                  onChange={(e) => setButtonForm({ ...buttonForm, placement: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                >
                  <option value="bottom">Bottom</option>
                  <option value="top">Top</option>
                  <option value="left">Left</option>
                  <option value="right">Right</option>
                </select>
              </div>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="isNewTab"
                  checked={buttonForm.isNewTab}
                  onCheckedChange={(checked) => setButtonForm({ ...buttonForm, isNewTab: checked })}
                />
                <Label htmlFor="isNewTab">Open in new tab</Label>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="buttonSortOrder">Sort Order</Label>
                <Input
                  id="buttonSortOrder"
                  type="number"
                  min="0"
                  value={buttonForm.sortOrder}
                  onChange={(e) => setButtonForm({ ...buttonForm, sortOrder: parseInt(e.target.value) })}
                  placeholder="0"
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setButtonFormOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createButtonMutation.isPending || updateButtonMutation.isPending}>
                {(createButtonMutation.isPending || updateButtonMutation.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {editingButton ? "Update" : "Add"} Button
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              {adToDelete
                ? "Are you sure you want to delete this advertisement? This action cannot be undone."
                : "Are you sure you want to delete this button? This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (adToDelete) {
                  deleteAdMutation.mutate(adToDelete);
                } else if (buttonToDelete) {
                  deleteButtonMutation.mutate(buttonToDelete);
                }
              }}
              disabled={deleteAdMutation.isPending || deleteButtonMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {(deleteAdMutation.isPending || deleteButtonMutation.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// Ad Card Component
const AdCard: React.FC<{
  ad: Advertisement;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  onAddButton: () => void;
  onEditButton: (button: AdButton) => void;
  onDeleteButton: (buttonId: number) => void;
}> = ({ ad, onEdit, onDelete, onToggleActive, onAddButton, onEditButton, onDeleteButton }) => {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return format(new Date(dateString), "MMM d, yyyy");
  };
  
  // Style the preview of the ad
  const adStyle = {
    backgroundColor: ad.backgroundColor || "#ffffff",
    color: ad.textColor || "#000000",
    backgroundImage: ad.backgroundGradient || (ad.backgroundImageUrl ? `url(${ad.backgroundImageUrl})` : "none"),
    backgroundSize: "cover",
    backgroundPosition: "center",
    textAlign: ad.textAlignment as "left" | "center" | "right",
  };
  
  return (
    <Card className="overflow-hidden">
      <div 
        className="h-40 flex flex-col justify-center items-center p-4 relative" 
        style={adStyle}
      >
        <div className={`absolute top-2 ${ad.isActive ? "right-2" : "left-2"} px-2 py-1 rounded text-xs ${ad.isActive ? "bg-green-500" : "bg-gray-500"} text-white`}>
          {ad.isActive ? "Active" : "Inactive"}
        </div>
        
        {ad.imageUrl && (
          <div className="w-full h-full flex justify-center items-center">
            <img 
              src={ad.imageUrl} 
              alt={ad.title} 
              className="max-h-full max-w-full object-contain"
            />
          </div>
        )}
      </div>
      
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="truncate mr-2">{ad.title}</span>
          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="icon" onClick={onToggleActive} title={ad.isActive ? "Deactivate" : "Activate"}>
              {ad.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={onEdit} title="Edit">
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete} title="Delete">
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
        <CardDescription className="line-clamp-2">{ad.description}</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Views:</span> {ad.views}
          </div>
          <div>
            <span className="text-muted-foreground">Clicks:</span> {ad.clicks}
          </div>
          <div>
            <span className="text-muted-foreground">Created:</span> {formatDate(ad.createdAt)}
          </div>
          <div>
            <span className="text-muted-foreground">Expires:</span> {formatDate(ad.expiresAt)}
          </div>
        </div>
        
        {/* Buttons section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Buttons</h4>
            <Button variant="outline" size="sm" onClick={onAddButton}>
              <Plus className="h-3 w-3 mr-1" /> Add
            </Button>
          </div>
          
          {ad.buttons && ad.buttons.length > 0 ? (
            <ul className="space-y-2">
              {ad.buttons.map((button) => (
                <li key={button.id} className="flex items-center justify-between text-sm bg-muted/50 p-2 rounded">
                  <div className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-2" 
                      style={{ backgroundColor: button.buttonColor }}
                    />
                    <span className="mr-1">{button.text}</span>
                    <a 
                      href={button.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-muted-foreground hover:text-primary"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs text-muted-foreground">{button.clicks} clicks</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEditButton(button)}>
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onDeleteButton(button.id)}>
                      <Trash className="h-3 w-3" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-2">
              No buttons added yet.
            </p>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button variant="outline" size="sm" asChild>
          <a href={`/preview/ad/${ad.id}`} target="_blank" rel="noopener noreferrer">
            Preview
          </a>
        </Button>
        <div className="flex items-center space-x-1 text-sm text-muted-foreground">
          <BarChart className="h-4 w-4 mr-1" />
          CTR: {ad.views > 0 ? `${((ad.clicks / ad.views) * 100).toFixed(1)}%` : "0%"}
        </div>
      </CardFooter>
    </Card>
  );
};

export default AdminAdvertisements;