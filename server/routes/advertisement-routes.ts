import express from "express";
import { insertAdvertisementSchema, insertAdvertisementMetricSchema } from "@shared/schema";
import { isAdmin } from "../auth";
import { storage } from "../storage";
import type { Request } from "express";

// Extend Express.Request to include the isAuthenticated method
declare global {
  namespace Express {
    interface Request {
      isAuthenticated(): boolean;
    }
  }
}

const router = express.Router();

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
    
    const validation = insertAdvertisementSchema.safeParse(req.body);
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
    
    const validation = insertAdvertisementSchema.partial().safeParse(req.body);
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
    
    await storage.deleteAdvertisement(id);
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