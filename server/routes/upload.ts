import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { isAdmin } from '../auth'; // Import isAdmin for more permissive upload rules for admins

const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log(`Created uploads directory at ${uploadDir}`);
}

// Explicitly set uploads directory permissions to be readable
try {
  fs.chmodSync(uploadDir, 0o755);
  console.log('Set uploads directory permissions to 755');
} catch (error) {
  console.error('Error setting uploads directory permissions:', error);
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate a unique filename with original extension
    const uniqueFilename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    console.log(`Generated filename: ${uniqueFilename} for ${file.originalname}`);
    cb(null, uniqueFilename);
  },
});

// Configure file filter
const fileFilter = (req: express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept images and videos
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/ogg'
  ];
  
  console.log(`File upload request: ${file.originalname}, type: ${file.mimetype}`);
  
  // Allow all file types for admins (they should know what they're doing)
  if (req.user && (req.user as any).isAdmin) {
    console.log('Admin user uploading file - bypassing type check');
    cb(null, true);
    return;
  }
  
  if (allowedTypes.includes(file.mimetype)) {
    console.log(`File type ${file.mimetype} is allowed`);
    cb(null, true);
  } else {
    console.error(`Rejected file upload: ${file.originalname} with type ${file.mimetype}`);
    cb(new Error(`Invalid file type: ${file.mimetype}. Allowed types are: ${allowedTypes.join(', ')}`));
  }
};

// Configure multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Error handling middleware for multer
const handleMulterError = (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof multer.MulterError) {
    // A Multer error occurred when uploading
    console.error('Multer error:', err.code, err.message);
    return res.status(400).json({
      error: 'File upload error',
      details: err.message,
      code: err.code
    });
  } else if (err) {
    // An unknown error occurred
    console.error('Unknown upload error:', err);
    return res.status(500).json({
      error: 'File upload failed',
      details: err.message
    });
  }
  next();
};

// Handle file uploads for authenticated users
router.post('/', (req, res, next) => {
  // Check if user is authenticated
  if (!req.isAuthenticated()) {
    return res.status(401).json({
      error: "Authentication required",
      redirectTo: "/login",
    });
  }
  next();
}, upload.single('file'), handleMulterError, (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Ensure file was saved correctly
    const filePath = path.join(uploadDir, req.file.filename);
    if (!fs.existsSync(filePath)) {
      console.error(`File not found at expected path: ${filePath}`);
      return res.status(500).json({ error: 'File was not saved correctly' });
    }

    // Check file permissions
    try {
      fs.accessSync(filePath, fs.constants.R_OK);
    } catch (error) {
      console.error(`File permissions issue: ${filePath}`, error);
      fs.chmodSync(filePath, 0o644); // Try to fix permissions
      console.log(`Updated file permissions for ${filePath}`);
    }

    // Generate URL for the uploaded file (using absolute path with domain)
    const fileUrl = `/uploads/${req.file.filename}`;
    console.log(`File uploaded successfully: ${fileUrl}, type: ${req.file.mimetype}, size: ${req.file.size} bytes`);
    
    return res.status(201).json({
      url: fileUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  } catch (error) {
    console.error('Upload processing error:', error);
    return res.status(500).json({ error: 'Failed to process uploaded file' });
  }
});

// Special admin-only upload route with fewer restrictions
router.post('/admin', isAdmin, upload.single('file'), handleMulterError, (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Generate URL for the uploaded file
    const fileUrl = `/uploads/${req.file.filename}`;
    console.log(`Admin file uploaded successfully: ${fileUrl}`);
    
    // Ensure file is readable
    fs.chmodSync(path.join(uploadDir, req.file.filename), 0o644);
    
    return res.status(201).json({
      url: fileUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  } catch (error) {
    console.error('Admin upload error:', error);
    return res.status(500).json({ error: 'Failed to upload file' });
  }
});

export default router;