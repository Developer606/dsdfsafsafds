/**
 * Anime Character Chat Application - Production Server
 * 
 * This is the production entry point for the application.
 * 
 * To run this file directly:
 * 1. Use the start.sh script: ./start.sh
 * 2. Or run: NODE_ENV=production node index.js
 */

import express from "express";
import { createServer } from "http";
import { registerRoutes } from "./server/routes.js";
import { setupVite, serveStatic, log } from "./server/vite.js";
import { runMigrations } from "./server/db.js";
import { initializeNotifications } from "./server/notification-db.js";
import { startScheduler } from "./server/scheduler.js";
import { initializeAdminDb } from "./server/admin-db.js";
import { initializeMessagesDb } from "./server/messages-db.js";
import { initializePlans } from "./server/plan-db.js";
import { setupSocketIOServer } from "./server/socket-io-server.js";
import path from "path";
import { fileURLToPath } from "url";

// Get current file directory (equivalent to __dirname in CommonJS)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Configure trust proxy to get real client IP when behind a proxy (like in Replit)
app.set("trust proxy", true);

// Serve files from the uploads directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Enhanced logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse = undefined;
  let capturedError = undefined;

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
    
    // Initialize plans
    console.log("Checking for existing plans...");
    await initializePlans();
    log("Plans initialization completed");

    // Initialize admin database
    await initializeAdminDb();
    log("Admin database initialized successfully");
    
    // Initialize notifications database
    await initializeNotifications();
    log("Notifications database initialized successfully");

    // Initialize messages database
    console.log("Initializing messages database...");
    await initializeMessagesDb();
    log("Messages database initialized successfully");

    // Start the broadcast scheduler
    startScheduler();
    log("Broadcast scheduler started successfully");

    // Create HTTP server first
    const httpServer = createServer(app);
    
    // Register routes and setup Socket.IO
    await registerRoutes(app, httpServer);

    // Global error handler with better logging
    app.use((err, req, res, _next) => {
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

    const PORT = process.env.PORT || 5000;
    httpServer.listen(PORT, "0.0.0.0", () => {
      log(`Server started successfully on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
})();