import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { runMigrations } from "./db";
import { initializeNotifications } from "./notification-db";
import { startScheduler } from "./scheduler";
import { initializeAdminDb } from "./admin-db";
import { setupSocketIOServer } from "./socket-io-server";
import { initializeNotificationSocketService } from "./notification-socket-service";
import { initializeFlaggedMessagesDb } from "./content-moderation";
import { initializeEmailTransporter } from "./email";
import path from "path";

const app = express();
// Increase JSON body size limit to handle larger image data
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: false, limit: '20mb' }));

// Configure trust proxy to get real client IP when behind a proxy (like in Replit)
app.set("trust proxy", true);

// Serve files from the uploads directory and its subdirectories
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
// Make sure advertisement uploads are also accessible
app.use("/uploads/advertisements", express.static(path.join(process.cwd(), "uploads/advertisements")));

// Enhanced logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
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
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;

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

    // Initialize email transporter
    const emailInitSuccess = await initializeEmailTransporter();
    if (emailInitSuccess) {
      log("Email transporter initialized successfully");
    } else {
      log("Email transporter initialization failed - emails may not work properly");
    }

    // Start the broadcast scheduler
    startScheduler();
    log("Broadcast scheduler started successfully");

    // Register routes and get the HTTP server
    // Note: The Socket.IO server is now set up inside registerRoutes
    const httpServer = await registerRoutes(app);
    log("Routes registered and Socket.IO server initialized successfully");
    
    // Initialize the notification socket service using the same HTTP server
    // This now uses the shared Socket.IO instance through socketService
    initializeNotificationSocketService(httpServer);
    log("Notification Socket.IO service initialized successfully");

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
