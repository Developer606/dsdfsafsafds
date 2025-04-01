import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, FileImage, FileVideo } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onUploadComplete: (url: string) => void;
  accept: string;
  label: string;
  currentUrl?: string;
  type?: 'image' | 'video';
  uploadType?: 'advertisement' | string; // Used to route uploads to specific folders
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  onUploadComplete,
  accept,
  label,
  currentUrl,
  type = 'image',
  uploadType
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
      console.log('Using uploaded file URL:', url);
      return url;
    }
    
    // If it contains base64 data
    if (url.startsWith('data:')) {
      return url;
    }
    
    // For any other format, assume it might be a relative path
    return url;
  };

  // Update preview URL when currentUrl changes (from parent component)
  useEffect(() => {
    if (currentUrl) {
      console.log('Current URL updated to:', currentUrl);
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
      
      // Upload the file - for admins use the admin endpoint
      const adminUser = sessionStorage.getItem('isAdmin') === 'true';
      let uploadUrl = adminUser ? '/api/upload/admin' : '/api/upload';
      
      // Add the uploadType as a query parameter if it's specified (for both admin and regular users)
      if (uploadType) {
        uploadUrl += `?type=${encodeURIComponent(uploadType)}`;
      }
      
      console.log(`Using upload endpoint: ${uploadUrl}, user is${adminUser ? '' : ' not'} admin, uploadType: ${uploadType || 'none'}`);
      
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        // Important: Don't set Content-Type header when using FormData
        // The browser will set the appropriate multipart/form-data boundary
      });

      console.log('Upload response status:', response.status);
      
      if (!response.ok) {
        let errorText = '';
        try {
          const errorData = await response.json();
          errorText = errorData.error || 'Unknown error';
        } catch (e) {
          errorText = await response.text();
        }
        
        console.error('Upload failed with response:', errorText);
        throw new Error(`Failed to upload file: ${errorText}`);
      }

      const data = await response.json();
      console.log('Upload successful, received URL:', data.url);
      
      // Make sure the URL is properly formatted before setting it
      if (data.url) {
        // Use the full URL returned from the server without any manipulation
        onUploadComplete(data.url);
      } else {
        throw new Error('Server did not return a valid URL');
      }
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
  
  // Function to show error message and log details about URL issues
  const handleMediaError = (e: React.SyntheticEvent<HTMLImageElement | HTMLVideoElement, Event>) => {
    console.error('Media failed to load:', e.currentTarget.src);
    setError(`Failed to load media. URL: ${e.currentTarget.src}`);
    // Try to fetch the URL to see what response we get
    fetch(e.currentTarget.src)
      .then(response => {
        console.log('Media URL response status:', response.status);
        if (!response.ok) {
          setError(`Media fetch failed with status: ${response.status}`);
        }
      })
      .catch(err => {
        console.error('Error fetching media:', err);
        setError(`Network error fetching media: ${err.message}`);
      });
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
              onError={handleMediaError}
              onLoad={() => setError(null)}
            />
          ) : (
            <video 
              src={formatUrl(previewUrl) || ''} 
              className="w-full h-40 object-cover"
              controls
              onError={handleMediaError}
              onLoadedData={() => setError(null)}
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
          
          {/* Display URL for debugging */}
          {previewUrl && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-xs text-white p-1 truncate">
              {formatUrl(previewUrl)}
            </div>
          )}
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