import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { insertAdvertisementSchema } from '@shared/schema';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
import type { Advertisement } from '@shared/schema';
import { FileUpload } from '@/components/ui/file-upload';
import { 
  ChevronRight, 
  ImageIcon, 
  VideoIcon, 
  Calendar, 
  Link as LinkIcon, 
  Palette, 
  Trash2, 
  Edit, 
  Eye,
  Plus,
  PanelLeftOpen,
  PanelLeftClose,
  RotateCcw,
  Save,
  Play,
  Settings,
  Calendar as CalendarIcon,
  Type,
  Layout,
  Monitor,
  ArrowRight,
  X
} from 'lucide-react';

// Extend the schema for form validation
const formSchema = insertAdvertisementSchema.extend({
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  mediaType: z.enum(['image', 'video']).default('image'),
  videoUrl: z.string().optional(),
});

// Create type to use in the form
interface FormDataInterface {
  title: string;
  description: string;
  imageUrl: string;
  videoUrl?: string | null;
  mediaType: 'image' | 'video';
  buttonText: string | null;
  buttonLink: string;
  buttonStyle: string | null;
  backgroundColor: string | null;
  textColor: string | null;
  position: number | null;
  animationType: string | null;
  startDate: string;
  endDate: string;
  isActive?: boolean | null;
}

type FormData = FormDataInterface;

