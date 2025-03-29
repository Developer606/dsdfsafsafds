import express, { Request, Response } from "express";
import { storage } from "./storage";
import { StatusError } from "./middleware/error-handler";

const router = express.Router();

// Define middleware to check if user is authenticated
const isAuthenticated = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({
      error: "Authentication required",
      redirectTo: "/login",
    });
  }
  next();
};

/**
 * Check if encryption is enabled for a conversation
 */
router.get('/check-encryption', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    
    if (!userId || typeof userId !== 'string') {
      throw new StatusError(400, 'Missing or invalid userId parameter');
    }
    
    // Get current user ID
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      throw new StatusError(401, 'User not authenticated');
    }
    
    // Check if conversation exists and if encryption is enabled
    const conversationKey = await storage.getConversationEncryptionKey(
      parseInt(currentUserId.toString()),
      parseInt(userId)
    );
    
    res.json({
      isEncrypted: !!conversationKey,
      canEnable: true
    });
  } catch (error) {
    console.error('Error checking encryption status:', error);
    const status = error instanceof StatusError ? error.status : 500;
    res.status(status).json({
      error: error instanceof StatusError ? error.message : 'Failed to check encryption status'
    });
  }
});

/**
 * Get encrypted conversation key for a user
 */
router.get('/key', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    
    if (!userId || typeof userId !== 'string') {
      throw new StatusError(400, 'Missing or invalid userId parameter');
    }
    
    // Get current user ID
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      throw new StatusError(401, 'User not authenticated');
    }
    
    // Get the encrypted conversation key
    const encryptedKey = await storage.getEncryptedConversationKey(
      parseInt(currentUserId.toString()),
      parseInt(userId)
    );
    
    if (!encryptedKey) {
      throw new StatusError(404, 'Encryption key not found for this conversation');
    }
    
    res.json({ encryptedKey });
  } catch (error) {
    console.error('Error retrieving encryption key:', error);
    const status = error instanceof StatusError ? error.status : 500;
    res.status(status).json({
      error: error instanceof StatusError ? error.message : 'Failed to retrieve encryption key'
    });
  }
});

/**
 * Initiate encryption for a conversation
 */
router.post('/initiate-encryption', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { userId, publicKey, encryptedSymmetricKey } = req.body;
    
    if (!userId || !publicKey || !encryptedSymmetricKey) {
      throw new StatusError(400, 'Missing required parameters');
    }
    
    // Get current user ID
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      throw new StatusError(401, 'User not authenticated');
    }
    
    // Store user's public key if it doesn't exist
    const existingKey = await storage.getEncryptionKey(parseInt(currentUserId.toString()));
    if (!existingKey) {
      await storage.storeEncryptionKey(parseInt(currentUserId.toString()), publicKey);
    }
    
    // Store the encrypted conversation key
    await storage.storeEncryptedConversationKey(
      parseInt(currentUserId.toString()),
      parseInt(userId),
      encryptedSymmetricKey
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error initiating encryption:', error);
    const status = error instanceof StatusError ? error.status : 500;
    res.status(status).json({
      error: error instanceof StatusError ? error.message : 'Failed to initiate encryption'
    });
  }
});

/**
 * Store user's public key
 */
router.post('/keys', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { publicKey } = req.body;
    
    if (!publicKey) {
      throw new StatusError(400, 'Missing public key');
    }
    
    // Get current user ID
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      throw new StatusError(401, 'User not authenticated');
    }
    
    // Store user's public key
    await storage.storeEncryptionKey(parseInt(currentUserId.toString()), publicKey);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error storing public key:', error);
    const status = error instanceof StatusError ? error.status : 500;
    res.status(status).json({
      error: error instanceof StatusError ? error.message : 'Failed to store public key'
    });
  }
});

/**
 * Get user's public key
 */
router.get('/keys/:userId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      throw new StatusError(400, 'Missing userId parameter');
    }
    
    // Get user's public key
    const publicKey = await storage.getEncryptionKey(parseInt(userId));
    
    if (!publicKey) {
      throw new StatusError(404, 'Public key not found for this user');
    }
    
    res.json({ publicKey });
  } catch (error) {
    console.error('Error retrieving public key:', error);
    const status = error instanceof StatusError ? error.status : 500;
    res.status(status).json({
      error: error instanceof StatusError ? error.message : 'Failed to retrieve public key'
    });
  }
});

export default router;