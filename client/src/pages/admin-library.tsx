import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  ArrowLeft,
  BookOpen,
  Crown,
  Edit,
  Library,
  Loader2,
  Menu,
  MessageCircle,
  Newspaper,
  Palette,
  Plus,
  Shield,
  Trash2,
  AlertCircle,
  Megaphone,
  BookText,
} from "lucide-react";

// Schema validation for forms
const mangaSchema = z.object({
  id: z.string().min(1, "ID is required"),
  title: z.string().min(1, "Title is required"),
  cover: z.string().url("Must be a valid URL"),
  description: z.string().min(1, "Description is required"),
  author: z.string().min(1, "Author is required"),
  chapters: z.coerce.number().int().positive("Chapters must be a positive number"),
  tags: z.string().min(1, "Tags are required"),
  release_date: z.string().min(1, "Release date is required"),
});

const bookSchema = z.object({
  id: z.string().min(1, "ID is required"),
  title: z.string().min(1, "Title is required"),
  cover: z.string().url("Must be a valid URL"),
  description: z.string().min(1, "Description is required"),
  author: z.string().min(1, "Author is required"),
  pages: z.coerce.number().int().positive("Pages must be a positive number"),
  tags: z.string().min(1, "Tags are required"),
  release_date: z.string().min(1, "Release date is required"),
});

const newsSchema = z.object({
  id: z.string().min(1, "ID is required"),
  title: z.string().min(1, "Title is required"),
  image: z.string().url("Must be a valid URL"),
  summary: z.string().min(1, "Summary is required"),
  author: z.string().min(1, "Author is required"),
  date: z.string().min(1, "Date is required"),
  tags: z.string().min(1, "Tags are required"),
  source: z.string().min(1, "Source is required"),
});

