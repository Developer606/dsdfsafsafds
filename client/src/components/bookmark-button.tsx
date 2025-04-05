import { useState } from 'react';
import { Bookmark, BookmarkCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface BookmarkButtonProps {
  contentType: 'manga' | 'book' | 'news';
  contentId: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'ghost' | 'outline' | 'secondary';
  showText?: boolean;
}

export function BookmarkButton({
  contentType,
  contentId,
  title,
  description = '',
  thumbnailUrl = '',
  size = 'md',
  variant = 'ghost',
  showText = false
}: BookmarkButtonProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isHovered, setIsHovered] = useState(false);
  
  // Size mappings
  const sizeClasses = {
    sm: 'h-7 w-7',
    md: 'h-9 w-9',
    lg: 'h-11 w-11'
  };
  
  // Check if this content is already bookmarked
  const { data, isLoading: isCheckingBookmark } = useQuery({
    queryKey: ['/api/bookmarks/check', contentType, contentId],
    queryFn: async () => {
      const response = await fetch(`/api/bookmarks/check/${contentType}/${contentId}`);
      if (!response.ok) {
        // If not authenticated, just return false
        if (response.status === 401) {
          return { isBookmarked: false };
        }
        throw new Error('Failed to check bookmark status');
      }
      return response.json();
    },
    // We want graceful error handling for unauthenticated users
    retry: false,
    refetchOnWindowFocus: false
  });
  
  const isBookmarked = data?.isBookmarked || false;
  
  // Mutation for adding a bookmark
  const addBookmarkMutation = useMutation({
    mutationFn: () => {
      return apiRequest('/api/bookmarks', 'POST', {
        contentType,
        contentId,
        title,
        description,
        thumbnailUrl
      });
    },
    onSuccess: () => {
      toast({
        title: 'Bookmarked!',
        description: `Added ${title} to your bookmarks.`,
        variant: 'default'
      });
      
      // Invalidate queries to refresh bookmark data
      queryClient.invalidateQueries({ queryKey: ['/api/bookmarks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bookmarks/check', contentType, contentId] });
    },
    onError: (error) => {
      // If user not authenticated, prompt to log in
      if (error.message.includes('401')) {
        toast({
          title: 'Authentication Required',
          description: 'Please log in to bookmark items.',
          variant: 'destructive'
        });
        return;
      }
      
      // Handle conflict (already bookmarked)
      if (error.message.includes('409')) {
        toast({
          title: 'Already Bookmarked',
          description: 'This item is already in your bookmarks.',
          variant: 'default'
        });
        // Refresh status since it's already bookmarked
        queryClient.invalidateQueries({ queryKey: ['/api/bookmarks/check', contentType, contentId] });
        return;
      }
      
      toast({
        title: 'Error',
        description: 'Failed to add bookmark. Please try again.',
        variant: 'destructive'
      });
    }
  });
  
  // Mutation for removing a bookmark
  const removeBookmarkMutation = useMutation({
    mutationFn: async () => {
      // First need to get the bookmark ID
      const response = await fetch('/api/bookmarks');
      if (!response.ok) {
        throw new Error('Failed to fetch bookmarks');
      }
      
      const bookmarks = await response.json();
      const bookmark = bookmarks.find(
        (b: any) => b.contentType === contentType && b.contentId === contentId
      );
      
      if (!bookmark) {
        throw new Error('Bookmark not found');
      }
      
      // Now delete the bookmark
      return apiRequest(`/api/bookmarks/${bookmark.id}`, 'DELETE');
    },
    onSuccess: () => {
      toast({
        title: 'Removed',
        description: `Removed ${title} from your bookmarks.`,
        variant: 'default'
      });
      
      // Invalidate queries to refresh bookmark data
      queryClient.invalidateQueries({ queryKey: ['/api/bookmarks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bookmarks/check', contentType, contentId] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to remove bookmark. Please try again.',
        variant: 'destructive'
      });
    }
  });
  
  const isLoading = isCheckingBookmark || 
                    addBookmarkMutation.isPending || 
                    removeBookmarkMutation.isPending;
  
  const handleClick = () => {
    if (isLoading) return;
    
    if (isBookmarked) {
      removeBookmarkMutation.mutate();
    } else {
      addBookmarkMutation.mutate();
    }
  };
  
  return (
    <Button
      onClick={handleClick}
      variant={variant}
      size={showText ? undefined : "icon"}
      className={`group ${showText ? '' : sizeClasses[size]}`}
      disabled={isLoading}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          {isBookmarked ? (
            <BookmarkCheck className={`${showText ? 'mr-2' : ''} h-4 w-4 text-purple-500 transition-colors`} />
          ) : (
            <Bookmark className={`${showText ? 'mr-2' : ''} h-4 w-4 group-hover:text-purple-500 transition-colors`} />
          )}
          {showText && (isBookmarked ? "Bookmarked" : "Bookmark")}
        </>
      )}
    </Button>
  );
}