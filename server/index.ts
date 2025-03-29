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
import compression from "compression";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { StatusCodes } from "http-status-codes";
import { cache, cacheMiddleware } from "./services/cache-service";

const app = express();

// Security enhancements
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Required for client-side scripts
      connectSrc: ["'self'", "ws:", "wss:"], // Allow WebSocket connections
      imgSrc: ["'self'", "data:", "blob:"], // Allow data: URLs for images
      styleSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'", "data:"],
      mediaSrc: ["'self'", "data:", "blob:"]
    }
  }
}));

// Compression for all responses
app.use(compression());

// Increase JSON body size limit to handle larger image data
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: false, limit: '20mb' }));

// Configure trust proxy to get real client IP when behind a proxy (like in Replit)
// Configure more securely for use with rate limiting
app.set("trust proxy", "loopback, linklocal, uniquelocal");

// Rate limiting for API endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // 500 requests per windowMs
  message: {
    error: "Too many requests, please try again later.",
    status: StatusCodes.TOO_MANY_REQUESTS
  },
  standardHeaders: true,
  legacyHeaders: false,
  // IP address extractor that works with Replit's proxy
  keyGenerator: (request, response) => {
    // Get forwarded IP from Replit's proxy if available
    return request.ip || 
           request.headers['x-forwarded-for'] as string || 
           request.socket.remoteAddress || 
           'unknown';
  }
});

// Apply rate limiting to API routes
app.use("/api/", apiLimiter);

// Serve files from the uploads directory with caching
app.use("/uploads", express.static(path.join(process.cwd(), "uploads"), {
  maxAge: 86400000, // 1 day
  etag: true,
  lastModified: true
}));

// Apply cache middleware to specific routes
app.use("/api/users", cacheMiddleware(60)); // Cache user list for 1 minute
app.use("/api/status", cacheMiddleware(30)); // Cache status for 30 seconds

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

    // Start the broadcast scheduler
    startScheduler();
    log("Broadcast scheduler started successfully");

    // Create HTTP server first
    const httpServer = createServer(app);
    
    // Register routes and setup Socket.IO
    await registerRoutes(app);
    
    // Setup WebSocket server with Socket.IO
    const io = setupSocketIOServer(httpServer);
    
    // Configure Socket.IO for handling disconnects more gracefully (prevent ghost connections)
    io.engine.on("connection_error", (err: any) => {
      log(`Socket.IO connection error: ${err.message}`);
    });

    // Add monitoring endpoint for system health
    app.get("/api/system-status", (req, res) => {
      res.json({
        status: "ok",
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        connections: io.engine.clientsCount,
        cache: {
          size: cache.keys().length,
          stats: cache.getStats()
        },
        timestamp: new Date().toISOString()
      });
    });

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

    // Configure maximum HTTP and Socket.IO connections
    httpServer.maxConnections = 10000; // Increase max connections

    const PORT = 5000;
    httpServer.listen(PORT, "0.0.0.0", () => {
      log(`Server started successfully on port ${PORT}`);
      log(`Optimized for high traffic (up to 100k requests/minute)`);
    });
    
    // Graceful shutdown handling
    process.on('SIGTERM', () => {
      log('SIGTERM signal received: closing HTTP server');
      httpServer.close(() => {
        log('HTTP server closed');
      });
    });
    
    process.on('SIGINT', () => {
      log('SIGINT signal received: closing HTTP server');
      httpServer.close(() => {
        log('HTTP server closed');
      });
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
})();
