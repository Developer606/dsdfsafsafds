import express from "express";
import { insertAdvertisementSchema, insertAdvertisementMetricSchema } from "@shared/schema";
import { isAdmin } from "../auth";
import { storage } from "../storage";
import type { Request } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Extend Express.Request to include the isAuthenticated method
declare global {
  namespace Express {
    interface Request {
      isAuthenticated(): boolean;
    }
  }
}

const router = express.Router();

// Helper function to get the root directory path
const getRootDir = () => {
  return process.cwd();
};

// Helper function to delete a file from the uploads directory
const deleteFile = (filePath: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Only delete files within the uploads directory for security
    if (!filePath || !filePath.startsWith('/uploads/')) {
      console.warn(`Attempted to delete file outside uploads directory: ${filePath}`);
      return resolve();
    }
    
    const fullPath = path.join(getRootDir(), filePath);
    
    // Check if file exists before attempting to delete
    fs.access(fullPath, fs.constants.F_OK, (err) => {
      if (err) {
        console.warn(`File not found: ${fullPath}`);
        return resolve();
      }
      
      fs.unlink(fullPath, (err) => {
        if (err) {
          console.error(`Error deleting file ${fullPath}:`, err);
          return reject(err);
        }
        console.log(`Successfully deleted file: ${fullPath}`);
        resolve();
      });
    });
  });
};

// Get all advertisements (admin only)
router.get("/", isAdmin, async (req, res) => {
  try {
    const advertisements = await storage.getAllAdvertisements();
    res.json(advertisements);
  } catch (error) {
    console.error("Error fetching advertisements:", error);
    res.status(500).json({ error: "Failed to fetch advertisements" });
  }
});

// Get active advertisements (public)
router.get("/active", async (req, res) => {
  try {
    const advertisements = await storage.getActiveAdvertisements();
    res.json(advertisements);
  } catch (error) {
    console.error("Error fetching active advertisements:", error);
    res.status(500).json({ error: "Failed to fetch active advertisements" });
  }
});

// Get advertisement by ID (admin only)
router.get("/:id", isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid advertisement ID" });
    }
    
    const advertisement = await storage.getAdvertisementById(id);
    if (!advertisement) {
      return res.status(404).json({ error: "Advertisement not found" });
    }
    
    res.json(advertisement);
  } catch (error) {
    console.error("Error fetching advertisement:", error);
    res.status(500).json({ error: "Failed to fetch advertisement" });
  }
});

// Create advertisement (admin only)
router.post("/", isAdmin, async (req, res) => {
  try {
    console.log("Received advertisement data:", JSON.stringify(req.body, null, 2));
    
    // Helper function to sanitize YouTube URLs
    const sanitizeYouTubeUrl = (url) => {
      if (!url) return url;
      
      // Check if it's a YouTube URL
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        console.log('Sanitizing YouTube URL');
        
        // Extract video ID from various YouTube URL formats
        let videoId = '';
        
        // Extract from youtu.be format
        if (url.includes('youtu.be/')) {
          const match = /youtu\.be\/([^?&]+)/.exec(url);
          if (match && match[1]) videoId = match[1];
        } 
        // Extract from youtube.com/watch format
        else if (url.includes('youtube.com/watch')) {
          const match = /v=([^&]+)/.exec(url);
          if (match && match[1]) videoId = match[1];
        } 
        // Extract from embed format
        else if (url.includes('youtube.com/embed/')) {
          const match = /embed\/([^?&]+)/.exec(url);
          if (match && match[1]) videoId = match[1];
        }
        
        if (videoId) {
          // Return a proper YouTube embed URL
          console.log('Extracted YouTube video ID:', videoId);
          return `https://www.youtube.com/embed/${videoId}`;
        }
      }
      
      return url;
    };
    
    // Pre-process the data to convert date strings to Date objects and sanitize URLs
    const processedData = {
      ...req.body,
      startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
      endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
      // Sanitize URLs if they exist
      videoUrl: req.body.videoUrl ? sanitizeYouTubeUrl(req.body.videoUrl) : undefined,
      imageUrl: req.body.imageUrl ? sanitizeYouTubeUrl(req.body.imageUrl) : undefined,
    };
    
    console.log("Processed data for validation:", JSON.stringify({
      ...processedData,
      startDate: processedData.startDate?.toISOString(),
      endDate: processedData.endDate?.toISOString(),
    }, null, 2));
    
    const validation = insertAdvertisementSchema.safeParse(processedData);
    if (!validation.success) {
      console.error("Validation error:", JSON.stringify(validation.error.format(), null, 2));
      return res.status(400).json({ 
        error: "Invalid advertisement data", 
        details: validation.error.format() 
      });
    }
    
    // Process data to ensure isActive is properly set
    const data = validation.data;
    if (data.isActive === undefined) {
      data.isActive = true;
    }
    
    const advertisement = await storage.createAdvertisement(data);
    console.log("Created advertisement:", JSON.stringify(advertisement, null, 2));
    res.status(201).json(advertisement);
  } catch (error) {
    console.error("Error creating advertisement:", error);
    res.status(500).json({ error: "Failed to create advertisement" });
  }
});

