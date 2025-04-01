import React, { useState, useRef } from 'react';
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

      // Upload the file
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload file');
      }

      const data = await response.json();
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
              src={previewUrl} 
              alt="Preview" 
              className="w-full h-40 object-cover"
            />
          ) : (
            <video 
              src={previewUrl} 
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