export default function AdminLibrary() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("manga");
  const [mangaDialogOpen, setMangaDialogOpen] = useState(false);
  const [bookDialogOpen, setBookDialogOpen] = useState(false);
  const [newsDialogOpen, setNewsDialogOpen] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Form hooks for each content type
  const mangaForm = useForm<z.infer<typeof mangaSchema>>({
    resolver: zodResolver(mangaSchema),
    defaultValues: {
      id: "",
      title: "",
      cover: "",
      description: "",
      author: "",
      chapters: 0,
      tags: "",
      release_date: "",
    },
  });

  const bookForm = useForm<z.infer<typeof bookSchema>>({
    resolver: zodResolver(bookSchema),
    defaultValues: {
      id: "",
      title: "",
      cover: "",
      description: "",
      author: "",
      pages: 0,
      tags: "",
      release_date: "",
    },
  });

  const newsForm = useForm<z.infer<typeof newsSchema>>({
    resolver: zodResolver(newsSchema),
    defaultValues: {
      id: "",
      title: "",
      image: "",
      summary: "",
      author: "",
      date: "",
      tags: "",
      source: "",
    },
  });

  // Data fetching queries
  const { data: mangaData = [], isLoading: mangaLoading } = useQuery({
    queryKey: ["/api/library/manga"],
  });

  const { data: booksData = [], isLoading: booksLoading } = useQuery({
    queryKey: ["/api/library/books"],
  });

  const { data: newsData = [], isLoading: newsLoading } = useQuery({
    queryKey: ["/api/library/news"],
  });

  // Mutations for creating
  const createManga = useMutation({
    mutationFn: async (data: z.infer<typeof mangaSchema>) => {
      // Convert tags string to JSON string to match the expected format
      const formattedData = {
        ...data,
        tags: JSON.stringify(data.tags.split(',').map(tag => tag.trim())),
        created_at: new Date(),
        updated_at: new Date(),
      };
      
      return apiRequest("POST", "/api/admin/library/manga", formattedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/library/manga"] });
      toast({
        title: "Success",
        description: "Manga created successfully",
      });
      setMangaDialogOpen(false);
      mangaForm.reset();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create manga: " + error.message,
      });
    },
  });

  const createBook = useMutation({
    mutationFn: async (data: z.infer<typeof bookSchema>) => {
      const formattedData = {
        ...data,
        tags: JSON.stringify(data.tags.split(',').map(tag => tag.trim())),
        created_at: new Date(),
        updated_at: new Date(),
      };
      
      return apiRequest("POST", "/api/admin/library/books", formattedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/library/books"] });
      toast({
        title: "Success",
        description: "Book created successfully",
      });
      setBookDialogOpen(false);
      bookForm.reset();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create book: " + error.message,
      });
    },
  });

  const createNews = useMutation({
    mutationFn: async (data: z.infer<typeof newsSchema>) => {
      const formattedData = {
        ...data,
        tags: JSON.stringify(data.tags.split(',').map(tag => tag.trim())),
        created_at: new Date(),
        updated_at: new Date(),
      };
      
      return apiRequest("POST", "/api/admin/library/news", formattedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/library/news"] });
      toast({
        title: "Success",
        description: "News created successfully",
      });
      setNewsDialogOpen(false);
      newsForm.reset();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create news: " + error.message,
      });
    },
  });

  // Mutations for updating
  const updateManga = useMutation({
    mutationFn: async (data: z.infer<typeof mangaSchema>) => {
      const formattedData = {
        ...data,
        tags: JSON.stringify(data.tags.split(',').map(tag => tag.trim())),
        updated_at: new Date(),
      };
      
      return apiRequest("PUT", `/api/admin/library/manga/${data.id}`, formattedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/library/manga"] });
      toast({
        title: "Success",
        description: "Manga updated successfully",
      });
      setMangaDialogOpen(false);
      setEditingItem(null);
      mangaForm.reset();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update manga: " + error.message,
      });
    },
  });

  const updateBook = useMutation({
    mutationFn: async (data: z.infer<typeof bookSchema>) => {
      const formattedData = {
        ...data,
        tags: JSON.stringify(data.tags.split(',').map(tag => tag.trim())),
        updated_at: new Date(),
      };
      
      return apiRequest("PUT", `/api/admin/library/books/${data.id}`, formattedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/library/books"] });
      toast({
        title: "Success",
        description: "Book updated successfully",
      });
      setBookDialogOpen(false);
      setEditingItem(null);
      bookForm.reset();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update book: " + error.message,
      });
    },
  });

  const updateNews = useMutation({
    mutationFn: async (data: z.infer<typeof newsSchema>) => {
      const formattedData = {
        ...data,
        tags: JSON.stringify(data.tags.split(',').map(tag => tag.trim())),
        updated_at: new Date(),
      };
      
      return apiRequest("PUT", `/api/admin/library/news/${data.id}`, formattedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/library/news"] });
      toast({
        title: "Success",
        description: "News updated successfully",
      });
      setNewsDialogOpen(false);
      setEditingItem(null);
      newsForm.reset();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update news: " + error.message,
      });
    },
  });

  // Mutations for deleting
  const deleteManga = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/library/manga/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/library/manga"] });
      toast({
        title: "Success",
        description: "Manga deleted successfully",
      });
      setDeleteDialogOpen(false);
      setDeleteItemId(null);
      setDeleteType(null);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete manga: " + error.message,
      });
    },
  });

  const deleteBook = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/library/books/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/library/books"] });
      toast({
        title: "Success",
        description: "Book deleted successfully",
      });
      setDeleteDialogOpen(false);
      setDeleteItemId(null);
      setDeleteType(null);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete book: " + error.message,
      });
    },
  });

  const deleteNews = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/library/news/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/library/news"] });
      toast({
        title: "Success",
        description: "News deleted successfully",
      });
      setDeleteDialogOpen(false);
      setDeleteItemId(null);
      setDeleteType(null);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete news: " + error.message,
      });
    },
  });

  // Handle form submissions
  const onMangaSubmit = (data: z.infer<typeof mangaSchema>) => {
    if (editingItem) {
      updateManga.mutate(data);
    } else {
      createManga.mutate(data);
    }
  };

  const onBookSubmit = (data: z.infer<typeof bookSchema>) => {
    if (editingItem) {
      updateBook.mutate(data);
    } else {
      createBook.mutate(data);
    }
  };

  const onNewsSubmit = (data: z.infer<typeof newsSchema>) => {
    if (editingItem) {
      updateNews.mutate(data);
    } else {
      createNews.mutate(data);
    }
  };

  // Handle edit item clicks
  const handleEditManga = (manga: any) => {
    setEditingItem(manga);
    mangaForm.reset({
      id: manga.id,
      title: manga.title,
      cover: manga.cover,
      description: manga.description,
      author: manga.author,
      chapters: manga.chapters,
      tags: Array.isArray(manga.tags) 
        ? manga.tags.join(', ') 
        : typeof manga.tags === 'string' && manga.tags.startsWith('[') 
          ? JSON.parse(manga.tags).join(', ')
          : manga.tags,
      release_date: manga.release_date,
    });
    setMangaDialogOpen(true);
  };

  const handleEditBook = (book: any) => {
    setEditingItem(book);
    bookForm.reset({
      id: book.id,
      title: book.title,
      cover: book.cover,
      description: book.description,
      author: book.author,
      pages: book.pages,
      tags: Array.isArray(book.tags) 
        ? book.tags.join(', ') 
        : typeof book.tags === 'string' && book.tags.startsWith('[') 
          ? JSON.parse(book.tags).join(', ')
          : book.tags,
      release_date: book.release_date,
    });
    setBookDialogOpen(true);
  };

  const handleEditNews = (news: any) => {
    setEditingItem(news);
    newsForm.reset({
      id: news.id,
      title: news.title,
      image: news.image,
      summary: news.summary,
      author: news.author,
      date: news.date,
      tags: Array.isArray(news.tags) 
        ? news.tags.join(', ') 
        : typeof news.tags === 'string' && news.tags.startsWith('[') 
          ? JSON.parse(news.tags).join(', ')
          : news.tags,
      source: news.source,
    });
    setNewsDialogOpen(true);
  };

  // Handle delete confirmations
  const handleDelete = () => {
    if (!deleteItemId || !deleteType) return;
    
    if (deleteType === 'manga') {
      deleteManga.mutate(deleteItemId);
    } else if (deleteType === 'book') {
      deleteBook.mutate(deleteItemId);
    } else if (deleteType === 'news') {
      deleteNews.mutate(deleteItemId);
    }
  };

  // Reset forms when dialog closes
  const handleCloseMangaDialog = () => {
    setMangaDialogOpen(false);
    setEditingItem(null);
    mangaForm.reset();
  };

  const handleCloseBookDialog = () => {
    setBookDialogOpen(false);
    setEditingItem(null);
    bookForm.reset();
  };

  const handleCloseNewsDialog = () => {
    setNewsDialogOpen(false);
    setEditingItem(null);
    newsForm.reset();
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Link href="/admin/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Library Management</h1>
        </div>

        <div className="flex items-center gap-2">
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
                  <Button
                    variant="secondary"
                    className="w-full gap-2 justify-start"
                  >
                    <Crown className="h-4 w-4" />
                    Dashboard
                  </Button>
                </Link>
                <Link href="/admin/characters" className="w-full">
                  <Button
                    variant="secondary"
                    className="w-full gap-2 justify-start"
                  >
                    <Palette className="h-4 w-4" />
                    Manage Characters
                  </Button>
                </Link>
                <Link href="/admin/content-moderation" className="w-full">
                  <Button
                    variant="secondary"
                    className="w-full gap-2 justify-start"
                  >
                    <Shield className="h-4 w-4" />
                    Content Moderation
                  </Button>
                </Link>
                <Link href="/admin/dashboard/feedback" className="w-full">
                  <Button
                    variant="secondary"
                    className="w-full gap-2 justify-start"
                  >
                    <MessageCircle className="h-4 w-4" />
                    View Feedback
                  </Button>
                </Link>
                <Link href="/admin/dashboard/complaints" className="w-full">
                  <Button
                    variant="secondary"
                    className="w-full gap-2 justify-start"
                  >
                    <AlertCircle className="h-4 w-4" />
                    View Complaints
                  </Button>
                </Link>
                <Link href="/admin/advertisements" className="w-full">
                  <Button
                    variant="secondary"
                    className="w-full gap-2 justify-start"
                  >
                    <Megaphone className="h-4 w-4" />
                    Advertisements
                  </Button>
                </Link>
                <Link href="/admin/library" className="w-full">
                  <Button
                    variant="secondary"
                    className="w-full gap-2 justify-start bg-primary text-primary-foreground"
                  >
                    <Library className="h-4 w-4" />
                    Library Management
                  </Button>
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="manga" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Manga
          </TabsTrigger>
          <TabsTrigger value="books" className="gap-2">
            <BookText className="h-4 w-4" />
            Books
          </TabsTrigger>
          <TabsTrigger value="news" className="gap-2">
            <Newspaper className="h-4 w-4" />
            News
          </TabsTrigger>
        </TabsList>

        {/* Manga Tab Content */}
        <TabsContent value="manga">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Manga Collection</CardTitle>
                <CardDescription>
                  Manage manga entries available in the library
                </CardDescription>
              </div>
              <Dialog open={mangaDialogOpen} onOpenChange={setMangaDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => {
                    setEditingItem(null);
                    mangaForm.reset();
                  }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Manga
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingItem ? "Edit Manga" : "Add New Manga"}
                    </DialogTitle>
                  </DialogHeader>
                  <Form {...mangaForm}>
                    <form onSubmit={mangaForm.handleSubmit(onMangaSubmit)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={mangaForm.control}
                          name="id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>ID (URL slug)</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="one-piece" 
                                  {...field} 
                                  disabled={!!editingItem}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={mangaForm.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Title</FormLabel>
                              <FormControl>
                                <Input placeholder="One Piece" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={mangaForm.control}
                        name="cover"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cover Image URL</FormLabel>
                            <FormControl>
                              <Input placeholder="https://example.com/image.jpg" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={mangaForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="A story about pirates searching for the ultimate treasure..." 
                                {...field} 
                                rows={4}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={mangaForm.control}
                          name="author"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Author</FormLabel>
                              <FormControl>
                                <Input placeholder="Eiichiro Oda" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={mangaForm.control}
                          name="chapters"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Chapters</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  placeholder="1000" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={mangaForm.control}
                          name="tags"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tags (comma separated)</FormLabel>
                              <FormControl>
                                <Input placeholder="Adventure, Fantasy, Action" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={mangaForm.control}
                          name="release_date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Release Date</FormLabel>
                              <FormControl>
                                <Input placeholder="1997-07-22" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={mangaForm.control}
                        name="content_url"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Content URL (for "Read Now" button)</FormLabel>
                            <FormControl>
                              <Input placeholder="https://example.com/manga/read/my-manga" {...field} />
                            </FormControl>
                            <FormDescription>
                              Leave empty to show "Coming Soon" message, or enter a URL to make the button functional
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <DialogFooter>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={handleCloseMangaDialog}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={createManga.isPending || updateManga.isPending}>
                          {(createManga.isPending || updateManga.isPending) && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          {editingItem ? "Update Manga" : "Add Manga"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {mangaLoading ? (
                <div className="flex justify-center items-center py-10">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cover</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Author</TableHead>
                      <TableHead>Chapters</TableHead>
                      <TableHead>Tags</TableHead>
                      <TableHead>Release Date</TableHead>
                      <TableHead>Content URL</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.isArray(mangaData) && mangaData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-4">
                          No manga entries found
                        </TableCell>
                      </TableRow>
                    ) : (
                      Array.isArray(mangaData) && mangaData.map((manga) => (
                        <TableRow key={manga.id}>
                          <TableCell>
                            <img 
                              src={manga.cover} 
                              alt={manga.title}
                              className="w-16 h-20 object-cover rounded-md"
                            />
                          </TableCell>
                          <TableCell className="font-medium">{manga.title}</TableCell>
                          <TableCell>{manga.author}</TableCell>
                          <TableCell>{manga.chapters}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {(Array.isArray(manga.tags) 
                                ? manga.tags 
                                : typeof manga.tags === 'string' && manga.tags.startsWith('[') 
                                  ? JSON.parse(manga.tags) 
                                  : []
                              ).map((tag: string, index: number) => (
                                <Badge key={index} variant="outline">{tag}</Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>{manga.release_date}</TableCell>
                          <TableCell className="truncate max-w-[150px]">
                            {manga.content_url ? (
                              <a 
                                href={manga.content_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline truncate block"
                              >
                                {manga.content_url}
                              </a>
                            ) : (
                              <span className="text-gray-400 italic">None</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleEditManga(manga)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="destructive"
                                    size="icon"
                                    onClick={() => {
                                      setDeleteItemId(manga.id);
                                      setDeleteType('manga');
                                      setDeleteDialogOpen(true);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this manga? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
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
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Books Tab Content */}
        <TabsContent value="books">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Books Collection</CardTitle>
                <CardDescription>
                  Manage book entries available in the library
                </CardDescription>
              </div>
              <Dialog open={bookDialogOpen} onOpenChange={setBookDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => {
                    setEditingItem(null);
                    bookForm.reset();
                  }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Book
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingItem ? "Edit Book" : "Add New Book"}
                    </DialogTitle>
                  </DialogHeader>
                  <Form {...bookForm}>
                    <form onSubmit={bookForm.handleSubmit(onBookSubmit)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={bookForm.control}
                          name="id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>ID (URL slug)</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="brave-new-world" 
                                  {...field} 
                                  disabled={!!editingItem}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={bookForm.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Title</FormLabel>
                              <FormControl>
                                <Input placeholder="Brave New World" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={bookForm.control}
                        name="cover"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cover Image URL</FormLabel>
                            <FormControl>
                              <Input placeholder="https://example.com/image.jpg" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={bookForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="A dystopian novel about a future society..." 
                                {...field} 
                                rows={4}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={bookForm.control}
                          name="author"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Author</FormLabel>
                              <FormControl>
                                <Input placeholder="Aldous Huxley" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={bookForm.control}
                          name="pages"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Pages</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  placeholder="288" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={bookForm.control}
                          name="tags"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tags (comma separated)</FormLabel>
                              <FormControl>
                                <Input placeholder="Science Fiction, Dystopian, Classic" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={bookForm.control}
                          name="release_date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Release Date</FormLabel>
                              <FormControl>
                                <Input placeholder="1932-01-01" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={bookForm.control}
                        name="content_url"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Content URL (for "Read Now" button)</FormLabel>
                            <FormControl>
                              <Input placeholder="https://example.com/books/read/brave-new-world" {...field} />
                            </FormControl>
                            <FormDescription>
                              Leave empty to show "Coming Soon" message, or enter a URL to make the button functional
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DialogFooter>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={handleCloseBookDialog}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={createBook.isPending || updateBook.isPending}>
                          {(createBook.isPending || updateBook.isPending) && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          {editingItem ? "Update Book" : "Add Book"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {booksLoading ? (
                <div className="flex justify-center items-center py-10">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cover</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Author</TableHead>
                      <TableHead>Pages</TableHead>
                      <TableHead>Tags</TableHead>
                      <TableHead>Release Date</TableHead>
                      <TableHead>Content URL</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.isArray(booksData) && booksData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-4">
                          No book entries found
                        </TableCell>
                      </TableRow>
                    ) : (
                      Array.isArray(booksData) && booksData.map((book) => (
                        <TableRow key={book.id}>
                          <TableCell>
                            <img 
                              src={book.cover} 
                              alt={book.title}
                              className="w-16 h-20 object-cover rounded-md"
                            />
                          </TableCell>
                          <TableCell className="font-medium">{book.title}</TableCell>
                          <TableCell>{book.author}</TableCell>
                          <TableCell>{book.pages}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {(Array.isArray(book.tags) 
                                ? book.tags 
                                : typeof book.tags === 'string' && book.tags.startsWith('[') 
                                  ? JSON.parse(book.tags) 
                                  : []
                              ).map((tag: string, index: number) => (
                                <Badge key={index} variant="outline">{tag}</Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>{book.release_date}</TableCell>
                          <TableCell className="truncate max-w-[150px]">
                            {book.content_url ? (
                              <a 
                                href={book.content_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline truncate block"
                              >
                                {book.content_url}
                              </a>
                            ) : (
                              <span className="text-gray-400 italic">None</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleEditBook(book)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="destructive"
                                    size="icon"
                                    onClick={() => {
                                      setDeleteItemId(book.id);
                                      setDeleteType('book');
                                      setDeleteDialogOpen(true);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this book? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
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
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* News Tab Content */}
        <TabsContent value="news">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>News Collection</CardTitle>
                <CardDescription>
                  Manage news entries available in the library
                </CardDescription>
              </div>
              <Dialog open={newsDialogOpen} onOpenChange={setNewsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => {
                    setEditingItem(null);
                    newsForm.reset();
                  }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add News
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingItem ? "Edit News" : "Add New News"}
                    </DialogTitle>
                  </DialogHeader>
                  <Form {...newsForm}>
                    <form onSubmit={newsForm.handleSubmit(onNewsSubmit)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={newsForm.control}
                          name="id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>ID (URL slug)</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="anime-expo-2025" 
                                  {...field} 
                                  disabled={!!editingItem}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={newsForm.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Title</FormLabel>
                              <FormControl>
                                <Input placeholder="Anime Expo 2025 Announces Major Studio Appearances" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={newsForm.control}
                        name="image"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Image URL</FormLabel>
                            <FormControl>
                              <Input placeholder="https://example.com/image.jpg" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={newsForm.control}
                        name="summary"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Summary</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Anime Expo organizers have announced an impressive lineup..." 
                                {...field} 
                                rows={4}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={newsForm.control}
                          name="author"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Author</FormLabel>
                              <FormControl>
                                <Input placeholder="Anime News Network" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={newsForm.control}
                          name="source"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Source</FormLabel>
                              <FormControl>
                                <Input placeholder="AnimeNewsNetwork" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={newsForm.control}
                          name="tags"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tags (comma separated)</FormLabel>
                              <FormControl>
                                <Input placeholder="Event, Industry, Convention" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={newsForm.control}
                          name="date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Date</FormLabel>
                              <FormControl>
                                <Input placeholder="2025-03-15" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={newsForm.control}
                        name="content_url"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Content URL (for "Read Full Article" button)</FormLabel>
                            <FormControl>
                              <Input placeholder="https://example.com/news/article/anime-expo-2025" {...field} />
                            </FormControl>
                            <FormDescription>
                              Leave empty to show "Coming Soon" message, or enter a URL to make the button functional
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DialogFooter>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={handleCloseNewsDialog}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={createNews.isPending || updateNews.isPending}>
                          {(createNews.isPending || updateNews.isPending) && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          {editingItem ? "Update News" : "Add News"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {newsLoading ? (
                <div className="flex justify-center items-center py-10">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Image</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Author</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Tags</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Content URL</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.isArray(newsData) && newsData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-4">
                          No news entries found
                        </TableCell>
                      </TableRow>
                    ) : (
                      Array.isArray(newsData) && newsData.map((news) => (
                        <TableRow key={news.id}>
                          <TableCell>
                            <img 
                              src={news.image} 
                              alt={news.title}
                              className="w-16 h-12 object-cover rounded-md"
                            />
                          </TableCell>
                          <TableCell className="font-medium max-w-xs truncate">
                            {news.title}
                          </TableCell>
                          <TableCell>{news.author}</TableCell>
                          <TableCell>{news.date}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {(Array.isArray(news.tags) 
                                ? news.tags 
                                : typeof news.tags === 'string' && news.tags.startsWith('[') 
                                  ? JSON.parse(news.tags) 
                                  : []
                              ).map((tag: string, index: number) => (
                                <Badge key={index} variant="outline">{tag}</Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>{news.source}</TableCell>
                          <TableCell className="truncate max-w-[150px]">
                            {news.content_url ? (
                              <a 
                                href={news.content_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline truncate block"
                              >
                                {news.content_url}
                              </a>
                            ) : (
                              <span className="text-gray-400 italic">None</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleEditNews(news)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="destructive"
                                    size="icon"
                                    onClick={() => {
                                      setDeleteItemId(news.id);
                                      setDeleteType('news');
                                      setDeleteDialogOpen(true);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this news item? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
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
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}