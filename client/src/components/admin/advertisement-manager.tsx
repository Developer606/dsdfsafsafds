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
import { PlusCircle, Edit, Trash2, BarChart, Eye, EyeOff, CircleCheck, Folder, Image, Video, Calendar, Layout, Paintbrush, LayoutGrid, Layers, Check, Info, Upload, CalendarDays, Upload as UploadIcon, Link2 } from 'lucide-react';

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
      <div className="flex justify-between items-center bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
        <div className="flex items-center space-x-2">
          <LayoutGrid className="h-6 w-6 text-purple-500" />
          <h2 className="text-2xl font-bold">Advertisement Manager</h2>
        </div>
        <button
          onClick={handleCreateNew}
          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md flex items-center space-x-2 shadow-sm transition-all hover:shadow"
        >
          <PlusCircle className="h-5 w-5" />
          <span>Create New</span>
        </button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Advertisement list panel */}
        <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center space-x-2 mb-4">
            <Folder className="h-5 w-5 text-blue-500" />
            <h3 className="text-xl font-semibold">Your Advertisements</h3>
          </div>
          
          {isLoadingAds ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              ))}
            </div>
          ) : advertisements && advertisements.length > 0 ? (
            <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-2 custom-scrollbar">
              {advertisements.map((ad: Advertisement) => (
                <div
                  key={ad.id}
                  className={`border rounded-lg p-4 cursor-pointer hover:border-blue-500 transition-all hover:shadow-md ${
                    selectedAd?.id === ad.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md' : 'bg-white dark:bg-gray-900'
                  }`}
                  onClick={() => handleEdit(ad)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-base">{ad.title || "Untitled Advertisement"}</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[200px]">{ad.description || "No description"}</p>
                      <div className="flex items-center mt-2 text-xs">
                        <span className={`w-2 h-2 rounded-full mr-1 ${
                          new Date() >= new Date(ad.startDate) && new Date() <= new Date(ad.endDate) && ad.isActive
                            ? 'bg-green-500'
                            : 'bg-red-500'
                        }`}></span>
                        <span className={`${
                          new Date() >= new Date(ad.startDate) && new Date() <= new Date(ad.endDate) && ad.isActive
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        } font-medium`}>
                          {new Date() >= new Date(ad.startDate) && new Date() <= new Date(ad.endDate) && ad.isActive
                            ? 'Active'
                            : 'Inactive'}
                        </span>
                        <span className="mx-2 text-gray-400">•</span>
                        <span className="text-gray-500 dark:text-gray-400">
                          {ad.mediaType === 'image' ? <Image className="inline-block w-3 h-3 mr-1" /> : <Video className="inline-block w-3 h-3 mr-1" />}
                          {ad.mediaType}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs bg-gray-100 dark:bg-gray-800 rounded-lg p-2">
                      <div className="flex items-center mb-1 text-gray-700 dark:text-gray-300">
                        <Eye className="w-3 h-3 mr-1" /> 
                        <span>{ad.impressions || 0} views</span>
                      </div>
                      <div className="flex items-center text-gray-700 dark:text-gray-300">
                        <BarChart className="w-3 h-3 mr-1" /> 
                        <span>{ad.clicks || 0} clicks</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
              <Layout className="h-12 w-12 text-gray-400 mb-3" />
              <p className="text-gray-500 dark:text-gray-400 mb-2">No advertisements found</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm">Create your first advertisement to get started</p>
            </div>
          )}
        </div>
        
        {/* Form or preview panel */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5 border border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-center mb-4 pb-3 border-b dark:border-gray-700">
            <div className="flex items-center space-x-2">
              {selectedAd ? (
                <Edit className="h-5 w-5 text-amber-500" />
              ) : (
                <PlusCircle className="h-5 w-5 text-green-500" />
              )}
              <h3 className="text-xl font-semibold">
                {selectedAd ? `Edit: ${selectedAd.title || "Untitled Advertisement"}` : 'Create New Advertisement'}
              </h3>
            </div>
            <div className="flex space-x-2">
              {selectedAd && (
                <button
                  onClick={() => handleDelete(selectedAd.id)}
                  className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md flex items-center space-x-1 transition-all"
                  title="Delete advertisement"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete</span>
                </button>
              )}
              <button
                onClick={() => setIsPreviewMode(!isPreviewMode)}
                className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md flex items-center space-x-1 transition-all"
                title={isPreviewMode ? "Switch to edit mode" : "Preview advertisement"}
              >
                {isPreviewMode ? (
                  <>
                    <Edit className="h-4 w-4" />
                    <span>Edit</span>
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" />
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
                  {/* Content fields section */}
                  <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center space-x-2 mb-3 text-blue-600 dark:text-blue-400 pb-2 border-b border-gray-200 dark:border-gray-700">
                      <Layers className="h-4 w-4" />
                      <h4 className="font-medium">Content Information</h4>
                    </div>
                  
                    <div className="mb-4">
                      <label className="flex items-center text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                        <span className="mr-1">Title</span>
                        <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          {...register('title')}
                          className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          placeholder="Enter advertisement title"
                        />
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                          <Edit className="h-4 w-4" />
                        </div>
                      </div>
                      {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
                    </div>
                    
                    <div className="mb-4">
                      <label className="flex items-center text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                        <span className="mr-1">Description</span>
                        <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <textarea
                          {...register('description')}
                          className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 h-24 resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          placeholder="Enter advertisement description"
                        />
                        <div className="absolute left-3 top-3 text-gray-500">
                          <Layout className="h-4 w-4" />
                        </div>
                      </div>
                      {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
                    </div>
                    
                    <div className="mb-2">
                      <label className="flex items-center text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                        <span className="mr-1">Media Type</span>
                        <span className="text-red-500">*</span>
                      </label>
                      <div className="flex space-x-2">
                        <label className={`flex items-center p-3 border rounded-md cursor-pointer transition-all ${
                          formValues.mediaType === 'image' 
                            ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800' 
                            : 'bg-white border-gray-300 dark:bg-gray-800 dark:border-gray-700'
                        } flex-1`}>
                          <input
                            type="radio"
                            value="image"
                            {...register('mediaType')}
                            className="sr-only"
                          />
                          <Image className={`h-4 w-4 mr-2 ${formValues.mediaType === 'image' ? 'text-blue-500' : 'text-gray-500'}`} />
                          <span className={formValues.mediaType === 'image' ? 'font-medium text-blue-700 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}>Image</span>
                          {formValues.mediaType === 'image' && <Check className="h-4 w-4 text-blue-500 ml-auto" />}
                        </label>
                        
                        <label className={`flex items-center p-3 border rounded-md cursor-pointer transition-all ${
                          formValues.mediaType === 'video' 
                            ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800' 
                            : 'bg-white border-gray-300 dark:bg-gray-800 dark:border-gray-700'
                        } flex-1`}>
                          <input
                            type="radio"
                            value="video"
                            {...register('mediaType')}
                            className="sr-only"
                          />
                          <Video className={`h-4 w-4 mr-2 ${formValues.mediaType === 'video' ? 'text-blue-500' : 'text-gray-500'}`} />
                          <span className={formValues.mediaType === 'video' ? 'font-medium text-blue-700 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}>Video</span>
                          {formValues.mediaType === 'video' && <Check className="h-4 w-4 text-blue-500 ml-auto" />}
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  {/* Media upload section */}
                  <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center space-x-2 mb-3 text-purple-600 dark:text-purple-400 pb-2 border-b border-gray-200 dark:border-gray-700">
                      {formValues.mediaType === 'image' ? (
                        <Image className="h-4 w-4" />
                      ) : (
                        <Video className="h-4 w-4" />
                      )}
                      <h4 className="font-medium">{formValues.mediaType === 'image' ? 'Image Upload' : 'Video Upload'}</h4>
                    </div>
                  
                    {formValues.mediaType === 'image' ? (
                      <div>
                        <div className="mb-4">
                          <label className="flex items-center text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                            <span>Image URL (External)</span>
                          </label>
                          <div className="relative">
                            <input
                              {...register('imageUrl')}
                              className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                              placeholder="https://example.com/image.jpg"
                            />
                            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                              <Image className="h-4 w-4" />
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1 flex items-center">
                            <Info className="h-3 w-3 mr-1" />
                            Enter an external URL or upload an image below
                          </p>
                        </div>
                        
                        <div className="mb-2">
                          <p className="inline-flex items-center text-sm font-medium px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded">
                            <Upload className="h-3 w-3 mr-1" />
                            OR Upload Image
                          </p>
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
                          <label className="flex items-center text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                            <span>Video URL (External)</span>
                          </label>
                          <div className="relative">
                            <input
                              {...register('videoUrl')}
                              className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                              placeholder="https://example.com/video.mp4 or YouTube URL"
                            />
                            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                              <Video className="h-4 w-4" />
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1 flex items-center">
                            <Info className="h-3 w-3 mr-1" />
                            YouTube, Vimeo or direct video URL
                          </p>
                        </div>
                        
                        <div className="mb-2">
                          <p className="inline-flex items-center text-sm font-medium px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded">
                            <Upload className="h-3 w-3 mr-1" />
                            OR Upload Video
                          </p>
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
                        
                        <div className="mt-5 pt-5 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex items-center space-x-2 mb-3">
                            <Image className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                            <h4 className="font-medium text-purple-600 dark:text-purple-400">Thumbnail Image</h4>
                          </div>
                          
                          <div className="mb-4">
                            <label className="flex items-center text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                              <span>Thumbnail URL (External)</span>
                            </label>
                            <div className="relative">
                              <input
                                {...register('imageUrl')}
                                className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                                placeholder="https://example.com/thumbnail.jpg"
                              />
                              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                                <Image className="h-4 w-4" />
                              </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1 flex items-center">
                              <Info className="h-3 w-3 mr-1" />
                              Used as poster for video when not playing
                            </p>
                          </div>
                          
                          <div className="mb-2">
                            <p className="inline-flex items-center text-sm font-medium px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded">
                              <Upload className="h-3 w-3 mr-1" />
                              OR Upload Thumbnail
                            </p>
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
                  </div>
                  
                  {/* Schedule section */}
                  <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center space-x-2 mb-3 text-green-600 dark:text-green-400 pb-2 border-b border-gray-200 dark:border-gray-700">
                      <CalendarDays className="h-4 w-4" />
                      <h4 className="font-medium">Ad Schedule</h4>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="flex items-center text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                          <span>Start Date</span>
                          <span className="text-red-500 ml-1">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="date"
                            {...register('startDate')}
                            className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                          />
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                            <Calendar className="h-4 w-4" />
                          </div>
                        </div>
                        {errors.startDate && <p className="text-red-500 text-xs mt-1">{errors.startDate.message}</p>}
                      </div>
                      
                      <div>
                        <label className="flex items-center text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                          <span>End Date</span>
                          <span className="text-red-500 ml-1">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="date"
                            {...register('endDate')}
                            className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                          />
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                            <Calendar className="h-4 w-4" />
                          </div>
                        </div>
                        {errors.endDate && <p className="text-red-500 text-xs mt-1">{errors.endDate.message}</p>}
                      </div>
                    </div>
                    
                    <div className="mt-2 text-xs text-gray-500 bg-green-50 dark:bg-green-900/20 p-2 rounded border border-green-100 dark:border-green-900/30 flex items-start">
                      <CalendarDays className="h-3 w-3 text-green-500 mt-0.5 mr-1 flex-shrink-0" />
                      <span>
                        Advertisement will be active between these dates if toggled on. You can schedule ads in advance.
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {/* Button settings section */}
                  <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center space-x-2 mb-3 text-amber-600 dark:text-amber-400 pb-2 border-b border-gray-200 dark:border-gray-700">
                      <Link2 className="h-4 w-4" />
                      <h4 className="font-medium">Button & Link Settings</h4>
                    </div>
                    
                    <div className="mb-4">
                      <label className="flex items-center text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                        <span>Button Text</span>
                      </label>
                      <div className="relative">
                        <input
                          {...register('buttonText')}
                          className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                          placeholder="Learn More"
                        />
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                          <Edit className="h-4 w-4" />
                        </div>
                      </div>
                      {errors.buttonText && <p className="text-red-500 text-xs mt-1">{errors.buttonText.message}</p>}
                    </div>
                    
                    <div className="mb-4">
                      <label className="flex items-center text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                        <span>Button Link</span>
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                      <div className="relative">
                        <input
                          {...register('buttonLink')}
                          className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                          placeholder="https://example.com or /characters/123"
                        />
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                          <Link2 className="h-4 w-4" />
                        </div>
                      </div>
                      {errors.buttonLink && <p className="text-red-500 text-xs mt-1">{errors.buttonLink.message}</p>}
                    </div>
                    
                    <div>
                      <label className="flex items-center text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                        <span>Button Style</span>
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {['primary', 'secondary', 'outline', 'default'].map((style) => (
                          <label key={style} className={`flex flex-col items-center border p-2 rounded-md cursor-pointer transition-all ${
                            formValues.buttonStyle === style 
                              ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/30' 
                              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                          }`}>
                            <input
                              type="radio"
                              value={style}
                              {...register('buttonStyle')}
                              className="sr-only"
                            />
                            <div className={`h-8 w-full mb-1 rounded flex items-center justify-center ${
                              style === 'primary' ? 'bg-purple-500 text-white' :
                              style === 'secondary' ? 'bg-pink-500 text-white' :
                              style === 'outline' ? 'border border-purple-500 text-purple-500' :
                              'bg-gray-200 text-gray-700'
                            }`}>
                              <span className="text-xs">Button</span>
                            </div>
                            <span className="text-xs capitalize">{style}</span>
                            {formValues.buttonStyle === style && <Check className="h-3 w-3 text-amber-500 mt-1" />}
                          </label>
                        ))}
                      </div>
                      {errors.buttonStyle && <p className="text-red-500 text-xs mt-1">{errors.buttonStyle.message}</p>}
                    </div>
                  </div>
                  
                  {/* Styling section */}
                  <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center space-x-2 mb-3 text-purple-600 dark:text-purple-400 pb-2 border-b border-gray-200 dark:border-gray-700">
                      <Paintbrush className="h-4 w-4" />
                      <h4 className="font-medium">Visual Styling</h4>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="flex items-center text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                          <span>Background Color</span>
                        </label>
                        <div className="flex space-x-2">
                          <input
                            type="color"
                            {...register('backgroundColor')}
                            className="w-10 h-10 rounded-md cursor-pointer border border-gray-300 dark:border-gray-700"
                          />
                          <div className="relative flex-1">
                            <input
                              {...register('backgroundColor')}
                              className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                              placeholder="#8B5CF6"
                            />
                            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                              <span className="text-xs">#</span>
                            </div>
                          </div>
                        </div>
                        {errors.backgroundColor && <p className="text-red-500 text-xs mt-1">{errors.backgroundColor.message}</p>}
                      </div>
                      
                      <div>
                        <label className="flex items-center text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                          <span>Text Color</span>
                        </label>
                        <div className="flex space-x-2">
                          <input
                            type="color"
                            {...register('textColor')}
                            className="w-10 h-10 rounded-md cursor-pointer border border-gray-300 dark:border-gray-700"
                          />
                          <div className="relative flex-1">
                            <input
                              {...register('textColor')}
                              className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                              placeholder="#FFFFFF"
                            />
                            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                              <span className="text-xs">#</span>
                            </div>
                          </div>
                        </div>
                        {errors.textColor && <p className="text-red-500 text-xs mt-1">{errors.textColor.message}</p>}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="flex items-center text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                          <span>Animation Type</span>
                        </label>
                        <div className="relative">
                          <select
                            {...register('animationType')}
                            className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors appearance-none"
                          >
                            <option value="fade">Fade</option>
                            <option value="slide">Slide</option>
                            <option value="zoom">Zoom</option>
                          </select>
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                            <LayoutGrid className="h-4 w-4" />
                          </div>
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                            <svg className="h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                        {errors.animationType && <p className="text-red-500 text-xs mt-1">{errors.animationType.message}</p>}
                      </div>
                      
                      <div>
                        <label className="flex items-center text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                          <span>Display Position</span>
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            {...register('position', { valueAsNumber: true })}
                            className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                            placeholder="0"
                            min="0"
                          />
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                            <Layers className="h-4 w-4" />
                          </div>
                        </div>
                        {errors.position && <p className="text-red-500 text-xs mt-1">{errors.position.message}</p>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-6 border-t dark:border-gray-700">
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
                  className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center space-x-2 text-gray-700 dark:text-gray-300"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>Cancel</span>
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2.5 rounded-md flex items-center space-x-2 transition-all ${
                    createMutation.isPending || updateMutation.isPending
                      ? 'bg-gray-400 text-gray-100 cursor-not-allowed'
                      : selectedAd
                      ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-md hover:shadow-lg'
                      : 'bg-blue-500 hover:bg-blue-600 text-white shadow-md hover:shadow-lg'
                  }`}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Saving...</span>
                    </>
                  ) : selectedAd ? (
                    <>
                      <Edit className="h-4 w-4" />
                      <span>Update Advertisement</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle className="h-4 w-4" />
                      <span>Create Advertisement</span>
                    </>
                  )}
                </button>
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