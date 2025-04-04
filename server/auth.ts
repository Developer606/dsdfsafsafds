import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import {
  User as SelectUser,
  insertUserSchema,
  adminLoginSchema,
  users,
} from "@shared/schema";
import { eq } from "drizzle-orm";
import cryptoRandomString from "crypto-random-string";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

// Export hash password utility
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

// Add OTP generation utility
export function generateOTP() {
  return cryptoRandomString({ length: 6, type: "numeric" });
}

// Add email verification utility
export async function sendVerificationEmail(email: string, token: string) {
  // Implementation will be added when email service is set up
  console.log(
    `Verification email would be sent to ${email} with token ${token}`,
  );
  return true;
}

// Export compare passwords utility for use in other modules
export async function comparePasswords(supplied: string, stored: string) {
  // Handle cases where the stored password might not be in the correct format
  if (!stored || !stored.includes('.')) {
    return false;
  }
  
  try {
    const [hashed, salt] = stored.split(".");
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    console.error("Password comparison error:", error);
    return false; // Return false on any error to avoid revealing information
  }
}

// Middleware to check if user is admin
export function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && req.user.isAdmin) {
    return next();
  }
  res.status(403).json({ error: "Admin access required" });
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    name: "sid", // Set a specific cookie name
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
      sameSite: "lax",
    },
  };

  // Trust proxy if we're behind a reverse proxy
  if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false, { message: "Invalid credentials" });
        }

        // Update last login time
        // The IP is not available in passport strategy, will be updated in route
        await storage.updateLastLogin(user.id);
        return done(null, user);
      } catch (error) {
        console.error("Authentication error:", error);
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Regular user registration
  app.post("/api/register", async (req, res) => {
    try {
      // Validate input using schema
      const parsedInput = insertUserSchema.safeParse(req.body);
      if (!parsedInput.success) {
        return res.status(400).json({
          error: "Invalid input",
          details: parsedInput.error.errors,
        });
      }

      // Don't allow registering as admin
      if (req.body.isAdmin || req.body.role === "admin") {
        return res.status(400).json({ error: "Cannot register as admin" });
      }

      // Check if user exists
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      const existingEmail = await storage.getUserByEmail(req.body.email);
      if (existingEmail) {
        return res.status(400).json({ error: "Email already exists" });
      }

      // Hash password and create user
      const hashedPassword = await hashPassword(req.body.password);
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
        role: "user",
        isAdmin: false,
      });

      // Log in the user after registration
      req.login(user, (err) => {
        if (err) {
          console.error("Login after registration failed:", err);
          return res
            .status(500)
            .json({ error: "Login failed after registration" });
        }
        return res.status(201).json(user);
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      res
        .status(500)
        .json({ error: "Registration failed", details: error.message });
    }
  });

  // Admin-specific login endpoint
  app.post("/api/admin/login", async (req, res, next) => {
    try {
      const { username, password } = req.body;

      // Import the verifyAdminCredentials function
      const { verifyAdminCredentials } = await import("./admin-db");

      // First try to authenticate against the admin database
      const isValidAdminUser = await verifyAdminCredentials(username, password);

      if (!isValidAdminUser) {
        return res.status(401).json({ error: "Invalid admin credentials" });
      }

      // If admin credentials are valid, get or create a corresponding user in the main database
      let user = await storage.getUserByUsername(username);

      if (!user) {
        // If we don't have a corresponding user in the main database, create one
        user = await storage.createUser({
          username: username,
          // Use a random secure password for the main database record
          password: await hashPassword(randomBytes(32).toString("hex")),
          email: `${username}@admin.internal`, // Use a placeholder email
          isAdmin: true,
          role: "admin",
        });
      } else if (!user.isAdmin) {
        // Update user to have admin privileges if they don't already
        await storage.updateUserStatus(user.id, { isRestricted: false });
        // This is a workaround since there's no direct method to update isAdmin
        // We'll need to use the database directly
        const db = (await import("./db")).db;
        await db
          .update(users)
          .set({ isAdmin: true, role: "admin" })
          .where(eq(users.id, user.id));
        // Refresh user object
        user = (await storage.getUser(user.id)) as typeof user;
      }

      // Update last login time with IP address
      // Get the real client IP, considering X-Forwarded-For header
      const clientIP = (req.headers["x-forwarded-for"] || req.ip) as string;
      await storage.updateLastLogin(user.id, clientIP);

      // Log in the admin to the regular session
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ error: "Admin login failed" });
        }
        res.json(user);
      });
    } catch (error) {
      console.error("Admin login error:", error);
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", async (err: Error, user: Express.User) => {
      if (err) {
        return res.status(500).json({ error: "Login failed" });
      }
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Don't allow admin login through regular endpoint
      if (user.isAdmin) {
        return res.status(401).json({ error: "Please use admin login" });
      }

      // Get the real client IP, considering X-Forwarded-For header
      const clientIP = (req.headers["x-forwarded-for"] || req.ip) as string;
      await storage.updateLastLogin(user.id, clientIP);

      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ error: "Login failed" });
        }
        res.json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    res.json(req.user);
  });
}
