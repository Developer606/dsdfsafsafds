import { storage } from './storage';
import { getScheduledBroadcasts, markScheduledBroadcastAsSent, createBroadcastNotifications } from './notification-db';

// Function to process scheduled broadcasts
async function processScheduledBroadcasts() {
  try {
    const now = Date.now();
    const scheduledBroadcasts = await getScheduledBroadcasts();
    
    // Get all broadcasts that should be sent now
    const broadcastsDue = scheduledBroadcasts.filter(broadcast => 
      new Date(broadcast.scheduledFor).getTime() <= now && !broadcast.sent
    );

    if (broadcastsDue.length === 0) return;

    // Get all users for broadcasting
    const users = await storage.getAllUsers();

    // Process each due broadcast
    for (const broadcast of broadcastsDue) {
      try {
        // Send the broadcast to all users
        await createBroadcastNotifications(users, {
          type: broadcast.type,
          title: broadcast.title,
          message: broadcast.message
        });

        // Mark the broadcast as sent
        await markScheduledBroadcastAsSent(broadcast.id);
        
        console.log(`Successfully sent scheduled broadcast: ${broadcast.title}`);
      } catch (error) {
        console.error(`Error sending scheduled broadcast ${broadcast.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error processing scheduled broadcasts:', error);
  }
}

// Start the scheduler
export function startScheduler() {
  // Check for scheduled broadcasts every minute
  const INTERVAL = 60 * 1000; // 1 minute
  
  console.log('Starting broadcast scheduler...');
  
  // Initial check
  processScheduledBroadcasts();
  
  // Set up recurring check
  const intervalId = setInterval(processScheduledBroadcasts, INTERVAL);
  
  return () => {
    clearInterval(intervalId);
    console.log('Broadcast scheduler stopped');
  };
}
