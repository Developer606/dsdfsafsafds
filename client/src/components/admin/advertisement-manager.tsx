import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { insertAdvertisementSchema } from '@shared/schema';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
import type { Advertisement } from '@shared/schema';

// Extend the schema for form validation
const formSchema = insertAdvertisementSchema.extend({
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
});

type FormData = z.infer<typeof formSchema>;

export const AdvertisementManager: React.FC = () => {
  const [selectedAd, setSelectedAd] = useState<Advertisement | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  
  const queryClient = useQueryClient();
  
  // Default values for the form
  const defaultValues = {
    title: '',
    description: '',
    imageUrl: '',
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
      startDate: format(new Date(selectedAd.startDate), 'yyyy-MM-dd'),
      endDate: format(new Date(selectedAd.endDate), 'yyyy-MM-dd'),
    } : defaultValues,
  });
  
  // Watch form values for preview
  const formValues = watch();
  
  // Query to fetch all advertisements
  const { data: advertisements, isLoading: isLoadingAds } = useQuery({
    queryKey: ['/api/advertisements'],
    refetchInterval: 30000, // Refetch every 30 seconds
  });
  
  // Query to fetch metrics for selected advertisement
  const { data: metrics, isLoading: isLoadingMetrics } = useQuery({
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
      };
      
      return apiRequest('POST', '/api/advertisements', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/advertisements'] });
      reset(defaultValues);
      setSelectedAd(null);
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
      };
      
      return apiRequest('PUT', `/api/advertisements/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/advertisements'] });
    },
  });
  
  // Mutation to delete an advertisement
  const deleteMutation = useMutation({
    mutationFn: (id: number) => {
      return apiRequest('DELETE', `/api/advertisements/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/advertisements'] });
      setSelectedAd(null);
      reset(defaultValues);
    },
  });
  
  // Form submission handler
  const onSubmit = (data: FormData) => {
    if (selectedAd) {
      updateMutation.mutate({ ...data, id: selectedAd.id });
    } else {
      createMutation.mutate(data);
    }
  };
  
  // Handle editing an advertisement
  const handleEdit = (ad: Advertisement) => {
    setSelectedAd(ad);
    reset({
      ...ad,
      startDate: format(new Date(ad.startDate), 'yyyy-MM-dd'),
      endDate: format(new Date(ad.endDate), 'yyyy-MM-dd'),
    });
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
    // Create a preview object from form values
    const previewAd = {
      id: selectedAd?.id || 0,
      title: formValues.title,
      description: formValues.description,
      imageUrl: formValues.imageUrl,
      buttonText: formValues.buttonText,
      buttonLink: formValues.buttonLink,
      buttonStyle: formValues.buttonStyle,
      backgroundColor: formValues.backgroundColor,
      textColor: formValues.textColor,
      animationType: formValues.animationType,
      position: formValues.position || 0,
      startDate: new Date(formValues.startDate),
      endDate: new Date(formValues.endDate),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      impressions: selectedAd?.impressions || 0,
      clicks: selectedAd?.clicks || 0,
    };
    
    return (
      <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
        <h3 className="text-lg font-bold mb-4">Preview</h3>
        
        <div className="relative rounded-xl overflow-hidden shadow-lg mb-4" style={{ backgroundColor: previewAd.backgroundColor }}>
          <div className="relative">
            <div className="aspect-[3/2] rounded-t-xl overflow-hidden">
              {previewAd.imageUrl ? (
                <img
                  src={previewAd.imageUrl}
                  alt={previewAd.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center">
                  <p className="text-gray-500 dark:text-gray-400">No image URL provided</p>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            </div>
            
            <div className="absolute top-2 left-2">
              <div className="inline-block px-2 py-1 bg-pink-500/80 rounded-full text-xs text-white font-medium">
                Featured
              </div>
            </div>
          </div>
          
          <div className="p-4" style={{ color: previewAd.textColor }}>
            <h3 className="text-lg font-bold mb-1">{previewAd.title || 'No Title'}</h3>
            <p className="text-sm mb-4 opacity-90">{previewAd.description || 'No Description'}</p>
            
            <button
              className={`inline-block px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                previewAd.buttonStyle === 'primary' ? 'bg-pink-500 text-white hover:bg-pink-600' :
                previewAd.buttonStyle === 'secondary' ? 'bg-purple-500 text-white hover:bg-purple-600' :
                previewAd.buttonStyle === 'outline' ? 'border border-current hover:bg-white/10' :
                'bg-white text-gray-900 hover:bg-gray-100'
              }`}
            >
              {previewAd.buttonText}
            </button>
          </div>
        </div>
        
        <div className="text-sm text-gray-500 dark:text-gray-400">
          <p>Duration: {format(new Date(previewAd.startDate), 'MMM d, yyyy')} - {format(new Date(previewAd.endDate), 'MMM d, yyyy')}</p>
          <p>Animation: {previewAd.animationType}</p>
          <p>Position: {previewAd.position}</p>
        </div>
      </div>
    );
  };
  
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Advertisement Manager</h2>
        <button
          onClick={handleCreateNew}
          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md"
        >
          Create New
        </button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Advertisement list */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-xl font-semibold">Advertisements</h3>
          
          {isLoadingAds ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              ))}
            </div>
          ) : advertisements && advertisements.length > 0 ? (
            <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
              {advertisements.map((ad: Advertisement) => (
                <div
                  key={ad.id}
                  className={`border rounded-lg p-3 cursor-pointer hover:border-blue-500 transition-colors ${
                    selectedAd?.id === ad.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                  onClick={() => handleEdit(ad)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{ad.title}</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{ad.description}</p>
                      <div className="flex items-center mt-1 text-xs text-gray-500 dark:text-gray-400">
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
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      <div>👁️ {ad.impressions || 0}</div>
                      <div>👆 {ad.clicks || 0}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No advertisements found. Create one to get started.</p>
          )}
        </div>
        
        {/* Form or preview */}
        <div className="lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">
              {selectedAd ? `Edit: ${selectedAd.title}` : 'Create New Advertisement'}
            </h3>
            <div className="flex space-x-2">
              {selectedAd && (
                <button
                  onClick={() => handleDelete(selectedAd.id)}
                  className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-md"
                >
                  Delete
                </button>
              )}
              <button
                onClick={() => setIsPreviewMode(!isPreviewMode)}
                className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-md"
              >
                {isPreviewMode ? 'Edit' : 'Preview'}
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
                    <label className="block text-sm font-medium mb-1">Image URL</label>
                    <input
                      {...register('imageUrl')}
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="https://example.com/image.jpg"
                    />
                    {errors.imageUrl && <p className="text-red-500 text-xs mt-1">{errors.imageUrl.message}</p>}
                  </div>
                  
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
              
              <div className="flex justify-end space-x-2 pt-4">
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
                  className="px-4 py-2 border rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Saving...'
                    : selectedAd
                    ? 'Update'
                    : 'Create'}
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
                  <p className="text-2xl font-bold">{metrics.performance.impressions}</p>
                </div>
                
                <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-900/20">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Clicks</p>
                  <p className="text-2xl font-bold">{metrics.performance.clicks}</p>
                </div>
                
                <div className="border rounded-lg p-4 bg-purple-50 dark:bg-purple-900/20">
                  <p className="text-sm text-gray-500 dark:text-gray-400">CTR</p>
                  <p className="text-2xl font-bold">{metrics.performance.ctr.toFixed(2)}%</p>
                </div>
              </div>
              
              {metrics.metrics.length > 0 && (
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