import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Copy, ArrowLeft, CheckCircle } from "lucide-react";
import { Link } from "wouter";

export default function AdminUpload() {
  const { toast } = useToast();
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setUploadedFile(file);
      
      // Reset previous upload
      setUploadedUrl(null);
      setUploadProgress(0);
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
              <CardDescription>
                Upload PDF files or image collections for manga content.
                The uploaded file URL can be used in the Manga content_url field.
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
                
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-8 mb-4">
                  <Upload className="w-10 h-10 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500 mb-4">Click to browse or drag and drop</p>
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
                    <p className="text-sm text-gray-500 mt-2">
                      Copy this URL and paste it into the Manga content_url field in the admin panel
                    </p>
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
              <CardDescription>
                Upload PDF files or e-book formats for book content.
                The uploaded file URL can be used in the Book content_url field.
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
                
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-8 mb-4">
                  <Upload className="w-10 h-10 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500 mb-4">Click to browse or drag and drop</p>
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
                    <p className="text-sm text-gray-500 mt-2">
                      Copy this URL and paste it into the Book content_url field in the admin panel
                    </p>
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