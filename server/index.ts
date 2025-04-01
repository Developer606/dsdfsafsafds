import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { runMigrations } from "./db";
import { initializeNotifications } from "./notification-db";
import { startScheduler } from "./scheduler";
import { initializeAdminDb } from "./admin-db";
import { setupSocketIOServer } from "./socket-io-server";
import { initializeFlaggedMessagesDb } from "./content-moderation";
import path from "path";
import fs from "fs";

const app = express();
// Increase JSON body size limit to handle larger image data
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: false, limit: '20mb' }));

// Configure trust proxy to get real client IP when behind a proxy (like in Replit)
app.set("trust proxy", true);

// Create and configure upload directories with proper permissions
const uploadsDir = path.join(process.cwd(), "uploads");
const adsUploadsDir = path.join(process.cwd(), "uploads/advertisements");

// Ensure directories exist with correct permissions
[uploadsDir, adsUploadsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    console.log(`Creating directory: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
  }
  try {
    fs.chmodSync(dir, 0o755); // Set permissions to ensure files are accessible
    console.log(`Set directory permissions for ${dir} to 755`);
  } catch (err) {
    console.error(`Failed to set permissions for ${dir}:`, err);
  }
});

// Serve files from the uploads directory and its subdirectories
app.use("/uploads", express.static(uploadsDir));
// Make sure advertisement uploads are also accessible
app.use("/uploads/advertisements", express.static(adsUploadsDir));

// Enhanced logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const requestPath = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;
  let capturedError: any = undefined;

  // Capture json responses
  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  // Capture errors
  const originalResStatus = res.status;
  res.status = function (code) {
    if (code >= 400) {
      capturedError = new Error(`HTTP ${code}`);
    }
    return originalResStatus.apply(res, [code]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (requestPath.startsWith("/api")) {
      let logLine = `${req.method} ${requestPath} ${res.statusCode} in ${duration}ms`;

      if (capturedError) {
        logLine += ` ERROR: ${capturedError.message}`;
        if (capturedJsonResponse?.error) {
          logLine += ` - ${capturedJsonResponse.error}`;
        }
      } else if (capturedJsonResponse) {
        const jsonStr = JSON.stringify(capturedJsonResponse);
        if (jsonStr.length > 50) {
          logLine += ` :: ${jsonStr.slice(0, 47)}...`;
        } else {
          logLine += ` :: ${jsonStr}`;
        }
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // Run database migrations before starting the server
    await runMigrations();

    // Initialize admin database
    await initializeAdminDb();
    log("Admin database initialized successfully");
    
    // Initialize notifications database
    await initializeNotifications();
    log("Notifications database initialized successfully");
    
    // Initialize flagged messages database
    await initializeFlaggedMessagesDb();
    log("Flagged messages database initialized successfully");

    // Start the broadcast scheduler
    startScheduler();
    log("Broadcast scheduler started successfully");

    // Create HTTP server first
    const httpServer = createServer(app);
    
    // Register routes and setup Socket.IO
    await registerRoutes(app);

    // Global error handler with better logging
    app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      log(`ERROR [${status}] ${req.method} ${req.path}: ${message}`);
      if (err.stack) {
        log(`Stack trace: ${err.stack}`);
      }

      res.status(status).json({
        error: message,
        path: req.path,
        timestamp: new Date().toISOString(),
      });
    });

    if (app.get("env") === "development") {
      await setupVite(app, httpServer);
    } else {
      serveStatic(app);
    }

    const PORT = 5000;
    httpServer.listen(PORT, "0.0.0.0", () => {
      log(`Server started successfully on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
})();
