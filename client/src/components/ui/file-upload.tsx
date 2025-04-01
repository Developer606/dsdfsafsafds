import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, FileImage, FileVideo } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onUploadComplete: (url: string) => void;
  accept: string;
  label: string;
  currentUrl?: string;
  type?: 'image' | 'video';
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  onUploadComplete,
  accept,
  label,
  currentUrl,
  type = 'image'
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl || null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Format URL for display and functionality
  const formatUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    
    // If it's already a full URL, return it as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // If it's an uploaded file URL (starts with '/uploads'), make sure it's correctly formed
    if (url.startsWith('/uploads')) {
      return url;
    }
    
    // For any other format, assume it might be a relative path
    return url;
  };

  // Update preview URL when currentUrl changes (from parent component)
  useEffect(() => {
    if (currentUrl) {
      setPreviewUrl(formatUrl(currentUrl));
    }
  }, [currentUrl]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset states
    setError(null);
    setIsUploading(true);
    
    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size exceeds 10MB limit');
      setIsUploading(false);
      return;
    }

    try {
      // Create a preview URL
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      
      // Call the onFileSelect callback
      onFileSelect(file);
      
      // Create form data for upload
      const formData = new FormData();
      formData.append('file', file);

      console.log('Uploading file:', file.name, 'Size:', file.size, 'Type:', file.type);
      
      // Upload the file
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      console.log('Upload response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload failed with response:', errorText);
        throw new Error(`Failed to upload file: ${errorText}`);
      }

      const data = await response.json();
      console.log('Upload successful, received URL:', data.url);
      
      onUploadComplete(data.url);
    } catch (err) {
      setError('Error uploading file. Please try again.');
      console.error('Upload error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const clearUpload = () => {
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onUploadComplete('');
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium mb-1">{label}</label>
      
      {previewUrl ? (
        <div className="relative border rounded-md overflow-hidden">
          {type === 'image' ? (
            <img 
              src={formatUrl(previewUrl) || ''} 
              alt="Preview" 
              className="w-full h-40 object-cover"
            />
          ) : (
            <video 
              src={formatUrl(previewUrl) || ''} 
              className="w-full h-40 object-cover"
              controls
            />
          )}
          <button
            type="button"
            onClick={clearUpload}
            className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full hover:bg-red-700"
            aria-label="Remove file"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div 
          onClick={triggerFileInput}
          className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md p-6 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 dark:hover:border-gray-500"
        >
          {type === 'image' ? (
            <FileImage className="h-8 w-8 mb-2 text-gray-500" />
          ) : (
            <FileVideo className="h-8 w-8 mb-2 text-gray-500" />
          )}
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Click to {isUploading ? 'Uploading...' : 'upload'} or drag and drop
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {type === 'image' ? 'PNG, JPG or GIF' : 'MP4, WebM or Ogg'} (Max 10MB)
          </p>
        </div>
      )}
      
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        disabled={isUploading}
      />
    </div>
  );
};