import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Upload
} from "lucide-react";
import { Link } from "wouter";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

// Define interfaces
interface PredefinedCharacter {
  id: string;
  name: string;
  avatar: string;
  description: string;
  persona: string;
  createdAt?: Date;
}

interface CharacterStats {
  totalCharacters: number;
  customCharactersCount: number;
  predefinedCharactersCount: number;
  averageCustomCharactersPerUser: number;
}

// Character form validation schema
const characterSchema = z.object({
  id: z.string().min(1, "ID is required"),
  name: z.string().min(1, "Name is required"),
  avatar: z.string().min(1, "Avatar image source is required"),
  description: z.string().min(1, "Description is required"),
  persona: z.string().min(1, "Persona is required"),
});

type CharacterFormValues = z.infer<typeof characterSchema>;

export default function AdminCharacters() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<PredefinedCharacter | null>(null);
  
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
  
  // State for local images and upload
  const [localImages, setLocalImages] = useState<{filename: string; path: string}[]>([]);
  const [selectedImageType, setSelectedImageType] = useState<'url' | 'local'>('url');
  const [selectedLocalImage, setSelectedLocalImage] = useState<string>('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Fetch local images
  const { isLoading: localImagesLoading } = useQuery({
    queryKey: ["/api/admin/character-images"],
    onSuccess: (data: any) => {
      if (data?.localImages) {
        setLocalImages(data.localImages);
      }
    },
  });
  
  // Form setup
  const form = useForm<CharacterFormValues>({
    resolver: zodResolver(characterSchema),
    defaultValues: {
      id: "",
      name: "",
      avatar: "",
      description: "",
      persona: "",
    },
  });

  // Query for characters and stats
  const { data: characters = [], isLoading: charactersLoading } = useQuery<PredefinedCharacter[]>({
    queryKey: ["/api/admin/predefined-characters"],
  });

  const { data: stats = {
    totalCharacters: 0,
    customCharactersCount: 0,
    predefinedCharactersCount: 0,
    averageCustomCharactersPerUser: 0
  }, isLoading: statsLoading } = useQuery<CharacterStats>({
    queryKey: ["/api/admin/characters/stats"],
  });

  // File upload mutation
  const uploadImage = useMutation({
    mutationFn: async ({ file, characterId }: { file: File; characterId?: string }) => {
      const formData = new FormData();
      formData.append('image', file);
      
      // Add character ID if provided (for replacing existing images)
      if (characterId) {
        formData.append('characterId', characterId);
      }
      
      const res = await fetch('/api/admin/upload-character-image', {
        method: 'POST',
        body: formData,
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to upload image");
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      // Update the form with the uploaded image path
      form.setValue('avatar', data.path, { 
        shouldValidate: true,  // This triggers validation to clear any errors
        shouldDirty: true,     // Mark the field as dirty (changed)
        shouldTouch: true      // Mark the field as touched (interacted with)
      });
      setSelectedLocalImage(data.path);
      setSelectedImageType('local'); // Auto-switch to local image type when upload succeeds
      
      // Refresh the list of available images
      queryClient.invalidateQueries({ queryKey: ["/api/admin/character-images"] });
      
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
    
    // Automatically switch to local image mode when user selects a file
    setSelectedImageType('local');
    
    setUploadedFile(file);
    setIsUploading(true);
    setUploadProgress(10); // Start progress indication
    
    // Upload the file with character ID if editing
    uploadImage.mutate({
      file,
      characterId: editingCharacter?.id // Only pass characterId when editing
    });
  };

  // Mutations
  const createCharacter = useMutation({
    mutationFn: async (data: CharacterFormValues) => {
      const res = await apiRequest("POST", "/api/admin/predefined-characters", data);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create character");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/predefined-characters"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/characters/stats"] });
      setCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Character created successfully",
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

  const updateCharacter = useMutation({
    mutationFn: async (data: CharacterFormValues) => {
      const res = await apiRequest("PUT", `/api/admin/predefined-characters/${data.id}`, data);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update character");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/predefined-characters"] });
      setEditDialogOpen(false);
      setEditingCharacter(null);
      form.reset();
      toast({
        title: "Success",
        description: "Character updated successfully",
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

  const deleteCharacter = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/predefined-characters/${id}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to delete character");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/predefined-characters"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/characters/stats"] });
      toast({
        title: "Success",
        description: "Character deleted successfully",
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

  // Form submit handlers
  const onCreateSubmit = (data: CharacterFormValues) => {
    createCharacter.mutate(data);
  };

  const onEditSubmit = (data: CharacterFormValues) => {
    updateCharacter.mutate(data);
  };

  // Handler to open edit dialog with character data
  const handleEditCharacter = (character: PredefinedCharacter) => {
    setEditingCharacter(character);
    form.reset({
      id: character.id,
      name: character.name,
      avatar: character.avatar,
      description: character.description,
      persona: character.persona,
    });
    
    // Set image type based on avatar URL
    if (character.avatar.startsWith('/character_images/')) {
      setSelectedImageType('local');
      setSelectedLocalImage(character.avatar);
    } else {
      setSelectedImageType('url');
      setSelectedLocalImage('');
    }
    
    setEditDialogOpen(true);
  };

  // Open create dialog
  const handleCreateCharacter = () => {
    form.reset({
      id: "",
      name: "",
      avatar: "",
      description: "",
      persona: "",
    });
    setSelectedImageType('url');
    setSelectedLocalImage('');
    setCreateDialogOpen(true);
  };

  // JSX for local image selection with file upload (extracted for reuse)
  const renderLocalImageSelector = (field: any) => (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium mb-2">Upload character image</p>
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
      
      {selectedLocalImage && (
        <>
          <div className="flex items-center">
            <div className="h-2 w-2 bg-green-500 rounded-full mr-2"></div>
            <p className="text-sm text-green-500">Image uploaded successfully</p>
          </div>
          <div className="mt-2 relative w-32 h-32 rounded-md overflow-hidden border border-muted">
            <img 
              src={selectedLocalImage}
              alt="Selected character image"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://via.placeholder.com/100";
              }}
            />
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <Link href="/admin/dashboard">
          <Button variant="ghost" size="icon" className="mr-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Predefined Characters</h1>
        
        <div className="flex items-center ml-auto gap-2">
          <Button 
            onClick={handleCreateCharacter}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Character
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

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Total Characters</p>
            <p className="text-3xl font-bold">
              {statsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                stats.totalCharacters
              )}
            </p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Predefined Characters</p>
            <p className="text-3xl font-bold">
              {statsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                stats.predefinedCharactersCount
              )}
            </p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Custom Characters</p>
            <p className="text-3xl font-bold">
              {statsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                stats.customCharactersCount
              )}
            </p>
          </div>
        </Card>
      </div>

      {/* Characters table */}
      <Card className="overflow-hidden">
        <div className="p-6 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">Predefined Characters</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Manage predefined characters that appear to all users
            </p>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Avatar</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {charactersLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : characters.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10">
                  No predefined characters found.
                </TableCell>
              </TableRow>
            ) : (
              characters.map((character) => (
                <TableRow key={character.id}>
                  <TableCell>{character.id}</TableCell>
                  <TableCell>{character.name}</TableCell>
                  <TableCell>
                    {character.avatar ? (
                      <div className="relative h-10 w-10 rounded-full overflow-hidden">
                        <img 
                          src={character.avatar} 
                          alt={character.name} 
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://via.placeholder.com/100";
                          }}
                        />
                      </div>
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-500 text-sm">{character.name.charAt(0)}</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs truncate">
                      {character.description.length > 100
                        ? character.description.substring(0, 100) + "..."
                        : character.description}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditCharacter(character)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Character</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete the character "{character.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteCharacter.mutate(character.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {deleteCharacter.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : null}
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Create Character Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Create New Predefined Character</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onCreateSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID</FormLabel>
                    <FormControl>
                      <Input placeholder="character_id" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Character Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="avatar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Avatar</FormLabel>
                    <div className="space-y-2">
                      <div className="flex space-x-4">
                        <Button 
                          type="button" 
                          variant={selectedImageType === 'url' ? 'default' : 'outline'}
                          onClick={() => setSelectedImageType('url')}
                          className="flex-1"
                        >
                          URL
                        </Button>
                        <Button 
                          type="button" 
                          variant={selectedImageType === 'local' ? 'default' : 'outline'}
                          onClick={() => setSelectedImageType('local')}
                          className="flex-1"
                        >
                          Local Image
                        </Button>
                      </div>
                      
                      {selectedImageType === 'url' ? (
                        <FormControl>
                          <Input 
                            placeholder="https://example.com/avatar.jpg" 
                            {...field} 
                            onChange={(e) => {
                              field.onChange(e.target.value);
                              setSelectedLocalImage('');
                            }}
                          />
                        </FormControl>
                      ) : (
                        renderLocalImageSelector(field)
                      )}
                    </div>
                    <FormMessage />
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
                        placeholder="Short description of the character" 
                        className="min-h-[80px]" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="persona"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Persona</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Detailed persona instructions for the character" 
                        className="min-h-[120px]" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createCharacter.isPending}>
                  {createCharacter.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Create Character
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Character Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Edit Character: {editingCharacter?.name}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID</FormLabel>
                    <FormControl>
                      <Input placeholder="character_id" {...field} disabled />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Character Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="avatar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Avatar</FormLabel>
                    <div className="space-y-2">
                      <div className="flex space-x-4">
                        <Button 
                          type="button" 
                          variant={selectedImageType === 'url' ? 'default' : 'outline'}
                          onClick={() => setSelectedImageType('url')}
                          className="flex-1"
                        >
                          URL
                        </Button>
                        <Button 
                          type="button" 
                          variant={selectedImageType === 'local' ? 'default' : 'outline'}
                          onClick={() => setSelectedImageType('local')}
                          className="flex-1"
                        >
                          Local Image
                        </Button>
                      </div>
                      
                      {selectedImageType === 'url' ? (
                        <FormControl>
                          <Input 
                            placeholder="https://example.com/avatar.jpg" 
                            {...field} 
                            onChange={(e) => {
                              field.onChange(e.target.value);
                              setSelectedLocalImage('');
                            }}
                          />
                        </FormControl>
                      ) : (
                        renderLocalImageSelector(field)
                      )}
                    </div>
                    <FormMessage />
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
                        placeholder="Short description of the character" 
                        className="min-h-[80px]" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="persona"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Persona</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Detailed persona instructions for the character" 
                        className="min-h-[120px]" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateCharacter.isPending}>
                  {updateCharacter.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Update Character
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}