export const AdvertisementManager: React.FC = () => {
  const [selectedAd, setSelectedAd] = useState<Advertisement | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  const queryClient = useQueryClient();
  
  // Default values for the form
  const defaultValues: FormDataInterface = {
    title: '',
    description: '',
    imageUrl: '',
    videoUrl: '',
    mediaType: 'image' as 'image',
    buttonText: 'Learn More',
    buttonLink: '',
    buttonStyle: 'primary',
    backgroundColor: '#8B5CF6',
    textColor: '#FFFFFF',
    position: 0,
    animationType: 'fade',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'), // 30 days from now
  };
  
  // Initialize form with selected ad data or default values
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: selectedAd ? {
      ...selectedAd,
      mediaType: (selectedAd.mediaType as 'image' | 'video') || 'image',
      startDate: format(new Date(selectedAd.startDate), 'yyyy-MM-dd'),
      endDate: format(new Date(selectedAd.endDate), 'yyyy-MM-dd'),
    } : defaultValues,
  });
  
  // Watch form values for preview
  const formValues = watch();
  
  // Query to fetch all advertisements
  const { data: advertisements = [], isLoading: isLoadingAds } = useQuery<Advertisement[]>({
    queryKey: ['/api/advertisements'],
    refetchInterval: 30000, // Refetch every 30 seconds
  });
  
  // Query to fetch metrics for selected advertisement
  const { data: metrics, isLoading: isLoadingMetrics } = useQuery<any>({
    queryKey: ['/api/advertisements', selectedAd?.id, 'metrics'],
    enabled: !!selectedAd,
  });
  
  // Mutation to create a new advertisement
  const createMutation = useMutation({
    mutationFn: (data: FormData) => {
      // Convert string dates to Date objects
      const payload = {
        ...data,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        // Ensure isActive is set correctly (required by the schema)
        isActive: true,
        // Make sure position is a number
        position: Number(data.position || 0)
      };
      
      // Convert colors to strings if they're not already
      if (typeof payload.backgroundColor !== 'string') {
        payload.backgroundColor = String(payload.backgroundColor || '#8B5CF6');
      }
      
      if (typeof payload.textColor !== 'string') {
        payload.textColor = String(payload.textColor || '#FFFFFF');
      }
      
      console.log("Sending advertisement payload:", payload);
      return apiRequest('POST', '/api/advertisements', payload);
    },
    onSuccess: (data) => {
      console.log("Advertisement created successfully:", data);
      // Invalidate both regular and active advertisement queries
      queryClient.invalidateQueries({ queryKey: ['/api/advertisements'] });
      queryClient.invalidateQueries({ queryKey: ['/api/advertisements/active'] });
      reset(defaultValues);
      setSelectedAd(null);
    },
    onError: (error: any) => {
      console.error("Advertisement creation error:", error);
    },
  });
  
  // Mutation to update an existing advertisement
  const updateMutation = useMutation({
    mutationFn: (data: FormData & { id: number }) => {
      const { id, ...rest } = data;
      
      // Convert string dates to Date objects
      const payload = {
        ...rest,
        startDate: new Date(rest.startDate),
        endDate: new Date(rest.endDate),
        // Ensure isActive is set correctly (required by the schema)
        isActive: true,
        // Make sure position is a number
        position: Number(rest.position || 0)
      };
      
      // Convert colors to strings if they're not already
      if (typeof payload.backgroundColor !== 'string') {
        payload.backgroundColor = String(payload.backgroundColor || '#8B5CF6');
      }
      
      if (typeof payload.textColor !== 'string') {
        payload.textColor = String(payload.textColor || '#FFFFFF');
      }
      
      console.log("Sending update payload:", payload);
      return apiRequest('PUT', `/api/advertisements/${id}`, payload);
    },
    onSuccess: (data) => {
      console.log("Advertisement updated successfully:", data);
      // Invalidate both regular and active advertisement queries
      queryClient.invalidateQueries({ queryKey: ['/api/advertisements'] });
      queryClient.invalidateQueries({ queryKey: ['/api/advertisements/active'] });
    },
    onError: (error: any) => {
      console.error("Advertisement update error:", error);
    },
  });
  
  // Mutation to delete an advertisement
  const deleteMutation = useMutation({
    mutationFn: (id: number) => {
      return apiRequest('DELETE', `/api/advertisements/${id}`);
    },
    onSuccess: () => {
      // Invalidate both regular and active advertisement queries
      queryClient.invalidateQueries({ queryKey: ['/api/advertisements'] });
      queryClient.invalidateQueries({ queryKey: ['/api/advertisements/active'] });
      setSelectedAd(null);
      reset(defaultValues);
    },
    onError: (error: any) => {
      console.error("Advertisement deletion error:", error);
    },
  });
  
  // Form submission handler
  const onSubmit = (data: FormData) => {
    // Ensure we have the correct media type set based on URLs
    if (data.mediaType === 'video' && !data.videoUrl) {
      console.warn('Video media type selected but no video URL provided');
      // If a video URL is missing but image exists, switch to image mode
      if (data.imageUrl) {
        data.mediaType = 'image';
      }
    } else if (data.mediaType === 'image' && !data.imageUrl && data.videoUrl) {
      console.warn('Image media type selected but image URL missing and video URL exists');
      // If image is missing but video exists, switch to video mode
      data.mediaType = 'video';
    }
    
    // For video advertisements, if no image URL is provided, use an empty string
    // The schema will handle converting empty strings to a placeholder value
    if (data.mediaType === 'video' && !data.imageUrl) {
      console.log('Video advertisement with no image - providing empty string for imageUrl');
      data.imageUrl = '';
    }
    
    // Log the data being submitted to help with debugging
    console.log('Submitting form data:', {
      ...data,
      mediaType: data.mediaType,
      videoUrl: data.videoUrl,
      imageUrl: data.imageUrl
    });
    
    if (selectedAd) {
      updateMutation.mutate({ ...data, id: selectedAd.id });
    } else {
      createMutation.mutate(data);
    }
  };
  
  // Handle editing an advertisement
  const handleEdit = (ad: Advertisement) => {
    setSelectedAd(ad);
    
    // Create a safe copy of the ad to handle null values properly
    const safeAd = {
      ...ad,
      videoUrl: ad.videoUrl || '',
      buttonText: ad.buttonText || 'Learn More',
      buttonStyle: ad.buttonStyle || 'primary',
      backgroundColor: ad.backgroundColor || '#8B5CF6',
      textColor: ad.textColor || '#FFFFFF',
      animationType: ad.animationType || 'fade',
      position: ad.position ?? 0,
      isActive: ad.isActive ?? true,
      mediaType: (ad.mediaType as 'image' | 'video') || 'image',
      startDate: format(new Date(ad.startDate), 'yyyy-MM-dd'),
      endDate: format(new Date(ad.endDate), 'yyyy-MM-dd'),
    };
    
    reset(safeAd);
    setIsPreviewMode(false);
  };
  
  // Handle deleting an advertisement
  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this advertisement?')) {
      deleteMutation.mutate(id);
    }
  };
  
  // Handle creating a new advertisement
  const handleCreateNew = () => {
    setSelectedAd(null);
    reset(defaultValues);
    setIsPreviewMode(false);
  };
  
  // Preview component
  const PreviewComponent = () => {
    // Ensure colors are properly formatted as strings
    const backgroundColor = typeof formValues.backgroundColor === 'string' 
      ? formValues.backgroundColor 
      : '#8B5CF6';
      
    const textColor = typeof formValues.textColor === 'string'
      ? formValues.textColor
      : '#FFFFFF';
      
    // Create a preview object from form values
    const previewAd = {
      id: selectedAd?.id || 0,
      title: formValues.title || 'Example Advertisement',
      description: formValues.description || 'Example description for this advertisement.',
      imageUrl: formValues.imageUrl || '',
      videoUrl: formValues.videoUrl || '',
      mediaType: formValues.mediaType as 'image' | 'video' || 'image',
      buttonText: formValues.buttonText || 'Learn More',
      buttonLink: formValues.buttonLink || '',
      buttonStyle: formValues.buttonStyle || 'primary',
      backgroundColor: backgroundColor,
      textColor: textColor,
      animationType: formValues.animationType || 'fade',
      position: Number(formValues.position || 0),
      startDate: formValues.startDate ? new Date(formValues.startDate) : new Date(),
      endDate: formValues.endDate ? new Date(formValues.endDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isActive: true,
      impressions: selectedAd?.impressions || 0,
      clicks: selectedAd?.clicks || 0
    };
    
    return (
      <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
        <h3 className="text-lg font-bold mb-4">Preview</h3>
        
        <div className="relative rounded-xl overflow-hidden shadow-lg mb-4" 
             style={{ backgroundColor: previewAd.backgroundColor || 'rgb(15, 23, 42)' }}>
          <div className="relative">
            <div className="aspect-[3/4] rounded-xl overflow-hidden">
              {previewAd.mediaType === 'video' && previewAd.videoUrl ? (
                <div className="relative w-full h-full">
                  {previewAd.videoUrl.includes('youtube.com') || previewAd.videoUrl.includes('youtu.be') ? (
                    <iframe
                      src={previewAd.videoUrl.includes('youtube.com/embed') ? 
                        previewAd.videoUrl : 
                        previewAd.videoUrl.includes('youtube.com/shorts/') ?
                          (() => {
                            const match = /shorts\/([^?&/]+)/.exec(previewAd.videoUrl);
                            return match && match[1] ? 
                              `https://www.youtube.com/embed/${match[1]}?loop=1&controls=1` : 
                              previewAd.videoUrl;
                          })() :
                          previewAd.videoUrl
                      }
                      className="w-full h-full object-cover"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title="Embedded video"
                    />
                  ) : (
                    <video
                      src={previewAd.videoUrl}
                      poster={previewAd.imageUrl}
                      className="w-full h-full object-cover"
                      muted
                      loop
                      autoPlay
                      playsInline
                    />
                  )}
                  <div className="absolute bottom-3 right-3 flex space-x-2">
                    <div className="w-8 h-8 flex items-center justify-center bg-black/60 hover:bg-black/80 text-white rounded-full backdrop-blur-sm">
                      <span className="text-xs">Video</span>
                    </div>
                  </div>
                </div>
              ) : previewAd.imageUrl ? (
                <img
                  src={previewAd.imageUrl}
                  alt={previewAd.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                  <p className="text-gray-400">No media provided</p>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
            </div>
            
            <div className="absolute bottom-0 left-0 p-5 w-full">
              <div className="absolute top-4 left-4">
                <div className="text-xs text-purple-300 font-medium mb-1">
                  Featured
                </div>
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-1">
                {previewAd.title}
              </h2>
              
              <div className="flex items-center mb-3">
                <span className="bg-gray-800 text-white text-xs px-2 py-0.5 rounded-full">
                  New
                </span>
                <span className="mx-2 text-gray-500">•</span>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star, i) => (
                    <span
                      key={i}
                      className={`${i < 3 ? "text-amber-400" : "text-gray-600"} text-xs`}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>
              
              <button
                className={`px-4 py-2 ${
                  previewAd.buttonStyle === 'primary' ? 'bg-purple-500 hover:bg-purple-600' :
                  previewAd.buttonStyle === 'secondary' ? 'bg-pink-500 hover:bg-pink-600' :
                  previewAd.buttonStyle === 'outline' ? 'border border-purple-500 text-purple-500 hover:bg-purple-500/10' :
                  'bg-purple-500 hover:bg-purple-600'
                } text-white font-medium text-sm rounded-full shadow-lg flex items-center max-w-fit`}
              >
                {previewAd.buttonText}
              </button>
            </div>
          </div>
        </div>
        
        <div className="text-sm text-gray-500 dark:text-gray-400">
          <p>Duration: {format(previewAd.startDate, 'MMM d, yyyy')} - {format(previewAd.endDate, 'MMM d, yyyy')}</p>
          <p>Animation: {previewAd.animationType}</p>
          <p>Position: {previewAd.position}</p>
        </div>
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-gradient-to-r from-purple-600 to-indigo-600 p-4 rounded-lg shadow-md sticky top-0 z-10">
        <div className="flex items-center">
          <h2 className="text-2xl font-bold text-white">Advertisement Manager</h2>
          <span className="ml-3 px-3 py-1 bg-white/20 text-white text-xs font-medium rounded-full backdrop-blur-sm">
            {advertisements.length} Ads
          </span>
        </div>
        <button
          onClick={handleCreateNew}
          className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-100 text-purple-600 rounded-full font-medium transition-colors shadow-md"
        >
          <Plus size={16} />
          <span>Create New</span>
        </button>
      </div>
      
      {/* Responsive toggle for mobile view */}
      <div className="lg:hidden flex justify-end mb-2">
        <button 
          className="p-2 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors shadow-sm"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Advertisement list sidebar */}
        <div className={`lg:col-span-4 ${sidebarCollapsed ? 'hidden' : 'block'} lg:block`}>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">My Advertisements</h3>
              <button
                onClick={handleCreateNew}
                className="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-200 transition-colors"
                title="Create new advertisement"
              >
                <Plus size={16} />
              </button>
            </div>
            
            {isLoadingAds ? (
              <div className="animate-pulse space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                ))}
              </div>
            ) : advertisements && advertisements.length > 0 ? (
              <div className="space-y-3 max-h-[calc(100vh-250px)] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                {advertisements.map((ad: Advertisement) => (
                  <div
                    key={ad.id}
                    className={`border rounded-lg p-3 cursor-pointer hover:border-purple-500 transition-all ${
                      selectedAd?.id === ad.id ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 shadow-md' : 'bg-white dark:bg-gray-800'
                    }`}
                    onClick={() => handleEdit(ad)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-800 dark:text-white truncate">{ad.title || "Untitled Ad"}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-full">{ad.description || "No description"}</p>
                        <div className="flex items-center mt-2 space-x-2">
                          <span className={`flex items-center text-xs ${
                            new Date() >= new Date(ad.startDate) && new Date() <= new Date(ad.endDate) && ad.isActive
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}>
                            <span className={`w-2 h-2 rounded-full mr-1 ${
                              new Date() >= new Date(ad.startDate) && new Date() <= new Date(ad.endDate) && ad.isActive
                                ? 'bg-green-500'
                                : 'bg-red-500'
                            }`}></span>
                            <span>
                              {new Date() >= new Date(ad.startDate) && new Date() <= new Date(ad.endDate) && ad.isActive
                                ? 'Active'
                                : 'Inactive'}
                            </span>
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {ad.mediaType === 'image' ? <ImageIcon size={12} className="inline mr-1" /> : <VideoIcon size={12} className="inline mr-1" />}
                            {ad.mediaType}
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 flex flex-col items-end">
                        <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400" title="Impressions">
                          <Eye size={12} />
                          <span>{ad.impressions || 0}</span>
                        </div>
                        <div className="flex items-center gap-1 text-green-600 dark:text-green-400 mt-1" title="Clicks">
                          <span>👆</span>
                          <span>{ad.clicks || 0}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex justify-between">
                      <span>
                        <Calendar size={12} className="inline mr-1" />
                        {format(new Date(ad.startDate), 'MMM d')} - {format(new Date(ad.endDate), 'MMM d, yyyy')}
                      </span>
                      <span>
                        <ChevronRight size={14} className="text-gray-400" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
                  <ImageIcon size={24} className="text-gray-500" />
                </div>
                <p className="text-gray-600 dark:text-gray-400">No advertisements found.</p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Create one to get started.</p>
                <button
                  onClick={handleCreateNew}
                  className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md font-medium transition-colors text-sm"
                >
                  Create First Ad
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Form or preview */}
        <div className="lg:col-span-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                {selectedAd ? (
                  <>
                    <Edit size={18} className="text-purple-500" />
                    <span>Edit: {selectedAd.title || "Untitled Ad"}</span>
                  </>
                ) : (
                  <>
                    <Plus size={18} className="text-purple-500" />
                    <span>Create New Advertisement</span>
                  </>
                )}
              </h3>
              <div className="flex space-x-3">
                {selectedAd && (
                  <button
                    onClick={() => handleDelete(selectedAd.id)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 rounded-full transition-colors"
                  >
                    <Trash2 size={16} />
                    <span>Delete</span>
                  </button>
                )}
                <button
                  onClick={() => setIsPreviewMode(!isPreviewMode)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full transition-colors ${
                    isPreviewMode 
                      ? 'bg-purple-100 text-purple-600 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50' 
                      : 'bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50'
                  }`}
                >
                  {isPreviewMode ? (
                    <>
                      <Edit size={16} />
                      <span>Edit</span>
                    </>
                  ) : (
                    <>
                      <Eye size={16} />
                      <span>Preview</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          
          {isPreviewMode ? (
            <PreviewComponent />
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  {/* Content fields */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Title</label>
                    <input
                      {...register('title')}
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="Advertisement title"
                    />
                    {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <textarea
                      {...register('description')}
                      className="w-full px-3 py-2 border rounded-md h-24 resize-none"
                      placeholder="Advertisement description"
                    />
                    {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Media Type</label>
                    <select
                      {...register('mediaType')}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="image">Image</option>
                      <option value="video">Video</option>
                    </select>
                  </div>
                  
                  {formValues.mediaType === 'image' ? (
                    <div>
                      <div className="mb-4">
                        <label className="block text-sm font-medium mb-1">Image URL (External)</label>
                        <input
                          {...register('imageUrl')}
                          className="w-full px-3 py-2 border rounded-md"
                          placeholder="https://example.com/image.jpg"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Enter an external URL or upload an image below
                        </p>
                      </div>
                      
                      <div className="mb-2">
                        <p className="text-sm font-medium mb-1">OR Upload Image</p>
                      </div>
                      
                      <FileUpload
                        onFileSelect={(file) => console.log('Image file selected:', file)}
                        onUploadComplete={(url) => {
                          // Update the form with the new image URL
                          const imageField = register('imageUrl');
                          imageField.onChange({ target: { value: url || '', name: 'imageUrl' } });
                        }}
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        label="Advertisement Image"
                        currentUrl={formValues.imageUrl || ''}
                        type="image"
                        uploadType="advertisement"
                      />
                      {errors.imageUrl && <p className="text-red-500 text-xs mt-1">{errors.imageUrl.message}</p>}
                    </div>
                  ) : (
                    <div>
                      <div className="mb-4">
                        <label className="block text-sm font-medium mb-1">Video URL (External)</label>
                        <input
                          {...register('videoUrl')}
                          className="w-full px-3 py-2 border rounded-md"
                          placeholder="https://example.com/video.mp4"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Enter an external URL or upload a video below
                        </p>
                      </div>
                      
                      <div className="mb-2">
                        <p className="text-sm font-medium mb-1">OR Upload Video</p>
                      </div>
                      
                      <FileUpload
                        onFileSelect={(file) => console.log('Video file selected:', file)}
                        onUploadComplete={(url) => {
                          // Update the form with the new video URL
                          const videoField = register('videoUrl');
                          videoField.onChange({ target: { value: url || '', name: 'videoUrl' } });
                        }}
                        accept="video/mp4,video/webm,video/ogg"
                        label="Advertisement Video"
                        currentUrl={formValues.videoUrl || ''}
                        type="video"
                        uploadType="advertisement"
                      />
                      
                      <div className="mt-5 border-t pt-5">
                        <label className="block text-sm font-medium mb-1">Thumbnail Image URL (External)</label>
                        <input
                          {...register('imageUrl')}
                          className="w-full px-3 py-2 border rounded-md"
                          placeholder="https://example.com/thumbnail.jpg"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Enter an external URL or upload a thumbnail below
                        </p>
                        
                        <div className="mb-2 mt-4">
                          <p className="text-sm font-medium mb-1">OR Upload Thumbnail</p>
                        </div>
                        
                        <FileUpload
                          onFileSelect={(file) => console.log('Thumbnail file selected:', file)}
                          onUploadComplete={(url) => {
                            // Update the form with the new thumbnail URL
                            const imageField = register('imageUrl');
                            imageField.onChange({ target: { value: url || '', name: 'imageUrl' } });
                          }}
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          label="Video Thumbnail Image"
                          currentUrl={formValues.imageUrl || ''}
                          type="image"
                          uploadType="advertisement"
                        />
                        {errors.imageUrl && <p className="text-red-500 text-xs mt-1">{errors.imageUrl.message}</p>}
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Start Date</label>
                      <input
                        type="date"
                        {...register('startDate')}
                        className="w-full px-3 py-2 border rounded-md"
                      />
                      {errors.startDate && <p className="text-red-500 text-xs mt-1">{errors.startDate.message}</p>}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">End Date</label>
                      <input
                        type="date"
                        {...register('endDate')}
                        className="w-full px-3 py-2 border rounded-md"
                      />
                      {errors.endDate && <p className="text-red-500 text-xs mt-1">{errors.endDate.message}</p>}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {/* Button and styling fields */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Button Text</label>
                    <input
                      {...register('buttonText')}
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="Learn More"
                    />
                    {errors.buttonText && <p className="text-red-500 text-xs mt-1">{errors.buttonText.message}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Button Link</label>
                    <input
                      {...register('buttonLink')}
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="https://example.com or /characters/123"
                    />
                    {errors.buttonLink && <p className="text-red-500 text-xs mt-1">{errors.buttonLink.message}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Button Style</label>
                    <select
                      {...register('buttonStyle')}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="primary">Primary</option>
                      <option value="secondary">Secondary</option>
                      <option value="outline">Outline</option>
                      <option value="default">Default</option>
                    </select>
                    {errors.buttonStyle && <p className="text-red-500 text-xs mt-1">{errors.buttonStyle.message}</p>}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Background Color</label>
                      <div className="flex space-x-2">
                        <input
                          type="color"
                          {...register('backgroundColor')}
                          className="w-10 h-10 rounded-md cursor-pointer"
                        />
                        <input
                          {...register('backgroundColor')}
                          className="flex-1 px-3 py-2 border rounded-md"
                          placeholder="#8B5CF6"
                        />
                      </div>
                      {errors.backgroundColor && <p className="text-red-500 text-xs mt-1">{errors.backgroundColor.message}</p>}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Text Color</label>
                      <div className="flex space-x-2">
                        <input
                          type="color"
                          {...register('textColor')}
                          className="w-10 h-10 rounded-md cursor-pointer"
                        />
                        <input
                          {...register('textColor')}
                          className="flex-1 px-3 py-2 border rounded-md"
                          placeholder="#FFFFFF"
                        />
                      </div>
                      {errors.textColor && <p className="text-red-500 text-xs mt-1">{errors.textColor.message}</p>}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Animation Type</label>
                      <select
                        {...register('animationType')}
                        className="w-full px-3 py-2 border rounded-md"
                      >
                        <option value="fade">Fade</option>
                        <option value="slide">Slide</option>
                        <option value="zoom">Zoom</option>
                      </select>
                      {errors.animationType && <p className="text-red-500 text-xs mt-1">{errors.animationType.message}</p>}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Position</label>
                      <input
                        type="number"
                        {...register('position', { valueAsNumber: true })}
                        className="w-full px-3 py-2 border rounded-md"
                        placeholder="0"
                        min="0"
                      />
                      {errors.position && <p className="text-red-500 text-xs mt-1">{errors.position.message}</p>}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="sticky bottom-0 bg-white dark:bg-gray-800 pt-6 pb-2 border-t mt-8 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedAd) {
                      setSelectedAd(null);
                      reset(defaultValues);
                    } else {
                      reset(defaultValues);
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <RotateCcw size={16} />
                  <span>Reset</span>
                </button>
                
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsPreviewMode(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors"
                  >
                    <Eye size={16} />
                    <span>Preview</span>
                  </button>
                  
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-full font-medium transition-colors shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {createMutation.isPending || updateMutation.isPending ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        <span>{selectedAd ? 'Update Ad' : 'Create Ad'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
          
          {/* Performance metrics for selected ad */}
          {selectedAd && metrics && (
            <div className="mt-8 border-t pt-4">
              <h3 className="text-xl font-semibold mb-4">Performance Metrics</h3>
              
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Impressions</p>
                  <p className="text-2xl font-bold">{selectedAd && selectedAd.impressions ? selectedAd.impressions : 0}</p>
                </div>
                
                <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-900/20">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Clicks</p>
                  <p className="text-2xl font-bold">{selectedAd && selectedAd.clicks ? selectedAd.clicks : 0}</p>
                </div>
                
                <div className="border rounded-lg p-4 bg-purple-50 dark:bg-purple-900/20">
                  <p className="text-sm text-gray-500 dark:text-gray-400">CTR</p>
                  <p className="text-2xl font-bold">
                    {selectedAd && selectedAd.impressions && selectedAd.impressions > 0 
                      ? (((selectedAd.clicks || 0) / selectedAd.impressions) * 100).toFixed(2) 
                      : "0.00"}%
                  </p>
                </div>
              </div>
              
              {metrics && metrics.metrics && Array.isArray(metrics.metrics) && metrics.metrics.length > 0 && (
                <div>
                  <h4 className="text-lg font-medium mb-2">Recent Activity</h4>
                  <div className="max-h-40 overflow-y-auto border rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Action</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Device</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Time</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                        {metrics.metrics.slice(0, 10).map((metric: any) => (
                          <tr key={metric.id}>
                            <td className="px-4 py-2 whitespace-nowrap text-sm">
                              {metric.action === 'click' ? '👆 Click' : '👁️ Impression'}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {metric.deviceType || 'Unknown'}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {format(new Date(metric.timestamp), 'MMM d, h:mm a')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};