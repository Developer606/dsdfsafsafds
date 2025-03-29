/**
 * User Status Service
 * 
 * This service tracks socket connections for message delivery
 * without exposing online/offline status to other users.
 * 
 * Per client request, online status indicators have been removed.
 */

// Track user socket connections for message delivery
const userConnections = new Map<number, {
  socketId: string,
  lastActive: Date
}>();

// Time in milliseconds for connection tracking (5 minutes)
const CONNECTION_TIMEOUT = 5 * 60 * 1000;

/**
 * Track a user's socket connection when they connect
 * Note: This no longer exposes online status to other users
 * @param userId User ID
 * @param socketId Socket ID associated with this user
 */
export function markUserOnline(userId: number, socketId: string): void {
  userConnections.set(userId, {
    socketId,
    lastActive: new Date()
  });
}

/**
 * Update a user's last active timestamp
 * @param userId User ID
 */
export function updateUserActivity(userId: number): void {
  const userConnection = userConnections.get(userId);
  if (userConnection) {
    userConnection.lastActive = new Date();
    userConnections.set(userId, userConnection);
  }
}

/**
 * Remove user's socket connection when they disconnect
 * @param userId User ID
 */
export function markUserOffline(userId: number): void {
  userConnections.delete(userId);
}

/**
 * Check if a user has an active socket connection
 * This is for internal message delivery only, not for status display
 * @param userId User ID
 * @returns Boolean indicating if user has an active connection
 */
export function isUserOnline(userId: number): boolean {
  // For compatibility, but no longer used for UI status indicators
  return false;
}

/**
 * Get the socket ID associated with a user
 * @param userId User ID
 * @returns Socket ID or null if user has no active connection
 */
export function getUserSocketId(userId: number): string | null {
  const userConnection = userConnections.get(userId);
  return userConnection ? userConnection.socketId : null;
}

/**
 * Get all users with active connections
 * @returns Array of user IDs with active connections
 */
export function getOnlineUsers(): number[] {
  // For compatibility, but no longer used for UI status indicators
  return [];
}

/**
 * Get the last active timestamp for a user
 * @param userId User ID
 * @returns Date of last activity or null if user is not tracked
 */
export function getLastActiveTime(userId: number): Date | null {
  // For compatibility, but no longer used for UI status indicators
  return null;
}

/**
 * Get count of users with active connections
 * @returns Number of users with active connections
 */
export function getOnlineUserCount(): number {
  // For compatibility, but no longer returns actual count
  return 0;
}

/**
 * Cleanup inactive user connections
 */
export function cleanupInactiveUsers(): void {
  const now = new Date();
  
  Array.from(userConnections.entries()).forEach(([userId, connection]) => {
    const timeSinceLastActive = now.getTime() - connection.lastActive.getTime();
    if (timeSinceLastActive > CONNECTION_TIMEOUT) {
      userConnections.delete(userId);
    }
  });
}