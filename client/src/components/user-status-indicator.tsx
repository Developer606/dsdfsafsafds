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
  isAI?: boolean;
}

export function UserStatusIndicator({ 
  userId, 
  size = 'md', 
  showText = false, 
  className,
  isAI = false 
}: UserStatusIndicatorProps) {
  const { isOnline, lastActiveFormatted, isLoading } = useUserStatus(userId);
  
  // Size mappings
  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3',
    lg: 'h-4 w-4'
  };
  
  if (isLoading && !isAI) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="rounded-full bg-gray-300 dark:bg-gray-700 h-2 w-2" />
        <span className="text-xs text-gray-400 dark:text-gray-500">Loading...</span>
      </div>
    );
  }
  
  // AI characters are always considered online
  const showAsOnline = isAI || isOnline;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("flex items-center gap-2", className)}>
            <div className={cn(
              "rounded-full", 
              sizeClasses[size],
              showAsOnline
                ? "bg-green-500 animate-pulse" 
                : "bg-gray-400"
            )} />
            
            <span className={cn(
              "text-xs font-medium",
              showAsOnline
                ? "text-green-600 dark:text-green-500"
                : "text-gray-500 dark:text-gray-400"
            )}>
              {showAsOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {isAI 
            ? 'AI character is always online'
            : isOnline 
              ? 'User is currently online' 
              : `Last active: ${lastActiveFormatted}`}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}