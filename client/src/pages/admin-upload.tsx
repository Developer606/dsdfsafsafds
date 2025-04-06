import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Copy, ArrowLeft, CheckCircle, RefreshCw } from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

interface LibraryItem {
  id: string;
  title: string;
}

export default function AdminUpload() {
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [supportedFileTypes, setSupportedFileTypes] = useState<string[]>([
    "application/pdf", 
    "image/jpeg", 
    "image/png", 
    "image/gif",
    "application/vnd.amazon.ebook"
  ]);
  const [activeTab, setActiveTab] = useState<string>("manga");
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [isUpdatingContentUrl, setIsUpdatingContentUrl] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Fetch manga list for selection dropdown
  const mangaQuery = useQuery({
    queryKey: ["/api/library/manga"],
    enabled: activeTab === "manga",
    queryFn: async () => {
      const response = await fetch("/api/library/manga");
      if (!response.ok) {
        throw new Error("Failed to fetch manga data");
      }
      return await response.json();
    },
  });

  // Fetch books list for selection dropdown
  const booksQuery = useQuery({
    queryKey: ["/api/library/books"],
    enabled: activeTab === "books",
    queryFn: async () => {
      const response = await fetch("/api/library/books");
      if (!response.ok) {
        throw new Error("Failed to fetch books data");
      }
      return await response.json();
    },
  });

  // Update content_url mutation
  const updateContentUrlMutation = useMutation({
    mutationFn: async ({ id, url, type }: { id: string, url: string, type: string }) => {
      const response = await fetch(`/api/admin/library/${type}/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content_url: url }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update content URL: ${response.statusText}`);
      }

      return await response.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: [`/api/library/${activeTab}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/library/${activeTab}/${selectedItemId}`] });
      
      setUpdateSuccess(true);
      toast({
        title: "Content URL updated",
        description: `The content URL has been automatically updated for the selected item`,
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update content URL",
        variant: "destructive",
      });
    },
  });

  // Reset selection when tab changes
  useEffect(() => {
    setSelectedItemId("");
    setUploadedUrl(null);
    setUploadedFile(null);
    setUpdateSuccess(false);
  }, [activeTab]);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setUploadedFile(file);
      
      // Reset previous upload
      setUploadedUrl(null);
      setUploadProgress(0);
      setUpdateSuccess(false);
    }
  };
  
  const handleUpload = async () => {
    if (!uploadedFile) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    
    const formData = new FormData();
    formData.append("file", uploadedFile);
    
    // Add query param for content type
    const uploadUrl = `/api/upload/admin?type=${activeTab}`;
    
    try {
      // Simulate upload progress
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + Math.random() * 10;
          return newProgress > 90 ? 90 : newProgress;
        });
      }, 300);
      
      const response = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
      });
      
      clearInterval(interval);
      setUploadProgress(100);
      
      if (!response.ok) {
        throw new Error(`Upload failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      setUploadedUrl(data.url);
      
      toast({
        title: "Upload successful",
        description: "File has been uploaded and is ready to use",
        variant: "default",
      });

      // If an item was selected, automatically update its content_url
      if (selectedItemId && selectedItemId !== 'none') {
        updateContentUrlMutation.mutate({
          id: selectedItemId,
          url: data.url,
          type: activeTab === "manga" ? "manga" : "books"
        });
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  const copyToClipboard = () => {
    if (uploadedUrl) {
      navigator.clipboard.writeText(uploadedUrl);
      toast({
        title: "URL copied",
        description: "File URL has been copied to clipboard",
        variant: "default",
      });
    }
  };

  const updateItemContentUrl = () => {
    if (!uploadedUrl || !selectedItemId || selectedItemId === 'none') return;
    
    updateContentUrlMutation.mutate({
      id: selectedItemId,
      url: uploadedUrl,
      type: activeTab === "manga" ? "manga" : "books"
    });
  };
  
  return (
    <div className="container py-6 max-w-5xl">
      <div className="flex items-center mb-6">
        <Link href="/admin-library">
          <Button variant="ghost" size="sm" className="mr-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Library
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Upload Content Files</h1>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manga">Manga Content</TabsTrigger>
          <TabsTrigger value="book">Book Content</TabsTrigger>
        </TabsList>
        
        <TabsContent value="manga" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload Manga Content</CardTitle>
              <CardDescription className="space-y-1">
                <p>Upload PDF files or image collections for manga content.</p>
                <p><span className="font-semibold text-blue-600">NEW:</span> Select a manga from the dropdown below to automatically update its content URL!</p>
                <p>No need to manually copy-paste URLs anymore.</p>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <AlertTitle>Supported formats</AlertTitle>
                  <AlertDescription>
                    PDF files, JPG/JPEG, PNG, and GIF images are supported.
                    Max file size: 30MB.
                  </AlertDescription>
                </Alert>
                
                {/* Select manga for automatic update */}
                <div className="flex flex-col space-y-2 mb-4">
                  <label htmlFor="manga-select" className="text-sm font-medium">
                    Select Manga to Update (Optional)
                  </label>
                  <Select
                    value={selectedItemId}
                    onValueChange={setSelectedItemId}
                  >
                    <SelectTrigger id="manga-select" className="w-full">
                      <SelectValue placeholder="Select a manga..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Don't associate with any manga</SelectItem>
                      {mangaQuery.isLoading ? (
                        <SelectItem value="loading" disabled>Loading manga...</SelectItem>
                      ) : mangaQuery.isError ? (
                        <SelectItem value="error" disabled>Error loading manga</SelectItem>
                      ) : mangaQuery.data && mangaQuery.data.length > 0 ? (
                        mangaQuery.data.map((manga: LibraryItem) => (
                          <SelectItem key={manga.id} value={manga.id}>
                            {manga.title}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-manga" disabled>No manga available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {selectedItemId && selectedItemId !== 'none' && (
                    <p className="text-xs text-green-600">
                      Selected manga's content_url will be automatically updated after upload
                    </p>
                  )}
                </div>
                
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-8 mb-4">
                  <Upload className="w-10 h-10 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500 mb-2">Upload manga content files</p>
                  <p className="text-xs text-blue-600 mb-4">Supported: PDF, JPG, PNG, GIF (Max size: 30MB)</p>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.gif"
                    onChange={handleFileChange}
                    ref={fileInputRef}
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    Select File
                  </Button>
                </div>
                
                {uploadedFile && (
                  <div className="p-4 bg-gray-50 rounded-md">
                    <div className="flex items-center">
                      <div className="flex-1">
                        <p className="font-medium">{uploadedFile.name}</p>
                        <p className="text-sm text-gray-500">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <Button
                        onClick={handleUpload}
                        disabled={isUploading}
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          "Upload"
                        )}
                      </Button>
                    </div>
                    
                    {isUploading && (
                      <div className="mt-4">
                        <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1 text-right">{Math.round(uploadProgress)}%</p>
                      </div>
                    )}
                  </div>
                )}
                
                {uploadedUrl && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex items-center mb-2">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                      <p className="font-medium text-green-700">File uploaded successfully</p>
                    </div>
                    <div className="flex items-center">
                      <Input value={uploadedUrl} readOnly className="flex-1 mr-2 bg-white" />
                      <Button variant="outline" onClick={copyToClipboard}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    {updateSuccess ? (
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded flex items-start">
                        <CheckCircle className="w-5 h-5 text-blue-500 mr-2 mt-0.5" />
                        <div>
                          <p className="font-medium text-blue-700">Manga content URL updated!</p>
                          <p className="text-sm text-blue-600 mt-1">
                            The selected manga has been updated with this content URL
                          </p>
                          <div className="mt-3">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => navigate('/admin-library')}
                            >
                              Back to Library Management
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        {selectedItemId && selectedItemId !== 'none' ? (
                          <div className="mt-2 flex items-center">
                            <Button 
                              variant="default" 
                              size="sm" 
                              onClick={updateItemContentUrl}
                              disabled={updateContentUrlMutation.isPending}
                              className="mr-2"
                            >
                              {updateContentUrlMutation.isPending ? (
                                <>
                                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                  Updating...
                                </>
                              ) : (
                                <>Update Manga Content URL</>
                              )}
                            </Button>
                            <p className="text-xs text-gray-500">
                              Click to update the selected manga's content URL
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 mt-2">
                            File uploaded successfully! URL is shown above. 
                            <br />Select a manga from the dropdown to associate it with this file.
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="book" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload Book Content</CardTitle>
              <CardDescription className="space-y-1">
                <p>Upload PDF files or e-book formats for book content.</p>
                <p><span className="font-semibold text-blue-600">NEW:</span> Select a book from the dropdown below to automatically update its content URL!</p>
                <p>No need to manually copy-paste URLs anymore.</p>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <AlertTitle>Supported formats</AlertTitle>
                  <AlertDescription>
                    PDF files and Kindle format e-books are supported.
                    Max file size: 30MB.
                  </AlertDescription>
                </Alert>
                
                {/* Select book for automatic update */}
                <div className="flex flex-col space-y-2 mb-4">
                  <label htmlFor="book-select" className="text-sm font-medium">
                    Select Book to Update (Optional)
                  </label>
                  <Select
                    value={selectedItemId}
                    onValueChange={setSelectedItemId}
                  >
                    <SelectTrigger id="book-select" className="w-full">
                      <SelectValue placeholder="Select a book..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Don't associate with any book</SelectItem>
                      {booksQuery.isLoading ? (
                        <SelectItem value="loading" disabled>Loading books...</SelectItem>
                      ) : booksQuery.isError ? (
                        <SelectItem value="error" disabled>Error loading books</SelectItem>
                      ) : booksQuery.data && booksQuery.data.length > 0 ? (
                        booksQuery.data.map((book: LibraryItem) => (
                          <SelectItem key={book.id} value={book.id}>
                            {book.title}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-books" disabled>No books available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {selectedItemId && selectedItemId !== 'none' && (
                    <p className="text-xs text-green-600">
                      Selected book's content_url will be automatically updated after upload
                    </p>
                  )}
                </div>
                
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-8 mb-4">
                  <Upload className="w-10 h-10 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500 mb-2">Upload book content files</p>
                  <p className="text-xs text-blue-600 mb-4">Supported: PDF, EPUB, MOBI, AZW (Max size: 30MB)</p>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.epub,.mobi,.azw,.azw3"
                    onChange={handleFileChange}
                    ref={fileInputRef}
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    Select File
                  </Button>
                </div>
                
                {uploadedFile && (
                  <div className="p-4 bg-gray-50 rounded-md">
                    <div className="flex items-center">
                      <div className="flex-1">
                        <p className="font-medium">{uploadedFile.name}</p>
                        <p className="text-sm text-gray-500">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <Button
                        onClick={handleUpload}
                        disabled={isUploading}
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          "Upload"
                        )}
                      </Button>
                    </div>
                    
                    {isUploading && (
                      <div className="mt-4">
                        <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1 text-right">{Math.round(uploadProgress)}%</p>
                      </div>
                    )}
                  </div>
                )}
                
                {uploadedUrl && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex items-center mb-2">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                      <p className="font-medium text-green-700">File uploaded successfully</p>
                    </div>
                    <div className="flex items-center">
                      <Input value={uploadedUrl} readOnly className="flex-1 mr-2 bg-white" />
                      <Button variant="outline" onClick={copyToClipboard}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    {updateSuccess ? (
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded flex items-start">
                        <CheckCircle className="w-5 h-5 text-blue-500 mr-2 mt-0.5" />
                        <div>
                          <p className="font-medium text-blue-700">Book content URL updated!</p>
                          <p className="text-sm text-blue-600 mt-1">
                            The selected book has been updated with this content URL
                          </p>
                          <div className="mt-3">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => navigate('/admin-library')}
                            >
                              Back to Library Management
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        {selectedItemId && selectedItemId !== 'none' ? (
                          <div className="mt-2 flex items-center">
                            <Button 
                              variant="default" 
                              size="sm" 
                              onClick={updateItemContentUrl}
                              disabled={updateContentUrlMutation.isPending}
                              className="mr-2"
                            >
                              {updateContentUrlMutation.isPending ? (
                                <>
                                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                  Updating...
                                </>
                              ) : (
                                <>Update Book Content URL</>
                              )}
                            </Button>
                            <p className="text-xs text-gray-500">
                              Click to update the selected book's content URL
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 mt-2">
                            File uploaded successfully! URL is shown above. 
                            <br />Select a book from the dropdown to associate it with this file.
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}