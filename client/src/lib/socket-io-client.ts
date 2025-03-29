import { io, Socket } from 'socket.io-client';
import { queryClient } from './queryClient';

// Singleton to manage the socket connection
class SocketIOManager {
  private static instance: SocketIOManager;
  private socket: Socket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isConnecting: boolean = false;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  
  private constructor() {}
  
  public static getInstance(): SocketIOManager {
    if (!SocketIOManager.instance) {
      SocketIOManager.instance = new SocketIOManager();
    }
    return SocketIOManager.instance;
  }
  
  /**
   * Initialize and connect the socket
   * @returns The socket instance
   */
  public connect(): Socket {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }
    
    if (this.isConnecting) {
      return this.socket as Socket;
    }
    
    this.isConnecting = true;
    
    // Get JWT token from localStorage
    const token = localStorage.getItem('jwt_token');
    
    // Connect to the server with authentication
    // Using both websocket and polling for better fallback capability
    this.socket = io({
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      auth: {
        token
      }
    });
    
    console.log("Attempting Socket.IO connection with transports:", ['websocket', 'polling']);
    
    this.setupEventHandlers();
    
    return this.socket;
  }
  
  /**
   * Set up event handlers for socket events
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;
    
    this.socket.on('connect', () => {
      console.log('Connected to Socket.IO server');
      this.isConnecting = false;
      this.notifyListeners('connection_status', { connected: true });
      
      // Clear reconnect timer if it exists
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    });
    
    this.socket.on('disconnect', (reason) => {
      console.log(`Disconnected from Socket.IO server: ${reason}`);
      this.notifyListeners('connection_status', { connected: false });
      
      // If disconnected due to network issues, try to reconnect
      if (reason === 'io server disconnect' || reason === 'transport close') {
        this.attemptReconnect();
      }
    });
    
    this.socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
      this.isConnecting = false;
      this.notifyListeners('connection_error', { error: error.message });
      
      // Attempt to reconnect after delay
      this.attemptReconnect();
    });
    
    // Handle ping event to keep connection alive
    this.socket.on('ping', () => {
      this.socket?.emit('pong');
    });
    
    // Handle errors from the server
    this.socket.on('error', (error) => {
      console.error('Socket.IO server error:', error);
      
      // Show toast notification for specific errors
      if (error.code === 'CONVERSATION_BLOCKED') {
        // Use queryClient to refresh the messages - this will cause the UI to show the blocked state
        queryClient.invalidateQueries({ queryKey: ['/api/user-messages'] });
      }
      
      this.notifyListeners('server_error', error);
    });
    
    // Handle new messages
    this.socket.on('new_message', (data) => {
      console.log('Received new message:', data);
      this.notifyListeners('new_message', data);
      
      // Invalidate queries to refresh UI
      if (data.message) {
        // Invalidate conversation list
        queryClient.invalidateQueries({ queryKey: ['/api/user/conversations'] });
        
        // Invalidate specific conversation
        if (data.message.senderId) {
          queryClient.invalidateQueries({ 
            queryKey: ['/api/user-messages', data.message.senderId] 
          });
        }
        if (data.message.receiverId) {
          queryClient.invalidateQueries({ 
            queryKey: ['/api/user-messages', data.message.receiverId] 
          });
        }
      }
      
      // Auto mark as delivered if we're the receiver
      const currentUserId = this.getCurrentUserId();
      if (data.message && data.message.receiverId === currentUserId) {
        this.socket?.emit('message_status_update', {
          messageId: data.message.id,
          status: 'delivered'
        });
      }
    });
    
    // Handle message sent confirmation
    this.socket.on('message_sent', (data) => {
      console.log('Message sent confirmation:', data);
      this.notifyListeners('message_sent', data);
      
      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['/api/user-messages'] });
    });
    
    // Handle message status updates
    this.socket.on('message_status', (data) => {
      console.log('Message status update:', data);
      this.notifyListeners('message_status', data);
      
      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['/api/user-messages'] });
    });
    
    // Handle batch message status updates (for high throughput optimization)
    this.socket.on('message_status_batch', (data) => {
      console.log('Batch message status update:', data);
      this.notifyListeners('message_status_batch', data);
      
      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['/api/user-messages'] });
    });
    
    // Handle typing indicators
    this.socket.on('typing_indicator', (data) => {
      console.log('Typing indicator:', data);
      this.notifyListeners('typing_indicator', data);
    });
    
    // Handle conversation status updates (block/unblock)
    this.socket.on('conversation_status_update', (data) => {
      console.log('Conversation status update:', data);
      this.notifyListeners('conversation_status_update', data);
      
      // Invalidate queries to refresh UI
      if (data.otherUserId) {
        queryClient.invalidateQueries({ 
          queryKey: ['/api/user-messages', data.otherUserId] 
        });
      }
    });
    
    // Handle refreshed messages
    this.socket.on('messages_refreshed', (data) => {
      console.log('Messages refreshed:', data);
      this.notifyListeners('messages_refreshed', data);
    });
    
    // Handle rate limit errors
    this.socket.on('rate_limit_exceeded', (data) => {
      console.warn('Rate limit exceeded:', data);
      this.notifyListeners('rate_limit', data);
      
      // Show toast notification
      if (typeof window !== 'undefined') {
        this.showRateLimitToast(data.message);
      }
    });
    
    // General socket error event - has different data format from the server 'error' event
    this.socket.on('error', (error: any) => {
      console.error('Socket.IO connection error:', error);
      this.notifyListeners('error', error);
    });
  }
  
  /**
   * Helper method to show a toast notification for rate limits
   */
  private showRateLimitToast(message: string): void {
    // Create a toast element
    const toast = document.createElement('div');
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.right = '20px';
    toast.style.backgroundColor = '#f44336';
    toast.style.color = 'white';
    toast.style.padding = '12px 20px';
    toast.style.borderRadius = '4px';
    toast.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    toast.style.zIndex = '9999';
    toast.style.minWidth = '250px';
    toast.textContent = message || 'Rate limit exceeded. Please wait before sending more messages.';
    
    // Add to DOM
    document.body.appendChild(toast);
    
    // Remove after 5 seconds
    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    }, 5000);
  }
  
  /**
   * Attempt to reconnect to the server
   */
  private attemptReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    this.reconnectTimer = setTimeout(() => {
      console.log('Attempting to reconnect to Socket.IO server...');
      
      if (this.socket) {
        this.socket.connect();
      } else {
        this.connect();
      }
    }, 3000);
  }
  
  /**
   * Get the current user ID from the session
   */
  private getCurrentUserId(): number | null {
    try {
      // Try to get user info from localStorage or other client storage
      const userJson = localStorage.getItem('user');
      if (userJson) {
        const user = JSON.parse(userJson);
        return user.id;
      }
      return null;
    } catch (error) {
      console.error('Error getting current user ID:', error);
      return null;
    }
  }
  
  /**
   * Send a message to another user
   */
  public sendMessage(receiverId: number, content: string): void {
    if (!this.socket || !this.socket.connected) {
      this.connect();
    }
    
    // First check if we have conversation data cached in the query client
    const queryCache = queryClient.getQueryCache();
    const queryKey = ['/api/user-messages', receiverId];
    const queryData = queryCache.find({ queryKey })?.state?.data as { 
      messages: any[], 
      pagination: any, 
      conversationStatus?: { isBlocked: boolean } 
    } | undefined;
    
    // If the conversation is blocked in cache, don't send the message
    if (queryData?.conversationStatus?.isBlocked) {
      this.notifyListeners('server_error', { 
        message: 'This conversation has been blocked by a moderator for violating community guidelines.',
        code: 'CONVERSATION_BLOCKED'
      });
      return;
    }
    
    this.socket?.emit('user_message', {
      receiverId,
      content
    });
  }
  
  /**
   * Update message status (read/delivered)
   */
  public updateMessageStatus(messageId: number, status: 'sent' | 'delivered' | 'read'): void {
    if (!this.socket || !this.socket.connected) {
      this.connect();
    }
    
    this.socket?.emit('message_status_update', {
      messageId,
      status
    });
  }
  
  /**
   * Update multiple message statuses at once (for high throughput optimization)
   * @param messageIds Array of message IDs to update
   * @param status Status to set for all messages
   */
  public updateMessageStatusBatch(messageIds: number[], status: 'sent' | 'delivered' | 'read'): void {
    if (!messageIds.length) return;
    
    if (!this.socket || !this.socket.connected) {
      this.connect();
    }
    
    // For high throughput, use batch updates which reduce server load
    // by processing multiple messages in a single database operation
    this.socket?.emit('message_status_batch_update', {
      messageIds,
      status
    });
    
    console.log(`Batch updating ${messageIds.length} messages to status: ${status}`);
  }
  
  /**
   * Send typing indicator
   * With REST API fallback if Socket.IO is not connected
   */
  public sendTypingIndicator(receiverId: number, isTyping: boolean): void {
    if (this.socket && this.socket.connected) {
      // Primary method: Socket.IO (real-time)
      this.socket.emit('typing_indicator', {
        receiverId,
        isTyping
      });
      console.log(`Sent typing indicator via Socket.IO: ${isTyping}`);
    } else {
      // Fallback method: REST API
      this.connect(); // Try to reconnect for next time
      
      // Use fetch API as fallback
      const currentUserId = this.getCurrentUserId();
      if (!currentUserId) return;
      
      fetch('/api/typing-indicator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          senderId: currentUserId,
          receiverId: receiverId,
          isTyping: isTyping
        })
      }).then(response => {
        if (response.ok) {
          console.log(`Sent typing indicator via REST API fallback: ${isTyping}`);
        } else {
          console.error('Failed to send typing indicator via REST API');
        }
      }).catch(error => {
        console.error('Error sending typing indicator via REST API:', error);
      });
    }
  }
  
  /**
   * Disconnect the socket
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
  
  /**
   * Add an event listener
   */
  public addEventListener(event: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.add(callback);
    }
    
    // Return a function to remove the listener
    return () => this.removeEventListener(event, callback);
  }
  
  /**
   * Remove an event listener
   */
  public removeEventListener(event: string, callback: (data: any) => void): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }
  
  /**
   * Notify all listeners of an event
   */
  private notifyListeners(event: string, data: any): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }
  
  /**
   * Check if the socket is connected
   */
  public isConnected(): boolean {
    return !!this.socket && this.socket.connected;
  }
  
  /**
   * Force refresh conversation data
   * @param otherUserId The ID of the other user in the conversation
   * @param force Whether to force a thorough refresh
   */
  public refreshConversation(otherUserId: number, force: boolean = false): void {
    if (!this.socket || !this.socket.connected) {
      this.connect();
    }
    
    console.log(`[Socket.IO] Manually refreshing conversation with user ${otherUserId} (force=${force})`);
    
    // Invalidate the conversation cache
    queryClient.invalidateQueries({ 
      queryKey: ['/api/user-messages', otherUserId]
    });
    
    // Also inform the server to refresh its state
    this.socket?.emit('refresh_conversation', { otherUserId, force });
    
    // Also fetch the conversation status directly from API
    if (force) {
      fetch(`/api/conversations/${otherUserId}/status`)
        .then(res => res.json())
        .then(data => {
          console.log(`[Socket.IO] Direct conversation status check:`, data);
          
          // Emit a synthetic status update to ensure UI is in sync
          this.notifyListeners('conversation_status_update', {
            otherUserId: otherUserId,
            isBlocked: data.isBlocked,
            timestamp: data.timestamp,
            source: 'direct_api_check'
          });
        })
        .catch(err => console.error(`[Socket.IO] Error checking conversation status:`, err));
    }
    
    // Force a re-check of conversation status
    setTimeout(() => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/user-messages', otherUserId]
      });
      
      // Also check conversations list
      queryClient.invalidateQueries({
        queryKey: ['/api/user/conversations']
      });
    }, 1000);
  }
}

// Export singleton instance
export const socketManager = SocketIOManager.getInstance();

// Hook for React components
export function useSocket() {
  return socketManager;
}