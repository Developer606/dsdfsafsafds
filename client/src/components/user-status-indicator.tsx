import React from 'react';
import { useUserStatus } from '@/hooks/use-user-status';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface UserStatusIndicatorProps {
  userId: number;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export function UserStatusIndicator({ 
  userId, 
  size = 'md', 
  showText = false, 
  className 
}: UserStatusIndicatorProps) {
  const { isOnline, lastActiveFormatted, isLoading } = useUserStatus(userId);
  
  // Size mappings
  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3',
    lg: 'h-4 w-4'
  };
  
  if (isLoading) {
    return null; // Don't show anything while loading
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("flex items-center gap-2", className)}>
            <div className={cn(
              "rounded-full", 
              sizeClasses[size],
              isOnline 
                ? "bg-green-500 animate-pulse" 
                : "bg-gray-400"
            )} />
            
            <span className={cn(
              "text-xs",
              isOnline
                ? "text-green-500 dark:text-green-400"
                : "text-gray-500 dark:text-gray-400"
            )}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {isOnline 
            ? 'User is currently online' 
            : `Last active: ${lastActiveFormatted}`}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}