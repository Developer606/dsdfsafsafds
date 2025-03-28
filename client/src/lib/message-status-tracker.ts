import { useState, useEffect } from 'react';

interface MessageStatus {
  messageId: number;
  status: "sent" | "delivered" | "read";
  timestamp: number;
}

/**
 * Hook to track message status changes for animation purposes
 * @returns An object with methods to track and check message status changes
 */
export function useMessageStatusTracker() {
  // Track status changes with timestamps
  const [statusChanges, setStatusChanges] = useState<Map<number, MessageStatus>>(new Map());
  
  // Track previously rendered statuses to detect changes
  const [prevStatuses, setPrevStatuses] = useState<Map<number, string>>(new Map());
  
  // Clear old status changes after a certain time
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      const newStatusChanges = new Map(statusChanges);
      
      // Remove status changes older than 2 seconds
      Array.from(newStatusChanges.entries()).forEach(([messageId, status]) => {
        if (now - status.timestamp > 2000) {
          newStatusChanges.delete(messageId);
        }
      });
      
      setStatusChanges(newStatusChanges);
    }, 2000);
    
    return () => clearInterval(cleanup);
  }, [statusChanges]);
  
  /**
   * Track a message status change
   * @param messageId The ID of the message
   * @param status The new status of the message
   */
  const trackStatusChange = (messageId: number, status: "sent" | "delivered" | "read") => {
    // Check if this is a new status
    const prevStatus = prevStatuses.get(messageId);
    
    // Only track if status actually changed
    if (prevStatus !== status) {
      // Update previous statuses map
      setPrevStatuses(new Map(prevStatuses.set(messageId, status)));
      
      // Record the status change with timestamp
      setStatusChanges(new Map(statusChanges.set(messageId, {
        messageId,
        status,
        timestamp: Date.now()
      })));
    }
  };
  
  /**
   * Check if a message should animate its status
   * @param messageId The ID of the message
   * @returns Boolean indicating if status changed recently
   */
  const shouldAnimateStatus = (messageId: number): boolean => {
    return statusChanges.has(messageId);
  };
  
  return {
    trackStatusChange,
    shouldAnimateStatus
  };
}