// Update advertisement (admin only)
router.put("/:id", isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid advertisement ID" });
    }
    
    console.log("Received update data:", JSON.stringify(req.body, null, 2));
    
    // Helper function to sanitize YouTube URLs
    const sanitizeYouTubeUrl = (url) => {
      if (!url) return url;
      
      // Check if it's a YouTube URL
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        console.log('Sanitizing YouTube URL');
        
        // Extract video ID from various YouTube URL formats
        let videoId = '';
        
        // Extract from youtu.be format
        if (url.includes('youtu.be/')) {
          const match = /youtu\.be\/([^?&]+)/.exec(url);
          if (match && match[1]) videoId = match[1];
        } 
        // Extract from youtube.com/watch format
        else if (url.includes('youtube.com/watch')) {
          const match = /v=([^&]+)/.exec(url);
          if (match && match[1]) videoId = match[1];
        } 
        // Extract from embed format
        else if (url.includes('youtube.com/embed/')) {
          const match = /embed\/([^?&]+)/.exec(url);
          if (match && match[1]) videoId = match[1];
        }
        
        if (videoId) {
          // Return a proper YouTube embed URL
          console.log('Extracted YouTube video ID:', videoId);
          return `https://www.youtube.com/embed/${videoId}`;
        }
      }
      
      return url;
    };
    
    // Pre-process the data to convert date strings to Date objects and sanitize URLs
    const processedData = {
      ...req.body,
      startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
      endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
      // Sanitize URLs if they exist
      videoUrl: req.body.videoUrl ? sanitizeYouTubeUrl(req.body.videoUrl) : undefined,
      imageUrl: req.body.imageUrl ? sanitizeYouTubeUrl(req.body.imageUrl) : undefined,
    };
    
    console.log("Processed update data for validation:", JSON.stringify({
      ...processedData,
      startDate: processedData.startDate?.toISOString(),
      endDate: processedData.endDate?.toISOString(),
    }, null, 2));
    
    const validation = insertAdvertisementSchema.partial().safeParse(processedData);
    if (!validation.success) {
      console.error("Validation error:", JSON.stringify(validation.error.format(), null, 2));
      return res.status(400).json({ 
        error: "Invalid advertisement data", 
        details: validation.error.format() 
      });
    }
    
    // Process data to ensure isActive is properly set if included
    const data = validation.data;
    
    const advertisement = await storage.updateAdvertisement(id, data);
    console.log("Updated advertisement:", JSON.stringify(advertisement, null, 2));
    res.json(advertisement);
  } catch (error) {
    console.error("Error updating advertisement:", error);
    res.status(500).json({ error: "Failed to update advertisement" });
  }
});

