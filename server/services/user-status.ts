/**
 * User Status Service
 * 
 * This service tracks the online/offline status of users and provides
 * functionality to manage and query user status information.
 */

// Track online users with a Map for fast lookups
const onlineUsers = new Map<number, {
  socketId: string,
  lastActive: Date
}>();

// Time in milliseconds before considering a user offline (5 minutes)
const OFFLINE_THRESHOLD = 5 * 60 * 1000;

/**
 * Mark a user as online when they connect
 * @param userId User ID
 * @param socketId Socket ID associated with this user
 */
export function markUserOnline(userId: number, socketId: string): void {
  onlineUsers.set(userId, {
    socketId,
    lastActive: new Date()
  });
}

/**
 * Update a user's last active timestamp
 * @param userId User ID
 */
export function updateUserActivity(userId: number): void {
  const userStatus = onlineUsers.get(userId);
  if (userStatus) {
    userStatus.lastActive = new Date();
    onlineUsers.set(userId, userStatus);
  }
}

/**
 * Mark a user as offline when they disconnect
 * @param userId User ID
 */
export function markUserOffline(userId: number): void {
  onlineUsers.delete(userId);
}

/**
 * Check if a user is currently online
 * @param userId User ID
 * @returns Boolean indicating if user is online
 */
export function isUserOnline(userId: number): boolean {
  // First check if the user exists in our tracking map
  const userStatus = onlineUsers.get(userId);
  
  // If user is not in the tracking map at all, they're not logged in
  if (!userStatus) return false;
  
  // User is in the tracking map (logged in), consider them online
  return true;
}

/**
 * Get the socket ID associated with a user
 * @param userId User ID
 * @returns Socket ID or null if user is not online
 */
export function getUserSocketId(userId: number): string | null {
  const userStatus = onlineUsers.get(userId);
  return userStatus && isUserOnline(userId) ? userStatus.socketId : null;
}

/**
 * Get all currently online users
 * @returns Array of user IDs that are currently online
 */
export function getOnlineUsers(): number[] {
  const onlineUserIds: number[] = [];
  
  // Convert iterator to array to avoid TypeScript iterator issues
  Array.from(onlineUsers.entries()).forEach(([userId, status]) => {
    if (isUserOnline(userId)) {
      onlineUserIds.push(userId);
    }
  });
  
  return onlineUserIds;
}

/**
 * Get the last active timestamp for a user
 * @param userId User ID
 * @returns Date of last activity or null if user is not tracked
 */
export function getLastActiveTime(userId: number): Date | null {
  const userStatus = onlineUsers.get(userId);
  return userStatus ? userStatus.lastActive : null;
}

/**
 * Get count of online users
 * @returns Number of users currently online
 */
export function getOnlineUserCount(): number {
  return getOnlineUsers().length;
}

/**
 * Cleanup function is now a no-op since we want users to stay "online"
 * as long as they're logged in, regardless of inactivity period
 */
export function cleanupInactiveUsers(): void {
  // No longer remove users due to inactivity
  // They'll only be removed when they explicitly log out
  return;
}