import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { storage } from "../storage";
import { authenticateJWT } from '../middleware/jwt-auth';

const router = express.Router();

// Create profile pictures directory if it doesn't exist
const profilePicturesDir = path.join(process.cwd(), 'uploads', 'profile-pictures');
if (!fs.existsSync(profilePicturesDir)) {
  fs.mkdirSync(profilePicturesDir, { recursive: true });
  console.log(`Created profile pictures directory at ${profilePicturesDir}`);
}

// Set proper permissions on directory
try {
  fs.chmodSync(profilePicturesDir, 0o755);
  console.log('Set profile pictures directory permissions to 755');
} catch (error) {
  console.error('Error setting profile pictures directory permissions:', error);
}

// Configure multer storage for profile pictures
const profilePictureStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, profilePicturesDir);
  },
  filename: (req, file, cb) => {
    // Use user ID for the filename to make it unique per user
    // This also makes it easy to find and delete old images
    const userId = req.user?.id || 'unknown';
    const timestamp = Date.now();
    const fileExtension = path.extname(file.originalname);
    const filename = `user-${userId}-${timestamp}${fileExtension}`;
    cb(null, filename);
  },
});

// Configure file filter to only allow images
const fileFilter = (req: express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
  ];
  
  console.log(`Profile picture upload request: ${file.originalname}, type: ${file.mimetype}`);
  
  if (allowedTypes.includes(file.mimetype)) {
    console.log(`File type ${file.mimetype} is allowed for profile picture`);
    cb(null, true);
  } else {
    console.error(`Rejected profile picture upload: ${file.originalname} with type ${file.mimetype}`);
    cb(new Error(`Invalid file type for profile picture: ${file.mimetype}. Allowed types are: ${allowedTypes.join(', ')}`));
  }
};

// Create multer upload instance
const upload = multer({
  storage: profilePictureStorage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for profile pictures
  },
});

// Error handling middleware for multer
const handleMulterError = (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof multer.MulterError) {
    // A Multer error occurred when uploading
    console.error('Multer error during profile picture upload:', err.code, err.message);
    return res.status(400).json({
      error: 'Profile picture upload error',
      details: err.message,
      code: err.code
    });
  } else if (err) {
    // An unknown error occurred
    console.error('Unknown profile picture upload error:', err);
    return res.status(500).json({
      error: 'Profile picture upload failed',
      details: err.message
    });
  }
  next();
};

// Upload profile picture route
router.post('/upload', authenticateJWT, upload.single('profilePicture'), handleMulterError, async (req: express.Request, res: express.Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No profile picture uploaded' });
    }

    if (!req.user?.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const userId = req.user.id;
    
    // Find user's previous profile picture and delete it if it exists
    const previousProfilePictures = fs.readdirSync(profilePicturesDir)
      .filter(filename => filename.startsWith(`user-${userId}-`) && filename !== req.file?.filename);
    
    for (const oldPicture of previousProfilePictures) {
      const oldPicturePath = path.join(profilePicturesDir, oldPicture);
      try {
        fs.unlinkSync(oldPicturePath);
        console.log(`Deleted old profile picture: ${oldPicturePath}`);
      } catch (error) {
        console.error(`Failed to delete old profile picture: ${oldPicturePath}`, error);
      }
    }

    // Generate URL for the uploaded file
    const relativePath = path.join('profile-pictures', req.file.filename);
    const fileUrl = `/uploads/${relativePath.replace(/\\/g, '/')}`;
    
    // Update user's profilePicture in the database
    await storage.updateUserProfilePicture(userId, fileUrl);
    
    console.log(`Profile picture uploaded successfully for user ${userId}: ${fileUrl}`);
    
    return res.status(201).json({
      url: fileUrl,
      message: 'Profile picture updated successfully'
    });
  } catch (error) {
    console.error('Profile picture upload processing error:', error);
    return res.status(500).json({ error: 'Failed to process profile picture upload' });
  }
});

// Upload profile picture from URL route
router.post('/from-url', authenticateJWT, async (req: express.Request, res: express.Response) => {
  try {
    const { imageUrl } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({ error: 'No image URL provided' });
    }

    if (!req.user?.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const userId = req.user.id;
    
    // Validate URL (simple validation)
    try {
      new URL(imageUrl);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }
    
    // Update user's profilePicture in the database
    await storage.updateUserProfilePicture(userId, imageUrl);
    
    console.log(`Profile picture URL updated successfully for user ${userId}: ${imageUrl}`);
    
    return res.status(200).json({
      url: imageUrl,
      message: 'Profile picture URL updated successfully'
    });
  } catch (error) {
    console.error('Profile picture URL update error:', error);
    return res.status(500).json({ error: 'Failed to update profile picture from URL' });
  }
});

export default router;