// Delete advertisement (admin only)
router.delete("/:id", isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid advertisement ID" });
    }

    // First, get the advertisement to find the media files to delete
    const advertisement = await storage.getAdvertisementById(id);
    if (!advertisement) {
      return res.status(404).json({ error: "Advertisement not found" });
    }

    // Keep track of deleted files
    const deletedFiles = [];

    // Delete image file if it's in our uploads directory
    if (advertisement.imageUrl && advertisement.imageUrl.startsWith('/uploads/')) {
      try {
        await deleteFile(advertisement.imageUrl);
        deletedFiles.push(advertisement.imageUrl);
      } catch (err) {
        console.error(`Error deleting image file for advertisement ${id}:`, err);
        // Continue with deletion even if file removal fails
      }
    }

    // Delete video file if it exists and is in our uploads directory
    if (advertisement.videoUrl && advertisement.videoUrl.startsWith('/uploads/')) {
      try {
        await deleteFile(advertisement.videoUrl);
        deletedFiles.push(advertisement.videoUrl);
      } catch (err) {
        console.error(`Error deleting video file for advertisement ${id}:`, err);
        // Continue with deletion even if file removal fails
      }
    }
    
    // Now delete the advertisement from the database
    await storage.deleteAdvertisement(id);
    
    console.log(`Advertisement ${id} deleted successfully along with associated files:`, deletedFiles);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting advertisement:", error);
    res.status(500).json({ error: "Failed to delete advertisement" });
  }
});

// Record advertisement impression
router.post("/:id/impression", async (req, res) => {
  try {
    const advertisementId = parseInt(req.params.id);
    if (isNaN(advertisementId)) {
      return res.status(400).json({ error: "Invalid advertisement ID" });
    }
    
    await storage.incrementAdvertisementStat(advertisementId, 'impressions');
    
    // Also record detailed metrics if user is authenticated
    if (req.isAuthenticated() && req.user) {
      await storage.recordAdvertisementMetric({
        advertisementId,
        userId: (req.user as any).id,
        action: "impression",
        browserInfo: req.headers["user-agent"],
        deviceType: req.headers["sec-ch-ua-platform"] as string || "unknown"
      });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error("Error recording impression:", error);
    res.status(500).json({ error: "Failed to record impression" });
  }
});

// Record advertisement click
router.post("/:id/click", async (req, res) => {
  try {
    const advertisementId = parseInt(req.params.id);
    if (isNaN(advertisementId)) {
      return res.status(400).json({ error: "Invalid advertisement ID" });
    }
    
    await storage.incrementAdvertisementStat(advertisementId, 'clicks');
    
    // Also record detailed metrics if user is authenticated
    if (req.isAuthenticated() && req.user) {
      await storage.recordAdvertisementMetric({
        advertisementId,
        userId: (req.user as any).id,
        action: "click",
        browserInfo: req.headers["user-agent"],
        deviceType: req.headers["sec-ch-ua-platform"] as string || "unknown"
      });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error("Error recording click:", error);
    res.status(500).json({ error: "Failed to record click" });
  }
});

// Get advertisement metrics (admin only)
router.get("/:id/metrics", isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid advertisement ID" });
    }
    
    const metrics = await storage.getAdvertisementMetrics(id);
    const performance = await storage.getAdvertisementPerformance(id);
    
    res.json({
      metrics,
      performance
    });
  } catch (error) {
    console.error("Error fetching advertisement metrics:", error);
    res.status(500).json({ error: "Failed to fetch advertisement metrics" });
  }
});

// Get overall advertisement performance (admin only)
router.get("/metrics/performance", isAdmin, async (req, res) => {
  try {
    const performance = await storage.getAdvertisementPerformance();
    res.json(performance);
  } catch (error) {
    console.error("Error fetching advertisement performance:", error);
    res.status(500).json({ error: "Failed to fetch advertisement performance" });
  }
});

export default router;